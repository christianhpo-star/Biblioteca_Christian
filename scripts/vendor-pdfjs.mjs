/**
 * Copia o build oficial precompilado PDF.js para o site, sem incluir os PDFs do usuario.
 * O navegador recebe apenas arquivos estaticos da mesma origem, sem CDN externo.
 * O tarball e armazenado no cache ignorado pelo Git para builds repetidos.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {copyFile, mkdir, mkdtemp, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const exec = promisify(execFile);
export const PDFJS_VERSION = '6.5.438';
const archiveName = 'pdfjs-dist-' + PDFJS_VERSION + '.tgz';
const filenames = ['pdf.min.mjs', 'pdf.worker.min.mjs'];

export async function preparePdfJsAssets(root, dist) {
    const cache = resolve(root, 'node_modules', '.cache', 'biblioteca-pdfjs');
    const archive = join(cache, archiveName);
    const dest = resolve(dist, 'vendor', 'pdfjs');
    await mkdir(cache, {recursive: true});
    await mkdir(dest, {recursive: true});

    try {
        await stat(archive);
    } catch {
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const {stdout} = await exec(npm, [
            'pack', 'pdfjs-dist@' + PDFJS_VERSION, '--pack-destination', cache,
            '--ignore-scripts', '--json'
        ], {cwd: root, maxBuffer: 2 * 1024 * 1024});
        const packages = JSON.parse(stdout);
        if (!Array.isArray(packages) || packages[0]?.name !== 'pdfjs-dist' ||
            packages[0]?.version !== PDFJS_VERSION) {
            throw new Error('Versao do PDF.js diferente da fixada no projeto.');
        }
    }

    const tmp = await mkdtemp(join(tmpdir(), 'biblioteca-pdfjs-'));
    try {
        const extracted = filenames.map(file => 'package/build/' + file);
        extracted.push('package/LICENSE');
        await exec('tar', ['-xzf', archive, '-C', tmp, ...extracted], {
            cwd: root, maxBuffer: 1024 * 1024
        });
        for (const file of filenames) {
            await copyFile(join(tmp, 'package', 'build', file), join(dest, file));
        }
        await copyFile(join(tmp, 'package', 'LICENSE'), join(dest, 'LICENSE'));
    } finally {
        await rm(tmp, {recursive:true, force:true});
    }
    return filenames.map(file => 'vendor/pdfjs/' + file);
}
