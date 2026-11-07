import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/reading/pdf-prototype.js');
const html = read('templates/index.html');
const manifest = JSON.parse(read('src/manifest.json'));

function fixture(work = null) {
    const map = new Map(), events = {}, frames = [], opened = [], closed = [], restored = [];
    const created = [], revoked = [], loaded = [];
    let lines = 0, clicks = 0;
    const ink = {
        clearRect() { lines = 0; },
        beginPath() {}, moveTo() {},
        lineTo() { lines++; }, stroke() {}, arc() {}, fill() {}
    };
    class LocalURL extends URL {
        static createObjectURL(file) {
            const url = 'blob:local-test-' + (created.length + 1);
            created.push({ url, name: file.name });
            return url;
        }
        static revokeObjectURL(url) { revoked.push(url); }
    }
    const background = [{ inert: false }, { inert: false }];
    const origin = { isConnected: true, focus() { this.focused = true; } };

    function element(id) {
        if (!map.has(id)) {
            const node = {
                id, hidden: id === 'pdfPrototype' || id === 'pdfPrototypeFrame' ||
                    id === 'pdfPrototypeExternal' || id === 'pdfPrototypeNewTab',
                value: '', textContent: '', href: '', src: '', checked: false,
                isConnected: true, children: [], attrs: {}, events: {},
                focus() { this.focused = true; },
                setAttribute(name, value) { this.attrs[name] = value; },
                removeAttribute(name) { if (name === 'src') this.src = ''; delete this.attrs[name]; },
                addEventListener(name, callback) { this.events[name] = callback; },
                querySelectorAll() { return []; },
                contains() { return false; },
                click() { clicks++; this.events.click?.(); }
            };
            if (id === 'pdfPrototype') {
                node.querySelector = () => ({ open: true });
            }
            if (id === 'pdfPrototypeCanvas') {
                node.width = 900; node.height = 230;
                node.getContext = () => ink;
                node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 230 });
                node.setPointerCapture = () => {};
            }
            if (id === 'pdfPrototypeFile') node.files = [];
            map.set(id, node);
        }
        return map.get(id);
    }
    const document = {
        getElementById: element, activeElement: origin,
        body: { style: { overflow: 'auto' } },
        querySelectorAll: () => background,
        addEventListener(name, callback) { events[name] = callback; }
    };
    const window = {
        addEventListener(name, callback) { frames.push({ name, callback }); },
        // Leitor E1 isolado no teste do ciclo de vida do seletor E0.
        PdfPagePrototype: {
            async load(file) {
                loaded.push(file.name);
                element('pdfPrototypePages').hidden = false;
                element('pdfPrototypeEmpty').hidden = true;
            },
            destroy() {
                element('pdfPrototypePages').hidden = true;
                element('pdfPrototypeEmpty').hidden = false;
            }
        }
    };
    const context = vm.createContext({
        document, window, URL: LocalURL,
        currentModalWorkId: 5,
        getObraById: id => work && Number(id) === 5 ? work : null,
        closeModal: id => closed.push(id),
        openWorkSheet: id => restored.push(id)
    });
    vm.runInContext(source, context);
    const get = element;
    const makeFile = (name, contents) => {
        const bytes = Buffer.from(contents);
        return { name, size: bytes.length,
            slice: (start, end) => ({ arrayBuffer: async () =>
                Uint8Array.from(bytes.subarray(start, end)).buffer }) };
    };
    async function pick(file) {
        get('pdfPrototypeFile').files = [file];
        get('pdfPrototypeFile').events.change();
        await new Promise(resolve => setImmediate(resolve));
    }
    return { window, context, get, events, frames, background, origin,
        created, revoked, loaded, opened, closed, restored, makeFile, pick,
        get drawnLines() { return lines; },
        get filePickerClicks() { return clicks; } };
}

test('abre a tela local isolada e fecha restaurando o foco e o scroll', () => {
    const f = fixture();
    f.window.openPdfPrototype();
    assert.equal(f.get('pdfPrototype').hidden, false);
    assert.ok(f.background.every(item => item.inert));
    assert.equal(f.get('pdfPrototypeExternal').hidden, true);
    assert.equal(f.get('pdfPrototypeFrame').hidden, true);
    assert.equal(f.context.document.body.style.overflow, 'hidden');
    f.get('pdfPrototypePick').events.click();
    assert.equal(f.filePickerClicks, 1);
    f.get('pdfPrototypeClose').events.click();
    assert.equal(f.get('pdfPrototype').hidden, true);
    assert.ok(f.background.every(item => !item.inert));
    assert.equal(f.context.document.body.style.overflow, 'auto');
    assert.equal(f.origin.focused, true);
});

