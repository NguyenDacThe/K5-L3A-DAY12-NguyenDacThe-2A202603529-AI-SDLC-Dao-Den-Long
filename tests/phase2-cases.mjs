const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, charms: [] };
export const cases = {
  pause: { ticks: 20, every: 1, scenario: { ...empty, player: { charm_ticks: 300 } }, inputs: { frames: [{ tick: 0, pause: true, move: [0, 1] }, { tick: 1, pause: false }, { tick: 10, pause: true }, { tick: 11, pause: false }] } },
  dash: { ticks: 12, every: 1, scenario: empty, inputs: { frames: [{ tick: 0, dash: true, move: [1, 0] }] } },
  'air-dash': { ticks: 12, every: 1, scenario: { ...empty, player: { pos: [0, 5, 0] } }, inputs: { frames: [{ tick: 0, dash: true }] } },
  'charm-dash': { ticks: 30, every: 1, scenario: { ...empty, player: { charm_ticks: 100 } }, inputs: { frames: [{ tick: 0, move: [1, 0], dash: true }, { tick: 1, dash: false }, { tick: 12, dash: true }, { tick: 13, dash: false }, { tick: 24, dash: true }] } },
  charm: { night: 2, ticks: 2710, every: 1, scenario: { ...empty, player: { pos: [35, 0, 0] }, charms: [{ id: 'C1', pos: [35, 0, 0] }] } },
  steal: { night: 2, ticks: 1, every: 1, scenario: { ...empty, player: { carried: 8, invuln_ticks: 90 }, drifters: [{ id: 'D1', pos: [0, .8, 0] }], shades: [{ id: 'S1', pos: [0, .8, 0] }] } },
  'drifter-drop': { night: 2, ticks: 1, every: 1, scenario: { ...empty, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [2, .8, 0], state: 'flee', stolen: 3, state_ticks_left: 100 }] }, inputs: { frames: [{ tick: 0, pulse: true }] } },
  'pulse-3d': { ticks: 15, every: 1, scenario: { ...empty, player: { carried: 3 }, shades: [{ id: 'near', pos: [5, .8, 0] }, { id: 'high', pos: [0, 6, 0] }] }, inputs: { frames: [{ tick: 0, pulse: true }] } },
  fall: { ticks: 61, every: 1, scenario: { ...empty, player: { pos: [50, -11, 0], carried: 7, invuln_ticks: 999 } } },
  pad: { night: 2, ticks: 90, every: 1, scenario: { ...empty, player: { pos: [20, 0, 18] } } },
  'tower-pad': { night: 3, ticks: 90, every: 1, scenario: { ...empty, player: { pos: [0, 3, 13] } } },
  ramp: { night: 3, ticks: 75, every: 1, scenario: { ...empty, player: { pos: [31 * Math.cos(Math.PI / 6), 0, 15.5] } }, inputs: { frames: [{ tick: 0, move: [-Math.cos(Math.PI / 6), -.5] }] } },
  wind: { night: 3, ticks: 2100, every: 10, scenario: { ...empty, wind_enabled: true } },
  spawn: { night: 2, ticks: 1201, every: 1, scenario: { ...empty, random_shades: true, random_drifters: true } },
  'hit-drops': { ticks: 2, every: 1, scenario: { ...empty, player: { carried: 9 }, shades: [{ pos: [0, .8, 0] }] } }
};
