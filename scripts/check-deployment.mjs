import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const base = (process.argv[2] ?? 'https://gamedemo-xi.vercel.app').replace(/\/$/, '');
const dir = 'release/production-proof'; mkdirSync(dir, { recursive: true });
const version = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).contract_version;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], assets = [];
page.on('pageerror', e => errors.push(e.message));
try {
  for (const path of ['/', '/src/web.mjs', '/src/web-v11.mjs', '/vendor/three/three.module.js', '/vendor/three/three.core.js', '/game.contract.json', '/style.css', '/style-v11.css']) {
    const response = await page.request.get(base + path), type = response.headers()['content-type'];
    assert.equal(response.status(), 200, path);
    if (/\.(mjs|js)$/.test(path)) assert.match(type, /javascript/, path);
    if (path === '/game.contract.json') assert.equal((await response.json()).contract_version, version);
    assets.push({ path, status: response.status(), content_type: type });
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await page.getByRole('button', { name: 'Bắt đầu đêm 1', exact: true }).click();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
  assert.ok(Number(await page.locator('#game').getAttribute('data-sim-tick')) > 0);
  await page.screenshot({ path: `${dir}/game.png` });
  await page.keyboard.press('KeyP'); await page.getByRole('button', { name: 'Tiếp tục', exact: true }).waitFor();
  const tick = await page.locator('#game').getAttribute('data-sim-tick'); await page.waitForTimeout(300); assert.equal(await page.locator('#game').getAttribute('data-sim-tick'), tick);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  assert.deepEqual(errors, []);
  const result = { url: base, browser: browser.version(), viewport: '1280x720', assets, checks: ['HTTP and MIME', `Contract v${version}`, 'WebGL game starts', 'simulation advances', 'pause and resume'], page_errors: errors };
  writeFileSync(`${dir}/browser.json`, JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} finally { await browser.close(); }
