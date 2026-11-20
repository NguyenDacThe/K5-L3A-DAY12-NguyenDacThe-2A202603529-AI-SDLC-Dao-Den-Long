import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, totalmem, platform, release } from 'node:os';
import { simulate } from '../src/headless.mjs';
import { cases } from '../tests/phase2-cases.mjs';
const dir = 'docs/proof/phase-2'; mkdirSync(dir, { recursive: true });
const files = readdirSync('tests').filter(f => f.endsWith('.test.mjs')).sort().map(f => `tests/${f}`);
const tests = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], { encoding: 'utf8' });
writeFileSync(`${dir}/tests.txt`, tests.stdout + tests.stderr); process.stdout.write(tests.stdout); process.stderr.write(tests.stderr);
if (tests.status !== 0) process.exit(tests.status ?? 1);
for (const [name, options] of Object.entries(cases)) {
  writeFileSync(`${dir}/${name}.scenario.json`, JSON.stringify(options.scenario, null, 2) + '\n');
  writeFileSync(`${dir}/${name}.inputs.json`, JSON.stringify(options.inputs ?? { frames: [] }, null, 2) + '\n');
  writeFileSync(`${dir}/${name}.jsonl`, simulate({ seed: 42, ...options }));
}
const perf = [];
for (const night of [1, 2, 3]) {
  // Keep all scheduled spawns enabled; invulnerability prevents an early hit loss.
  const options = { seed: 42, night, ticks: 21600, scenario: { player: { invuln_ticks: 30000 } } };
  const begin = performance.now(), a = simulate(options), elapsed = performance.now() - begin;
  const b = simulate(options); if (a !== b) throw new Error(`Night ${night}: output nondeterministic`);
  if (elapsed > 30000) throw new Error(`Night ${night}: exceeds 30 seconds`);
  perf.push({ night, options, elapsed_ms: elapsed, seconds_limit: 30, end: JSON.parse(a.trim().split('\n').at(-1)), byte_identical: a === b, sha256: createHash('sha256').update(a).digest('hex'), bytes: Buffer.byteLength(a) });
}
writeFileSync(`${dir}/verification.json`, JSON.stringify({ node: process.version, platform: platform(), os: release(), cpu: cpus()[0]?.model, logical_cpus: cpus().length, ram_gb: totalmem() / 2 ** 30, tests_exit_code: tests.status, headless: perf }, null, 2) + '\n');
console.log(`Phase 2 evidence: ${dir}`); console.log(JSON.stringify(perf.map(p => ({ night: p.night, ms: p.elapsed_ms, ticks: p.end.ticks }))));
