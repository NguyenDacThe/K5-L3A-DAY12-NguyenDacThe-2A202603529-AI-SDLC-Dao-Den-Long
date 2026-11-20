const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, charms: [] };

export const phase3Cases = {
  'fuel-decay': {
    night: 1, ticks: 60, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 0], invuln_ticks: 999 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 100 }]
    }
  },
  'lantern-out': {
    night: 1, ticks: 5, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 0], invuln_ticks: 999 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 0.03 }]
    }
  },
  'relight-cost': {
    night: 1, ticks: 2, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 24], carried: 5 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: false, ever_lit: true, deposited: 0 }]
    },
    inputs: { frames: [{ tick: 0, interact: true }] }
  },
  'refuel-clamp': {
    night: 1, ticks: 2, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 24], carried: 5 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 82 }]
    },
    inputs: { frames: [{ tick: 0, interact: true }] }
  },
  'capacity-grow': {
    night: 1, ticks: 2, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 24], carried: 10, successful_lights: 0 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0 }]
    },
    inputs: { frames: [{ tick: 0, interact: true }] }
  },
  'shade-drain': {
    night: 1, ticks: 60, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 0], invuln_ticks: 999 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [0, 0.8, 24], state: 'drain', target_lantern_id: 'L1' }]
    }
  },
  'drain-pulse': {
    night: 1, ticks: 2, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 23], carried: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [0, 0.8, 24], state: 'drain', target_lantern_id: 'L1' }]
    },
    inputs: { frames: [{ tick: 0, pulse: true }] }
  },
  'refuel-evacuate': {
    night: 1, ticks: 30, every: 1,
    scenario: {
      ...empty,
      player: { pos: [0, 0, 24], carried: 5 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [0, 0.8, 22], state: 'wander', target_lantern_id: 'L1' }]
    },
    inputs: { frames: [{ tick: 0, interact: true }] }
  },
  'dawn-survived': {
    night: 1, ticks: 2, every: 1,
    scenario: {
      ...empty,
      time_left_s: 1 / 60,
      player: { pos: [0, 0, 0], flames: 3 },
      lanterns: [
        { id: 'L1', lit: true, fuel: 90 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 70 },
        { id: 'L4', lit: false, fuel: 0 },
        { id: 'L5', lit: false, fuel: 0 }
      ]
    }
  },
  'all-lit-continuous': {
    night: 1, ticks: 30, every: 1,
    scenario: {
      ...empty,
      time_left_s: 10,
      player: { pos: [0, 0, 0], flames: 3 },
      lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true, fuel: 100 }))
    }
  }
};
