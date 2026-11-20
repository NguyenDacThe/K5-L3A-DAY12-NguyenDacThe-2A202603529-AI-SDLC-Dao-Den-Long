// The caller runs timers before pickup/pulse, movement before contacts, spawn last.
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export function createDrifter(value, index) {
  return { id: value.id ?? `D${index + 1}`, pos: [...value.pos], state: value.state ?? 'idle', stolen: value.stolen ?? 0, ticksLeft: value.state_ticks_left ?? ((value.state ?? 'idle') === 'flee' ? 240 : 0) };
}
export function tickDrifterTimers(drifters) {
  for (const d of drifters) if (d.state === 'flee' && --d.ticksLeft <= 0) d.state = 'removed';
}
export function pulseDrifters(drifters, player, radius, drop, emit) {
  for (const d of drifters) {
    if (d.state === 'removed' || Math.hypot(d.pos[0] - player.pos[0], d.pos[1] - player.pos[1] - .8, d.pos[2] - player.pos[2]) > radius) continue;
    if (d.state === 'chase') { d.state = 'flee'; d.ticksLeft = 240; }
    else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen; drop(d.pos, amount); d.stolen = 0; d.ticksLeft = 120;
      emit('drifter_drop', { drifter_id: d.id, amount });
    }
  }
}
export function moveDrifters(drifters, player, simTick) {
  for (const d of drifters) {
    if (d.state === 'removed') continue;
    if (d.state === 'idle' || d.state === 'chase') d.state = player.carried >= 5 && distance(d.pos, player.pos) <= 15 ? 'chase' : 'idle';
    let dx, dz, speed;
    if (d.state === 'idle') { const a = simTick / 120; dx = Math.cos(a); dz = Math.sin(a); speed = 2; }
    else { const delta = distance(d.pos, player.pos); dx = delta ? (player.pos[0] - d.pos[0]) / delta : 1; dz = delta ? (player.pos[2] - d.pos[2]) / delta : 0; speed = 7 * (d.state === 'flee' ? -1 : 1); }
    d.pos[0] += dx * speed / 60; d.pos[2] += dz * speed / 60;
  }
}
export function stealDrifters(drifters, player, emit) {
  for (const d of [...drifters].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (d.state !== 'chase' || distance(d.pos, player.pos) > 1.2) continue;
    const amount = Math.min(3, player.carried); player.carried -= amount;
    d.stolen = amount; d.state = 'flee'; d.ticksLeft = 240;
    emit('drifter_steal', { drifter_id: d.id, amount, carried: player.carried });
  }
}
