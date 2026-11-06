const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFile,mkdir}=require('node:fs/promises');
const {chromium}=require('@playwright/test');

test('catálogo modular: cadastro físico, escrita persistida, busca e exportação',async()=>{
  const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'5012'},stdio:'pipe'});
  let browser;
  try {
    for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:5012');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5012');
    await page.locator('#authGate').waitFor({state:'hidden'});
    assert.equal(await page.locator('#badgeTotalObras').textContent(),'3');
    // The bridge must execute as its own source file, including in authenticated builds.
    assert.equal(await page.evaluate(()=>typeof window.libraryBridge.getState),'function');
    assert.equal(await page.evaluate(()=>typeof window.libraryValidateState),'function');
    await page.getByRole('button',{name:'+ Adicionar obra',exact:true}).click();
    await page.getByLabel('Título *',{exact:true}).fill('Meu exemplar de teste');
    await page.getByRole('button',{name:'Adicionar e começar fichamento'}).click();
    await page.locator('#studyWorkspace').waitFor({state:'visible'});
    await page.locator('#study_livre').fill('Interpretação pessoal para recuperar pela busca');
    await page.getByLabel('Página atual do livro',{exact:true}).fill('42');
    await page.getByLabel('Trecho literal',{exact:true}).fill('Trecho sintético do exemplar');
    await page.getByLabel('Página / intervalo',{exact:true}).fill('42–43');
    await page.getByLabel('Meu comentário / onde usar',{exact:true}).fill('Relacionar ao projeto');
    await page.getByRole('button',{name:'Adicionar citação',exact:true}).click();
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Exportar fichamento .md'}).click();
    const download=await downloadPromise;
    const md=await readFile(await download.path(),'utf8');
    assert.match(md,/Interpretação pessoal/);assert.match(md,/Trecho sintético/);assert.match(md,/42–43/);
    await page.getByRole('button',{name:'Voltar à biblioteca',exact:true}).click();
    await page.reload();
    assert.equal(await page.locator('#badgeTotalObras').textContent(),'4');
    await page.getByRole('button',{name:'Buscar na minha escrita',exact:true}).click();
    await page.getByRole('searchbox').fill('Interpretação pessoal');
    await page.locator('.study-result').click();
    assert.equal(await page.locator('#study_livre').inputValue(),'Interpretação pessoal para recuperar pela busca');
    assert.equal(await page.locator('#studyPage').inputValue(),'42');
    await mkdir('test-results',{recursive:true});
    await page.screenshot({path:'test-results/caderno-desktop.png',animations:'disabled'});
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.getElementById('studyWorkspace').scrollWidth<=innerWidth),true,`Caderno com overflow em ${width}px`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Página com overflow em ${width}px`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'test-results/caderno-mobile.png',animations:'disabled'});
    await page.getByRole('button',{name:'Voltar à biblioteca',exact:true}).click();
    const backup=await page.evaluate(()=>({state:window.libraryBridge.getState()}));
    page.on('dialog',dialog=>dialog.accept());
    await page.evaluate(()=>switchView('backup'));
    await page.locator('#backupFileInput').setInputFiles({name:'backup-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.waitForLoadState('load');
    await page.waitForFunction(()=>document.getElementById('badgeTotalObras').textContent==='4');
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();server.kill();}
});
