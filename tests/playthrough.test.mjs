import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Game } from '../src/game.mjs';
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;

test('default night 1 survives dawn by collecting, lighting and maintaining oil', () => {
  const g = new Game(t, 2026); let last = false;
  const count = {};
  while (g.state === 'playing') {
    const p = g.player, distance = obj => Math.hypot(obj.pos[0] - p.pos[0], obj.pos[2] - p.pos[2]);
    const danger = obj => g.shades.filter(s => ['chase', 'wander'].includes(s.state)).reduce((sum, s) => sum + Math.max(0, 8 - Math.hypot(obj.pos[0] - s.pos[0], obj.pos[2] - s.pos[2])) * 3, 0);

    const unlit = g.lanterns.filter(l => !l.lit).sort((a, b) => distance(a) - distance(b))[0];
    const lowFuel = g.lanterns.filter(l => l.lit && l.fuel < 60).sort((a, b) => a.fuel - b.fuel)[0];

    let target;
    const needed = unlit ? (unlit.ever_lit ? 5 : 10) - unlit.deposited : 0;
    if (unlit && p.carried >= needed) {
      target = unlit;
    } else if (lowFuel && p.carried >= 3) {
      target = lowFuel;
    } else if (p.carried < g.capacity) {
      target = g.motes.slice().sort((a, b) => distance(a) + danger(a) - distance(b) - danger(b))[0];
    } else {
      target = unlit ?? lowFuel ?? g.lanterns.sort((a, b) => a.fuel - b.fuel)[0];
    }
    if (!target) target = g.lanterns[0];

    const dx = target.pos[0] - p.pos[0], dz = target.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
    const threat = g.shades.some(s => s.state !== 'stunned' && distance(s) < 2.5);
    let move = d > .5 ? [dx / d, dz / d] : [0, 0], best = -Infinity;
    if (d > .5) for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16, vx = Math.cos(a), vz = Math.sin(a), px = p.pos[0] + vx * 2, pz = p.pos[2] + vz * 2;
      let score = (vx * dx + vz * dz) / d;
      for (const s of g.shades.filter(s => ['chase', 'wander'].includes(s.state))) score -= 12 / Math.max(.1, (px - s.pos[0]) ** 2 + (pz - s.pos[2]) ** 2);
      if (Math.hypot(px, pz) > 38) score -= 100;
      if (score > best) { best = score; move = [vx, vz]; }
    }
    const nearNeedyLamp = g.lanterns.some(l => distance(l) <= 2 && (!l.lit || l.fuel <= 80));
    for (const e of g.step({ move, interact: !last && nearNeedyLamp, pulse: !last && threat && p.carried >= 3, dash: !last && d > 4 })) {
      count[e.name] = (count[e.name] ?? 0) + 1;
    }
    last = !last;
  }
  const result = { seed: 2026, state: g.state, ticks: g.tick, seconds: g.tick / 60, score: g.score, flames: g.player.flames, lit: g.lanterns.filter(l => l.lit).length, events: count };
  if (existsSync('docs/proof/phase-4')) writeFileSync('docs/proof/phase-4/playthrough.json', JSON.stringify(result, null, 2) + '\n');
  assert.equal(g.state, 'won', JSON.stringify(result)); assert.ok(result.lit >= 3); assert.equal(g.simTick, 14400); assert.ok(count.mote_picked >= 30); assert.ok(count.lantern_lit >= 3);
});
