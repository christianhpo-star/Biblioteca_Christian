/** Assemble external scripts/styles from the manifest. Personal data never enters source. */
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {dirname, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
const readJson = async file => JSON.parse(await readFile(resolve(root, file), 'utf8'));
const config = await readJson(args.config || 'config/example.json');
if (!['local', 'firebase'].includes(config.mode) || !config.storageKey) throw Error('Configuração inválida.');
if (config.mode === 'firebase' && (!config.ownerEmail || !config.firebase?.projectId)) throw Error('Configure a conta proprietária e o projeto Firebase.');
// Local private builds embed catalog data for file:// compatibility. Never use them as public previews.
const data = config.mode === 'firebase' ? {obras: [], fichamentos: {}} : await readJson(args.catalog || 'data/demo.json');
if (!Array.isArray(data.obras) || !data.fichamentos || typeof data.fichamentos !== 'object') throw Error('Catálogo inválido.');
const manifest = await readJson('src/manifest.json');
const {build: bundle} = await import('esbuild');
const dist = resolve(root, 'dist');
await mkdir(dist, {recursive:true});
async function output(path, content) { const dest = resolve(dist, path); await mkdir(dirname(dest), {recursive:true}); await writeFile(dest, content); }
for (const path of [...manifest.scripts, ...manifest.styles]) {
  await mkdir(dirname(resolve(dist, path)), {recursive:true});
  await copyFile(resolve(root, path), resolve(dist, path));
}
// Escape '<' even though these payloads are external scripts, to retain safe embedding semantics.
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
await output('runtime.js', `window.LIBRARY_CONFIG=${json(config)};\nwindow.LIBRARY_DATA=${json(data)};\n`);
let template = await readFile(resolve(root, 'templates/index.html'), 'utf8');
await bundle({entryPoints:[resolve(root,'src/core/validation.mjs')], outfile:resolve(dist,'validation.js'), bundle:true, format:'iife'});
let scripts = ['runtime.js', 'validation.js', ...manifest.scripts];
if (config.mode === 'firebase') {
  await bundle({entryPoints:[resolve(root,'src/cloud/auth-sync.mjs')], outfile:resolve(dist,'cloud.js'), bundle:true, format:'iife', define:{__EMULATORS__:'false'}, minify:true});
  scripts.push('cloud.js');
  template = template.replace('<body>', '<body class="auth-locked">');
}
const styles = manifest.styles.map(path => `<link rel="stylesheet" href="${path}">`).join('\n');
const scriptTags = scripts.map(path => `<script src="${path}" defer></script>`).join('\n');
template = template.replace('<!-- STYLES -->', styles).replace('<!-- SCRIPTS -->', scriptTags);
await output('index.html', template);
for (const name of ['icon.svg','icon-192.png','icon-512.png','manifest.webmanifest']) await copyFile(resolve(root,'templates',name),resolve(dist,name));
// Cache the exact external resource graph. Authentication, PDFs and Firestore are never cached here.
const shell = ['./', './index.html', './runtime.js', './validation.js', ...manifest.scripts.map(p=>'./'+p), ...manifest.styles.map(p=>'./'+p), './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', ...(config.mode==='firebase'?['./cloud.js']:[])];
const sw = `const CACHE='biblioteca-modular-v1';\nconst SHELL=${JSON.stringify(shell)};\n` + (await readFile(resolve(root,'templates/sw.js'),'utf8')).replace(/^const CACHE[^\n]*\nconst SHELL[^\n]*\n/,'').replace("!SHELL.includes(url.pathname)", "!SHELL.some(path => new URL(path, self.registration.scope).pathname === url.pathname)");
await output('sw.js', sw);
console.log(`Build ${config.mode}: ${relative(root, dist)}, ${data.obras.length} obras locais; configuração ${args.config || 'demo'}.`);