test('o vínculo remoto fica apenas como alternativa externa, nunca iframe automático', () => {
    const f = fixture({ id: 5, titulo: 'Estudo local', uri: 'https://drive.google.com/file/d/sintetico' });
    f.window.openPdfPrototypeFromModal();
    assert.deepEqual(f.closed, ['modalWorkSheet']);
    assert.equal(f.get('pdfPrototypeExternal').hidden, false);
    assert.match(f.get('pdfPrototypeExternal').href, /^https:\/\/drive\.google\.com\//);
    assert.equal(f.get('pdfPrototypeFrame').src, '');
    assert.equal(f.created.length, 0);
    f.get('pdfPrototypeClose').events.click();
    assert.deepEqual(f.restored, [5]);
});

test('link javascript não vira origem navegável', () => {
    const f = fixture({ id: 5, titulo: 'Obra teste', uri: 'javascript:alert(1)' });
    f.window.openPdfPrototype(5);
    assert.equal(f.get('pdfPrototypeExternal').hidden, true);
    assert.equal(f.get('pdfPrototypeFrame').src, '');
});

test('PDF local com assinatura válida usa URL temporária e revoga ao fechar', async () => {
    const f = fixture();
    f.window.openPdfPrototype();
    await f.pick(f.makeFile('exemplo.pdf', '%PDF-1.7\nconteudo sintetico'));
    assert.equal(f.created.length, 1);
    assert.equal(f.get('pdfPrototypeFrame').src, '');
    assert.equal(f.get('pdfPrototypeFrame').hidden, true);
    assert.equal(f.get('pdfPrototypePages').hidden, false);
    assert.deepEqual(f.loaded, ['exemplo.pdf']);
    assert.equal(f.get('pdfPrototypeNewTab').hidden, false);
    f.get('pdfPrototypeClose').events.click();
    assert.deepEqual(f.revoked, [f.created[0].url]);
    assert.equal(f.get('pdfPrototypeFrame').src, '');
    assert.equal(f.get('pdfPrototypePages').hidden, true);
    assert.equal(f.get('pdfPrototypeNewTab').hidden, true);
});

test('rejeita arquivos vazios e arquivos que não tenham assinatura PDF', async () => {
    const f = fixture();
    f.window.openPdfPrototype();
    await f.pick(f.makeFile('vazio.pdf', ''));
    assert.match(f.get('pdfPrototypeStatus').textContent, /Arquivo vazio/);
    await f.pick(f.makeFile('falso.pdf', 'NÃO É PDF'));
    assert.match(f.get('pdfPrototypeStatus').textContent, /nao parece ser um PDF/);
    assert.equal(f.created.length, 0);
    assert.equal(f.get('pdfPrototypeFrame').hidden, true);
});

test('substituir arquivo revoga o blob anterior, sem persistir conteúdo', async () => {
    const f = fixture();
    f.window.openPdfPrototype();
    await f.pick(f.makeFile('um.pdf', '%PDF-1.4\nprimeiro'));
    await f.pick(f.makeFile('dois.pdf', '%PDF-1.4\nsegundo'));
    assert.equal(f.created.length, 2);
    assert.deepEqual(f.revoked, [f.created[0].url]);
    assert.equal(f.get('pdfPrototypeNewTab').href, f.created[1].url);
});

test('arquivo inválido após PDF anterior limpa a visualização sem engano', async () => {
    const f = fixture();
    f.window.openPdfPrototype();
    await f.pick(f.makeFile('bom.pdf', '%PDF-1.5\narquivo'));
    assert.equal(f.created.length, 1);
    await f.pick(f.makeFile('ruim.pdf', 'não é um PDF'));
    assert.equal(f.get('pdfPrototypeFrame').hidden, true);
    assert.equal(f.get('pdfPrototypeNewTab').hidden, true);
    assert.deepEqual(f.revoked, [f.created[0].url]);
    assert.match(f.get('pdfPrototypeStatus').textContent, /nao parece ser um PDF/);
});

test('S Pen desenha no diagnóstico, toque não desenha e cancelamento é registrado', () => {
    const f = fixture();
    f.window.openPdfPrototype();
    const canvas = f.get('pdfPrototypeCanvas');
    const point = { clientX: 20, clientY: 30, pressure: 0.5, preventDefault() {} };
    canvas.events.pointerdown({ ...point, pointerType: 'touch', pointerId: 1 });
    canvas.events.pointermove({ ...point, pointerType: 'touch', pointerId: 1 });
    assert.equal(f.drawnLines, 0);
    assert.match(f.get('pdfPrototypePenStatus').textContent, /Dedo\/toque: 1/);
    canvas.events.pointerdown({ ...point, pointerType: 'pen', pointerId: 2 });
    canvas.events.pointermove({ ...point, clientX: 55, pointerType: 'pen', pointerId: 2 });
    assert.ok(f.drawnLines > 0);
    canvas.events.pointercancel({ ...point, pointerType: 'pen', pointerId: 2 });
    assert.match(f.get('pdfPrototypePenStatus').textContent, /Cancelamentos: 1/);
    canvas.events.pointerdown({ ...point, pointerType: 'mouse', pointerId: 3 });
    const before = f.drawnLines;
    canvas.events.pointermove({ ...point, pointerType: 'mouse', pointerId: 3 });
    assert.equal(f.drawnLines, before);
    f.get('pdfPrototypeClear').events.click();
    assert.match(f.get('pdfPrototypePenStatus').textContent, /Sem contato detectado/);
});

test('Escape fecha o experimento; arquivos e traços não entram em estado ou rede', () => {
    const f = fixture();
    f.window.openPdfPrototype();
    const event = { key: 'Escape', preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; } };
    f.events.keydown(event);
    assert.equal(f.get('pdfPrototype').hidden, true);
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
    assert.doesNotMatch(source, /localStorage|saveAppState|fetch\s*\(|XMLHttpRequest|indexedDB/);
});

test('HTML e manifesto registram módulo e CSS sem alterar o leitor principal', () => {
    assert.match(html, /id="pdfPrototypeFrame"/);
    assert.match(html, /id="pdfPrototypePages"/);
    assert.match(html, /id="pdfInkPen"/);
    assert.match(html, /id="pdfPrototypeCanvas"/);
    assert.match(html, /id="modalPdfPrototypeBtn"/);
    assert.match(html, /Nenhum arquivo será enviado/);
    assert.match(html, /id="pdfInkShape"/);
    assert.match(html, /id="pdfInkRedo"/);
    assert.match(html, /id="pdfReaderMenu"/);
    assert.ok(manifest.scripts.includes('src/reading/pdf-prototype.js'));
    assert.ok(manifest.scripts.includes('src/reading/pdf-pages.js'));
    assert.ok(manifest.styles.includes('styles/pdf-prototype.css'));
    assert.match(html, /id="modalOpenPdfBtn"/);
});
