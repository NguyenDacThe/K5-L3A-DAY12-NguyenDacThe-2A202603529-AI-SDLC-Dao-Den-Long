import { mkdir, copyFile, readdir } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true }); await mkdir('dist/node_modules/three/build', { recursive: true });
for (const f of ['index.html', 'style.css', 'style-v11.css', 'game.contract.json', ...(await readdir('src')).filter(f => f.endsWith('.mjs') && !['headless.mjs', 'validation.mjs'].includes(f)).map(f => `src/${f}`), 'node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js']) await copyFile(f, `dist/${f}`);
await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
console.log('Static web build: dist/');
