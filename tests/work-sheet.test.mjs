import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { documentModel } from '../src/study/records.mjs';

const source = readFileSync(new URL('../src/reading/work-sheet.js', import.meta.url), 'utf8');
const repositorySource = readFileSync(new URL('../src/catalog/repository.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../templates/index.html', import.meta.url), 'utf8');

function fixture(uri = '') {
  const elements = new Map();
  const sections = Array.from({ length: 4 }, () => ({ open: true }));
  const stars = Array.from({ length: 5 }, () => ({
    classList: { toggle() {} }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }
  }));
  const card = { scrollTop: 20 };
  function node(id) {
    if (!elements.has(id)) {
      const el = {
        textContent: '', innerHTML: '', value: '', href: '', hidden: false,
        style: {}, attrs: {}, classList: { toggle() {} },
        setAttribute(k, v) { this.attrs[k] = v; }
      };
      if (id === 'modalWorkSheet') {
        el.querySelectorAll = () => sections;
        el.querySelector = () => card;
      }
      elements.set(id, el);
    }
    return elements.get(id);
  }
  const work = {
    id: 1, autor: 'Ana Exemplo', titulo: 'Estudos sobre a escola',
    codigo: '1', categoria: 'Educação', subarea: 'História',
    paginas: 100, resumo: '', palavras_chave: [],
    uri, arquivo: '', caminho: '', tamanho_mb: 0
  };
  const appState = {
    leituras: { 1: { status: 'nao_iniciado', paginasLidas: 0, favorito: false, avaliacao: 0, motivo: '' } },
    colecoes: [], metaOverrides: {}, fichamentos: {}
  };
  let opened = 0, saved = 0;
  const context = {
    document: { getElementById: node, querySelectorAll: () => stars },
    getObraById: () => work, getLeitura: (id) => appState.leituras[id],
    getAllWorks: () => [work], appState, URL, OBRAS_BASE: [work], FICHAMENTOS_BASE: {},
    escapeHtml: (v) => String(v ?? ''), escapeJs: (v) => String(v ?? ''),
    openModal: () => { opened += 1; }, saveAppState: () => { saved += 1; },
    filterCatalog() {}
  };
  vm.createContext(context);
  // Load the same repository dependency that precedes the worksheet in the manifest.
  vm.runInContext(repositorySource, context);
  vm.runInContext(source, context);
  return { node, work, appState, sections, card, run: (code) => vm.runInContext(code, context), opened: () => opened, saved: () => saved };
}

test('a ficha abre recolhida e um livro sem link não promete abrir PDF', () => {
  const ui = fixture();
  ui.run('openWorkSheet(1)');
  assert.equal(ui.node('modalOpenPdfBtn').hidden, true);
  assert.equal(ui.node('modalCopyFilePathBtn').hidden, true);
  assert.equal(ui.node('modalPagesReadInput').value, 0);
  assert.equal(ui.node('modalWorkSummary').textContent, 'Resumo ainda não registrado.');
  assert.equal(ui.node('modalWorkAddedAt').textContent, 'Data de inclusão não registrada');
  assert.ok(ui.sections.every((s) => !s.open));
  assert.equal(ui.card.scrollTop, 0);
  assert.equal(ui.opened(), 1);
});

test('a ficha mantém link HTTPS, atualiza leitura e favorito', () => {
  const ui = fixture('https://drive.google.com/file/d/teste');
  ui.run('openWorkSheet(1)');
  assert.equal(ui.node('modalOpenPdfBtn').hidden, false);
  assert.match(ui.node('modalOpenPdfBtn').href, /^https:/);
  ui.run("updateModalReadingStatus('lendo')");
  assert.equal(ui.appState.leituras[1].status, 'lendo');
  assert.equal(ui.node('modalReadingStatusText').textContent, 'Em leitura');
  ui.run('toggleModalFavorite()');
  assert.equal(ui.appState.leituras[1].favorito, true);
  assert.equal(ui.node('modalFavoriteBtn').attrs['aria-pressed'], 'true');
  assert.ok(ui.saved() >= 2);
});

test('links de esquema inseguro não abrem pela ficha', () => {
  const ui = fixture('javascript:alert(1)');
  ui.run('openWorkSheet(1)');
  assert.equal(ui.node('modalOpenPdfBtn').hidden, true);
  assert.equal(ui.node('modalCopyFilePathBtn').hidden, true);
});

test('a referência ausente não vira uma falsa referência automática', () => {
  const state = { fichamentos: { 1: {} }, notas: [], citacoes: [] };
  const work = { id: 1, titulo: 'Estudos sobre a escola', autor: 'Ana Exemplo' };
  assert.equal(documentModel(state, work).reference, 'Referência bibliográfica não informada.');
  state.fichamentos[1].referencia = 'Referência revisada pelo pesquisador';
  assert.equal(documentModel(state, work).reference, 'Referência revisada pelo pesquisador');
});

test('HTML mantém uma ficha compacta e não anuncia ABNT automática', () => {
  assert.match(html, /id="modalWorkTitle"/);
  assert.match(html, /Abrir caderno/);
  assert.match(html, /<details class="modal-work-section">/);
  assert.doesNotMatch(html, /copyWorkAbntModal|exportCollectionAbnt|Copiar ABNT|Copiar Referências ABNT/);
});
