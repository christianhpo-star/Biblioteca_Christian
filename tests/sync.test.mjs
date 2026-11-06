import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDelta, validateState } from '../src/cloud/sync-core.mjs';
test('preserva mudanças em obras diferentes feitas em dois aparelhos', () => {
  const base = { leituras: { 1: { favorito: false }, 2: { favorito: false } } };
  const local = structuredClone(base); local.leituras[1].favorito = true;
  const remote = structuredClone(base); remote.leituras[2].favorito = true;
  assert.deepEqual(mergeDelta(base, local, remote), { leituras: { 1: { favorito: true }, 2: { favorito: true } } });
});
test('preserva notas novas concorrentes e aplica exclusões locais', () => {
  const base = { notas: [{id:'old',texto:'antes'}] };
  const local = { notas: [{id:'local',texto:'tablet'}] };
  const remote = { notas: [{id:'old',texto:'antes'}, {id:'remote',texto:'celular'}] };
  assert.deepEqual(mergeDelta(base, local, remote).notas, [{id:'remote',texto:'celular'}, {id:'local',texto:'tablet'}]);
});
test('estado padrão sem mudanças não substitui progresso remoto', () => {
  const base = {status:'lido'}, remote = {status:'lendo'};
  assert.deepEqual(mergeDelta(base, base, remote), remote);
});
test('bloqueia backup inválido, campos extras e payload excessivo', () => {
  const valid = {leituras:{},fichamentos:{},metaOverrides:{},config:{},notas:[],citacoes:[],colecoes:[]};
  assert.equal(validateState(valid), valid);
  assert.throws(() => validateState({ ...valid, admin: true }));
  assert.throws(() => validateState({ ...valid, notas: {} }));
  assert.throws(() => validateState({ ...valid, notas: ['x'.repeat(700001)] }));
});
