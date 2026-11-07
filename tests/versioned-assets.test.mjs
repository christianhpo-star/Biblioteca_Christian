import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const html = read('dist/index.html').toString('utf8');
const sw = read('dist/sw.js').toString('utf8');
const manifest = JSON.parse(read('src/manifest.json').toString('utf8'));

function versionedPath(path) {
  const digest = createHash('sha256').update(read(path)).digest('hex').slice(0, 12);
  return path.replace(/(\.[^./]+)$/, '.' + digest + '$1');
}

test('o leitor usa scripts com nomes versionados, não reutiliza o script E0 anterior', () => {
  for (const file of ['src/reading/pdf-prototype.js', 'src/reading/pdf-pages.js']) {
    const versioned = versionedPath(file);
    assert.match(versioned, /\.[a-f0-9]{12}\.js$/);
    assert.ok(html.includes('src="' + versioned + '"'), 'HTML precisa referenciar ' + versioned);
    assert.ok(existsSync(resolve('dist', versioned)), versioned + ' precisa existir no artefato');
    assert.ok(!existsSync(resolve('dist', file)), 'A versão sem hash não deve ser publicada: ' + file);
    assert.ok(sw.includes('./' + versioned), 'O cache offline deve referenciar ' + versioned);
  }
  const js = read('src/reading/pdf-prototype.js').toString('utf8');
  assert.ok(js.includes('window.PdfPagePrototype.load(file)'));
  assert.doesNotMatch(js, /frame\.src\s*=\s*blobUrl/);
});

test('todos os módulos JS e CSS do app são versionados por conteúdo', () => {
  for (const file of [...manifest.scripts, ...manifest.styles]) {
    const versioned = versionedPath(file);
    const attribute = file.endsWith('.css') ? 'href="' : 'src="';
    assert.ok(html.includes(attribute + versioned + '"'), versioned + ' não está no HTML');
    assert.ok(existsSync(resolve('dist', versioned)), versioned + ' não foi compilado');
    assert.ok(!existsSync(resolve('dist', file)), file + ' sem hash não pode vazar para o dist');
  }
});

test('SW usa cache renovado, com os caminhos exatos das versões', () => {
  assert.ok(sw.includes("biblioteca-records-v4-hashed-assets"));
  assert.ok(sw.includes('./' + versionedPath('src/reading/pdf-prototype.js')));
  assert.ok(sw.includes('./' + versionedPath('styles/pdf-prototype.css')));
});
