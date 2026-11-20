import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.split('/').some(part => part === '..' || part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const allowed = path === '/' || path === '/index.html' || path === '/style.css' || path === '/style-v11.css' || path === '/game.contract.json' || path.startsWith('/src/') || path.startsWith('/node_modules/three/build/');
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!allowed || !file.startsWith(root + sep) || !(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${server.address().port}`));
