import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/reading/ink-shapes.js',import.meta.url),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(source,context);
const {transform}=context.window.PdfInkGeometry;

const interpolate=(start,end,steps=20)=>Array.from({length:steps},(_,i)=>({
    x:start.x+(end.x-start.x)*i/(steps-1),
    y:start.y+(end.y-start.y)*i/(steps-1)
}));
const rectangle=(x,y,w,h)=>[
    ...interpolate({x,y},{x:x+w,y},25),
    ...interpolate({x:x+w,y},{x:x+w,y:y+h},25),
    ...interpolate({x:x+w,y:y+h},{x,y:y+h},25),
    ...interpolate({x,y:y+h},{x,y},25)
];
const ellipse=(cx,cy,rx,ry)=>Array.from({length:81},(_,i)=>({
    x:cx+rx*Math.cos(2*Math.PI*i/80),
    y:cy+ry*Math.sin(2*Math.PI*i/80)
}));

test('modo Reta transforma rabisco ondulado na ligação exata entre extremidades',()=>{
    const points=[{x:10,y:20},{x:35,y:29},{x:60,y:26},{x:92,y:44}];
    const g=transform(points,'line');
    assert.equal(g.kind,'line');
    assert.equal(g.d,'M10.00 20.00 L92.00 44.00');
    assert.equal(g.points.length,2);
});

test('modo Auto endireita linha quase reta e preserva rabisco ambíguo',()=>{
    const line=Array.from({length:17},(_,i)=>({x:15+i*12,y:100+i*0.65+Math.sin(i)*2}));
    const straight=transform(line,'auto');
    assert.equal(straight.kind,'line');
    assert.equal(straight.points.length,2);
    const zigzag=[{x:5,y:5},{x:90,y:110},{x:5,y:110},{x:100,y:5}];
    const unclear=transform(zigzag,'auto');
    assert.equal(unclear.kind,'freehand');
    assert.equal(unclear.points.length,4);
});

test('modo Auto reconhece retângulo fechado e cria contorno apagável',()=>{
    const g=transform(rectangle(20,30,160,100),'auto');
    assert.equal(g.kind,'rect');
    assert.match(g.d,/M20\.00 30\.00 L180\.00 30\.00/);
    assert.ok(g.d.endsWith(' Z'));
    assert.equal(g.points.length,5);
    assert.deepEqual(JSON.parse(JSON.stringify(g.points[0])),
        JSON.parse(JSON.stringify(g.points.at(-1))));
});

test('modo Auto reconhece elipse fechada sem confundir com retângulo',()=>{
    const g=transform(ellipse(120,160,80,50),'auto');
    assert.equal(g.kind,'ellipse');
    assert.match(g.d,/ A80\.00 50\.00 /);
    assert.ok(g.points.length>=25);
    assert.ok(g.d.endsWith(' Z'));
});

test('opções explícitas criam retângulo, elipse e triângulo até de gesto irregular',()=>{
    const rough=[{x:20,y:35},{x:80,y:65},{x:190,y:160}];
    const r=transform(rough,'rect'),e=transform(rough,'ellipse'),t=transform(rough,'triangle');
    assert.equal(r.kind,'rect');
    assert.equal(e.kind,'ellipse');
    assert.equal(t.kind,'triangle');
    assert.ok([r,e,t].every(g=>g.d.endsWith(' Z')));
    assert.equal(t.points.length,4);
});

test('sem ferramenta de formas, gesto livre não é corrigido; entrada inválida não é inserida',()=>{
    const points=[{x:0,y:0},{x:50,y:30},{x:100,y:0}];
    const free=transform(points,'freehand');
    assert.equal(free.kind,'freehand');
    assert.equal(free.points.length,3);
    assert.equal(transform([{x:NaN,y:0},{x:2,y:3}],'auto').kind,'freehand');
    assert.equal(transform([],'auto').d,'');
});

test('geometria não usa rede, salvamento nem dados da biblioteca',()=>{
    assert.doesNotMatch(source,/fetch\s*\(|localStorage|IndexedDB|indexedDB|saveAppState/);
});
