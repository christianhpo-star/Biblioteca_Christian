const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const {chromium}=require('@playwright/test');
const {unzipSync,strFromU8}=require('fflate');
const {PDFDocument}=require('pdf-lib');

test('registros compactos, documento ordenado, downloads reais e recuperação de dados',async()=>{
  const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'5012'},stdio:'pipe'});let browser;
  try {
    for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:5012')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];
    const consoleErrors=[],failedRequests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
    page.on('requestfailed',r=>failedRequests.push(r.url()+' '+r.failure()?.errorText));
    await page.goto('http://127.0.0.1:5012');await page.locator('#authGate').waitFor({state:'hidden'});
    assert.equal(await page.locator('#badgeTotalObras').textContent(),'3');
    // Abertura mostra três obras legadas sem inventar recência; o acervo completo continua acessível.
    assert.equal(await page.locator('#dashboardHomeBooks .home-book-card').count(),3);
    assert.equal(await page.locator('#dashboardHomeTitle').textContent(),'Do seu acervo');
    assert.equal(await page.locator('.dashboard-advanced').evaluate(el=>el.open),false);
    await page.getByRole('button',{name:'Ver todo o acervo'}).click();
    assert.equal(await page.locator('#viewExplorer').isVisible(),true);
    assert.equal(await page.locator('#cardsContainer .work-card').count(),3);
    await page.getByRole('button',{name:'Voltar ao início'}).click();
    assert.equal(await page.locator('#viewDashboard').isVisible(),true);

    // E0 usa somente um PDF gerado em memoria; nunca le arquivos pessoais.
    await page.locator('.dashboard-advanced > summary').click();
    const beforePdf=await page.evaluate(()=>JSON.stringify(window.libraryBridge.getState()));
    await page.getByRole('button',{name:'Testar leitor de PDF local'}).click();
    assert.equal(await page.locator('#pdfPrototype').isVisible(),true);
    const syntheticPdf=await PDFDocument.create();
    syntheticPdf.addPage([320,480]);
    syntheticPdf.addPage([320,480]);
    await page.locator('#pdfPrototypeFile').setInputFiles({
      name:'documento-sintetico.pdf',
      mimeType:'application/pdf',
      buffer:Buffer.from(await syntheticPdf.save())
    });
    try {
      await page.waitForFunction(()=>{
        const canvas=document.querySelector('#pdfPrototypePages .pdf-page-canvas');
        return canvas && canvas.width>0 && canvas.height>0 &&
          !canvas.closest('.pdf-rendered-page').classList.contains('pdf-page-loading');
      },null,{timeout:20000});
    } catch(error) {
      const diag=await page.evaluate(()=>({
        status:document.getElementById('pdfPrototypeStatus')?.textContent,
        error:document.querySelector('.pdf-page-error')?.textContent,
        pages:document.querySelectorAll('.pdf-rendered-page').length,
        canvas:document.querySelector('.pdf-page-canvas')?.width,
        readerLoaded:typeof window.PdfPagePrototype?.load,
        modules:[...document.scripts].map(s=>s.src).filter(s=>/pdf/.test(s))
      }));
      console.error('PDF E1 DIAGNOSTICO',JSON.stringify({diag,errors,consoleErrors,failedRequests}));
      throw error;
    }
    assert.equal(await page.locator('.pdf-rendered-page').count(),2);
    assert.equal(await page.locator('#pdfPrototypeFrame').isHidden(),true);
    assert.match(await page.locator('#pdfPrototypeNewTab').getAttribute('href'),/^blob:/);
    assert.equal(await page.locator('#pdfPrototype').evaluate(el=>el.classList.contains('pdf-reading-active')),true);
    assert.equal(await page.locator('#pdfPrototypeTools').isVisible(),true);
    const readerHeights=await page.evaluate(()=>({
      viewer:document.getElementById('pdfPrototypeViewer').getBoundingClientRect().height,
      screen:document.getElementById('pdfPrototype').getBoundingClientRect().height,
      header:document.querySelector('#pdfPrototype .pdf-prototype-toolbar').getBoundingClientRect().height
    }));
    assert.ok(readerHeights.header<=74,'A barra superior deve ser compacta');
    assert.ok(readerHeights.viewer/readerHeights.screen>0.65,'PDF deve ocupar a maior parte da tela');
    const svg=page.locator('.pdf-page-ink').first();
    const rect=await svg.boundingBox();
    const pen=(type,id,dx,dy)=>({pointerType:type,pointerId:id,
      pressure:0.6,clientX:rect.x+dx,clientY:rect.y+dy});
    await svg.dispatchEvent('pointerdown',pen('pen',21,30,35));
    await svg.dispatchEvent('pointermove',pen('pen',21,85,75));
    await svg.dispatchEvent('pointerup',pen('pen',21,85,75));
    assert.equal(await svg.locator('path').count(),1);
    await svg.dispatchEvent('pointerdown',pen('touch',22,35,40));
    await svg.dispatchEvent('pointermove',pen('touch',22,55,65));
    await svg.dispatchEvent('pointerup',pen('touch',22,55,65));
    assert.equal(await svg.locator('path').count(),1);
    await page.locator('#pdfZoomIn').click();
    assert.equal(await page.locator('#pdfZoomLabel').textContent(),'120%');
    assert.equal(await svg.locator('path').count(),1);
    await page.locator('#pdfInkUndo').click();
    assert.equal(await svg.locator('path').count(),0);
    await page.locator('#pdfInkRedo').click();
    assert.equal(await svg.locator('path').count(),1);
    await page.locator('#pdfInkUndo').click();
    await page.locator('#pdfInkShape').click();
    await page.locator('#pdfShapeMode').selectOption('line');
    await svg.dispatchEvent('pointerdown',pen('pen',78,20,35));
    await svg.dispatchEvent('pointermove',pen('pen',78,55,68));
    await svg.dispatchEvent('pointerup',pen('pen',78,105,74));
    assert.equal(await svg.locator('path').count(),1);
    assert.match(await svg.locator('path').first().getAttribute('d'),/^M[0-9.]+ [0-9.]+ L[0-9.]+ [0-9.]+$/);
    await page.locator('#pdfReaderMenu > summary').click();
    await page.locator('#pdfReaderDiagnosticsToggle').click();
    assert.equal(await page.locator('#pdfPrototypeDiagnostics').isVisible(),true);
    await page.locator('#pdfPrototypeCanvas').dispatchEvent('pointerdown',{
      pointerId:81,pointerType:'pen',pressure:0.5,clientX:10,clientY:20
    });
    assert.match(await page.locator('#pdfPrototypePenStatus').innerText(),/Caneta: 1/);
    await page.locator('#pdfPrototypeClose').click();
    assert.equal(await page.locator('#pdfPrototype').isHidden(),true);
    assert.equal(await page.locator('#pdfPrototypeFrame').getAttribute('src'),null);
    assert.equal(await page.locator('#pdfPrototypePages').isHidden(),true);
    assert.equal(await page.evaluate(()=>JSON.stringify(window.libraryBridge.getState())),beforePdf);
    await page.locator('.dashboard-advanced > summary').click();

    // A busca do catálogo é única e atualiza sugestões enquanto a pessoa digita.
    assert.equal(await page.locator('#globalSearchInput').count(),1);
    assert.equal(await page.locator('#explorerSearchInput, #heroSearchInput').count(),0);
    const catalogInput=page.locator('#globalSearchInput');
    await catalogInput.fill('aprender');
    await page.locator('#catalogSuggestions').waitFor({state:'visible'});
    assert.ok((await page.locator('.catalog-suggestion-option').count())>0);
    await catalogInput.press('ArrowDown');
    assert.match(await catalogInput.getAttribute('aria-activedescendant'),/^catalogSuggestion/);
    await catalogInput.press('Escape');
    assert.equal(await page.locator('#catalogSuggestions').isHidden(),true);
    await catalogInput.press('Enter');
    assert.equal(await page.locator('#viewExplorer').isVisible(),true);
    assert.equal(await page.locator('#cardsContainer .work-card').count(),1);
    await catalogInput.fill('');
    await catalogInput.press('Enter');
    assert.equal(await page.locator('#viewDashboard').isVisible(),true);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await catalogInput.isVisible(),true);
    await page.setViewportSize({width:1440,height:1000});

    await page.getByRole('button',{name:'+ Adicionar obra',exact:true}).click();await page.getByLabel('Título *',{exact:true}).fill('Meu exemplar de teste');await page.getByRole('button',{name:'Adicionar e começar fichamento'}).click();
    assert.equal(await page.locator('#recordEditor').isVisible(),false);
    async function addNote(text,pageNumber){await page.locator('#recordNewNote').click();assert.equal(await page.locator('#recordLaunchers').isVisible(),false);await page.locator('#recordNote').fill(text);await page.locator('#recordPage').fill(pageNumber);await page.getByRole('button',{name:'Guardar registro',exact:true}).click();}
    await addNote('Sem página para retomar depois','');await addNote('Ideia na página cem','100');
    await page.locator('#recordNewQuote').click();await page.locator('#recordQuote').fill('Trecho literal com ação, memória e educação.');await page.locator('#recordPage').fill('10–12');await page.locator('#recordAddNote').click();await page.locator('#recordNote').fill('Comentário vinculado ao trecho.');await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
    await addNote('Primeira anotação da página dois','2');await addNote('Segunda anotação da página dois','2');
    assert.equal(await page.locator('.study-record').count(),5);
    // Draft text survives reload and remains outside the document until explicitly saved.
    await page.locator('#recordNewNote').click();await page.locator('#recordNote').fill('Rascunho recuperável');await page.locator('#recordClose').click();await page.reload();
    await page.getByRole('button',{name:'Buscar na minha escrita',exact:true}).click();await page.getByRole('searchbox').fill('Primeira anotação');await page.locator('.study-result').click();await page.locator('#recordResume').click();assert.equal(await page.locator('#recordNote').inputValue(),'Rascunho recuperável');await page.locator('#recordClose').click();
    await page.locator('#studyDocument').click();const text=await page.locator('#studyDocumentPaper').innerText();assert.ok(text.indexOf('Página 2')<text.indexOf('Página 10–12'));assert.ok(text.indexOf('Página 10–12')<text.indexOf('Página 100'));assert.ok(text.indexOf('Página 100')<text.indexOf('Sem página indicada'));assert.ok(text.indexOf('Primeira anotação')<text.indexOf('Segunda anotação'));assert.equal(text.includes('Rascunho recuperável'),false);assert.match(text,/Comentário vinculado/);
    await mkdir('test-results',{recursive:true});
    const wordWait=page.waitForEvent('download');await page.locator('#documentWord').click();const word=await wordWait;await word.saveAs('test-results/fichamento-test.docx');
    const xml=strFromU8(unzipSync(new Uint8Array(await readFile(await word.path())))['word/document.xml']);assert.ok(xml.indexOf('Página 2')<xml.indexOf('Página 100'));assert.match(xml,/Comentário vinculado ao trecho/);assert.match(xml,/ação, memória e educação/);
    const pdfWait=page.waitForEvent('download');await page.locator('#documentPdf').click();const pdfDownload=await pdfWait;await pdfDownload.saveAs('test-results/fichamento-test.pdf');const pdf=await PDFDocument.load(await readFile(await pdfDownload.path()));assert.ok(pdf.getPageCount()>=1);
    const longBytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (await StudyDocuments.createPdf({title:'Documento sintético longo',author:'Autora Exemplo',reference:'Referência fictícia',appendix:[],groups:[{heading:'Página 20',records:[{quote:'Educação e memória — ação. '.repeat(500),note:'PalavraSemEspaços'.repeat(100)}]}]})).arrayBuffer())));
    await writeFile('test-results/fichamento-long.pdf',Buffer.from(longBytes));assert.ok((await PDFDocument.load(Buffer.from(longBytes))).getPageCount()>2);
    const unsupported=await page.evaluate(async()=>{try{await StudyDocuments.createPdf({title:'😀',author:'A',reference:'B',groups:[],appendix:[]});return '';}catch(error){return error.message;}});assert.match(unsupported,/Baixe em Word/);
    await page.screenshot({path:'test-results/document-desktop.png',animations:'disabled'});
    for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.getElementById('studyWorkspace').scrollWidth<=innerWidth),true,'Overflow '+width);}
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/document-mobile.png',animations:'disabled'});await page.locator('#documentBack').click();
    page.on('dialog',dialog=>dialog.accept());await page.locator('.study-record').first().getByRole('button',{name:/Editar registro/}).click();await page.locator('#recordNote').fill('Primeira anotação editada');await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
    await page.screenshot({path:'test-results/records-mobile.png',animations:'disabled'});
    // A quota error must keep the user's input visible and block closing until it can be saved.
    await page.locator('#recordNewNote').click();await page.evaluate(()=>{window.realSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};});await page.locator('#recordNote').fill('Escrita preservada na falha');await page.locator('#recordClose').click();assert.equal(await page.locator('#recordEditor').isVisible(),true);assert.equal(await page.locator('#recordNote').inputValue(),'Escrita preservada na falha');await page.evaluate(()=>Storage.prototype.setItem=window.realSetItem);await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
    await page.locator('#studyBack').click();
    const currentState=await page.evaluate(()=>window.libraryBridge.getState());
    const manual=Object.values(currentState.metaOverrides).find(item=>item.catalogManual);
    assert.ok(manual);
    assert.match(manual.adicionadoEm,/^\d{4}-\d{2}-\d{2}T/);
    assert.equal(await page.locator('#dashboardHomeBooks .home-book-card').count(),4);
    assert.equal(await page.locator('#dashboardHomeTitle').textContent(),'Últimas inclusões');
    const backup={state:currentState};await page.evaluate(()=>switchView('backup'));await page.locator('#backupFileInput').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForLoadState('load');await page.waitForFunction(()=>document.getElementById('badgeTotalObras').textContent==='4');assert.deepEqual(errors,[]);
  }finally{await browser?.close();server.kill();}
});
