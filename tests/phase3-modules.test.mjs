import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.mjs';
import { FUEL_SCALE, fuelValue, lightCost, acceptsLight, safeLight, createLantern } from '../src/lanterns.mjs';
import { PALETTE, accessiblePalette } from '../src/palette.mjs';
import { loadSettings, saveSettings } from '../src/settings.mjs';

const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };

test('lanterns module calculates scale, cost, acceptsLight and safeLight correctly', () => {
  assert.equal(FUEL_SCALE, 60);
  assert.equal(fuelValue(6000), 100);
  assert.equal(fuelValue(1799), 30);
  assert.equal(fuelValue(1800), 30);
  assert.equal(fuelValue(0), 0);

  const fresh = createLantern('L1', [0, 0, 0], {}, t);
  assert.equal(fresh.lit, false);
  assert.equal(fresh.deposited, 0);
  assert.equal(fresh.ever_lit, false);
  assert.equal(fresh.fuel, 0);
  assert.equal(lightCost(fresh, t), 10);
  assert.equal(acceptsLight(fresh, t), true);
  assert.equal(safeLight(fresh, t), false);

  const litLamp = createLantern('L2', [0, 0, 0], { lit: true, fuel: 100 }, t);
  assert.equal(litLamp.lit, true);
  assert.equal(litLamp.ever_lit, true);
  assert.equal(litLamp.fuel, 100);
  assert.equal(acceptsLight(litLamp, t), false);
  assert.equal(safeLight(litLamp, t), true);

  const lowLamp = createLantern('L3', [0, 0, 0], { lit: true, fuel: 29.9 }, t);
  assert.equal(acceptsLight(lowLamp, t), true);
  assert.equal(safeLight(lowLamp, t), false);

  const exact30 = createLantern('L4', [0, 0, 0], { lit: true, fuel: 30.0 }, t);
  assert.equal(safeLight(exact30, t), true);
});

test('accessible palette switches shadeRim and danger correctly', () => {
  const normal = accessiblePalette(false);
  assert.equal(normal.shadeRim, '#7A3CFF');
  assert.equal(normal.danger, '#FF5A5F');

  const accessible = accessiblePalette(true);
  assert.equal(accessible.shadeRim, '#00B3FF');
  assert.equal(accessible.danger, '#FFFFFF');
});

test('settings save and load persists colorblind flag', () => {
  const memory = new Map();
  const storage = { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) };

  saveSettings(storage, { volume: 0.8, sensitivity: 1.5, colorblind: true });
  assert.deepEqual(loadSettings(storage), { volume: 0.8, sensitivity: 1.5, colorblind: true });

  saveSettings(storage, { volume: 0.5, sensitivity: 1.0, colorblind: false });
  assert.deepEqual(loadSettings(storage), { volume: 0.5, sensitivity: 1.0, colorblind: false });
});

test('fuel decays 1 unit per second and emits lantern_out when empty', () => {
  const g = new Game(t, 42, {
    ...empty,
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 100 }]
  });
  for (let i = 0; i < 60; i++) g.step();
  const l1 = g.lanterns.find(l => l.id === 'L1');
  assert.equal(l1.lit, true);
  assert.equal(l1.fuel, 99.0);

  const gOut = new Game(t, 42, {
    ...empty,
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 2 / 60 }]
  });
  gOut.step();
  assert.equal(gOut.lanterns[0].lit, true);
  const events = gOut.step();
  assert.equal(gOut.lanterns[0].lit, false);
  assert.equal(gOut.lanterns[0].deposited, 0);
  assert.equal(gOut.lanterns[0].ever_lit, true);
  assert.equal(events.some(e => e.name === 'lantern_out' && e.data.lantern_id === 'L1'), true);
});

test('relighting costs 5 motes and awards 40 + 25 points with relight: true event', () => {
  const g = new Game(t, 42, {
    ...empty,
    player: { pos: [0, 0, 1], carried: 7 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: false, ever_lit: true, deposited: 0 }]
  });
  const events = g.step({ interact: true });
  const litEvent = events.find(e => e.name === 'lantern_lit');
  assert.ok(litEvent);
  assert.equal(litEvent.data.lantern_id, 'L1');
  assert.equal(litEvent.data.relight, true);
  assert.equal(g.player.carried, 2);
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.lanterns[0].fuel, 100);
  assert.equal(g.lanterns[0].relit_count, 1);
  assert.equal(g.score, 5 * 5 + 40);
});

