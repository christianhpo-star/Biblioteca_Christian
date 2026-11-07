/**
 * Verificação obrigatória da prévia pública: o artefato só pode conter a demo
 * sintética. Este script não acessa credenciais, banco, Firebase ou rede.
 * Ajusta os caminhos do manifesto para o subdiretório do GitHub Pages.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const demo = await readJson('data/demo.json');
const config = await readJson('config/tablet-preview.json');
const runtime = await readFile('dist/runtime.js', 'utf8');

assert.equal(config.mode, 'local');
assert.equal(config.storageKey, 'BIBLIOTECA_TABLET_E0_PUBLIC_DEMO_V1');
assert.equal(Object.keys(config).sort().join(','), 'mode,storageKey');
assert.equal(demo.obras.length, 3, 'A demo aprovada precisa ter somente três obras fictícias');
assert.equal(Object.keys(demo.fichamentos).length, 0);
assert.ok(demo.obras.every(work =>
    Number.isInteger(work.id) &&
    String(work.autor || '').startsWith('EXEMPLO, ') &&
    work.formato === 'fisico' &&
    !work.uri && !work.drive_url && !work.link &&
    !work.adicionadoEm && !work.catalogManual
), 'Não publicar catálogos, links, arquivos nem fichamentos reais');

const sandbox = { window: {} };
vm.runInNewContext(runtime, sandbox, { timeout: 1000 });
assert.equal(JSON.stringify(sandbox.window.LIBRARY_CONFIG), JSON.stringify(config));
assert.equal(JSON.stringify(sandbox.window.LIBRARY_DATA), JSON.stringify(demo));
assert.equal(sandbox.window.LIBRARY_CONFIG.mode, 'local', 'Firebase não pode entrar na demo');
assert.ok(!existsSync('dist/cloud.js'), 'Bundle de acesso ao Firebase é proibido na demo');

const manifest = await readJson('dist/manifest.webmanifest');
manifest.id = './';
manifest.start_url = './';
manifest.scope = './';
manifest.icons = (manifest.icons || []).map(icon => ({
    ...icon, src: './' + String(icon.src || '').replace(/^\/+/, '')
}));
await writeFile('dist/manifest.webmanifest', JSON.stringify(manifest));

let html = await readFile('dist/index.html', 'utf8');
assert.ok(html.includes('id="pdfPrototype"'), 'O experimento E0 deve estar incluído');
assert.ok(html.includes('id="dashboardHomeBooks"'), 'O dashboard das PRs anteriores deve existir');
const banner = [
    '<section class="tablet-preview-banner" role="note" aria-label="Aviso de ambiente de testes">',
    '<strong>Ambiente público de testes — dados fictícios.</strong> ',
    'Não registre informações pessoais. PDFs escolhidos no dispositivo não são enviados pelo protótipo. ',
    '<button type="button" onclick="openPdfPrototype()">Abrir teste de PDF e S Pen</button>',
    '</section>'
].join('');
const css = [
    '<style>',
    '.tablet-preview-banner{margin:0 0 16px;padding:12px 15px;border:1px solid #93c5fd;',
    'border-radius:10px;background:#eff6ff;color:#1e3a8a;line-height:1.5;font-size:13px}',
    '.tablet-preview-banner button{margin:7px 0 0 8px;background:#1d4ed8;color:white;',
    'border:0;border-radius:8px;padding:10px 12px;min-height:44px;cursor:pointer;font-weight:700}',
    '.tablet-preview-banner button:focus-visible{outline:3px solid #1e40af;outline-offset:3px}',
    '@media(max-width:600px){.tablet-preview-banner button{display:block;margin:10px 0 0;width:100%}}',
    '</style>'
].join('');
assert.ok(html.includes('<div class="dashboard-hero">'));
html = html.replace('</head>', '<link rel="manifest" href="./manifest.webmanifest">\n' + css + '\n</head>');
html = html.replace('<div class="dashboard-hero">', banner + '\n<div class="dashboard-hero">');
await writeFile('dist/index.html', html);
await writeFile('dist/.nojekyll', '');

console.log('Public preview PASS: somente 3 obras fictícias, sem Firebase/Drive, caminhos relativos e aviso de teste.');
