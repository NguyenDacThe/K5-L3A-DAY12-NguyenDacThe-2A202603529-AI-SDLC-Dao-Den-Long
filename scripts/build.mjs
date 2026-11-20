import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'dist');
// Only remove the fixed build directory inside this checkout, including on Windows.
if (relative(root, output) !== 'dist') throw new Error('Unsafe build output path');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
await mkdir(resolve(output, 'vendor/three'), { recursive: true });
for (const file of ['index.html', 'style.css', 'style-v11.css', 'game.contract.json', ...(await readdir(resolve(root, 'src'))).filter(f => f.endsWith('.mjs') && !['headless.mjs', 'validation.mjs'].includes(f)).map(f => `src/${f}`)]) {
  await copyFile(resolve(root, file), resolve(output, file));
}
for (const file of ['three.module.js', 'three.core.js']) {
  await copyFile(resolve(root, 'node_modules/three/build', file), resolve(output, 'vendor/three', file));
}
await copyFile(resolve(root, 'node_modules/three/LICENSE'), resolve(output, 'THREE-LICENSE.txt'));
console.log('Static web build: dist/');
