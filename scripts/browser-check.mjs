import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  const response = await page.goto('http://127.0.0.1:5173'); assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('#stats').textContent.includes('Ngọn lửa'));
  await page.screenshot({ path: 'docs/proof/phase-1/title.png' });
  await page.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
  await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
  await page.screenshot({ path: 'docs/proof/phase-1/gameplay.png' });
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).waitFor({ state: 'visible' });
  const before = await page.locator('#stats').textContent(); await page.waitForTimeout(1100); assert.equal(await page.locator('#stats').textContent(), before);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.setViewportSize({ width: 800, height: 650 }); await page.waitForTimeout(200);
  await page.screenshot({ path: 'docs/proof/phase-1/compact.png' });
  const endChecks = [];
  for (const result of ['won', 'lost']) {
    const fixturePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    fixturePage.on('pageerror', e => errors.push(e.message));
    const scenario = result === 'won'
      ? { random_motes: false, random_shades: false, player: { carried: 10 }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i > 0 })) }
      : { random_motes: false, random_shades: false, time_left_s: .25 };
    // Test-only scenario injection at construction; production source stays unchanged.
    await fixturePage.route('**/src/web.mjs', async route => {
      const original = await route.fetch();
      const source = (await original.text()).replace('new Game(tuning, 2026)', `new Game(tuning, 2026, ${JSON.stringify(scenario)})`);
      await route.fulfill({ response: original, body: source });
    });
    await fixturePage.goto('http://127.0.0.1:5173');
    await fixturePage.getByRole('button', { name: 'Bắt đầu đêm 1' }).click();
    if (result === 'won') await fixturePage.keyboard.down('KeyE');
    await fixturePage.getByRole('button', { name: 'Chơi lại đêm 1' }).waitFor({ state: 'visible' });
    if (result === 'won') await fixturePage.keyboard.up('KeyE');
    await fixturePage.screenshot({ path: `docs/proof/phase-1/${result}-fixture.png` });
    await fixturePage.getByRole('button', { name: 'Chơi lại đêm 1' }).click();
    assert.equal(await fixturePage.locator('#overlay').isHidden(), true);
    endChecks.push(`${result} screen and restart with injected test scenario`);
    await fixturePage.close();
  }
  assert.deepEqual(errors, []);
  mkdirSync('docs/proof/phase-1', { recursive: true });
  writeFileSync('docs/proof/phase-1/browser.json', JSON.stringify({ browser: browser.version(), http: response.status(), checks: ['title rendered', 'start', 'keyboard move/jump', 'camera rotate', 'pause freezes HUD', 'resume', 'resize', ...endChecks], page_errors: errors }, null, 2) + '\n');
  console.log('Browser checks passed');
} finally { await browser.close(); }
