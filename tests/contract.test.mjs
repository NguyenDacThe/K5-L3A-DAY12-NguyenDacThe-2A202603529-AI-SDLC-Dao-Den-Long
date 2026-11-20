import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Game } from '../src/game.mjs';
import { simulate } from '../src/headless.mjs';
import { validateInputs, validateScenario } from '../src/validation.mjs';
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const empty = { random_motes: false, random_shades: false };
const make = s => new Game(t, 42, { ...empty, ...s });
test('tick 0 precedes input; N steps, interval snapshots and mandatory end', () => {
  const rows = simulate({ seed: 1, ticks: 12, scenario: empty, inputs: { frames: [{ tick: 0, move: [0, 1] }] } }).trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.filter(r => r.type === 'snapshot').map(r => r.tick), [0, 10]);
  assert.deepEqual(rows[0].player.pos, [0, 0, 0]); assert.deepEqual(rows[1].player.pos, [0, 0, 1]);
  assert.equal(rows[1].time_left_s, 300 - 10 / 60); assert.equal(rows.at(-1).ticks, 12);
});
test('movement normalization, camera rotation and sparse input persistence', () => {
  const g = make(); g.step({ move: [1, 1] }); assert.ok(Math.abs(Math.hypot(g.player.pos[0], g.player.pos[2]) - .1) < 1e-10);
  const rows = simulate({ seed: 1, ticks: 60, every: 60, scenario: empty, inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }, { tick: 30, jump: true }] } }).trim().split('\n').map(JSON.parse);
  assert.equal(rows[1].player.pos[0], 6); assert.equal(rows[1].player.pos[2], 0);
});
test('pickup uses inclusive horizontal radius and respects capacity', () => {
  const g = make({ player: { pos: [0, 5, 0], carried: 19 }, motes: [[1.5, 0, 0], [0, 0, 0], [10, 0, 0]] });
  const events = g.step(); assert.equal(g.player.carried, 20); assert.equal(g.motes.length, 2); assert.equal(events[0].name, 'mote_picked'); assert.equal(g.score, 10);
});
test('deposit transfers partially, requires rising edge, lights once', () => {
  const g = make({ player: { carried: 6 }, lanterns: [{ id: 'L1', pos: [0, 0, 3] }] });
  g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 6); assert.equal(g.player.carried, 0);
  g.player.carried = 10; assert.equal(g.step({ interact: true }).length, 0);
  g.step({ interact: false }); const events = g.step({ interact: true });
  assert.equal(g.player.carried, 6); assert.equal(g.lanterns[0].lit, true); assert.equal(events.filter(e => e.name === 'lantern_lit').length, 1); assert.equal(g.score, 100);
});
test('pulse cost, inclusive radius, push, stun duration and cooldown', () => {
  const g = make({ player: { carried: 10 }, shades: [{ id: 'target', pos: [6, 0, 0] }, { id: 'far', pos: [6.01, 0, 0] }] });
  const events = g.step({ pulse: true }); assert.deepEqual(events[0].data.stunned_ids, ['target']); assert.equal(g.player.carried, 8); assert.equal(g.shades[0].pos[0], 10); assert.equal(g.shades[0].state, 'stunned');
  g.step({ pulse: false }); assert.equal(g.step({ pulse: true }).some(e => e.name === 'pulse'), false);
  while (g.tick < 180) g.step(); assert.equal(g.shades[0].state, 'stunned'); g.step(); assert.equal(g.shades[0].state, 'chase');
});
test('no light means no pulse; held pulse activates once', () => {
  const g = make(); assert.equal(g.step({ pulse: true }).length, 0);
  g.player.carried = 10; assert.equal(g.step({ pulse: true }).length, 0); g.step({ pulse: false }); g.step({ pulse: true });
  for (let i = 0; i < 100; i++) g.step({ pulse: true }); assert.equal(g.player.carried, 8);
});
test('shade hit drops floor ratio, invulnerability and no_flames loss', () => {
  const g = make({ player: { carried: 5 }, shades: [{ pos: [0, 0, 0] }] });
  const hit = g.step()[0]; assert.deepEqual(hit.data, { by: 'shade', flames: 2, dropped: 2 });
  while (g.tick < 120) g.step(); assert.equal(g.player.flames, 2); g.step(); assert.equal(g.player.flames, 1);
  while (g.state === 'playing') g.step(); assert.equal(g.tick, 241); assert.equal(g.state, 'lost'); assert.equal(g.events.at(-1).data.reason, 'no_flames');
});
test('lit lantern excludes shades and protects player, without setup points/events', () => {
  const g = make({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [0, 0, 0] }] });
  assert.equal(g.score, 0); assert.equal(g.events.length, 0); for (let i = 0; i < 180; i++) g.step();
  assert.equal(g.player.flames, 3); assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2]) > t.safe_radius);
});
test('all_lit win score and dawn stop at exact tick', () => {
  const g = make({ player: { carried: 10 }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i !== 0 })) });
  g.step({ interact: true }); assert.equal(g.state, 'won'); assert.equal(g.score, 100 + 299 + 150); assert.deepEqual(g.events.at(-1).data, { result: 'won', reason: 'all_lit' });
  const rows = simulate({ seed: 2, ticks: 100, scenario: { ...empty, time_left_s: 1 / 60 } }).trim().split('\n').map(JSON.parse);
  assert.equal(rows.at(-1).ticks, 1); assert.equal(rows.at(-2).data.reason, 'dawn');
});
test('jump is edge triggered; island boundary clamps without fall penalty', () => {
  const g = make(); g.step({ jump: true }); assert.ok(g.player.pos[1] > 0);
  for (let i = 0; i < 120; i++) g.step({ jump: true }); assert.equal(g.player.pos[1], 0);
  for (let i = 0; i < 600; i++) g.step({ move: [1, 0] }); assert.equal(g.player.pos[0], 32); assert.equal(g.player.flames, 3);
});
test('scenario lists replace defaults, unspecified lanterns persist, seed is deterministic', () => {
  const g = make({ motes: [], shades: [], lanterns: [{ id: 'L2', deposited: 4 }] }); assert.equal(g.motes.length, 0); assert.equal(g.shades.length, 0); assert.equal(g.lanterns.length, 5); assert.equal(g.lanterns[1].deposited, 4);
  const options = { seed: -123, ticks: 1000 }; assert.equal(simulate(options), simulate(options)); assert.notEqual(simulate(options), simulate({ ...options, seed: 12 }));
});
test('validators reject invalid types, out-of-range input, duplicate ticks/ids', () => {
  for (const bad of [{}, { frames: [{ tick: 0 }, { tick: 0 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pulse: 1 }] }]) assert.throws(() => validateInputs(bad));
  for (const bad of [{ motes: [null] }, { lanterns: [{ id: 'L8' }] }, { shades: [{ id: 'a', pos: [0, 0, 0] }, { id: 'a', pos: [0, 0, 0] }] }, { player: { carried: 21 } }, { random_shades: 'false' }]) assert.throws(() => validateScenario(bad, t));
});
test('real CLI writes JSONL and returns exit 2 for malformed input/scenario', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-test-'));
  try {
    const out = join(dir, 'out.jsonl'); const args = ['src/headless.mjs', '--seed', '1', '--night', '1', '--ticks', '0', '--out', out];
    const good = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(good.status, 0, good.stderr); assert.equal(JSON.parse(readFileSync(out, 'utf8').trim().split('\n').at(-1)).ticks, 0);
    const bad = join(dir, 'bad.json'); writeFileSync(bad, '{');
    for (const flag of ['--inputs', '--scenario']) { const result = spawnSync(process.execPath, [...args, flag, bad], { encoding: 'utf8' }); assert.equal(result.status, 2); assert.ok(result.stderr.length); }
    assert.notEqual(spawnSync(process.execPath, ['src/headless.mjs']).status, 0);
  } finally { rmSync(dir, { recursive: true }); }
});
