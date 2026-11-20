import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/headless.mjs';
import { phase3Cases } from './phase3-cases.mjs';

const run = name => simulate({ seed: 42, ...phase3Cases[name] }).trim().split('\n').map(JSON.parse);
const snap = (rows, tick) => rows.find(r => r.type === 'snapshot' && r.tick === tick);
const event = (rows, name) => rows.find(r => r.type === 'event' && r.name === name);

test('headless: fuel decay at 1.0 unit per second across 60 ticks', () => {
  const rows = run('fuel-decay');
  assert.equal(snap(rows, 0).lanterns[0].fuel, 100);
  assert.equal(snap(rows, 60).lanterns[0].fuel, 99.0);
});

test('headless: lantern_out event emitted when fuel reaches 0 and deposited resets', () => {
  const rows = run('lantern-out');
  const out = event(rows, 'lantern_out');
  assert.ok(out);
  assert.equal(out.data.lantern_id, 'L1');
  const finalSnap = snap(rows, 5);
  const l1 = finalSnap.lanterns.find(l => l.id === 'L1');
  assert.equal(l1.lit, false);
  assert.equal(l1.fuel, 0);
  assert.equal(l1.deposited, 0);
  assert.equal(l1.ever_lit, true);
});

test('headless: relighting ever_lit lantern costs 5 motes and records relight_count', () => {
  const rows = run('relight-cost');
  const lit = event(rows, 'lantern_lit');
  assert.ok(lit);
  assert.equal(lit.data.relight, true);
  const s = snap(rows, 1);
  assert.equal(s.player.carried, 0);
  const l1 = s.lanterns.find(l => l.id === 'L1');
  assert.equal(l1.lit, true);
  assert.equal(l1.fuel, 100);
  assert.equal(l1.relit_count, 1);
  assert.equal(s.score, 65);
});

test('headless: refuel clamps to 100 and consumes minimal needed motes', () => {
  const rows = run('refuel-clamp');
  const rf = event(rows, 'refuel');
  assert.ok(rf);
  assert.equal(rf.data.amount, 2);
  assert.equal(rf.data.fuel, 100);
  const s = snap(rows, 1);
  assert.equal(s.player.carried, 3);
  assert.equal(s.score, 10);
});

test('headless: capacity increases with successful lights in snapshot', () => {
  const rows = run('capacity-grow');
  assert.equal(snap(rows, 0).player.capacity, 10);
  assert.equal(snap(rows, 1).player.capacity, 12);
});

test('headless: shade in drain decreases fuel by 5/s and emits fuel_drain every 60 ticks', () => {
  const rows = run('shade-drain');
  const drainEvents = rows.filter(r => r.type === 'event' && r.name === 'fuel_drain');
  assert.equal(drainEvents.length, 1);
  assert.equal(drainEvents[0].tick, 60);
  assert.equal(drainEvents[0].data.lantern_id, 'L1');
  assert.equal(drainEvents[0].data.shade_id, 'S1');
  assert.equal(drainEvents[0].data.fuel, 14.0);
  assert.equal(snap(rows, 60).lanterns.find(l => l.id === 'L1').fuel, 14.0);
});

test('headless: pulse on draining shade yields 15 points and transitions to stunned', () => {
  const rows = run('drain-pulse');
  const p = event(rows, 'pulse');
  assert.ok(p);
  assert.deepEqual(p.data.stunned_ids, ['S1']);
  assert.equal(snap(rows, 1).score, 15);
  assert.equal(snap(rows, 1).shades.find(s => s.id === 'S1').state, 'stunned');
});

test('headless: refuel restores safe zone and evacuates nearby shade', () => {
  const rows = run('refuel-evacuate');
  const s30 = snap(rows, 30);
  assert.equal(s30.player.flames, 3);
  const shade = s30.shades.find(s => s.id === 'S1');
  assert.ok(Math.hypot(shade.pos[0] - 0, shade.pos[2] - 25) >= 6.0 - 1e-6);
});

test('headless: dawn survived wins with reason dawn_survived and calculates dawn score', () => {
  const rows = run('dawn-survived');
  const over = event(rows, 'game_over');
  assert.ok(over);
  assert.equal(over.data.result, 'won');
  assert.equal(over.data.reason, 'dawn_survived');
  assert.equal(rows.at(-1).score, (50 + 89) + (50 + 79) + (50 + 69) + 3 * 50);
});

test('headless: all lit lanterns does not win early and continues playing', () => {
  const rows = run('all-lit-continuous');
  assert.equal(snap(rows, 30).state, 'playing');
  assert.equal(rows.some(r => r.type === 'event' && r.name === 'game_over'), false);
});
