const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = n => typeof n === 'number' && Number.isFinite(n);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const pos = v => Array.isArray(v) && v.length === 3 && v.every(finite);
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function keys(value, allowed, label) { requireValue(object(value), `${label}: cần object`); for (const key of Object.keys(value)) requireValue(allowed.includes(key), `${label}: trường không hỗ trợ ${key}`); }
export function validateInputs(value) {
  keys(value, ['frames'], 'inputs'); requireValue(Array.isArray(value.frames), 'inputs.frames cần array');
  let last = -1;
  for (const f of value.frames) {
    keys(f, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'], 'frame');
    requireValue(integer(f.tick) && f.tick > last, 'tick phải là số nguyên không âm, tăng nghiêm ngặt'); last = f.tick;
    if ('move' in f) requireValue(Array.isArray(f.move) && f.move.length === 2 && f.move.every(n => finite(n) && n >= -1 && n <= 1), 'move không hợp lệ');
    if ('cam_yaw_deg' in f) requireValue(finite(f.cam_yaw_deg), 'cam_yaw_deg không hợp lệ');
    for (const b of ['jump', 'interact', 'pulse', 'dash']) if (b in f) requireValue(typeof f[b] === 'boolean', `${b} cần boolean`);
  }
  return value;
}
export function validateScenario(s, t) {
  keys(s, ['player', 'random_motes', 'random_shades', 'motes', 'shades', 'lanterns', 'time_left_s'], 'scenario');
  for (const b of ['random_motes', 'random_shades']) if (b in s) requireValue(typeof s[b] === 'boolean', `${b} cần boolean`);
  if ('time_left_s' in s) requireValue(finite(s.time_left_s) && s.time_left_s >= 0, 'time_left_s không hợp lệ');
  if ('player' in s) {
    keys(s.player, ['pos', 'carried', 'flames'], 'player');
    if ('pos' in s.player) requireValue(pos(s.player.pos) && s.player.pos[1] >= 0, 'player.pos không hợp lệ');
    if ('carried' in s.player) requireValue(integer(s.player.carried) && s.player.carried <= t.carry_capacity, 'carried vượt sức chứa');
    if ('flames' in s.player) requireValue(integer(s.player.flames), 'flames không hợp lệ');
  }
  if ('motes' in s) requireValue(Array.isArray(s.motes) && s.motes.every(pos), 'motes không hợp lệ');
  if ('shades' in s) {
    requireValue(Array.isArray(s.shades), 'shades cần array');
    const ids = new Set();
    s.shades.forEach((shade, i) => {
      keys(shade, ['id', 'pos'], 'shade'); requireValue(pos(shade.pos), 'shade.pos không hợp lệ');
      const id = shade.id ?? `S${i + 1}`;
      requireValue(typeof id === 'string' && id.length > 0 && !ids.has(id), 'shade.id không hợp lệ hoặc trùng'); ids.add(id);
    });
  }
  if ('lanterns' in s) {
    requireValue(Array.isArray(s.lanterns), 'lanterns cần array'); const ids = new Set();
    for (const l of s.lanterns) {
      keys(l, ['id', 'pos', 'deposited', 'lit'], 'lantern');
      requireValue(/^L[1-5]$/.test(l.id) && !ids.has(l.id), 'lantern.id không hợp lệ hoặc trùng'); ids.add(l.id);
      if ('pos' in l) requireValue(pos(l.pos), 'lantern.pos không hợp lệ');
      if ('lit' in l) requireValue(typeof l.lit === 'boolean', 'lit cần boolean');
      if ('deposited' in l) requireValue(integer(l.deposited) && l.deposited <= t.lantern_cost, 'deposited không hợp lệ');
    }
  }
  return s;
}
