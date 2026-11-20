import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, terrainHeight, blockedByTower, padAt, launchVelocity } from '../src/world.mjs';
import { createDrifter, tickDrifterTimers, moveDrifters, pulseDrifters, stealDrifters } from '../src/drifters.mjs';
import { createCharms, tickCharms, pickupCharms } from '../src/charms.mjs';
import { Campaign } from '../src/campaign.mjs';
import { loadSettings, saveSettings, SETTINGS_KEY } from '../src/settings.mjs';
import { updateWind, windVelocity } from '../src/wind.mjs';
import { buildWorldView } from '../src/world-view.mjs';
import * as THREE from 'three';
test('v1.1 maps have exact island sizes, lantern positions and spawn point counts', () => {
  const a = createWorld(1), b = createWorld(2), c = createWorld(3);
  assert.equal(a.islands[0].radius, 40); assert.deepEqual(a.lanternPositions[1], [23.8, 0, 7.7]); assert.equal(a.motePoints.length, 24); assert.equal(a.shadePoints.length, 12);
  assert.deepEqual(b.islands.map(i => i.center), [[0, 0, 0], [70, 0, 0]]); assert.equal(b.lanternPositions.length, 6); assert.equal(b.motePoints.length, 24); assert.equal(b.shadePoints.length, 16);
  assert.equal(c.islands[0].radius, 45); assert.deepEqual(c.lanternPositions[0], [0, 6, 6]); assert.equal(c.motePoints.length, 30); assert.equal(c.shadePoints.length, 16); assert.equal(c.lanternPositions.length, 7);
});
test('bridge edges, cloud gap, upper terraces, ramps and tower are represented', () => {
  const b = createWorld(2), c = createWorld(3);
  assert.equal(terrainHeight(b, 35, 2), 0); assert.equal(terrainHeight(b, 35, 2.01), null);
  assert.equal(terrainHeight(c, 0, 5), 6); assert.equal(terrainHeight(c, 0, 18), 3); assert.equal(terrainHeight(c, 0, -18), 0);
  assert.ok(Math.abs(terrainHeight(c, 27 * Math.cos(Math.PI / 6), 27 * Math.sin(Math.PI / 6)) - 1.5) < 1e-10);
  assert.equal(blockedByTower(c, [1, 6, 0]), true); assert.equal(blockedByTower(c, [3, 6, 0]), false);
});
test('pads launch toward the other island or toward -Z with specified velocity', () => {
  const b = createWorld(2), c = createWorld(3), pad = padAt(b, [20, 0, 18], true);
  const v = launchVelocity(pad, pad.pos); assert.equal(v[1], 14); assert.ok(Math.abs(Math.hypot(v[0], v[2]) - 24) < 1e-10); assert.ok(v[0] > 0 && v[2] < 0);
  assert.deepEqual(launchVelocity(c.pads[0], c.pads[0].pos), [0, 12, -8]); assert.equal(padAt(c, [0, 3, 13], false), undefined);
});
test('drifter chase threshold, steal once, no flame loss and flee removal at 240 ticks', () => {
  const p = { pos: [0, 0, 0], carried: 5, flames: 3 }, d = createDrifter({ pos: [1, 0, 0] }, 0), events = [];
  moveDrifters([d], p, 1); assert.equal(d.state, 'chase'); stealDrifters([d], p, (name, data) => events.push({ name, data }));
  assert.equal(d.state, 'flee'); assert.equal(d.stolen, 3); assert.equal(p.carried, 2); assert.equal(p.flames, 3);
  stealDrifters([d], p, () => assert.fail('cannot steal twice'));
  for (let i = 0; i < 239; i++) tickDrifterTimers([d]); assert.equal(d.state, 'flee'); tickDrifterTimers([d]); assert.equal(d.state, 'removed');
  assert.deepEqual(events[0], { name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 2 } });
});
test('drifter loses chase condition; pulse repels chase and recovers stolen motes', () => {
  const p = { pos: [0, 0, 0], carried: 4 }, d = createDrifter({ pos: [1, 0, 0], state: 'chase' }, 0);
  moveDrifters([d], p, 1); assert.equal(d.state, 'idle'); p.carried = 5; moveDrifters([d], p, 2); assert.equal(d.state, 'chase');
  pulseDrifters([d], p, 6, () => assert.fail(), () => {}); assert.equal(d.state, 'flee'); assert.equal(d.stolen, 0);
  d.stolen = 3; let dropped = 0; pulseDrifters([d], p, 6, (pos, amount) => { assert.deepEqual(pos, d.pos); dropped += amount; }, (name, data) => { assert.equal(name, 'drifter_drop'); assert.equal(data.amount, 3); });
  assert.equal(dropped, 3); assert.equal(d.stolen, 0); assert.equal(d.ticksLeft, 120);
});
test('charm gives 600 ticks, refreshes and respawns exactly 2700 ticks later', () => {
  const charms = createCharms(createWorld(2)), p = { pos: [35, 0, 0], charmTicks: 12 };
  pickupCharms(charms, p, 1, () => {}); assert.equal(p.charmTicks, 600); assert.equal(charms[0].available, false);
  for (let i = 0; i < 2699; i++) tickCharms(charms); assert.equal(charms[0].available, false); tickCharms(charms); assert.equal(charms[0].available, true);
  p.charmTicks = 5; pickupCharms(charms, p, 1, () => {}); assert.equal(p.charmTicks, 600);
  assert.deepEqual(createCharms(createWorld(3), []), []);
});
test('campaign preserves only won night scores, retries current night, ends at dawn', () => {
  const c = new Campaign(); assert.equal(c.screen, 'menu'); c.begin(); assert.equal(c.screen, 'intro'); c.play(); c.complete('won', 100); c.next(); assert.equal(c.night, 2);
  c.play(); c.complete('lost', 90); assert.equal(c.total, 100); c.retry(); assert.equal(c.night, 2); c.play(); c.complete('won', 200); c.next(); c.play(); c.complete('won', 300);
  assert.equal(c.screen, 'dawn'); assert.equal(c.total, 600); c.complete('won', 300); assert.equal(c.total, 600); c.menu(); assert.equal(c.total, 0);
});
test('pause/settings returns to paused, settings persist and corrupted storage falls back', () => {
  const c = new Campaign(); c.begin(); c.play(); c.pause(); c.settings(); c.closeSettings(); assert.equal(c.screen, 'paused'); c.resume(); assert.equal(c.screen, 'playing');
  const memory = new Map(), storage = { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  const expectedDefault = {
    volume: .2, sensitivity: 1.8, colorblind: false, reduceMotion: false, largeText: false,
    keybindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'KeyP' }
  };
  saveSettings(storage, { volume: .2, sensitivity: 1.8, colorblind: false }); assert.deepEqual(loadSettings(storage), expectedDefault);
  memory.set(SETTINGS_KEY, 'bad json'); assert.deepEqual(loadSettings(storage), { ...expectedDefault, volume: .5, sensitivity: 1 });
});
test('wind warns 2 seconds before a 5-second gust every 30 seconds', () => {
  const wind = { active: false, dir_deg: 0 }, random = () => .25;
  updateWind(wind, 1679, true, random); assert.equal(wind.warning, false);
  updateWind(wind, 1680, true, random); assert.equal(wind.warning, true); assert.equal(wind.active, false);
  updateWind(wind, 1800, true, random); assert.equal(wind.active, true); assert.equal(wind.warning, false); assert.equal(wind.dir_deg, 90);
  const velocity = windVelocity(wind); assert.ok(Math.abs(velocity[0]) < 1e-10); assert.equal(velocity[2], 2);
  updateWind(wind, 2099, true, random); assert.equal(wind.active, true); updateWind(wind, 2100, true, random); assert.equal(wind.active, false);
  updateWind(wind, 3600, false, random); assert.equal(wind.active, false); assert.deepEqual(windVelocity(wind), [0, 0, 0]);
});
test('three map views build and dispose without a GPU or browser', () => {
  const palette = { ground: '#234455', stone: '#333344', bamboo: '#aa8855', pad: '#ffcc66' };
  for (const night of [1, 2, 3]) {
    const view = buildWorldView(THREE, createWorld(night), palette); assert.ok(view.children.length > 1);
    assert.equal(view.children.filter(m => m.name === 'jump-pad').length, [0, 2, 1][night - 1]); view.userData.dispose();
  }
});
