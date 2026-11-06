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
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5012');await page.locator('#authGate').waitFor({state:'hidden'});
    assert.equal(await page.locator('#badgeTotalObras').textContent(),'3');
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
    await page.locator('#studyBack').click();const backup=await page.evaluate(()=>({state:window.libraryBridge.getState()}));await page.evaluate(()=>switchView('backup'));await page.locator('#backupFileInput').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForLoadState('load');await page.waitForFunction(()=>document.getElementById('badgeTotalObras').textContent==='4');assert.deepEqual(errors,[]);
  }finally{await browser?.close();server.kill();}
});
