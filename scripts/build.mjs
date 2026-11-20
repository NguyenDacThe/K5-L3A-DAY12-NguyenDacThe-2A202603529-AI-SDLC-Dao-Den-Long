import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true }); await mkdir('dist/node_modules/three/build', { recursive: true });
for (const f of ['index.html', 'style.css', 'game.contract.json', 'src/game.mjs', 'src/web.mjs', 'node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js']) await copyFile(f, `dist/${f}`);
await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
console.log('Static web build: dist/');
