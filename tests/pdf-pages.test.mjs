import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/reading/pdf-pages.js', import.meta.url), 'utf8');
// Apenas o import ESM e substituido pela biblioteca falsa: gestos e DOM usam fonte real.
const patched = source.replace(
    "import(new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href)",
    "Promise.resolve(window.mockPdfjs)"
);
assert.notEqual(patched, source, 'Import testavel deve manter o mesmo caminho em producao');

function fixture() {
    const nodes = new Map(), requests = [], status = {destroyed:0, rendered:0};
    function element(tag, id = '') {
        const attrs = {}, listeners = {}, attrsClass = new Set(), children = [];
        const node = {
            tag, id, attrs, listeners, children, style:{}, dataset:{}, hidden:false,
            textContent:'', scrollTop:0, scrollLeft:0, clientWidth:800, clientHeight:600,
            classList: {add(v){attrsClass.add(v);}, remove(v){attrsClass.delete(v);},
                contains(v){return attrsClass.has(v);}},
            setAttribute(name, value) {attrs[name] = String(value);},
            append(...items) {items.forEach(item => {item.parent=this;children.push(item);});},
            replaceChildren(...items) {
                this.children.length = 0; this.append(...items);
            },
            addEventListener(name, handler) {listeners[name] = handler;},
            remove() {
                if (!this.parent) return;
                const index=this.parent.children.indexOf(this);
                if (index>=0) this.parent.children.splice(index,1);
            },
            setPointerCapture() {},
            getBoundingClientRect() {
                if (id === 'pdfPrototypePages') return {left:0,top:0,bottom:600,width:800,height:600};
                if (tag === 'svg') return {left:20,top:30,width:760,height:970};
                return {left:10,top:this.dataset.page==='2'?1050:20,bottom:1000,width:760,height:970};
            },
            getContext() {return {clearRect(){}};}
        };
        return node;
    }
    function get(id) {
        if (!nodes.has(id)) nodes.set(id, element('div', id));
        return nodes.get(id);
    }
    for(const id of ['pdfInkPen','pdfInkHighlight','pdfInkErase','pdfInkUndo',
        'pdfInkClear','pdfZoomIn','pdfZoomOut','pdfZoomLabel','pdfPageIndicator',
        'pdfPrototypePages','pdfPrototypeEmpty','pdfPrototypeTools',
        'pdfPrototypeStatus','pdfPrototypeMouse']) get(id);
    const doc = {
        baseURI:'https://example.org/Biblioteca_Christian/',
        getElementById:get, createElement:tag=>element(tag),
        createElementNS:(_,tag)=>element(tag)
    };
    const fakePdf = {
        numPages:2,
        async getPage() {
            return {
                getViewport({scale}) {return {width:400*scale,height:510*scale};},
                render() {
                    status.rendered++;
                    return {promise:Promise.resolve(),cancel(){}};
                }
            };
        }
    };
    const fakeLib = {
        GlobalWorkerOptions:{workerSrc:''},
        getDocument() {
            return {promise:Promise.resolve(fakePdf),
                async destroy(){status.destroyed++;}};
        }
    };
    const win = {devicePixelRatio:1, mockPdfjs:fakeLib, confirm:()=>true,
        addEventListener(name,cb){requests.push({name,cb});}};
    class Observer {
        constructor(callback){this.callback=callback;}
        observe(target){if(target.dataset.page==='1') this.callback([{isIntersecting:true,target}]);}
        disconnect() {}
    }
    const ctx = vm.createContext({window:win,document:doc,URL,
        IntersectionObserver:Observer,console});
    vm.runInContext(patched,ctx);
    const viewer = win.PdfPagePrototype;
    const file = {size:1024, async arrayBuffer(){return new Uint8Array(64).buffer;}};
    function pageInk(index=0){
        return get('pdfPrototypePages').children[index].children[0].children[1];
    }
    function pointer(svg,event,pointerId,pointerType,x,y) {
        svg.listeners[event]({
            pointerId,pointerType,clientX:x,clientY:y,pressure:0.5,
            preventDefault(){}
        });
    }
    return {viewer,get,file,win,fakeLib,status,pageInk,pointer};
}

