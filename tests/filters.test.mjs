import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/catalog/explorer.js', import.meta.url), 'utf8');
const filterFunctions = source.slice(0, source.indexOf('function renderCards(obras) {'));
const html = readFileSync(new URL('../templates/index.html', import.meta.url), 'utf8');

function fixture() {
    const obras = [
        { id: 1, titulo: 'Educação e memória', autor: 'Ana', codigo: '1', subarea: 'Currículo', palavras_chave: ['escola'], paginas: 100 },
        { id: 2, titulo: 'Didática crítica', autor: 'José', codigo: '1', subarea: 'Didática', palavras_chave: ['ensino'], paginas: 90 },
        { id: 3, titulo: 'Fontes históricas', autor: 'Bruna', codigo: '2', subarea: 'História cultural', palavras_chave: ['arquivo'], paginas: 110 },
        { id: 4, titulo: 'São Paulo e educação', autor: 'Mário', codigo: '1', subarea: 'Currículo', palavras_chave: ['escola'], paginas: 120 }
    ];
    const statusById = { 1: 'lido', 2: 'lendo', 3: 'lendo', 4: 'quero_ler' };
    const nodes = new Map(), listeners = new Map();
    function makeElement(tag = 'div') {
        return {
            tag, value: '', hidden: false, textContent: '', innerHTML: '', style: {},
            className: '', children: [], attrs: {}, events: {},
            replaceChildren(...children) { this.children = children; },
            append(...children) { this.children.push(...children); },
            setAttribute(key, value) { this.attrs[key] = value; },
            addEventListener(key, handler) { this.events[key] = handler; },
            focus() { this.focused = true; }
        };
    }
    function element(id) {
        if (!nodes.has(id)) nodes.set(id, makeElement(id));
        return nodes.get(id);
    }
    const document = {
        getElementById: element,
        createElement: makeElement,
        querySelector() { return null; },
        addEventListener(key, handler) { listeners.set(key, handler); }
    };
    element('explorerFilterPanel').hidden = true;
    element('catalogSuggestions').hidden = true;
    element('filterCategorySelect').value = 'all';
    element('filterStatusSelect').value = 'all';
    element('filterSortSelect').value = 'autor_asc';
    element('filterCategorySelect').selectedOptions = [{ textContent: 'Educação' }];
    element('filterStatusSelect').selectedOptions = [{ textContent: 'Em leitura' }];
    let displayed = [];
    const context = {
        document, window: {}, currentView: 'explorer',
        selectedSubareas: new Set(), selectedTags: new Set(),
        catalogSearchState: { author: null }, updateCatalogSearchSummary() {},
        getAllWorks: () => obras, getLeitura: id => ({ status: statusById[id] }),
        renderCards: works => { displayed = works.map(w => w.id); },
        renderList() {}, renderTable() {}
    };
    vm.createContext(context);
    vm.runInContext(filterFunctions, context);
    return { context, element, get displayed() { return displayed; }, listeners };
}

test('painel permanece recolhido até solicitado e fecha com foco retornado', () => {
    const f = fixture();
    f.context.toggleExplorerFilters(true);
    assert.equal(f.element('explorerFilterPanel').hidden, false);
    assert.equal(f.element('explorerFiltersToggle').attrs['aria-expanded'], 'true');
    f.context.toggleExplorerFilters(false);
    assert.equal(f.element('explorerFilterPanel').hidden, true);
    assert.equal(f.element('explorerFiltersToggle').focused, true);
});

test('a escolha de uma segunda subárea substitui a primeira', () => {
    const f = fixture();
    f.context.renderSubareaChips();
    assert.equal(f.element('filterSubareaSelect').children.length, 4);
    f.context.onSubareaSelectChange('Currículo');
    assert.equal(f.context.selectedSubareas.size, 1);
    assert.deepEqual(f.displayed, [1, 4]);
    f.context.onSubareaSelectChange('Didática');
    assert.equal(f.context.selectedSubareas.size, 1);
    assert.deepEqual(f.displayed, [2]);
});

test('subárea, área, leitura, tags e pesquisa combinam sem união implícita', () => {
    const f = fixture();
    f.context.onSubareaSelectChange('Currículo');
    f.element('filterCategorySelect').value = '1';
    f.element('filterStatusSelect').value = 'lido';
    f.context.selectedTags.add('escola');
    f.context.filterCatalog();
    assert.deepEqual(f.displayed, [1]);
    f.element('globalSearchInput').value = 'sao';
    f.context.filterCatalog();
    assert.deepEqual(f.displayed, []);
    assert.match(f.element('resultsCount').textContent, /Nenhuma obra/);
    f.element('filterStatusSelect').value = 'all';
    f.context.filterCatalog();
    assert.deepEqual(f.displayed, [4]); // busca sem acento
});

test('seleção de autor nas sugestões não encontra autores citados apenas no resumo', () => {
    const f = fixture();
    f.context.catalogSearchState.author = 'Ana';
    f.element('globalSearchInput').value = 'Ana';
    f.context.filterCatalog();
    assert.deepEqual(f.displayed, [1]);
});

test('filtros ativos possuem remoção individual e o estado vazio não apaga a escolha', () => {
    const f = fixture();
    f.context.onSubareaSelectChange('Não cadastrada');
    assert.equal(f.context.selectedSubareas.size, 1);
    assert.equal(f.displayed.length, 0);
    f.context.renderSubareaChips();
    assert.equal(f.element('filterSubareaSelect').value, 'Não cadastrada');
    const chip = f.element('activeFilterChipsList').children[0];
    chip.children[1].events.click();
    assert.equal(f.context.selectedSubareas.size, 0);
    assert.equal(f.element('activeFiltersBar').hidden, true);
    assert.equal(f.displayed.length, 4);
});

test('HTML exibe botão Filtros sem mostrar todas as subáreas e sem E/OU', () => {
    assert.match(html, /id="explorerFilterPanel"[^>]*hidden/);
    assert.match(html, /id="filterSubareaSelect"/);
    assert.match(html, /id="explorerFiltersToggle"/);
    assert.doesNotMatch(html, /id="subareasChipsContainer"|id="logicOptAnd"|id="logicOptOr"/);
});
