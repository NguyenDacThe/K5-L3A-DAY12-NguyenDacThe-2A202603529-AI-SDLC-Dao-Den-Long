import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBenchmark, frameStatistics } from '../src/benchmark.mjs';
import { sanitizeSettings, DEFAULT_KEYBINDINGS, checkKeyConflict } from '../src/settings.mjs';
import { sanitizeEntry, addLeaderboardEntry } from '../src/leaderboard.mjs';
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url))).tuning;
test('benchmark contains exact scene and preserves wander, fuel, player and entity counts',()=>{
  const a=createBenchmark(t,42), b=createBenchmark(t,42); assert.deepEqual(a.snapshot(),b.snapshot());
  assert.equal(a.shades.length,200);assert.equal(a.motes.length,100);assert.ok(a.shades.every(s=>Math.hypot(s.pos[0],s.pos[2])<40));
  for(let i=0;i<600;i++){a.tick++;a.simTick++;a.moveShades();}
  assert.ok(a.shades.every(s=>s.state==='wander'));assert.deepEqual(a.player.pos,[0,0,0]);assert.equal(a.player.flames,3);assert.equal(a.player.carried,0);assert.deepEqual(a.lanterns.slice(0,3).map(l=>l.fuel),[100,100,100]);
});
test('benchmark frame statistics use worst 1%, nearest-rank p95 and total measured time',()=>{
  const s=frameStatistics([...Array(99).fill(10),100]);assert.equal(s.frames,100);assert.equal(s.p1_low_fps,10);assert.equal(s.frame_ms_p95,10);assert.equal(s.avg_fps,100000/1090);assert.throws(()=>frameStatistics([]));
});
test('saved accessibility settings survive normalization and duplicate keys fall back',()=>{
  const s=sanitizeSettings({reduceMotion:true,largeText:true,keybindings:{...DEFAULT_KEYBINDINGS,up:'ArrowUp'}});assert.equal(s.keybindings.up,'ArrowUp');assert.ok(s.reduceMotion&&s.largeText);assert.equal(checkKeyConflict(s.keybindings,'jump','ArrowUp'),'up');
  assert.deepEqual(sanitizeSettings({keybindings:{up:'KeyS'}}).keybindings,DEFAULT_KEYBINDINGS);
  assert.ok(checkKeyConflict(s.keybindings,'jump','Escape'));
});
test('leaderboard sanitizes finite values, normalizes timezone and keeps ties in achieved order',()=>{
  const e=sanitizeEntry({name:'Mây',score:0,nights_won:NaN,achieved_at:'2026-11-20T16:00:00+07:00',seed:7});assert.equal(e.achieved_at,'2026-11-20T09:00:00.000Z');assert.equal(e.nights_won,0);
  const list=addLeaderboardEntry([e],{...e,name:'Dao',achieved_at:'2026-11-20T10:00:00Z'});assert.equal(list[0].name,'Mây');
});
