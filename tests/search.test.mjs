import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const searchCode = readFileSync(new URL('../src/catalog/search.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../templates/index.html', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../styles/cloud.css', import.meta.url), 'utf8');

const books = [
  { id: 1, titulo: 'Álgebra e currículo', autor: 'SILVA, Ana' },
  { id: 2, titulo: 'Memória e escola', autor: 'SILVA, Ana' },
  { id: 3, titulo: 'Memória oral', autor: 'FERREIRA, Carla' },
  { id: 4, titulo: 'Currículo em ação', autor: 'OLIVEIRA, Bruno' },
  { id: 5, titulo: 'Conhecimento e ensino', autor: 'COSTA, Joana' },
  { id: 6, titulo: 'Didática', autor: 'SOUZA, Júlia' },
  { id: 7, titulo: 'A escola e a vida', autor: 'SILVA, Ana' }
];

function fixture(available = books) {
  const nodes = new Map(), handlers = new Map(), views = [], opened = [];
  let renders = 0;
  function element(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id, value: '', hidden: true, innerHTML: '', textContent: '', attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; },
        removeAttribute(k) { delete this.attrs[k]; },
        focus() { this.focused = true; },
        scrollIntoView() {},
        querySelectorAll() { return []; },
        addEventListener(k, cb) { this[k] = cb; }
      });
    }
    return nodes.get(id);
  }
  element('globalSearchInput').hidden = false;
  element('catalogSearchSummary').hidden = false;
  const ctx = {
    document: {
      getElementById: element,
      addEventListener(name, fn) { handlers.set(name, fn); }
    },
    window: {}, currentView: 'dashboard',
    selectedSubareas: new Set(), selectedTags: new Set(),
    getCatalogFacetedWorks: () => available,
    escapeHtml: text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    switchView(view) { views.push(view); ctx.currentView = view; },
    filterCatalog() { renders++; },
    openWorkSheet(id) { opened.push(id); }
  };
  vm.createContext(ctx);
  vm.runInContext(searchCode, ctx);
  return { ctx, element, views, opened, get renders() { return renders; } };
}

test('a consulta ignora acentos, maiúsculas e espaços repetidos', () => {
  const f = fixture();
  assert.equal(vm.runInContext("normalizeCatalogSearch('  AÇÃO    E   MEMÓRIA  ')", f.ctx), 'acao e memoria');
});

test('sugestões respeitam limite, são únicas e distinguem títulos de autores', () => {
  const f = fixture();
  const suggestions = f.ctx.buildCatalogSuggestions('sIlVa', books);
  assert.ok(suggestions.length <= 6);
  assert.equal(suggestions.filter(s => s.kind === 'author').length, 1);
  const author = suggestions.find(s => s.kind === 'author');
  assert.equal(author.count, 3);
  assert.ok(suggestions.some(s => s.kind === 'work' && s.id === 1));
  assert.equal(new Set(suggestions.map(s => s.kind + ':' + (s.id ?? s.label))).size, suggestions.length);
});

test('prefixos de título são preferidos a menções parciais', () => {
  const f = fixture();
  const suggestions = f.ctx.buildCatalogSuggestions('memoria', books);
  assert.deepEqual(Array.from(suggestions.filter(s => s.kind === 'work').map(s => s.id)), [2, 3]);
});

test('digitar abre sugestões sem mudar de tela e filtra imediatamente no explorador', () => {
  const f = fixture();
  f.element('globalSearchInput').value = 'silva';
  f.ctx.onCatalogSearchInput();
  assert.equal(f.views.length, 0);
  assert.equal(f.element('catalogSuggestions').hidden, false);
  assert.equal(f.element('globalSearchInput').attrs['aria-expanded'], 'true');
  assert.match(f.element('catalogSuggestions').innerHTML, /Obras/);
  assert.match(f.element('catalogSuggestions').innerHTML, /Autores/);
  assert.equal(f.renders, 0);
  f.ctx.currentView = 'explorer';
  f.ctx.onCatalogSearchInput();
  assert.equal(f.renders, 1);
});

test('teclado percorre as sugestões e Escape fecha sem apagar a busca', () => {
  const f = fixture();
  f.element('globalSearchInput').value = 'mem';
  f.ctx.onCatalogSearchInput();
  const input = f.element('globalSearchInput');
  const down = { key: 'ArrowDown', preventDefault() { this.prevented = true; } };
  f.ctx.handleCatalogSearchKeydown(down);
  assert.equal(input.attrs['aria-activedescendant'], 'catalogSuggestion0');
  assert.equal(down.prevented, true);
  const esc = { key: 'Escape', preventDefault() { this.prevented = true; }, stopPropagation() {} };
  f.ctx.handleCatalogSearchKeydown(esc);
  assert.equal(f.element('catalogSuggestions').hidden, true);
  assert.equal(input.value, 'mem');
  assert.equal(input.attrs['aria-expanded'], 'false');
});

test('escolha de obra abre ficha; escolha de autor mostra apenas a autoria selecionada', () => {
  const f = fixture();
  f.element('globalSearchInput').value = 'silva';
  f.ctx.onCatalogSearchInput();
  const state = vm.runInContext('catalogSearchState', f.ctx);
  const workIndex = state.suggestions.findIndex(s => s.kind === 'work');
  f.ctx.selectCatalogSuggestion(workIndex);
  assert.equal(f.opened.length, 1);
  f.ctx.onCatalogSearchInput();
  const authorIndex = state.suggestions.findIndex(s => s.kind === 'author');
  f.ctx.selectCatalogSuggestion(authorIndex);
  assert.equal(state.author, 'SILVA, Ana');
  assert.equal(f.views.at(-1), 'explorer');
  assert.equal(f.element('globalSearchInput').value, 'SILVA, Ana');
});

test('filtros restringem as sugestões e consulta vazia respeita filtros ativos', () => {
  const f = fixture([books[2]]);
  f.element('globalSearchInput').value = 'silva';
  f.ctx.onCatalogSearchInput();
  assert.equal(vm.runInContext('catalogSearchState.suggestions.length', f.ctx), 0);
  f.element('globalSearchInput').value = '';
  f.ctx.submitCatalogSearch();
  assert.equal(f.views.at(-1), 'dashboard');
  f.ctx.selectedSubareas.add('História');
  f.ctx.submitCatalogSearch();
  assert.equal(f.views.at(-1), 'explorer');
});

test('há apenas uma busca de catálogo e ela está acessível no celular', () => {
  assert.equal((html.match(/id="globalSearchInput"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="explorerSearchInput"|id="heroSearchInput"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /role="listbox"/);
  assert.match(mobileCss, /\.header-center \{ display:block; order:3/);
});
