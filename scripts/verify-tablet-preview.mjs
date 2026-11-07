/** Verify the prepared synthetic artifact, or the real Pages deployment. No personal files. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {PDFDocument, StandardFonts} from 'pdf-lib';

const remote = process.argv.find(arg => arg.startsWith('--url='))?.slice(6);
const url = remote || 'http://127.0.0.1:5014/';
if (remote) assert.equal(new URL(remote).protocol, 'https:');
const server = remote ? null : spawn(process.execPath, ['scripts/serve.mjs'], {
  env: {...process.env, PORT:'5014'}, stdio:'pipe'
});
const demo = JSON.parse(await readFile('data/demo.json','utf8'));
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
for(let n=1;n<=2;n++) pdf.addPage([400,550]).drawText(`PDF SINTETICO - pagina ${n}`,{x:35,y:500,font,size:18});
const buffer = Buffer.from(await pdf.save());
const results=[];
let browser;
try {
  if(server) {
    let available=false;
    for(let n=0;n<80;n++) {
      try {if((await fetch(url)).ok) {available=true;break;}} catch {}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(available,'Servidor do artefato não iniciou');
  }
  // The full Chromium headless mode includes its PDF viewer; headless-shell may download PDFs.
  browser=await chromium.launch({headless:true,channel:'chromium'});
  for(const viewport of [{width:1024,height:768},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,serviceWorkers:'block'});
    const page=await context.newPage(), errors=[], failedAssets=[], writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{
      if(/\.(js|css)(?:\?|$)/.test(response.url())&&response.status()>=400) failedAssets.push(response.url());
    });
    page.on('request',request=>{if(!['GET','HEAD'].includes(request.method())) writes.push(request.url());});
    await page.addInitScript(()=>{
      window.previewRevoked=[];
      const revoke=URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL=url=>{window.previewRevoked.push(url);revoke(url);};
    });
    const response=await page.goto(url);
    assert.equal(response.status(),200);
    await page.locator('#authGate').waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(()=>window.LIBRARY_DATA),demo);
    assert.equal(await page.evaluate(()=>window.LIBRARY_CONFIG.mode),'local');
    assert.equal(await page.locator('.home-book-card').count(),3);
    assert.equal(await page.locator('.tablet-preview-banner button').isVisible(),true);
    const input=page.locator('#globalSearchInput');
    await input.fill('aprender');await input.press('Enter');
    assert.equal(await page.locator('#cardsContainer .work-card').count(),1);
    await input.fill('');await input.press('Enter');
    await page.getByRole('button',{name:'Ver todo o acervo',exact:true}).click();
    await page.getByRole('button',{name:/^Filtros/}).click();
    await page.locator('#filterCategorySelect').selectOption('2');
    assert.equal(await page.locator('#cardsContainer .work-card').count(),1);
    assert.match(await page.locator('#cardsContainer').innerText(),/Bruno/i);
    await page.locator('#filterCategorySelect').selectOption('all');
    await page.getByRole('button',{name:'Fechar filtros',exact:true}).click();
    await page.getByRole('button',{name:'Voltar ao início',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow no início');
    const before=await page.evaluate(()=>JSON.stringify(window.libraryBridge.getState()));
    await page.locator('.tablet-preview-banner button').click();
    await page.locator('#pdfPrototypeFile').setInputFiles({name:'teste-ficticio.pdf',mimeType:'application/pdf',buffer});
    // PDF.js pinta as paginas com canvas próprio. iframe/plugin do Android não é utilizado.
    await page.waitForFunction(()=>{
      const first=document.querySelector('#pdfPrototypePages .pdf-page-canvas');
      return first && first.width>0 && first.height>0 &&
        !first.closest('.pdf-rendered-page').classList.contains('pdf-page-loading');
    },null,{timeout:30000});
    assert.equal(await page.locator('.pdf-rendered-page').count(),2);
    assert.equal(await page.locator('#pdfPrototypeFrame').isHidden(),true);
    const blob=await page.locator('#pdfPrototypeNewTab').getAttribute('href');
    assert.equal(await page.locator('#pdfPrototype').evaluate(el=>
      el.classList.contains('pdf-reading-active')),true);
    assert.equal(await page.locator('#pdfPrototypeTools').isVisible(),true);
    assert.equal(await page.locator('#pdfPrototypeDiagnostics').isVisible(),false);
    if (viewport.width === 390) {
      const dock=await page.locator('#pdfPrototypeTools').evaluate(el=>({
        visible:el.clientWidth, total:el.scrollWidth
      }));
      assert.ok(dock.total <= dock.visible+3,
        'Barra de ferramentas não deve cortar os botões em 390px: '+JSON.stringify(dock));
    }
    const bounds=await page.evaluate(()=>({
      header:document.querySelector('.pdf-prototype-toolbar').getBoundingClientRect().height,
      viewer:document.getElementById('pdfPrototypeViewer').getBoundingClientRect().height,
      screen:document.getElementById('pdfPrototype').getBoundingClientRect().height
    }));
    assert.ok(bounds.header<=74);
    assert.ok(bounds.viewer/bounds.screen>0.65);
    const penLayer=page.locator('.pdf-page-ink').first();
    const box=await penLayer.boundingBox();
    assert.ok(box?.width>100 && box?.height>100);
    const pen=(pointerType,pointerId,x,y)=>({
      pointerType,pointerId,pressure:0.5,clientX:box.x+x,clientY:box.y+y
    });
    await penLayer.dispatchEvent('pointerdown',pen('pen',31,25,25));
    await penLayer.dispatchEvent('pointermove',pen('pen',31,95,85));
    await penLayer.dispatchEvent('pointerup',pen('pen',31,95,85));
    assert.equal(await penLayer.locator('path').count(),1);
    await penLayer.dispatchEvent('pointerdown',pen('touch',32,20,20));
    await penLayer.dispatchEvent('pointermove',pen('touch',32,40,45));
    await penLayer.dispatchEvent('pointerup',pen('touch',32,40,45));
    assert.equal(await penLayer.locator('path').count(),1,'Dedo nunca deve criar riscos');
    await page.locator('#pdfZoomIn').click();
    assert.equal(await page.locator('#pdfZoomLabel').textContent(),'120%');
    assert.equal(await penLayer.locator('path').count(),1,'Zoom preserva traços da mesma página');
    await page.locator('#pdfInkUndo').click();
    await page.locator('#pdfInkShape').click();
    await page.locator('#pdfShapeMode').selectOption('line');
    const straight=({pointerType:'pen',pointerId:71,pressure:0.5});
    await penLayer.dispatchEvent('pointerdown',{...straight,clientX:box.x+25,clientY:box.y+20});
    await penLayer.dispatchEvent('pointermove',{...straight,clientX:box.x+75,clientY:box.y+55});
    await penLayer.dispatchEvent('pointerup',{...straight,clientX:box.x+105,clientY:box.y+65});
    assert.match(await penLayer.locator('path').first().getAttribute('d'),
      /^M[0-9.]+ [0-9.]+ L[0-9.]+ [0-9.]+$/);
    await page.locator('#pdfInkUndo').click();
    assert.equal(await penLayer.locator('path').count(),0);
    await page.locator('#pdfInkRedo').click();
    assert.equal(await penLayer.locator('path').count(),1);
    await mkdir('test-results',{recursive:true});
    await page.screenshot({path:`test-results/tablet-preview-${remote?'live':'local'}-${viewport.width}.png`});
    // Fallback externo segue disponível, mas o leitor integrado não depende dele.
    await page.locator('#pdfReaderMenu > summary').click();
    assert.equal(await page.locator('#pdfPrototypeNewTab').isVisible(),true);
    const opened=context.waitForEvent('page');
    await page.locator('#pdfPrototypeNewTab').click();
    const popup=await opened;
    await popup.waitForURL(value=>value.href.startsWith('blob:'),{timeout:15000,waitUntil:'commit'});
    await popup.close();
    await page.locator('#pdfPrototypeClose').click();
    assert.equal(await page.locator('#pdfPrototype').isHidden(),true);
    assert.equal(await page.locator('#pdfPrototypeFrame').getAttribute('src'),null);
    assert.equal(await page.locator('#pdfPrototypePages').isHidden(),true);
    assert.ok(await page.evaluate(value=>window.previewRevoked.includes(value),blob));
    assert.equal(await page.evaluate(()=>JSON.stringify(window.libraryBridge.getState())),before);
    assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);assert.deepEqual(writes,[]);
    results.push({viewport,http:response.status(),syntheticWorks:3,search:true,filters:true,
      engine:'PDF.js local',localPdfSelected:true,pages:2,
      penInkSimulated:true,touchDoesNotDraw:true,zoomKeepsInk:true,
      newTabFallback:true,blobRevoked:true,stateUnchanged:true,
      consoleErrors:errors,failedAssets,noUploads:writes.length===0});
    await context.close();
  }
  await writeFile(`test-results/tablet-preview-${remote?'live':'local'}.json`,JSON.stringify({url,results,physicalPenValidated:false},null,2));
  console.log(JSON.stringify({url,results,physicalPenValidated:false},null,2));
} finally {await browser?.close();server?.kill();}