test('refueling calculates used motes correctly and ignores full lantern', () => {
  const g = new Game(t, 42, {
    ...empty,
    player: { pos: [0, 0, 1], carried: 5 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 75 }]
  });
  const events = g.step({ interact: true });
  const refuel = events.find(e => e.name === 'refuel');
  assert.ok(refuel);
  assert.equal(refuel.data.lantern_id, 'L1');
  assert.equal(refuel.data.amount, 3);
  assert.equal(refuel.data.fuel, 100);
  assert.equal(g.player.carried, 2);
  assert.equal(g.score, 3 * 5);

  // When lantern is at max fuel, interact() ignores it
  g.lanterns[0].fuelUnits = t.fuel_max * FUEL_SCALE;
  const eventsBefore = g.events.length;
  g.interact();
  assert.equal(g.events.length, eventsBefore);
  assert.equal(g.player.carried, 2);
});

test('capacity grows by 2 per successful light up to max 20', () => {
  const g = new Game(t, 42, {
    ...empty,
    player: { pos: [0, 0, 1], carried: 10, successful_lights: 0 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: false, deposited: 0 }]
  });
  assert.equal(g.capacity, 10);
  g.step({ interact: true });
  assert.equal(g.player.successfulLights, 1);
  assert.equal(g.capacity, 12);

  g.player.successfulLights = 5;
  assert.equal(g.capacity, 20);
  g.player.successfulLights = 6;
  assert.equal(g.capacity, 20);
});

test('shade drains 5 fuel/s and earns 15 points when pulsed during drain', () => {
  const g = new Game(t, 42, {
    ...empty,
    player: { pos: [0, 0, 2], carried: 3 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 0.8, 1], state: 'drain', target_lantern_id: 'L1' }]
  });
  const events = g.step({ pulse: true });
  const pulse = events.find(e => e.name === 'pulse');
  assert.ok(pulse);
  assert.deepEqual(pulse.data.stunned_ids, ['S1']);
  assert.equal(g.shades[0].state, 'stunned');
  assert.equal(g.score, 15);
});

test('refueling to >= 30 pushes nearby shades out over 30 ticks without damage', () => {
  const g = new Game(t, 42, {
    ...empty,
    player: { pos: [0, 0, 1], carried: 5 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
    shades: [{ id: 'S1', pos: [0, 0.8, 2], state: 'wander', target_lantern_id: 'L1' }]
  });
  g.step({ interact: true });
  assert.equal(g.shades[0].evacuateTicks, 29);
  for (let i = 0; i < 29; i++) {
    g.step();
    assert.equal(g.player.flames, 3);
  }
  assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2]) >= 6.0 - 1e-6);
});

test('dawn survival requires at least 60% of total lanterns lit', () => {
  const gWon = new Game(t, 42, {
    ...empty,
    time_left_s: 1 / 60,
    player: { flames: 3 },
    lanterns: [
      { id: 'L1', lit: true, fuel: 100 },
      { id: 'L2', lit: true, fuel: 80 },
      { id: 'L3', lit: true, fuel: 60 },
      { id: 'L4', lit: false, fuel: 0 },
      { id: 'L5', lit: false, fuel: 0 }
    ]
  });
  gWon.step();
  assert.equal(gWon.state, 'won');
  assert.equal(gWon.events.at(-1).data.reason, 'dawn_survived');
  assert.equal(gWon.score, (50 + 99) + (50 + 79) + (50 + 59) + 3 * 50);

  const gLost = new Game(t, 42, {
    ...empty,
    time_left_s: 1 / 60,
    player: { flames: 3 },
    lanterns: [
      { id: 'L1', lit: true, fuel: 100 },
      { id: 'L2', lit: true, fuel: 80 },
      { id: 'L3', lit: false, fuel: 0 },
      { id: 'L4', lit: false, fuel: 0 },
      { id: 'L5', lit: false, fuel: 0 }
    ]
  });
  gLost.step();
  assert.equal(gLost.state, 'lost');
  assert.equal(gLost.events.at(-1).data.reason, 'dawn');
});
