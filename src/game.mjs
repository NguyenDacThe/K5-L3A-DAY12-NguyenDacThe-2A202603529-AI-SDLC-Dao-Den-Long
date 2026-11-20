// Shared deterministic simulation: no DOM, renderer, clock or filesystem.
export const DT = 1 / 60;
export const ISLAND_RADIUS = 32;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const round = n => Math.round(n * 1000) / 1000;
const rounded = p => p.map(round);
export class Game {
  constructor(tuning, seed = 1, scenario = {}) {
    this.t = tuning; this.seed = seed >>> 0; this.tick = 0; this.state = 'playing'; this.score = 0;
    this.events = []; this.moteId = 0; this.shadeId = 0;
    this.player = { pos: [0, 0, 0], carried: 0, flames: tuning.flames, ...structuredClone(scenario.player ?? {}) };
    this.initialTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.time = this.initialTime; this.vy = 0; this.invulnUntil = 0; this.pulseUntil = 0;
    this.previous = { jump: false, interact: false, pulse: false };
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.lanterns = Array.from({ length: 5 }, (_, i) => {
      const a = i * Math.PI * 2 / 5;
      return { id: `L${i + 1}`, pos: [Math.sin(a) * 21, 0, Math.cos(a) * 21], deposited: 0, lit: false };
    });
    for (const update of scenario.lanterns ?? []) {
      const l = this.lanterns.find(l => l.id === update.id);
      Object.assign(l, structuredClone(update));
      if (l.lit || l.deposited >= tuning.lantern_cost) { l.lit = true; l.deposited = tuning.lantern_cost; }
    }
    this.motes = scenario.motes ? scenario.motes.map(pos => this.makeMote(pos)) : this.randomMotes ? Array.from({ length: 100 }, () => this.makeMote(this.randomPos(28))) : [];
    this.shades = scenario.shades ? scenario.shades.map((s, i) => ({ id: s.id ?? `S${i + 1}`, pos: [...s.pos], state: 'chase', stunnedUntil: 0 })) : this.randomShades ? Array.from({ length: 4 }, () => this.makeShade()) : [];
    this.shadeId = this.shades.length;
    this.usedShadeIds = new Set(this.shades.map(s => s.id));
    for (const shade of this.shades) this.keepOutsideLights(shade);
  }
  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  randomPos(radius) { const a = this.random() * Math.PI * 2, r = Math.sqrt(this.random()) * radius; return [Math.cos(a) * r, 0, Math.sin(a) * r]; }
  makeMote(pos) { return { id: `M${++this.moteId}`, pos: [...pos] }; }
  makeShade() { const a = this.random() * Math.PI * 2; return { id: `S${++this.shadeId}`, pos: [Math.cos(a) * 29, 0, Math.sin(a) * 29], state: 'chase', stunnedUntil: 0 }; }
  emit(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  keepOutsideLights(shade) {
    // Repeated projection also handles overlapping safe zones in custom scenarios.
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;
      for (const l of this.lanterns.filter(l => l.lit)) {
        const d = distance(shade.pos, l.pos), r = this.t.safe_radius;
        if (d <= r) {
          const dx = d > 0 ? (shade.pos[0] - l.pos[0]) / d : 1;
          const dz = d > 0 ? (shade.pos[2] - l.pos[2]) / d : 0;
          shade.pos[0] = l.pos[0] + dx * (r + 0.001);
          shade.pos[2] = l.pos[2] + dz * (r + 0.001); changed = true;
        }
      }
      if (!changed) break;
    }
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += Math.floor(Math.max(0, this.time)) * this.t.score.per_second_left + this.player.flames * this.t.score.per_flame_left;
    this.emit('game_over', { result: state, reason });
  }
  step(input = {}) {
    if (this.state !== 'playing') return [];
    this.tick++; this.events = []; const p = this.player, t = this.t;
    this.time = Math.max(0, this.initialTime - this.tick / 60);
    const edge = key => !!input[key] && !this.previous[key];
    let [x, z] = input.move ?? [0, 0]; const length = Math.max(1, Math.hypot(x, z)); x /= length; z /= length;
    const a = (input.cam_yaw_deg ?? 0) * Math.PI / 180;
    p.pos[0] += (x * Math.cos(a) + z * Math.sin(a)) * t.player_speed * DT;
    p.pos[2] += (-x * Math.sin(a) + z * Math.cos(a)) * t.player_speed * DT;
    const radius = Math.hypot(p.pos[0], p.pos[2]);
    if (radius > ISLAND_RADIUS) { p.pos[0] *= ISLAND_RADIUS / radius; p.pos[2] *= ISLAND_RADIUS / radius; }
    if (edge('jump') && p.pos[1] === 0) this.vy = 6;
    if (this.vy || p.pos[1] > 0) { p.pos[1] = Math.max(0, p.pos[1] + this.vy * DT); this.vy -= 18 * DT; if (!p.pos[1]) this.vy = 0; }
    this.motes = this.motes.filter(m => {
      if (p.carried < t.carry_capacity && distance(p.pos, m.pos) <= t.pickup_radius) {
        p.carried++; this.score += t.score.per_mote; this.emit('mote_picked', { carried: p.carried }); return false;
      } return true;
    });
    if (edge('interact')) {
      const l = this.lanterns.filter(l => !l.lit && distance(l.pos, p.pos) <= t.interact_radius).sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
      if (l && p.carried > 0) {
        const amount = Math.min(p.carried, t.lantern_cost - l.deposited);
        p.carried -= amount; l.deposited += amount;
        this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited >= t.lantern_cost) { l.lit = true; this.score += t.score.per_lantern; this.emit('lantern_lit', { lantern_id: l.id }); }
      }
    }
    if (edge('pulse') && p.carried >= t.pulse_cost && this.tick >= this.pulseUntil) {
      p.carried -= t.pulse_cost; this.pulseUntil = this.tick + Math.round(t.pulse_cooldown_s * 60);
      const ids = [];
      for (const s of this.shades) if (distance(p.pos, s.pos) <= t.pulse_radius) {
        ids.push(s.id); s.state = 'stunned'; s.stunnedUntil = this.tick + Math.round(t.pulse_stun_s * 60);
        const d = distance(p.pos, s.pos), dx = d ? (s.pos[0] - p.pos[0]) / d : 1, dz = d ? (s.pos[2] - p.pos[2]) / d : 0;
        s.pos[0] += dx * t.pulse_push_m; s.pos[2] += dz * t.pulse_push_m;
        this.score += t.score.per_stun;
      }
      this.emit('pulse', { stunned_ids: ids });
    }
    for (const s of this.shades) {
      if (this.tick >= s.stunnedUntil) s.state = 'chase';
      if (s.state !== 'stunned') {
        const d = distance(s.pos, p.pos), move = Math.min(d, t.shade_speed * DT);
        if (d) { s.pos[0] += (p.pos[0] - s.pos[0]) / d * move; s.pos[2] += (p.pos[2] - s.pos[2]) / d * move; }
      }
      this.keepOutsideLights(s);
      const safe = this.lanterns.some(l => l.lit && distance(p.pos, l.pos) <= t.safe_radius);
      if (!safe && s.state !== 'stunned' && distance(s.pos, p.pos) <= t.shade_hit_radius && this.tick >= this.invulnUntil) {
        const dropped = Math.floor(p.carried * t.hit_drop_ratio); p.carried -= dropped; p.flames = Math.max(0, p.flames - 1);
        this.invulnUntil = this.tick + Math.round(t.invuln_s * 60);
        // Dropped light dissipates; it is not immediately picked up again.
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.time <= 0) this.finish('lost', 'dawn');
    if (this.state === 'playing') {
      if (this.randomMotes && this.tick % 180 === 0 && this.motes.length < 100) this.motes.push(this.makeMote(this.randomPos(28)));
      if (this.randomShades && this.tick % 600 === 0 && this.shades.length < 10) {
        let s; do { s = this.makeShade(); } while (this.usedShadeIds.has(s.id));
        this.usedShadeIds.add(s.id); this.keepOutsideLights(s); this.shades.push(s); this.emit('shade_spawned', { id: s.id });
      }
    }
    this.previous = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };
    return this.events;
  }
  snapshot() {
    return { type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state, time_left_s: this.time, score: this.score,
      player: { pos: rounded(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ ...l, pos: rounded(l.pos) })),
      shades: this.shades.map(s => ({ id: s.id, pos: rounded(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: rounded(m.pos) })) };
  }
}
