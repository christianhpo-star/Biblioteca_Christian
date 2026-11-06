const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
function setup(){
  const nodes=new Map();
  class Element{
    constructor(){this.hidden=false;this.value='';this.style={};this.classList={add(){},remove(){},toggle(){}};this.dataset={};this.tagName='SECTION';}
    set id(id){this._id=id;nodes.set(id,this);}get id(){return this._id;}
    set innerHTML(html){this._html=html;for(const m of html.matchAll(/<(input|textarea|select|button|p|div|span)[^>]*\bid="([^"]+)"([^>]*)>([\s\S]*?)(?=<\/(?:textarea|select|button|p|div|span)>|$)/g)){const n=new Element();n.id=m[2];n.value=(m[3].match(/\bvalue="([^"]*)"/)||[])[1]||(['textarea'].includes(m[1])?m[4]:'');}for(const m of html.matchAll(/\bid="([^"]+)"/g)){if(!nodes.has(m[1])){const n=new Element();n.id=m[1];}}}
    get innerHTML(){return this._html;}
    setAttribute(){}append(){}focus(){}addEventListener(){}insertAdjacentHTML(){}querySelector(){return new Element();}querySelectorAll(){return [];}replaceChildren(...children){this.children=children;}
  }
  const document={createElement:()=>new Element(),body:new Element(),activeElement:new Element(),getElementById:id=>{if(!nodes.has(id)){const e=new Element();e.id=id;}return nodes.get(id);},querySelector:()=>new Element(),querySelectorAll:()=>[],addEventListener(){}};
  const saved=new Map(); const ctx={document,console,URL,crypto:webcrypto,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},confirm:()=>true,alert(){},setTimeout,clearTimeout,Blob,CustomEvent:class{},Date,structuredClone};ctx.window=ctx;ctx.addEventListener=()=>{};ctx.dispatchEvent=()=>{};
  vm.createContext(ctx);
  const root=path.resolve(__dirname,'..');
  ctx.LIBRARY_CONFIG={mode:'local',storageKey:'TEST_LIBRARY'};ctx.LIBRARY_DATA=JSON.parse(fs.readFileSync(path.join(root,'data/demo.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8'));
  for(const file of manifest.scripts.filter(f=>!f.endsWith('workspace.js')&&!f.endsWith('bridge.js')&&!f.endsWith('bootstrap.js')))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  vm.runInContext('updateBadgesAndKpis=renderDashboard=renderExplorer=renderFichamentosList=renderSubareaChips=renderAuthors=renderTopics=()=>{};',ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'src/study/workspace.js'),'utf8'),ctx);
  const run=s=>vm.runInContext(s,ctx), el=id=>document.getElementById(id);
  return {ctx,run,el,saved};
}
test('obra física sem arquivo entra no acervo e preserva o catálogo original',()=>{
  const {ctx,run,el}=setup();const before=run('getAllWorks().length');ctx.openNewWork();el('newTitle').value='Livro de papel';el('newFormat').value='fisico';el('newWorkForm').onsubmit({preventDefault(){}});
  assert.equal(run('getAllWorks().length'),before+1);assert.equal(run('OBRAS_BASE.length'),before);
  assert.equal(run('getAllWorks().at(-1).titulo'),'Livro de papel');assert.equal(run('getLeitura(getAllWorks().at(-1).id).status'),'nao_iniciado');
  assert.equal(el('studyWorkspace').hidden,false);assert.match(el('studyWorkspace').innerHTML,/Leia no papel/);
});
test('escrita, rascunho e citações sobrevivem ao salvamento e integram a exportação',()=>{
  const {ctx,run,el,saved}=setup();ctx.openStudy(1);
  el('study_livre').value='Minha interpretação';el('studyQuote').value='Trecho do livro';el('studyQuotePage').value='42–43';el('studyQuoteComment').value='Comparar com outro autor';
  el('studyAddQuote').onclick();el('studyQuote').value='Rascunho a conferir';el('studyBack').onclick();
  const state=JSON.parse([...saved.values()].at(-1));assert.equal(state.fichamentos[1].livre,'Minha interpretação');assert.equal(state.fichamentos[1].quoteDraft.texto,'Rascunho a conferir');assert.equal(state.citacoes[0].pagina,'42–43');
  run('downloadFile=(name,content)=>window.exported={name,content};');ctx.openStudy(1);el('studyExport').onclick();
  assert.match(ctx.exported.content,/Minha interpretação/);assert.match(ctx.exported.content,/Trecho do livro/);assert.match(ctx.exported.content,/42–43/);assert.match(ctx.exported.content,/Comparar com outro autor/);
});
test('campo desconhecido não é necessário para sincronizar obras físicas',()=>{
  const {ctx,run,el}=setup();ctx.openNewWork();el('newTitle').value='Exemplar de teste';el('newFormat').value='fisico';el('newWorkForm').onsubmit({preventDefault(){}});
  assert.deepEqual(Array.from(run('Object.keys(appState)')).sort(),['leituras','notas','citacoes','fichamentos','colecoes','metaOverrides','config'].sort());
});
