// Original procedural sound: no network assets. Start only after a user gesture.
export class GameAudio {
  constructor(volume = .5) { this.volume = volume; this.active = false; this.lastSecond = -1; this.lastMusic = -1; }
  async start() {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    if (!this.context) { this.context = new Audio(); this.master = this.context.createGain(); this.master.connect(this.context.destination); }
    this.setVolume(this.volume); await this.context.resume(); this.active = true;
  }
  setVolume(value) { this.volume = value; if (this.master) this.master.gain.setTargetAtTime(value * .2, this.context.currentTime, .02); }
  tone(freq, length = .18, offset = 0, shape = 'sine') {
    if (!this.active || !this.context || this.context.state !== 'running') return;
    const time = this.context.currentTime + offset, oscillator = this.context.createOscillator(), envelope = this.context.createGain();
    oscillator.type = shape; oscillator.frequency.value = freq;
    envelope.gain.setValueAtTime(.0001, time); envelope.gain.exponentialRampToValueAtTime(.35, time + .02); envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(envelope); envelope.connect(this.master); oscillator.start(time); oscillator.stop(time + length + .02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  effect(name) {
    const notes = {
      mote_picked: [880, 1174], lantern_lit: [392, 494, 587, 784], pulse: [220, 440, 880], player_hit: [196, 147],
      jump: [330, 440], dash: [660, 880], won: [392, 494, 587, 784, 988], lost: [330, 294, 220],
      shade_spawned: [110, 123], countdown: [784], wind_warning: [440, 330, 440], charm_picked: [587, 784, 1174], drifter_steal: [262, 196]
    }[name];
    notes?.forEach((f, i) => this.tone(f, .2, i * .09, name === 'player_hit' ? 'triangle' : 'sine'));
  }
  update(simTick, timeLeft) {
    const phrase = Math.floor(simTick / 240);
    if (phrase !== this.lastMusic) { this.lastMusic = phrase; [196, 246.94, 293.66].forEach((f, i) => this.tone(f, 2.5, i * .14)); }
    const second = Math.ceil(timeLeft);
    if (second <= 10 && second > 0 && second !== this.lastSecond) this.effect('countdown');
    this.lastSecond = second;
  }
  suspend() { this.active = false; this.context?.suspend().catch(() => {}); }
}
