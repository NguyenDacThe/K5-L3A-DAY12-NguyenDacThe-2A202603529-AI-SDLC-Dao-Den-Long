import { NIGHT_NAMES } from './world.mjs';
const lines = [
  'Ông Đăng: Đảo Bến đang đợi ánh đèn của cháu. Mang đom đóm về, và nhớ tìm nơi sáng khi sương tới.',
  'Ông Đăng: Qua cầu tre là một bờ mây mới. Bục nhảy và Bùa Gió sẽ giúp cháu, nhưng coi chừng Gió Lạc.',
  'Ông Đăng: Khi chuông trên cao gặp bình minh, cả biển mây sẽ sáng. Hãy tìm dốc và bước theo ánh đèn.'
];
export class Campaign {
  constructor() { this.menu(); }
  menu() { this.screen = 'menu'; this.night = 1; this.scores = [0, 0, 0]; this.lastResult = null; }
  begin() { this.night = 1; this.scores = [0, 0, 0]; this.lastResult = null; this.screen = 'intro'; }
  intro() { return { night: this.night, name: NIGHT_NAMES[this.night - 1], message: lines[this.night - 1] }; }
  play() { if (this.screen === 'intro') this.screen = 'playing'; }
  pause() { if (this.screen === 'playing') this.screen = 'paused'; }
  resume() { if (this.screen === 'paused') this.screen = 'playing'; }
  settings() { this.returnScreen = this.screen; this.screen = 'settings'; }
  closeSettings() { if (this.screen === 'settings') this.screen = this.returnScreen ?? 'menu'; }
  retry() { this.scores[this.night - 1] = 0; this.lastResult = null; this.screen = 'intro'; }
  complete(result, score) {
    if (this.screen !== 'playing' || !['won', 'lost'].includes(result)) return;
    this.lastResult = { result, score };
    this.scores[this.night - 1] = result === 'won' ? score : 0;
    this.screen = result === 'won' && this.night === 3 ? 'dawn' : 'result';
  }
  next() {
    if (this.screen !== 'result' || this.lastResult?.result !== 'won') return;
    this.night++; this.lastResult = null; this.screen = 'intro';
  }
  get total() { return this.scores.reduce((a, b) => a + b, 0); }
}
