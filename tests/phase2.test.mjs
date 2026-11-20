import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/headless.mjs';
import { Game } from '../src/game.mjs';
import { cases } from './phase2-cases.mjs';
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const run = name => simulate({ seed: 42, ...cases[name] }).trim().split('\n').map(JSON.parse);
const snap = (rows, tick) => rows.find(r => r.type === 'snapshot' && r.tick === tick);
const event = (rows, name) => rows.find(r => r.type === 'event' && r.name === name);
test('headless pause freezes sim_tick, movement, buffs and time while tick advances', () => {
  const rows = run('pause'); assert.equal(snap(rows, 10).state, 'paused'); assert.equal(snap(rows, 10).sim_tick, 0); assert.equal(snap(rows, 10).player.charm_s, 5);
  assert.equal(snap(rows, 20).sim_tick, 10); assert.ok(Math.abs(snap(rows, 20).player.pos[2] - 1.2) < .001); assert.equal(event(rows, 'resumed').tick, 11);
});
test('dash travels 2.8m in 12 ticks, has 90-tick cooldown, holds airborne height', () => {
  const rows = run('dash'); assert.equal(snap(rows, 12).player.pos[0], 2.8); assert.equal(snap(rows, 12).player.dash_cd_s, 79 / 60); assert.equal(rows.filter(r => r.name === 'dash').length, 1);
  assert.equal(snap(run('air-dash'), 12).player.pos[1], 5);
});
test('charm pickup expires after 600 ticks and respawns after 2700', () => {
  const rows = run('charm'); assert.equal(snap(rows, 1).player.charm_s, 10); assert.equal(snap(rows, 600).player.charm_s, 1 / 60); assert.equal(snap(rows, 601).player.charm_s, 0);
  assert.equal(rows.filter(r => r.name === 'charm_picked').length, 2); assert.equal(snap(rows, 2701).player.charm_s, 10);
});
test('charm permits re-pressed dashes without cooldown but never interrupts an active dash', () => {
  const rows = run('charm-dash'); assert.equal(rows.filter(r => r.name === 'dash').length, 3); assert.equal(snap(rows, 30).player.pos[0], 7); assert.equal(snap(rows, 30).player.dash_cd_s, 0);
});
test('drifter theft ignores invulnerability and happens before shade hit', () => {
  const rows = run('steal'); assert.equal(event(rows, 'drifter_steal').data.amount, 3); assert.equal(snap(rows, 1).player.carried, 5); assert.equal(snap(rows, 1).player.flames, 3);
  const opts = structuredClone(cases.steal); opts.scenario.player.invuln_ticks = 0;
  const names = simulate({ seed: 42, ...opts }).trim().split('\n').map(JSON.parse).filter(r => r.type === 'event').map(e => e.name);
  assert.ok(names.indexOf('drifter_steal') < names.indexOf('player_hit'));
});
test('pulse returns a fleeing drifter stash as dropped motes', () => {
  const rows = run('drifter-drop'); assert.equal(event(rows, 'drifter_drop').data.amount, 3); assert.equal(snap(rows, 1).motes.filter(m => m.kind === 'dropped').length, 3); assert.equal(snap(rows, 1).drifters[0].stolen, 0);
});
test('pulse latches targets in 3D and pushes exactly 4m across 15 steps', () => {
  const rows = run('pulse-3d'); assert.deepEqual(event(rows, 'pulse').data.stunned_ids, ['near']); assert.equal(snap(rows, 15).shades.find(s => s.id === 'near').pos[0], 9); assert.equal(snap(rows, 1).score, 5);
});
test('fall ignores invulnerability, fires once and respawns after 60 ticks', () => {
  const rows = run('fall'); assert.equal(rows.filter(r => r.name === 'player_hit').length, 1); assert.equal(event(rows, 'player_hit').data.lost, 7); assert.deepEqual(snap(rows, 61).player.pos, [0, 0, 0]); assert.equal(snap(rows, 61).player.flames, 2); assert.equal(snap(rows, 61).player.invuln, true);
});
test('island pad locks horizontal launch and lands on opposite island', () => {
  const rows = run('pad'); const p = snap(rows, 90).player; assert.ok(p.pos[0] > 42); assert.equal(p.grounded, true); assert.equal(p.pos[1], 0);
});
test('tower pad reaches upper tier without climbing the tower', () => {
  const rows = run('tower-pad'); assert.ok(rows.some(r => r.type === 'snapshot' && r.player.pos[1] >= 6)); assert.equal(snap(rows, 90).player.pos[1], 6);
});
test('radial ramp reaches tier 1 with ordinary movement', () => {
  assert.equal(snap(run('ramp'), 75).player.pos[1], 3);
});
test('contractual origin remains usable below the central deck on night 3', () => {
  const g = new Game(t, 1, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false }, 3);
  assert.deepEqual(g.player.pos, [0, 0, 0]); for (let i = 0; i < 100; i++) g.step({ move: [0, -1] });
  assert.ok(g.player.pos[2] < -9); assert.equal(g.player.pos[1], 0);
});
test('night 3 wind follows gameplay time and pushes 2m/s', () => {
  const rows = run('wind'); assert.equal(snap(rows, 1790).wind.active, false); assert.equal(snap(rows, 1800).wind.active, true); assert.equal(snap(rows, 2100).wind.active, false);
  const a = snap(rows, 1800).player.pos, b = snap(rows, 2090).player.pos; assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[2] - b[2]) - 290 / 30) < .01);
});
test('scheduled shades start at tick 300, drifters at 1200, all snapshot fields exist', () => {
  const rows = run('spawn'); assert.equal(rows.filter(r => r.name === 'shade_spawned' && r.tick === 300).length, 2); assert.equal(snap(rows, 1200).drifters.length, 1);
  const s = snap(rows, 0); for (const key of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(key in s); for (const key of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(key in s.player);
});
test('hits scatter recoverable motes born after pickup, TTL starts at 480', () => {
  const rows = run('hit-drops'), s = snap(rows, 1); assert.equal(s.player.carried, 5); assert.equal(s.motes.length, 4); assert.ok(s.motes.every(m => m.ttl_s === 8 && Math.hypot(m.pos[0], m.pos[2]) >= 1.5 && Math.hypot(m.pos[0], m.pos[2]) <= 2.501)); assert.equal(snap(rows, 2).motes[0].ttl_s, 479 / 60);
});
test('win at dawn has priority over timeout; no flames overrides all lit', () => {
  for (const flames of [0, 3]) {
    const g = new Game(t, 42, { random_motes: false, random_shades: false, time_left_s: 1 / 60, player: { flames }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true })) });
    g.step(); assert.equal(g.state, flames ? 'won' : 'lost');
  }
});
