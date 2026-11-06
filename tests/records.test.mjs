import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listRecords,saveRecord,documentModel,documentBlocks,pageOrder} from '../src/study/records.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const state=()=>({leituras:{},notas:[],citacoes:[],fichamentos:{},colecoes:[],metaOverrides:{},config:{}});
const work={id:1,titulo:'Livro fictício',autor:'Autora Exemplo'};
test('ordena páginas numericamente e mantém criação na mesma página e sem página ao final',()=>{
  const s=state();
  for(const [id,page] of [['a','100'],['b','2'],['c','10–12'],['d','2'],['e','']])saveRecord(s,1,{page,note:id},'2026-11-06T12:00:00Z',id);
  assert.deepEqual(listRecords(s,1).map(r=>r.note),['b','d','c','a','e']);
  assert.deepEqual(documentModel(s,work).groups.map(g=>g.heading),['Página 2','Página 10–12','Página 100','Sem página indicada']);
  assert.equal(pageOrder('p. 42')[1],42);assert.equal(pageOrder('xii')[1],12);
});
test('trecho e comentário permanecem juntos e edição preserva criação',()=>{
  const s=state();saveRecord(s,1,{page:'9',quote:'Literal',note:'Minha ideia'},'2026-11-06T12:00:00Z','quote');
  const record=listRecords(s,1)[0];saveRecord(s,1,{...record,page:'3',note:'Comentário editado'},'2026-11-07T12:00:00Z');
  const result=listRecords(s,1)[0];assert.equal(result.quote,'Literal');assert.equal(result.note,'Comentário editado');assert.equal(result.createdAt,record.createdAt);assert.equal(s.citacoes.length,1);
  assert.deepEqual(documentBlocks(documentModel(s,work)).slice(-4).map(b=>b.text),['Página 3','Literal','Meu comentário','Comentário editado']);
});
test('conteúdo legado é consultado sem migração e continua editável',()=>{
  const s=state();s.fichamentos[1]={livre:'Minha anotação anterior',analise:'Crítica anterior',referencia:'Minha referência'};s.notas=[{id:'old',obraId:1,texto:'Nota antiga'}];
  const before=JSON.stringify(s),model=documentModel(s,work);assert.equal(JSON.stringify(s),before);assert.equal(model.reference,'Minha referência');assert.equal(model.appendix[0].text,'Crítica anterior');
  saveRecord(s,1,{key:'legacy:livre',note:'Revisada',page:'14'});assert.equal(s.fichamentos[1].livre,'Revisada');assert.equal(s.fichamentos[1].analise,'Crítica anterior');assert.equal(s.notas[0].texto,'Nota antiga');
});
test('tipo pode mudar sem duplicar o registro ou perder o ID',()=>{
  const s=state();saveRecord(s,1,{page:'5',note:'Comentário'},'2026-11-06T12:00:00Z','same');
  saveRecord(s,1,{key:'notas:same',page:'5',quote:'Trecho novo',note:'Comentário'});
  assert.equal(s.notas.length,0);assert.equal(s.citacoes[0].id,'same');assert.equal(listRecords(s,1).length,1);
});
test('rejeita registro vazio e citação sem página sem alterar estado',()=>{
  const s=state(),before=JSON.stringify(s);assert.throws(()=>saveRecord(s,1,{note:' '}));assert.throws(()=>saveRecord(s,1,{quote:'Texto'}));assert.equal(JSON.stringify(s),before);
});
test('rascunhos não entram no documento e o modelo não mistura obras',()=>{
  const s=state();s.fichamentos[1]={registroRascunho:{note:'Não guardada'}};saveRecord(s,2,{page:'1',note:'Outra obra'});
  assert.equal(documentModel(s,work).groups.length,0);assert.equal(documentBlocks(documentModel(s,work)).some(b=>b.text.includes('Não guardada')),false);
});
test('um rascunho novo não encobre a referência e o conteúdo da base preexistente',()=>{
  const context={appState:{fichamentos:{1:{registroRascunho:{note:'Rascunho'}}}},FICHAMENTOS_BASE:{1:{referencia:'Referência completa da edição',argumento:'Conteúdo anterior'}}};
  vm.createContext(context);vm.runInContext(readFileSync(new URL('../src/catalog/repository.js',import.meta.url),'utf8'),context);
  assert.equal(vm.runInContext('getFichamento(1).referencia',context),'Referência completa da edição');assert.equal(vm.runInContext('getFichamento(1).argumento',context),'Conteúdo anterior');
});
