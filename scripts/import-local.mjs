/** Read an existing catalog without editing it; write data only into the git-ignored private directory. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const source = process.argv[2];
if (!source) throw Error('Uso: npm run import:local -- "caminho/para/Catalogo_Biblioteca.html"');
const html = await readFile(resolve(source),'utf8');
const data={};
for (const [name,key] of [['OBRAS_BASE','obras'],['FICHAMENTOS_BASE','fichamentos']]) {
  const match=html.match(new RegExp(`const ${name} = (.*?);(?=\\r?\\n)`));
  if (!match) throw Error(`Base ${name} não encontrada no HTML. Use o catálogo original com dados embutidos.`);
  data[key]=JSON.parse(match[1]);
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(resolve(root,'private'),{recursive:true});
await writeFile(resolve(root,'private/catalog.json'),JSON.stringify(data,null,2));
console.log(`Catálogo importado localmente: ${data.obras.length} obras. Nenhum PDF ou armazenamento do navegador foi alterado.`);
