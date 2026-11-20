// Integer units: one fuel unit is 1/60 fuel. Never round the simulation.
export const FUEL_SCALE = 60;
export const fuelValue = units => Math.round(units / FUEL_SCALE * 10) / 10;
export const lightCost = (lamp, t) => lamp.ever_lit ? t.relight_cost : t.lantern_cost;
export const acceptsLight = (lamp, t) => !lamp.lit || lamp.fuelUnits < t.fuel_max * FUEL_SCALE;
export const safeLight = (lamp, t) => lamp.lit && lamp.fuelUnits >= t.low_fuel_threshold * FUEL_SCALE;
export function createLantern(id, pos, update = {}, t) {
  const ever = update.ever_lit ?? false;
  const lit = update.lit ?? ((update.deposited ?? 0) >= (ever ? t.relight_cost : t.lantern_cost));
  return {
    id,
    pos: [...(update.pos ?? pos)],
    deposited: update.deposited ?? (lit ? (ever ? t.relight_cost : t.lantern_cost) : 0),
    lit,
    fuelUnits: lit ? Math.round((update.fuel ?? t.fuel_max) * FUEL_SCALE) : 0,
    ever_lit: lit || ever,
    relit_count: update.relit_count ?? 0,
    get fuel() { return this.fuelUnits / FUEL_SCALE; }
  };
}
