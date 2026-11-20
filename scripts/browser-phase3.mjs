import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const dir = 'docs/proof/phase-3';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const errors = [], checks = [], base = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
context.on('page', p => p.on('pageerror', e => errors.push(e.message)));

try {
  const page = await context.newPage();
  assert.equal((await page.goto(base)).status(), 200);

  // Settings & colorblind mode
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.locator('#volume').fill('0.2');
  await page.locator('#volume').dispatchEvent('input');
  await page.locator('#sensitivity').fill('1.8');
  await page.locator('#sensitivity').dispatchEvent('input');
  await page.locator('#colorblind').check();
  await page.locator('#colorblind').dispatchEvent('input');

  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  assert.equal(await page.locator('#volume').inputValue(), '0.2');
  assert.equal(await page.locator('#sensitivity').inputValue(), '1.8');
  assert.equal(await page.locator('#colorblind').isChecked(), true);
  checks.push('settings and colorblind mode persist after reload');

  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.screenshot({ path: `${dir}/menu.png` });

  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await page.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();

  assert.equal(await page.locator('#carry i').count(), 10);
  assert.ok((await page.locator('#carry-label').textContent()).includes('/10 đom đóm'));
  checks.push('HUD has 10 carry slots and capacity label');

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ShiftLeft');

  await page.screenshot({ path: `${dir}/night1.png` });

  // FPS benchmark
  const fps = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const start = performance.now();
    const frame = now => {
      count++;
      if (now - start >= 3000) resolve({ fps: count * 1000 / (now - start), frames: count, duration_ms: now - start });
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }));

  await page.keyboard.press('KeyP');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).waitFor();
  const tick = await page.locator('#game').getAttribute('data-sim-tick');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#game').getAttribute('data-sim-tick'), tick);
  checks.push('pause freezes simulation');

  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  checks.push('pause settings resumes');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu đêm 1' }).waitFor();
  checks.push('retry keeps current night');
  await page.close();

  // Fixture test for campaign progression to dawn in Phase 3
  const fixture = await context.newPage();
  await fixture.route('**/src/web-v11.mjs', async route => {
    const original = await route.fetch();
    const source = (await original.text()).replace(
      'new Game(tuning, 2026 + campaign.night, {}, campaign.night)',
      `new Game(tuning, 2026 + campaign.night, {random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,time_left_s:0.3,player:{pos:[3,6,0],carried:5},lanterns:Array.from({length:campaign.night+4},(_,i)=>({id:'L'+(i+1),pos:[3,6,0],lit:true,fuel:100}))}, campaign.night)`
    );
    await route.fulfill({ response: original, body: source });
  });

  await fixture.goto(base);
  await fixture.getByRole('button', { name: 'Bắt đầu hành trình' }).click();

  for (const night of [1, 2, 3]) {
    await fixture.getByRole('button', { name: `Bắt đầu đêm ${night}`, exact: true }).click();
    await fixture.screenshot({ path: `${dir}/night${night}-playing-fixture.png` });
    await fixture.getByRole('heading', { name: night === 3 ? 'Bình Minh' : /đã qua bình minh/ }).waitFor({ timeout: 10000 });
    await fixture.screenshot({ path: `${dir}/night${night}-won-fixture.png` });
    if (night < 3) await fixture.getByRole('button', { name: 'Đêm kế tiếp', exact: true }).click();
  }
  checks.push('fixture: 3-night dawn survival campaign, results and dawn completion');
  assert.ok((await fixture.locator('#overlay-text').textContent()).includes('Tổng điểm:'));
  await fixture.close();

  // Loss fixture test
  const loss = await context.newPage();
  await loss.route('**/src/web-v11.mjs', async route => {
    const original = await route.fetch();
    await route.fulfill({
      response: original,
      body: (await original.text()).replace(
        'new Game(tuning, 2026 + campaign.night, {}, campaign.night)',
        'new Game(tuning, 2026 + campaign.night, {random_motes:false,random_shades:false,time_left_s:.25,lanterns:[]}, campaign.night)'
      )
    });
  });

  await loss.goto(base);
  await loss.getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await loss.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();
  await loss.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).waitFor();
  await loss.screenshot({ path: `${dir}/lost-fixture.png` });
  await loss.getByRole('button', { name: 'Chơi lại Đêm', exact: true }).click();
  await loss.getByRole('button', { name: 'Bắt đầu đêm 1' }).waitFor();
  checks.push('fixture: loss and retry');

  assert.deepEqual(errors, []);
  writeFileSync(`${dir}/browser.json`, JSON.stringify({
    browser: browser.version(),
    viewport: '1280x720',
    checks,
    errors,
    fps,
    fps_pass: fps.fps >= 30,
    note: 'Phase 3 browser verification measured in headless Chrome on Windows; colorblind mode tested and persisted; dawn survival tested across 3 nights.'
  }, null, 2) + '\n');

  assert.ok(fps.fps >= 30, `FPS ${fps.fps} is below the 30 FPS requirement`);
  console.log(JSON.stringify({ checks, fps, errors }));
} finally {
  await browser.close();
}
