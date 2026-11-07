import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const repository = read('src/catalog/repository.js');
const dashboard = read('src/catalog/dashboard.js');
const metadata = read('src/catalog/metadata.js');
const registration = read('src/study/workspace.js');
const template = read('templates/index.html');
const recent = '2026-11-06T20:00:00.000Z';
const older = '2026-11-05T20:00:00.000Z';

const work = (id, title, adicionadoEm) => ({
    id, titulo: title, autor: 'AUTOR, Exemplo', codigo: '1', paginas: 100,
    categoria: 'Educação', formato: 'fisico', palavras_chave: [],
    ...(adicionadoEm === undefined ? {} : { adicionadoEm })
});

function context(books = [], overrides = {}) {
    const ctx = vm.createContext({
        OBRAS_BASE: books, FICHAMENTOS_BASE: {},
        appState: { metaOverrides: overrides, leituras: {}, fichamentos: {} }
    });
    vm.runInContext(repository, ctx);
    return ctx;
}
const ids = list => Array.from(list, item => item.id);

test('acervo vazio e de uma a quatro obras não inventa registros', () => {
    const empty = context();
    const first = empty.selectHomeWorks();
    assert.equal(first.total, 0);
    assert.equal(first.recent.length + first.undated.length, 0);
    for (let n = 1; n <= 4; n++) {
        const ctx = context(Array.from({ length: n }, (_, i) => work(i + 1, 'Obra ' + i)));
        const result = ctx.selectHomeWorks();
        assert.equal(result.total, n);
        assert.equal(result.undated.length, n);
        assert.equal(result.recent.length, 0);
    }
});

test('datas ISO verificadas aparecem antes de obras sem data; no máximo cinco', () => {
    const works = [
        work(10, 'Zeta'), work(11, 'Beta'), work(12, 'Alfa'),
        work(4, 'Antiga data', older), work(5, 'Nova data', recent),
        work(13, 'Gama'), work(6, 'Outra data', older)
    ];
    const ctx = context(works);
    const selected = ctx.selectHomeWorks();
    assert.equal(selected.total, 7);
    assert.deepEqual(ids(selected.recent), [5, 4, 6]);
    assert.deepEqual(ids(selected.undated), [12, 11]);
    assert.equal(selected.recent.length + selected.undated.length, 5);
    assert.deepEqual(ids(ctx.selectHomeWorks(works, 2).recent), [5, 4]);
});

test('empates têm ordenação estável por título e depois por ID', () => {
    const works = [work(8, 'Mesmo título', recent), work(2, 'Mesmo título', recent),
        work(3, 'A primeiro', recent), work(10, 'Sem data'), work(7, 'Outro sem data')];
    const ctx = context(works);
    assert.deepEqual(ids(ctx.selectHomeWorks().recent), [3, 2, 8]);
    assert.deepEqual(ids(ctx.selectHomeWorks().undated), [7, 10]);
});

test('não interpreta ID, data de leitura, edição, datas ausentes ou inválidas como inclusão', () => {
    const cases = [
        work(999999, 'Só ID'), work(1, 'Formato data', '2026-11-06'),
        work(2, 'Data inexistente', '2026-02-30T12:00:00.000Z'),
        work(3, 'Texto arbitrário', 'ontem'),
        { ...work(4, 'Leitura recente'), ultimaLeitura: recent },
        work(5, 'Mês inexistente', '2026-13-01T12:00:00Z')
    ];
    const ctx = context(cases);
    assert.equal(ctx.selectHomeWorks().recent.length, 0);
    for (const item of cases) assert.equal(ctx.getWorkAddedAtTimestamp(item), null);
});

test('obras antigas continuam ordenadas alfabeticamente, não pelo ID', () => {
    const ctx = context([work(999, 'Zebra'), work(4, 'Beta'), work(1, 'Árvore'),
        work(500, 'Alfa'), work(7, 'Café'), work(90, 'Mar')]);
    assert.deepEqual(ids(ctx.selectHomeWorks().undated), [500, 1, 4, 7, 90]);
});

