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
    keys(f, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash', 'pause'], 'frame');
    requireValue(integer(f.tick) && f.tick > last, 'tick phải là số nguyên không âm, tăng nghiêm ngặt'); last = f.tick;
    if ('move' in f) requireValue(Array.isArray(f.move) && f.move.length === 2 && f.move.every(n => finite(n) && n >= -1 && n <= 1), 'move không hợp lệ');
    if ('cam_yaw_deg' in f) requireValue(finite(f.cam_yaw_deg), 'cam_yaw_deg không hợp lệ');
    for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (b in f) requireValue(typeof f[b] === 'boolean', `${b} cần boolean`);
  }
  return value;
}
export function validateScenario(s, t, night = 1) {
  keys(s, ['player', 'random_motes', 'random_shades', 'random_drifters', 'wind_enabled', 'motes', 'shades', 'lanterns', 'drifters', 'charms', 'time_left_s'], 'scenario');
  for (const b of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (b in s) requireValue(typeof s[b] === 'boolean', `${b} cần boolean`);
  if ('time_left_s' in s) requireValue(finite(s.time_left_s) && s.time_left_s >= 0, 'time_left_s không hợp lệ');
  if ('player' in s) {
    keys(s.player, ['pos', 'carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks'], 'player');
    if ('pos' in s.player) requireValue(pos(s.player.pos), 'player.pos không hợp lệ');
    for (const key of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) if (key in s.player) requireValue(integer(s.player[key]), `${key} cần số tick không âm`);
    if ('carried' in s.player) requireValue(integer(s.player.carried) && s.player.carried <= t.carry_capacity, 'carried vượt sức chứa');
    if ('flames' in s.player) requireValue(integer(s.player.flames), 'flames không hợp lệ');
  }
  if ('motes' in s) {
    requireValue(Array.isArray(s.motes), 'motes cần array');
    for (const m of s.motes) {
      if (Array.isArray(m)) requireValue(pos(m), 'mote.pos không hợp lệ');
      else { keys(m, ['id', 'pos', 'kind', 'ttl_ticks'], 'mote'); requireValue(pos(m.pos), 'mote.pos không hợp lệ'); if ('kind' in m) requireValue(['random', 'dropped'].includes(m.kind), 'mote.kind không hợp lệ'); if ('ttl_ticks' in m) requireValue(integer(m.ttl_ticks), 'ttl_ticks không hợp lệ'); }
    }
  }
  if ('shades' in s) {
    requireValue(Array.isArray(s.shades), 'shades cần array');
    const ids = new Set();
    s.shades.forEach((shade, i) => {
      keys(shade, ['id', 'pos', 'state', 'state_ticks_left'], 'shade'); requireValue(pos(shade.pos), 'shade.pos không hợp lệ');
      if ('state' in shade) requireValue(['spawning', 'wander', 'chase', 'recoil', 'stunned'].includes(shade.state), 'shade.state không hợp lệ');
      if ('state_ticks_left' in shade) requireValue(integer(shade.state_ticks_left), 'state_ticks_left không hợp lệ');
      const id = shade.id ?? `S${i + 1}`;
      requireValue(typeof id === 'string' && id.length > 0 && !ids.has(id), 'shade.id không hợp lệ hoặc trùng'); ids.add(id);
    });
  }
  if ('lanterns' in s) {
    requireValue(Array.isArray(s.lanterns), 'lanterns cần array'); const ids = new Set();
    for (const l of s.lanterns) {
      keys(l, ['id', 'pos', 'deposited', 'lit'], 'lantern');
      requireValue(typeof l.id === 'string' && /^L[1-7]$/.test(l.id) && Number(l.id.slice(1)) <= night + 4 && !ids.has(l.id), 'lantern.id không hợp lệ hoặc trùng'); ids.add(l.id);
      if ('pos' in l) requireValue(pos(l.pos), 'lantern.pos không hợp lệ');
      if ('lit' in l) requireValue(typeof l.lit === 'boolean', 'lit cần boolean');
      if ('deposited' in l) requireValue(integer(l.deposited) && l.deposited <= t.lantern_cost, 'deposited không hợp lệ');
    }
  }
  for (const key of ['drifters', 'charms']) if (key in s) {
    requireValue(Array.isArray(s[key]), `${key} cần array`); const ids = new Set();
    for (const [i, item] of s[key].entries()) {
      keys(item, key === 'drifters' ? ['id', 'pos', 'state', 'stolen', 'state_ticks_left'] : ['id', 'pos', 'available', 'respawn_ticks'], key);
      requireValue(pos(item.pos) || (key === 'charms' && item.pos === undefined && /^C[12]$/.test(item.id) && Number(item.id.slice(1)) <= night - 1), `${key}.pos không hợp lệ`);
      const id = item.id ?? `${key === 'drifters' ? 'D' : 'C'}${i + 1}`;
      requireValue(typeof id === 'string' && id.length > 0 && !ids.has(id), `${key}.id không hợp lệ`); ids.add(id);
      if ('state' in item) requireValue(['idle', 'chase', 'flee', 'removed'].includes(item.state), 'drifter.state không hợp lệ');
      for (const n of ['stolen', 'state_ticks_left', 'respawn_ticks']) if (n in item) requireValue(integer(item[n]), `${n} không hợp lệ`);
      if ('available' in item) requireValue(typeof item.available === 'boolean', 'available cần boolean');
    }
  }
  return s;
}
