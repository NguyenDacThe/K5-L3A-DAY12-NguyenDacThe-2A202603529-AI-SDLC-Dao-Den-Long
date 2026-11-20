import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Game } from './game.mjs';
import { validateInputs, validateScenario } from './validation.mjs';
const tuning = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
export function simulate({ seed, ticks, every = 10, scenario = {}, inputs = { frames: [] } }) {
  validateScenario(scenario, tuning); validateInputs(inputs);
  const game = new Game(tuning, seed, scenario), rows = [game.snapshot()];
  let nextFrame = 0; const input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
  for (let k = 0; k < ticks && game.state === 'playing'; k++) {
    if (inputs.frames[nextFrame]?.tick === k) Object.assign(input, inputs.frames[nextFrame++]);
    rows.push(...game.step(input));
    if (game.tick % every === 0) rows.push(game.snapshot());
  }
  rows.push({ type: 'end', ticks: game.tick, state: game.state, score: game.score });
  return rows.map(row => JSON.stringify(row)).join('\n') + '\n';
}
export function main(args) {
  try {
    const opts = {}, allowed = ['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'];
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].slice(2);
      if (!args[i].startsWith('--') || !allowed.includes(key) || opts[key] !== undefined || args[i + 1] === undefined) throw new Error('Tham số CLI không hợp lệ');
      opts[key] = args[i + 1];
    }
    for (const key of ['seed', 'night', 'ticks', 'out']) if (opts[key] === undefined) throw new Error(`Thiếu --${key}`);
    if (!/^-?\d+$/.test(opts.seed) || !Number.isSafeInteger(Number(opts.seed))) throw new Error('seed phải là số nguyên');
    if (opts.night !== '1') throw new Error('Phase 1 chỉ hỗ trợ --night 1');
    if (!/^\d+$/.test(opts.ticks) || !Number.isSafeInteger(Number(opts.ticks))) throw new Error('ticks không hợp lệ');
    const every = Number(opts['snapshot-every'] ?? 10);
    if (!Number.isSafeInteger(every) || every <= 0) throw new Error('snapshot-every phải là số nguyên dương');
    let scenario = {}, inputs = { frames: [] };
    try {
      if (opts.scenario) scenario = JSON.parse(readFileSync(opts.scenario, 'utf8').replace(/^\uFEFF/, ''));
      if (opts.inputs) inputs = JSON.parse(readFileSync(opts.inputs, 'utf8').replace(/^\uFEFF/, ''));
      validateScenario(scenario, tuning); validateInputs(inputs);
    } catch (error) { console.error(error.message); return 2; }
    writeFileSync(opts.out, simulate({ seed: Number(opts.seed), ticks: Number(opts.ticks), every, scenario, inputs }));
    return 0;
  } catch (error) { console.error(error.message); return 1; }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
