import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'docs/proof/phase-2'; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const errors = [], checks = [], base = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
try {
  const page = await context.newPage(); assert.equal((await page.goto(base)).status(), 200);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.locator('#volume').fill('0.2'); await page.locator('#volume').dispatchEvent('input');
  await page.locator('#sensitivity').fill('1.8'); await page.locator('#sensitivity').dispatchEvent('input');
  await page.reload(); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); assert.equal(await page.locator('#volume').inputValue(), '0.2'); assert.equal(await page.locator('#sensitivity').inputValue(), '1.8'); checks.push('settings persist after reload');
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.screenshot({ path: `${dir}/menu.png` });
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click(); await page.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();
  assert.equal(await page.locator('#carry i').count(), 10); checks.push('HUD has 10 carry cells');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(600); await page.keyboard.up('KeyW'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(300); await page.keyboard.up('ShiftLeft');
  await page.screenshot({ path: `${dir}/night1.png` });
  const fps = await page.evaluate(() => new Promise(resolve => { let count = 0; const start = performance.now(); const frame = now => { count++; if (now - start >= 3000) resolve({ fps: count * 1000 / (now - start), frames: count, duration_ms: now - start }); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); }));
  await page.keyboard.press('KeyP'); await page.getByRole('button', { name: 'Tiếp tục', exact: true }).waitFor();
  const tick = await page.locator('#game').getAttribute('data-sim-tick'); await page.waitForTimeout(500); assert.equal(await page.locator('#game').getAttribute('data-sim-tick'), tick); checks.push('pause freezes simulation');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByRole('button', { name: 'Quay lại', exact: true }).click(); await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click(); checks.push('pause settings resumes');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).click(); await page.getByRole('button', { name: 'Bắt đầu đêm 1' }).waitFor(); checks.push('retry keeps current night');
  await page.close();
  const fixture = await context.newPage();
  await fixture.route('**/src/web-v11.mjs', async route => {
    const original = await route.fetch(), source = (await original.text()).replace('new Game(tuning, 2026 + campaign.night, {}, campaign.night)', `new Game(tuning, 2026 + campaign.night, {random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,player:{pos:[3,6,0],carried:10},lanterns:Array.from({length:campaign.night+4},(_,i)=>({id:'L'+(i+1),pos:[3,6,0],lit:i>0}))}, campaign.night)`);
    await route.fulfill({ response: original, body: source });
  });
  await fixture.goto(base); await fixture.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  for (const night of [1, 2, 3]) {
    await fixture.getByRole('button', { name: `Bắt đầu đêm ${night}`, exact: true }).click();
    await fixture.screenshot({ path: `${dir}/night${night}-playing-fixture.png` });
    await fixture.keyboard.down('KeyE');
    await fixture.getByRole('heading', { name: night === 3 ? 'Bình Minh' : /lại sáng rồi/ }).waitFor(); await fixture.keyboard.up('KeyE');
    await fixture.screenshot({ path: `${dir}/night${night}-won-fixture.png` });
    if (night < 3) await fixture.getByRole('button', { name: 'Đêm kế tiếp', exact: true }).click();
  }
  checks.push('fixture: 3-night campaign, results, next night and dawn');
  assert.ok((await fixture.locator('#overlay-text').textContent()).includes('Tổng điểm:'));
  await fixture.close();
  const loss = await context.newPage();
  await loss.route('**/src/web-v11.mjs', async route => {
    const original = await route.fetch();
    await route.fulfill({ response: original, body: (await original.text()).replace('new Game(tuning, 2026 + campaign.night, {}, campaign.night)', 'new Game(tuning, 2026 + campaign.night, {random_motes:false,random_shades:false,time_left_s:.25}, campaign.night)') });
  });
  await loss.goto(base); await loss.getByRole('button', { name: 'Bắt đầu hành trình' }).click(); await loss.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();
  await loss.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).waitFor(); await loss.screenshot({ path: `${dir}/lost-fixture.png` });
  await loss.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).click(); await loss.getByRole('button', { name: 'Bắt đầu đêm 1' }).waitFor(); checks.push('fixture: loss and retry');
  assert.deepEqual(errors, []);
  writeFileSync(`${dir}/browser.json`, JSON.stringify({ browser: browser.version(), viewport: '1280x720', checks, errors, fps, fps_pass: fps.fps >= 30, note: 'FPS measured in headless Chrome on this Windows machine; campaign win screenshots use explicit test-only scenario injection.' }, null, 2) + '\n');
  assert.ok(fps.fps >= 30, `FPS ${fps.fps} is below the 30 FPS requirement`);
  console.log(JSON.stringify({ checks, fps, errors }));
} finally { await browser.close(); }