test('PDF sintético renderiza duas páginas internas e usa worker da mesma origem',async()=>{
    const f=fixture();
    await f.viewer.load(f.file);
    assert.equal(f.get('pdfPrototypePages').children.length,2);
    assert.equal(f.get('pdfPrototypePages').hidden,false);
    assert.equal(f.get('pdfPrototypeTools').hidden,false);
    assert.ok(f.status.rendered>=1);
    assert.equal(f.get('pdfPrototypeFrame'),undefined); // iframe não é acessado pelo renderer
    assert.equal(f.fakeLib.GlobalWorkerOptions.workerSrc,
        'https://example.org/Biblioteca_Christian/vendor/pdfjs/pdf.worker.min.mjs');
    assert.match(f.get('pdfPrototypeStatus').textContent,/2 páginas/);
    f.viewer.destroy();
    assert.equal(f.get('pdfPrototypePages').hidden,true);
    assert.equal(f.get('pdfPrototypePages').children.length,0);
    assert.ok(f.status.destroyed>=1);
});

test('caneta desenha na página; dedo não cria riscos e controla a rolagem',async()=>{
    const f=fixture();
    await f.viewer.load(f.file);
    const svg=f.pageInk();
    f.pointer(svg,'pointerdown',21,'pen',35,45);
    f.pointer(svg,'pointermove',21,'pen',110,90);
    f.pointer(svg,'pointerup',21,'pen',110,90);
    assert.equal(svg.children.length,1);
    f.pointer(svg,'pointerdown',22,'touch',35,75);
    f.pointer(svg,'pointermove',22,'touch',35,40);
    f.pointer(svg,'pointerup',22,'touch',35,40);
    assert.equal(svg.children.length,1);
    assert.ok(f.get('pdfPrototypePages').scrollTop>0);
    f.get('pdfZoomIn').listeners.click();
    assert.equal(f.get('pdfZoomLabel').textContent,'120%');
    assert.equal(svg.children.length,1);
    f.get('pdfInkUndo').listeners.click();
    assert.equal(svg.children.length,0);
    f.viewer.destroy();
});

test('caneta cancelada não salva traço; marca-texto, borracha e limpeza são temporários',async()=>{
    const f=fixture();
    await f.viewer.load(f.file);
    const svg=f.pageInk();
    f.pointer(svg,'pointerdown',30,'pen',45,55);
    f.pointer(svg,'pointermove',30,'pen',100,100);
    f.pointer(svg,'pointercancel',30,'pen',100,100);
    assert.equal(svg.children.length,0);
    f.get('pdfInkHighlight').listeners.click();
    assert.equal(f.get('pdfInkHighlight').attrs['aria-pressed'],'true');
    f.pointer(svg,'pointerdown',31,'pen',55,65);
    f.pointer(svg,'pointermove',31,'pen',100,95);
    f.pointer(svg,'pointerup',31,'pen',100,95);
    assert.equal(svg.children.length,1);
    assert.equal(svg.children[0].attrs.stroke,'#facc15');
    f.get('pdfInkClear').listeners.click();
    assert.equal(svg.children.length,0);
    f.get('pdfInkUndo').listeners.click();
    assert.equal(svg.children.length,1);
    f.viewer.destroy();
});

test('PDFs muito grandes e versão sem estado persistente recebem restrições explícitas',async()=>{
    const f=fixture();
    await assert.rejects(f.viewer.load({size:52*1024*1024}),/50 MB/);
    assert.doesNotMatch(source,/localStorage|saveAppState|indexedDB|XMLHttpRequest|fetch\s*\(/);
});