test('metadados editados preservam cadastro manual, data original, formato e link', () => {
    const original = { ...work(77, 'Título original', recent), catalogManual: true,
        formato: 'ambos', uri: 'https://example.org/teste.pdf', localizacao: 'Estante' };
    const ctx = context([], { 77: original });
    const fields = { editMetaAutor: 'Autora', editMetaTitulo: 'Título editado',
        editMetaSubarea: 'Currículo', editMetaCodigo: '1', editMetaResumo: 'Texto',
        editMetaTags: 'educação, escola' };
    ctx.currentModalWorkId = 77;
    ctx.document = { getElementById: id => ({ value: fields[id] }) };
    ctx.saveAppState = () => {};
    ctx.closeModal = () => {};
    ctx.alert = () => {};
    ctx.filterCatalog = () => {};
    ctx.renderDashboard = () => {};
    ctx.renderSubareaChips = () => {};
    ctx.renderAuditCenter = () => {};
    vm.runInContext(metadata, ctx);
    ctx.saveMetadataOverrides();
    const result = ctx.appState.metaOverrides[77];
    assert.equal(result.catalogManual, true);
    assert.equal(result.adicionadoEm, recent);
    assert.equal(result.formato, 'ambos');
    assert.equal(result.uri, original.uri);
    assert.equal(ctx.getAllWorks().length, 1);
    assert.equal(ctx.getAllWorks()[0].titulo, 'Título editado');
    assert.equal(ctx.selectHomeWorks().recent.length, 1);
});

function fakeDocument() {
    const elements = new Map();
    function createElement(tag) {
        return { tag, children: [], textContent: '', className: '', attrs: {},
            addEventListener(name, callback) { this[name] = callback; },
            setAttribute(name, value) { this.attrs[name] = value; },
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; } };
    }
    function getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement(id));
        return elements.get(id);
    }
    return { createElement, getElementById };
}

test('prévia da página inicial mostra até cinco botões que abrem a ficha', () => {
    const books = [work(10, 'Décimo'), work(2, 'Segundo', older),
        work(3, 'Terceiro', recent), work(4, 'Quarto'),
        work(5, 'Quinto'), work(6, 'Sexto')];
    const ctx = context(books);
    ctx.document = fakeDocument();
    let opened;
    ctx.openWorkSheet = id => { opened = id; };
    ctx.openNewWork = () => {};
    ctx.resetAllFilters = () => {};
    ctx.switchView = () => {};
    vm.runInContext(dashboard, ctx);
    ctx.renderHomePreview();
    const groups = ctx.document.getElementById('dashboardHomeBooks').children;
    const cards = groups.flatMap(group => group.children[1].children);
    assert.equal(cards.length, 5);
    assert.equal(ctx.document.getElementById('dashboardHomeTitle').textContent, 'Últimas inclusões');
    assert.match(ctx.document.getElementById('dashboardHomeHint').textContent, /5 de 6/);
    assert.equal(cards[0].attrs['aria-label'], 'Abrir ficha: Terceiro');
    cards[0].click();
    assert.equal(opened, 3);
});

test('estados vazios e navegação ao acervo completo são explícitos', () => {
    const ctx = context([]);
    ctx.document = fakeDocument();
    let add = 0, cleared = 0;
    const views = [];
    ctx.openWorkSheet = () => {};
    ctx.openNewWork = () => { add++; };
    ctx.resetAllFilters = () => { cleared++; };
    ctx.switchView = name => views.push(name);
    vm.runInContext(dashboard, ctx);
    ctx.renderHomePreview();
    const children = ctx.document.getElementById('dashboardHomeBooks').children;
    assert.equal(children.length, 2);
    children[1].click();
    assert.equal(add, 1);
    ctx.openFullCatalogFromHome();
    ctx.returnHomeFromCatalog();
    assert.deepEqual(views, ['explorer', 'dashboard']);
    assert.equal(cleared, 2);
});

test('estrutura mantém painel avançado, retorno e cadastro novo com carimbo ISO', () => {
    assert.match(template, /id="dashboardHomeBooks"/);
    assert.match(template, /Ver todo o acervo/);
    assert.match(template, /class="dashboard-advanced"/);
    assert.match(template, /returnHomeFromCatalog\(\)/);
    assert.match(template, /id="modalWorkAddedAt"/);
    assert.match(registration, /catalogManual: true,\s*adicionadoEm: new Date\(\)\.toISOString\(\)/);
});
