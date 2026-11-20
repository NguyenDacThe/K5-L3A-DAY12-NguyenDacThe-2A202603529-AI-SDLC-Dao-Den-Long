import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Game } from '../src/game.mjs';
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
test('default island is winnable by moving, collecting, depositing and pulsing', () => {
  const g = new Game(t, 2026); let last = false;
  const count = {};
  while (g.state === 'playing') {
    const p = g.player, distance = obj => Math.hypot(obj.pos[0] - p.pos[0], obj.pos[2] - p.pos[2]);
    let target = g.lanterns.filter(l => !l.lit).sort((a, b) => distance(a) - distance(b))[0];
    if (p.carried < 10) target = g.motes.slice().sort((a, b) => distance(a) - distance(b))[0] ?? target;
    const dx = target.pos[0] - p.pos[0], dz = target.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
    const threat = g.shades.some(s => s.state !== 'stunned' && distance(s) < 5);
    for (const e of g.step({ move: d > .5 ? [dx / d, dz / d] : [0, 0], interact: !last, pulse: !last && threat })) count[e.name] = (count[e.name] ?? 0) + 1;
    last = !last;
  }
  const result = { seed: 2026, state: g.state, ticks: g.tick, seconds: g.tick / 60, score: g.score, flames: g.player.flames, lit: g.lanterns.filter(l => l.lit).length, events: count };
  if (existsSync('docs/proof/phase-1')) writeFileSync('docs/proof/phase-1/playthrough.json', JSON.stringify(result, null, 2) + '\n');
  assert.equal(g.state, 'won', JSON.stringify(result)); assert.equal(result.lit, 5); assert.ok(count.mote_picked >= 50); assert.ok(count.pulse > 0);
});
