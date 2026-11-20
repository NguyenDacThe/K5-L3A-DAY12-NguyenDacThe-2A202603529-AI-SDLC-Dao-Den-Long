import { Game } from './game.mjs';
export function createBenchmark(tuning, seed) {
  const game = new Game(tuning, seed, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: 100 })) }, 1);
  game.benchmark = true;
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const point = () => { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 39; return [r * Math.cos(a), .8, r * Math.sin(a)]; };
  game.shades = Array.from({ length: 200 }, (_, i) => ({ id: `S${i + 1}`, pos: point(), state: 'wander', ticksLeft: 0, pushTicks: 0, recoilTicks: 0, evacuateTicks: 0, targetLanternId: null, drainTicks: 0 }));
  game.motes = Array.from({ length: 100 }, (_, i) => { const p = point(); p[1] = 0; return { id: `M${i + 1}`, pos: p, kind: 'random', ttlTicks: null, born: 0 }; });
  return game;
}
export function frameStatistics(samples) {
  if (!samples.length || samples.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Invalid frame times');
  const sorted = [...samples].sort((a, b) => a - b), count = samples.length, k = Math.max(1, Math.ceil(.01 * count));
  const worst = sorted.slice(-k).reduce((sum, n) => sum + n, 0) / k;
  return { avg_fps: 1000 * count / samples.reduce((a, b) => a + b, 0), p1_low_fps: 1000 / worst, frame_ms_p95: sorted[Math.max(0, Math.ceil(.95 * count) - 1)], frames: count };
}
