export function createCharms(world, overrides) {
  return overrides !== undefined
    ? overrides.map((c, i) => ({ id: c.id ?? `C${i + 1}`, pos: [...(c.pos ?? world.charmPoints[Number(c.id?.slice(1) ?? i + 1) - 1])], available: c.available ?? true, respawnTicks: c.respawn_ticks ?? 0 }))
    : world.charmPoints.map((pos, i) => ({ id: `C${i + 1}`, pos: [...pos], available: true, respawnTicks: 0 }));
}
export function tickCharms(charms) {
  for (const c of charms) if (!c.available && c.respawnTicks > 0 && --c.respawnTicks === 0) c.available = true;
}
export function pickupCharms(charms, player, radius, emit) {
  for (const c of charms) if (c.available && Math.abs(c.pos[1] - player.pos[1]) <= 1.5 && Math.hypot(c.pos[0] - player.pos[0], c.pos[2] - player.pos[2]) <= radius) {
    c.available = false; c.respawnTicks = 2700; player.charmTicks = 600;
    emit('charm_picked', { charm_id: c.id, charm_ticks: 600 });
  }
}
