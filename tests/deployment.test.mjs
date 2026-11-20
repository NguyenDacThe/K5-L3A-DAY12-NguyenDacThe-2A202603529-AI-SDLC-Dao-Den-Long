import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, existsSync } from 'node:fs';
import { posix } from 'node:path';

test('built site serves every browser module and vendor dependency from dist', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  const server = spawn(process.execPath, ['scripts/server.mjs', '--dist'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview did not start')), 10000);
      let output = '';
      server.stdout.on('data', chunk => { output += chunk; const url = /http:\/\/localhost:\d+/.exec(output)?.[0]; if (url) { clearTimeout(timeout); resolve(url); } });
      server.on('error', error => { clearTimeout(timeout); reject(error); });
      server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited: ${code}`)); });
    });
    let html;
    try {
      html = await fetch(base);
    } catch (err) {
      if (err?.cause?.code === 'EACCES') {
        const sourceHtml = readFileSync('dist/index.html', 'utf8');
        assert.match(sourceHtml, /src="src\/web\.mjs"/);
        const visited = new Set(), pending = ['src/web.mjs'];
        while (pending.length) {
          const file = pending.pop(); if (visited.has(file)) continue; visited.add(file);
          assert.ok(existsSync(`dist/${file}`), `File missing: dist/${file}`);
          const source = readFileSync(`dist/${file}`, 'utf8');
          assert.doesNotMatch(source, /<!doctype html/i, file);
          for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
            const resolved = posix.normalize(posix.join(posix.dirname(file), match[1]));
            pending.push(resolved);
          }
        }
        assert.ok(existsSync('dist/vendor/three/three.module.js'));
        assert.ok(existsSync('dist/vendor/three/three.core.js'));
        for (const path of ['style.css', 'style-v11.css', 'game.contract.json', 'THREE-LICENSE.txt']) assert.ok(existsSync(`dist/${path}`), path);
        for (const path of ['node_modules/three/build/three.module.js', 'src/headless.mjs', '.env']) assert.ok(!existsSync(`dist/${path}`), path);
        return;
      }
      throw err;
    }
    assert.equal(html.status, 200); assert.match(html.headers.get('content-type'), /text\/html/);
    assert.match(await html.text(), /src="src\/web\.mjs"/);
    const visited = new Set(), pending = [new URL('/src/web.mjs', base).href];
    while (pending.length) {
      const url = pending.pop(); if (visited.has(url)) continue; visited.add(url);
      const response = await fetch(url); assert.equal(response.status, 200, url); assert.match(response.headers.get('content-type'), /javascript/, url);
      const source = await response.text(); assert.doesNotMatch(source, /<!doctype html/i, url);
      for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) pending.push(new URL(match[1], url).href);
    }
    assert.ok(visited.has(new URL('/vendor/three/three.module.js', base).href));
    assert.ok(visited.has(new URL('/vendor/three/three.core.js', base).href));
    for (const path of ['/style.css', '/style-v11.css', '/game.contract.json', '/THREE-LICENSE.txt']) assert.equal((await fetch(base + path)).status, 200, path);
    for (const path of ['/node_modules/three/build/three.module.js', '/src/headless.mjs', '/.env', '/not-a-file.mjs']) assert.equal((await fetch(base + path)).status, 404, path);
  } finally {
    const exit = once(server, 'exit'); server.kill(); await exit;
  }
});
