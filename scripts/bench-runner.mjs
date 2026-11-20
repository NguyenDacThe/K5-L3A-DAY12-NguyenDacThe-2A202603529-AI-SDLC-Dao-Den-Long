import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { platform, release, cpus } from 'node:os';
const started = 0, args = process.argv.slice(2), options = {}; // performance.now() includes module loading since Node startup.
for (let i = 0; i < args.length; i += 2) { if (!['--seed', '--duration', '--out'].includes(args[i]) || args[i+1] === undefined) throw new Error('Invalid benchmark arguments'); options[args[i]] = args[i+1]; }
const seed = Number(options['--seed'] ?? 42), duration = Number(options['--duration'] ?? 30), out = options['--out'] ?? 'bench.json';
if (!Number.isSafeInteger(seed) || !Number.isFinite(duration) || duration <= 0) throw new Error('Invalid seed/duration');
let server, browser;
try {
  let base = process.env.GAME_URL;
  if (!base) {
    server = spawn(process.execPath, ['scripts/server.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
    base = await new Promise((resolve, reject) => { server.stdout.on('data', b => { const url = /http:\/\/localhost:\d+/.exec(b.toString())?.[0]; if(url) resolve(url); }); server.on('error', reject); });
  }
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: process.env.BENCH_HEADLESS === '1', args: ['--window-size=1280,720', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let loadMs = null;
  await page.exposeFunction('__reportFirstBenchFrame', () => { loadMs = performance.now() - started; });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?bench=1&seed=${seed}&duration=${duration}`);
  await page.waitForFunction(() => window.__BENCH_RESULTS__, null, { timeout: (duration + 30) * 1000 });
  if (errors.length) throw new Error(errors.join('\n'));
  const result = await page.evaluate(() => window.__BENCH_RESULTS__), scene = await page.evaluate(() => window.__BENCH_SCENE__);
  if (scene.shades !== 200 || scene.motes !== 100 || scene.states.join() !== 'wander' || scene.fuels.some(n=>n!==100)) throw new Error('Invalid benchmark scene');
  const output = { contract_version: '1.3', ...result, load_ms: loadMs, peak_mem_mb: null, vsync_off: false, os: `${platform()} ${release()} / ${cpus()[0]?.model}` };
  mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(out, JSON.stringify(output,null,2)+'\n');
  writeFileSync(out.replace(/\.json$/, '') + '.scene.json', JSON.stringify({ ...scene, seed, duration_s: duration, headed: process.env.BENCH_HEADLESS !== '1', notes: 'Web RSS unavailable; RAF synchronization cannot be guaranteed disabled by browser flags.' },null,2)+'\n');
  console.log(JSON.stringify(output));
} finally { await browser?.close(); server?.kill(); }
