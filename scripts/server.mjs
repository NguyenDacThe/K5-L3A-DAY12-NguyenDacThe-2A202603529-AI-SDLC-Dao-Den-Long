import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const built = process.argv.includes('--dist');
const root = resolve(import.meta.dirname, '..', ...(built ? ['dist'] : []));
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.split('/').some(part => part === '..' || part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const vendor = /^\/vendor\/three\/(three\.module\.js|three\.core\.js)$/.exec(path);
    const allowed = path === '/' || path === '/index.html' || path === '/style.css' || path === '/style-v11.css' || path === '/game.contract.json' || path === '/THREE-LICENSE.txt' || path.startsWith('/src/') || !!vendor;
    const file = !built && vendor ? resolve(root, 'node_modules/three/build', vendor[1]) : resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!allowed || !file.startsWith(root + sep) || !(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${server.address().port}`));
