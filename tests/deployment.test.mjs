import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';

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
    const html = await fetch(base); assert.equal(html.status, 200); assert.match(html.headers.get('content-type'), /text\/html/);
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
