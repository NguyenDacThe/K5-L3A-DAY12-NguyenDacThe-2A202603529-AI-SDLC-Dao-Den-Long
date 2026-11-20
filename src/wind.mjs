// Schedule is gameplay time, not output tick; caller never advances it on pause.
export function updateWind(wind, simTick, enabled, random) {
  wind.warning = enabled && simTick >= 1680 && simTick % 1800 >= 1680;
  if (!enabled) { wind.active = false; return; }
  if (simTick > 0 && simTick % 1800 === 0) wind.dir_deg = random() * 360;
  wind.active = simTick >= 1800 && simTick % 1800 < 300;
}
export function windVelocity(wind) {
  if (!wind.active) return [0, 0, 0];
  const angle = wind.dir_deg * Math.PI / 180;
  return [2 * Math.cos(angle), 0, 2 * Math.sin(angle)];
}
