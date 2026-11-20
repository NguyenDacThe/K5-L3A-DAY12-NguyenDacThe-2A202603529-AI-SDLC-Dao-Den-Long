import { createWorld, terrainHeight, padAt, launchVelocity, blockedByTower } from './world.mjs';
import { createCharms, tickCharms, pickupCharms } from './charms.mjs';
import { createDrifter, tickDrifterTimers, moveDrifters, stealDrifters, pulseDrifters } from './drifters.mjs';
import { updateWind, windVelocity } from './wind.mjs';
export const DT = 1 / 60;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const r = n => Math.round(n * 1000) / 1000;
const rp = p => p.map(r);
const idSort = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export class Game {
  constructor(tuning, seed = 1, scenario = {}, night = 1) {
    this.t = tuning; this.night = night; this.world = createWorld(night); this.seed = seed >>> 0;
    this.tick = 0; this.simTick = 0; this.state = 'playing'; this.score = 0; this.events = []; this.previous = {};
    const s = scenario.player ?? {};
    this.player = { pos: [...(s.pos ?? this.world.spawn)], vel: [0, 0, 0], flames: s.flames ?? 3, carried: s.carried ?? 0,
      invulnTicks: s.invuln_ticks ?? 0, dashCd: s.dash_cd_ticks ?? 0, pulseCd: s.pulse_cd_ticks ?? 0, charmTicks: s.charm_ticks ?? 0 };
    this.player.grounded = this.player.pos[1] === 0 || Math.abs((terrainHeight(this.world, this.player.pos[0], this.player.pos[2]) ?? -999) - this.player.pos[1]) < .01;
    this.facing = [0, 1]; this.dashTicks = 0; this.dashDirection = [0, 1]; this.launch = null; this.respawnTicks = 0;
    this.time = scenario.time_left_s ?? tuning[`night${night}_duration_s`]; this.initialTime = this.time;
    this.randomMotes = scenario.random_motes ?? true; this.randomShades = scenario.random_shades ?? true;
    this.randomDrifters = scenario.random_drifters ?? true; this.windEnabled = night === 3 && (scenario.wind_enabled ?? true);
    this.wind = { active: false, dir_deg: 0, warning: false };
    this.lanterns = this.world.lanternPositions.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], deposited: 0, lit: false }));
    for (const v of scenario.lanterns ?? []) { const l = this.lanterns.find(l => l.id === v.id); Object.assign(l, structuredClone(v)); if (l.lit || l.deposited === tuning.lantern_cost) { l.lit = true; l.deposited = tuning.lantern_cost; } }
    this.moteId = 0; this.shadeId = 0; this.drifterId = 0; this.usedMoteIds = new Set();
    this.motes = (scenario.motes ?? []).map(m => this.mote(Array.isArray(m) ? m : m.pos, m.kind ?? 'random', m.ttl_ticks ?? null, m.id));
    if (scenario.motes === undefined && this.randomMotes) for (let i = 0; i < 20; i++) this.spawnMote();
    this.shades = (scenario.shades ?? []).map((s, i) => ({ id: s.id ?? `S${i + 1}`, pos: [...s.pos], state: s.state ?? 'chase', ticksLeft: s.state_ticks_left ?? 0, pushTicks: 0, push: [0, 0], recoilTicks: s.state === 'recoil' ? (s.state_ticks_left ?? 60) : 0, recoil: [1, 0], evacuateTicks: 0 }));
    this.drifters = (scenario.drifters ?? []).map(createDrifter);
    this.charms = createCharms(this.world, scenario.charms);
    this.usedShadeIds = new Set(this.shades.map(s => s.id)); this.usedDrifterIds = new Set(this.drifters.map(d => d.id));
    this.updateSafeZones();
  }
  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  emit(name, data = {}) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  mote(pos, kind = 'random', ttlTicks = null, id) {
    if (id === undefined) do { id = `M${++this.moteId}`; } while (this.usedMoteIds.has(id));
    this.usedMoteIds.add(id); return { id, pos: [...pos], kind, ttlTicks, born: this.simTick };
  }
  spawnMote() {
    if (this.motes.length >= 30) return;
    const free = this.world.motePoints.filter(p => !this.motes.some(m => m.kind === 'random' && dist(m.pos, p) < .01 && m.pos[1] === p[1]));
    if (free.length) this.motes.push(this.mote(free[Math.floor(this.random() * free.length)]));
  }
  spawnShade() {
    if (this.shades.length >= this.world.shadeLimit) return;
    const free = this.world.shadePoints.filter(pos => dist(pos, this.player.pos) >= 15 && !this.shades.some(s => dist(s.pos, pos) < 1));
    if (!free.length) return;
    let id; do { id = `S${++this.shadeId}`; } while (this.usedShadeIds.has(id)); this.usedShadeIds.add(id);
    const pos = [...free[Math.floor(this.random() * free.length)]]; pos[1] += .8;
    this.shades.push({ id, pos, state: 'spawning', ticksLeft: 60, pushTicks: 0, push: [0, 0], recoilTicks: 0, recoil: [0, 0], evacuateTicks: 0 }); this.emit('shade_spawned', { id });
  }
  drop(pos, amount, scatter = true) {
    for (let i = 0; i < amount; i++) {
      const a = scatter ? this.random() * Math.PI * 2 : 0, radius = scatter ? 1.5 + this.random() : 0;
      const x = pos[0] + Math.cos(a) * radius, z = pos[2] + Math.sin(a) * radius, y = terrainHeight(this.world, x, z);
      this.motes.push(this.mote([x, y ?? pos[1], z], 'dropped', 480));
    }
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += Math.floor(Math.max(0, this.time)) * this.t.score.per_second_left + this.player.flames * this.t.score.per_flame_left;
    this.emit('game_over', { result: state, reason });
  }
  updateSafeZones() {
    for (const s of this.shades) {
      const l = this.lanterns.find(l => l.lit && dist(l.pos, s.pos) < this.t.safe_radius - 1e-8);
      if (l && !s.evacuateTicks) s.evacuateTicks = 30;
    }
  }
  movePlayer(input, edge) {
    const p = this.player;
    if (this.respawnTicks) return;
    let [x, z] = input.move ?? [0, 0], length = Math.max(1, Math.hypot(x, z)); x /= length; z /= length;
    const a = (input.cam_yaw_deg ?? 0) * Math.PI / 180, dx = x * Math.cos(a) + z * Math.sin(a), dz = -x * Math.sin(a) + z * Math.cos(a);
    if (dx || dz) { const l = Math.hypot(dx, dz); this.facing = [dx / l, dz / l]; }
    if (edge('dash') && !this.dashTicks && (!p.dashCd || p.charmTicks)) {
      this.dashDirection = [...this.facing]; this.dashTicks = 12; p.dashCd = p.charmTicks ? 0 : 90; this.emit('dash');
    }
    if (edge('jump') && p.grounded && !this.dashTicks) { p.vel[1] = 7; p.grounded = false; }
    const pad = padAt(this.world, p.pos, p.grounded);
    if (pad && !this.dashTicks) { p.vel = launchVelocity(pad, p.pos); this.launch = [p.vel[0], p.vel[2]]; p.grounded = false; }
    const speed = p.charmTicks ? 7.2 : this.t.player_speed;
    p.vel[0] = this.dashTicks ? this.dashDirection[0] * 14 : this.launch ? this.launch[0] : dx * speed;
    p.vel[2] = this.dashTicks ? this.dashDirection[1] * 14 : this.launch ? this.launch[1] : dz * speed;
    const wind = windVelocity(this.wind), next = [...p.pos];
    next[0] += (p.vel[0] + wind[0]) * DT; next[2] += (p.vel[2] + wind[2]) * DT;
    const height = terrainHeight(this.world, next[0], next[2]), oldHeight = terrainHeight(this.world, p.pos[0], p.pos[2]);
    const rampClimb = p.grounded && height !== null && oldHeight !== null && height - oldHeight <= .16;
    // Tier 0 spans the entire island. The contractual origin on night 3 is
    // beneath tier 2; allow leaving that space, but never walking into a wall.
    const underDeck = this.night === 3 && oldHeight > p.pos[1] + .16 && height === oldHeight;
    if (blockedByTower(this.world, next) || (height !== null && height > p.pos[1] + .16 && !rampClimb && !underDeck)) { next[0] = p.pos[0]; next[2] = p.pos[2]; p.vel[0] = p.vel[2] = 0; }
    let floor = terrainHeight(this.world, next[0], next[2]);
    if (this.night === 3 && floor > p.pos[1] + .16) floor = 0;
    if (this.dashTicks) { this.dashTicks--; if (floor === null || floor < next[1] - .05) p.grounded = false; /* airborne dash holds height and vertical velocity */ }
    else {
      if (p.grounded && floor !== null && Math.abs(floor - p.pos[1]) <= .16) { next[1] = floor; p.vel[1] = 0; }
      else { p.grounded = false; next[1] += p.vel[1] * DT; p.vel[1] -= 20 * DT; }
      if (!p.grounded && floor !== null && p.vel[1] <= 0 && p.pos[1] >= floor && next[1] <= floor) { next[1] = floor; p.vel[1] = 0; p.grounded = true; this.launch = null; }
    }
    p.pos = next;
    if (p.pos[1] < -10) {
      const lost = p.carried; p.carried = 0; p.flames = Math.max(0, p.flames - 1); this.respawnTicks = 60; this.dashTicks = 0; this.launch = null;
      p.vel = [0, 0, 0]; this.emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }
  pulse() {
    const p = this.player, t = this.t;
    if (p.carried < t.pulse_cost || p.pulseCd) return;
    p.carried -= t.pulse_cost; p.pulseCd = Math.round(t.pulse_cooldown_s * 60);
    const ids = [];
    for (const s of [...this.shades].sort(idSort)) if (Math.hypot(p.pos[0] - s.pos[0], p.pos[1] + .8 - s.pos[1], p.pos[2] - s.pos[2]) <= t.pulse_radius) {
      ids.push(s.id); s.state = 'stunned'; s.ticksLeft = 120; s.pushTicks = 15;
      const d = dist(s.pos, p.pos); s.push = d ? [(s.pos[0] - p.pos[0]) / d, (s.pos[2] - p.pos[2]) / d] : [1, 0];
      this.score += t.score.per_stun;
    }
    pulseDrifters(this.drifters, p, t.pulse_radius, (pos, n) => this.drop(pos, n, false), (name, data) => this.emit(name, data));
    this.emit('pulse', { stunned_ids: ids });
  }
  moveShades() {
    for (const s of this.shades) {
      const p = this.player, d = dist(s.pos, p.pos); let vx = 0, vz = 0;
      if (s.state === 'spawning' && !s.ticksLeft) s.state = 'wander';
      if (s.state === 'stunned' && !s.ticksLeft) s.state = 'wander';
      if (s.state === 'recoil' && !s.recoilTicks) s.state = 'wander';
      if (s.state === 'wander' && d <= 12) s.state = 'chase';
      else if (s.state === 'chase' && d > 18) s.state = 'wander';
      if (s.state === 'stunned' && s.pushTicks) { vx = s.push[0] * 4 / 15; vz = s.push[1] * 4 / 15; s.pushTicks--; }
      else if (s.state === 'recoil' && s.recoilTicks) { vx = s.recoil[0] * 2 / 60; vz = s.recoil[1] * 2 / 60; }
      else if (s.state === 'chase' && d) { const speed = this.night === 3 ? 4.5 : this.t.shade_speed; vx = (p.pos[0] - s.pos[0]) / d * speed * DT; vz = (p.pos[2] - s.pos[2]) / d * speed * DT; }
      else if (s.state === 'wander') { const a = (this.simTick / 120) + Number(s.id.replace(/\D/g, '') || 0); vx = Math.cos(a) / 60; vz = Math.sin(a) / 60; }
      const proposed = [s.pos[0] + vx, s.pos[1], s.pos[2] + vz];
      const floor = terrainHeight(this.world, proposed[0], proposed[2]);
      if (floor !== null && floor <= s.pos[1] + .16 && !blockedByTower(this.world, proposed)) { proposed[1] = floor + .8; s.pos = proposed; }
      for (const l of this.lanterns.filter(l => l.lit)) {
        const ds = dist(s.pos, l.pos), radius = this.t.safe_radius;
        if (ds < radius) {
          const dx = ds ? (s.pos[0] - l.pos[0]) / ds : 1, dz = ds ? (s.pos[2] - l.pos[2]) / ds : 0;
          const push = s.evacuateTicks ? (radius - ds) / s.evacuateTicks : radius - ds;
          s.pos[0] += dx * push; s.pos[2] += dz * push;
        }
      }
      if (s.evacuateTicks) s.evacuateTicks--;
    }
  }
  step(input = {}) {
    if (this.state === 'won' || this.state === 'lost') return [];
    this.tick++; this.events = [];
    const edge = key => !!input[key] && !this.previous[key];
    if (edge('pause')) { this.state = this.state === 'paused' ? 'playing' : 'paused'; this.emit(this.state === 'paused' ? 'paused' : 'resumed'); }
    const finishInput = () => { this.previous = { jump: !!input.jump, dash: !!input.dash, pulse: !!input.pulse, interact: !!input.interact, pause: !!input.pause }; };
    if (this.state === 'paused') { finishInput(); return this.events; }
    this.simTick++; this.time = Math.max(0, this.initialTime - this.simTick / 60); const p = this.player;
    for (const key of ['invulnTicks', 'dashCd', 'pulseCd', 'charmTicks']) if (p[key]) p[key]--;
    for (const s of this.shades) { if (s.ticksLeft) s.ticksLeft--; if (s.recoilTicks) s.recoilTicks--; }
    this.motes = this.motes.filter(m => m.ttlTicks === null || --m.ttlTicks > 0);
    tickCharms(this.charms); tickDrifterTimers(this.drifters); this.drifters = this.drifters.filter(d => d.state !== 'removed');
    updateWind(this.wind, this.simTick, this.windEnabled, () => this.random());
    if (this.respawnTicks && --this.respawnTicks === 0) { p.pos = [...this.world.spawn]; p.vel = [0, 0, 0]; p.grounded = true; p.invulnTicks = 90; }
    this.movePlayer(input, edge);
    if (!this.respawnTicks) {
      this.motes = this.motes.filter(m => {
        if (m.born < this.simTick && p.carried < this.t.carry_capacity && dist(p.pos, m.pos) <= this.t.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= 1.5) {
          p.carried++; this.emit('mote_picked', { carried: p.carried }); return false;
        } return true;
      });
      pickupCharms(this.charms, p, this.t.pickup_radius, (name, data) => this.emit(name, data));
      if (edge('interact')) {
        const l = this.lanterns.filter(l => !l.lit && dist(l.pos, p.pos) <= this.t.interact_radius).sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos) || idSort(a, b))[0];
        if (l && p.carried) {
          const amount = Math.min(p.carried, this.t.lantern_cost - l.deposited); p.carried -= amount; l.deposited += amount; this.score += amount * this.t.score.per_mote;
          this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
          if (l.deposited === this.t.lantern_cost) { l.lit = true; this.score += this.t.score.per_lantern; this.emit('lantern_lit', { lantern_id: l.id }); }
        }
      }
    }
    this.updateSafeZones(); if (!this.respawnTicks && edge('pulse')) this.pulse(); this.moveShades();
    moveDrifters(this.drifters, p, this.simTick);
    if (!this.respawnTicks) {
      stealDrifters(this.drifters, p, (name, data) => this.emit(name, data));
      for (const s of [...this.shades].sort(idSort)) {
        if (p.invulnTicks || s.evacuateTicks || !['wander', 'chase'].includes(s.state) || dist(p.pos, s.pos) > 1 || Math.abs(p.pos[1] - s.pos[1]) > 1.5 || this.lanterns.some(l => l.lit && dist(p.pos, l.pos) <= this.t.safe_radius)) continue;
        const dropped = Math.floor(p.carried / 2); p.carried -= dropped; p.flames = Math.max(0, p.flames - 1); p.invulnTicks = 90;
        this.drop(p.pos, dropped); s.state = 'recoil'; s.recoilTicks = 60;
        const d = dist(s.pos, p.pos); s.recoil = d ? [(s.pos[0] - p.pos[0]) / d, (s.pos[2] - p.pos[2]) / d] : [1, 0];
        const first = [s.pos[0] + s.recoil[0] * 2 / 60, s.pos[1], s.pos[2] + s.recoil[1] * 2 / 60];
        if (terrainHeight(this.world, first[0], first[2]) !== null && !blockedByTower(this.world, first)) s.pos = first;
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped }); break;
      }
    }
    if (this.randomMotes && this.simTick % 240 === 0) this.spawnMote();
    if (this.randomShades && (this.simTick === 300 || (this.simTick > 300 && (this.simTick - 300) % this.world.shadeIntervalTicks === 0))) { this.spawnShade(); if (this.simTick === 300) this.spawnShade(); }
    if (this.night >= 2 && this.randomDrifters && this.simTick % 1200 === 0 && this.drifters.length < 2) {
      let id; do { id = `D${++this.drifterId}`; } while (this.usedDrifterIds.has(id)); this.usedDrifterIds.add(id);
      this.drifters.push(createDrifter({ id, pos: this.world.shadePoints[Math.floor(this.random() * this.world.shadePoints.length)] }, 0));
    }
    if (p.flames <= 0) this.finish('lost', 'no_flames'); else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit'); else if (!this.time) this.finish('lost', 'dawn');
    finishInput(); return this.events;
  }
  snapshot() {
    const p = this.player;
    return { type: 'snapshot', tick: this.tick, sim_tick: this.simTick, night: this.night, state: this.state, time_left_s: this.time, score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dir_deg },
      player: { pos: rp(p.pos), vel: rp(p.vel), flames: p.flames, carried: p.carried, grounded: p.grounded, invuln: p.invulnTicks > 0, dash_cd_s: p.dashCd / 60, pulse_cd_s: p.pulseCd / 60, charm_s: p.charmTicks / 60 },
      lanterns: this.lanterns.map(l => ({ ...l, pos: rp(l.pos) })), shades: this.shades.map(s => ({ id: s.id, pos: rp(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: rp(m.pos), kind: m.kind, ttl_s: m.ttlTicks === null ? null : m.ttlTicks / 60 })),
      drifters: this.drifters.map(d => ({ id: d.id, pos: rp(d.pos), state: d.state, stolen: d.stolen })), charms: this.charms.map(c => ({ id: c.id, available: c.available, respawn_s: c.respawnTicks / 60 })) };
  }
}
