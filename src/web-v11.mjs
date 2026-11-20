import * as THREE from '../vendor/three/three.module.js';
import { Game, DT } from './game.mjs';
import { createBenchmark, frameStatistics } from './benchmark.mjs';
import { addLeaderboardEntry, sortLeaderboard, sanitizeEntry, validateName, LEADERBOARD_KEY } from './leaderboard.mjs';
import { buildWorldView } from './world-view.mjs';
import { Campaign } from './campaign.mjs';
import { loadSettings, saveSettings, DEFAULT_KEYBINDINGS, checkKeyConflict } from './settings.mjs';
import { GameAudio } from './audio.mjs';
import { PALETTE as C, accessiblePalette } from './palette.mjs';
import { lightCost, acceptsLight, safeLight } from './lanterns.mjs';

const { tuning } = await (await fetch(new URL('../game.contract.json', import.meta.url))).json();
const $ = id => document.getElementById(id);

let storage;
try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => {} }; }

let settings = loadSettings(storage);
const audio = new GameAudio(settings.volume);
const campaign = new Campaign();

// Apply accessibility classes
function applyAccessibilitySettings() {
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  document.body.classList.toggle('large-text', !!settings.largeText);
}
applyAccessibilitySettings();

const canvas = $('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  $('overlay-title').textContent = 'Trình duyệt cần WebGL';
  $('overlay-text').textContent = 'Hãy bật tăng tốc đồ họa rồi tải lại game.';
  throw new Error('WebGL unavailable');
}

const urlParams = new URLSearchParams(location.search);
const isBench = urlParams.has('bench');
const benchSeed = Number(urlParams.get('seed') ?? 42);
const benchDuration = Number(urlParams.get('duration') ?? 30);
const pageStartTime = performance.now();

if (isBench) {
  renderer.setSize(1280, 720);
} else {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
}
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.FogExp2(C.fog, .006);

const camera = new THREE.PerspectiveCamera(55, isBench ? (1280 / 720) : (innerWidth / innerHeight), .1, 300);
const ambient = new THREE.HemisphereLight('#ffffff', C.cloud, .15);
scene.add(ambient);

const moon = new THREE.DirectionalLight('#9cafff', 1.6);
moon.position.set(-20, 40, 0);
scene.add(moon);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra });
function mesh(geometry, material, parent, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos);
  parent.add(m);
  return m;
}

const cloudGeometry = new THREE.SphereGeometry(7, 10, 6), cloudMat = mat(C.cloud);
for (let i = 0; i < (isBench ? 0 : 40); i++) {
  const a = i * 2.399;
  mesh(cloudGeometry, cloudMat, scene, [Math.cos(a) * (55 + i % 6 * 4) + 20, -7 - i % 3, Math.sin(a) * (55 + i % 6 * 4)]).scale.set(1.7, .25, 1);
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 180 }, (_, i) => [Math.cos(i * 2.399) * 110, 35 + i % 70, Math.sin(i * 2.399) * 110]).flat(), 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: C.core, size: .18 })); stars.visible = !isBench; scene.add(stars);

const player = new THREE.Group();
scene.add(player);
mesh(new THREE.ConeGeometry(.4, .95, 8), mat(C.shirt), player, [0, .65, 0]);
mesh(new THREE.SphereGeometry(.28, 12, 8), mat('#dfba95'), player, [0, 1.35, 0]);
mesh(new THREE.ConeGeometry(.7, .32, 24), mat(C.sand), player, [0, 1.67, 0]);
mesh(new THREE.BoxGeometry(.55, .12, .4), mat(C.scarf), player, [0, 1.1, 0]);
mesh(new THREE.SphereGeometry(.18, 10, 8), mat(C.lit, { emissive: C.core, emissiveIntensity: 1.2 }), player, [.5, .9, 0]);
const personalLight = new THREE.PointLight(C.lit, 18, 9);
personalLight.position.set(.5, 1.2, 0);
player.add(personalLight);

const sphere = new THREE.SphereGeometry(.15, 8, 6), moteMat = new THREE.MeshBasicMaterial({ color: C.mote });
const shadeGeo = new THREE.SphereGeometry(.65, 10, 8), shadeMat = mat(C.shade, { emissive: C.shadeRim, emissiveIntensity: .18 }), stunMat = mat(C.stunned);
const shadeRimMat = new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide });
const eyeGeo = new THREE.SphereGeometry(.09, 8, 6), eyeMat = new THREE.MeshBasicMaterial({ color: C.shadeRim });
const drifterMat = new THREE.MeshBasicMaterial({ color: C.drifter, side: THREE.DoubleSide }), charmMat = new THREE.MeshBasicMaterial({ color: C.scarf });
const ringGeo = new THREE.RingGeometry(.94, 1, 48), pulseRing = mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.halo, transparent: true, opacity: 0, side: THREE.DoubleSide }), scene);
pulseRing.rotation.x = -Math.PI / 2;

const leaves = new THREE.Group();
scene.add(leaves);
for (let i = 0; i < 18; i++) mesh(new THREE.PlaneGeometry(.3, .1), new THREE.MeshBasicMaterial({ color: C.gold, side: THREE.DoubleSide }), leaves);

const entities = { lanterns: new Map(), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
let worldView, game, yaw = 0, accumulator = 0, last = performance.now(), pulseTime = -10000, noticeUntil = 0, subtitleUntil = 0;
const keys = new Set();
let shadeAlert = null;

// State trackers for audio-visual cues
let prevShadeCount = 0;
let prevWindWarning = false;
let prevTimeSec = 300;
const alertedLowLanterns = new Set();

function showSubtitle(text) {
  if (!$('subtitles')) return;
  $('subtitles').hidden = false;
  $('subtitles').textContent = text;
  subtitleUntil = performance.now() + 2500;
}

function resetNight() {
  if (worldView) { scene.remove(worldView); worldView.userData.dispose(); }
  for (const map of Object.values(entities)) { for (const m of map.values()) scene.remove(m); map.clear(); }

  if (isBench) {
    game = createBenchmark(tuning, benchSeed);
  } else {
    game = new Game(tuning, 2026 + campaign.night, {}, campaign.night);
  }

  worldView = buildWorldView(THREE, game.world, { ground: C.ground, stone: C.sand, bamboo: C.wood, pad: C.gold });
  scene.add(worldView);

  for (const l of game.lanterns) {
    const g = new THREE.Group(); g.position.set(...l.pos); scene.add(g);
    mesh(new THREE.CylinderGeometry(.13, .2, 3, 8), mat(C.wood), g, [0, 1.5, 0]);
    const orb = mesh(new THREE.SphereGeometry(.7, 12, 8), mat(C.unlit), g, [0, 3.3, 0]); orb.scale.y = 1.2;
    mesh(new THREE.ConeGeometry(.95, .4, 8), mat(C.wood), g, [0, 4.3, 0]);
    const ring = mesh(new THREE.RingGeometry(5.93, 6, 48), new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide }), g, [0, .03, 0]);
    ring.rotation.x = -Math.PI / 2;
    orb.material.transparent = true;
    const tear = new THREE.Group(); g.add(tear);
    for (const sign of [-1, 1]) {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.25, 3.65, sign * .66), new THREE.Vector3(.04, 3.4, sign * .71), new THREE.Vector3(-.1, 3.25, sign * .7), new THREE.Vector3(.22, 3.05, sign * .65)]);
      tear.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: C.sky })));
    }
    const fuelBar = new THREE.Group(); fuelBar.position.y = 4.9; g.add(fuelBar);
    mesh(new THREE.PlaneGeometry(1.6, .18), new THREE.MeshBasicMaterial({ color: C.sky, side: THREE.DoubleSide }), fuelBar);
    const fuelFill = mesh(new THREE.PlaneGeometry(1.5, .12), new THREE.MeshBasicMaterial({ color: C.gold, side: THREE.DoubleSide }), fuelBar, [0, 0, .01]);
    g.userData = { orb, ring, tear, fuelBar, fuelFill };
    entities.lanterns.set(l.id, g);
  }

  yaw = 0; accumulator = 0; pulseTime = -10000; noticeUntil = 0; subtitleUntil = 0;
  $('notice').textContent = ''; if ($('subtitles')) $('subtitles').hidden = true;
  keys.clear(); audio.lastMusic = -1; audio.lastSecond = -1;
  prevShadeCount = game.shades.length;
  prevWindWarning = false;
  prevTimeSec = Math.ceil(game.time);
  alertedLowLanterns.clear();
  renderHUD(); sync(performance.now());
}

function action(label, fn, primary = false) {
  const b = document.createElement('button');
  b.textContent = label;
  if (primary) b.className = 'primary';
  b.onclick = fn;
  $('actions').append(b);
}

function announce(message) {
  $('notice').textContent = message;
  noticeUntil = performance.now() + 2200;
}

function startAudio() {
  audio.start().catch(() => announce('Âm thanh chưa được trình duyệt cho phép.'));
}

async function fetchLeaderboard() {
  try { const value = JSON.parse(storage.getItem(LEADERBOARD_KEY)); if (Array.isArray(value)) return sortLeaderboard(value.map(sanitizeEntry).filter(Boolean)); } catch {}
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    try { const res=await fetch('/api/leaderboard'); if(res.ok) return sortLeaderboard((await res.json()).entries ?? []); } catch {}
  }
  return [];
}
async function submitLeaderboard(entry) {
  const entries=addLeaderboardEntry(await fetchLeaderboard(), entry);
  storage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    const res=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
    if(!res.ok && ![404,405,501].includes(res.status)) throw new Error('Không lưu được bảng điểm trên đĩa');
  }
}

async function renderLeaderboardTable() {
  const tbody = $('leaderboard-body');
  if (!tbody) return;
  tbody.replaceChildren();
  const entries = await fetchLeaderboard();
  if (entries.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center;padding:12px;color:#aab7cc">Chưa có người chơi nào ghi danh.</td>';
    tbody.append(tr);
    return;
  }
  entries.forEach((e, i) => {
    const tr = document.createElement('tr');
    const timeStr = e.achieved_at ? new Date(e.achieved_at).toLocaleDateString('vi-VN') : '';
    for(const value of [i+1,e.name,e.score,`${e.nights_won}/3`,timeStr]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    tbody.append(tr);
  });
}

function updateKeyLabels() {
  const b = settings.keybindings ?? DEFAULT_KEYBINDINGS;
  const map = {
    'rebind-up': b.up,
    'rebind-down': b.down,
    'rebind-left': b.left,
    'rebind-right': b.right,
    'rebind-jump': b.jump,
    'rebind-dash': b.dash,
    'rebind-interact': b.interact,
    'rebind-pulse': b.pulse,
    'rebind-pause': b.pause
  };
  for (const [id, code] of Object.entries(map)) {
    const el = $(id);
    if (el) el.textContent = code.replace(/^Key/, '').replace(/^Digit/, '');
  }
}

function overlay() {
  if (isBench) { $('overlay').hidden = true; return; }
  $('overlay').hidden = campaign.screen === 'playing';
  $('actions').replaceChildren();
  $('settings').hidden = campaign.screen !== 'settings';
  $('leaderboard').hidden = campaign.screen !== 'leaderboard';
  $('export-board').hidden = campaign.screen !== 'leaderboard';
  if ($('name-form')) $('name-form').hidden = !(campaign.screen === 'dawn' || (campaign.screen === 'result' && campaign.lastResult?.result === 'lost'));

  let title = '', text = '';
  if (campaign.screen === 'menu') {
    title = 'Giữ lửa tới bình minh.';
    text = 'Đèn sẽ cạn dầu. Gom đom đóm để thắp, châm dầu và giữ ít nhất 60% số đèn sáng khi đêm kết thúc.';
    action('Bắt đầu hành trình', () => { campaign.begin(); resetNight(); overlay(); startAudio(); }, true);
    action('Bảng xếp hạng', async () => { campaign.leaderboard(); overlay(); await renderLeaderboardTable(); });
    action('Cài đặt', () => { campaign.settings(); overlay(); });
  } else if (campaign.screen === 'intro') {
    const intro = campaign.intro();
    title = `Đêm ${intro.night} · ${intro.name}`;
    text = intro.message;
    action(`Bắt đầu đêm ${campaign.night}`, () => { campaign.play(); last = performance.now(); accumulator = 0; overlay(); startAudio(); }, true);
    action('Về menu', menu);
  } else if (campaign.screen === 'paused') {
    title = 'Giữ lửa một chút.';
    text = 'Đêm đã dừng. Thời gian và mọi sinh vật đang chờ bạn.';
    action('Tiếp tục', resume, true);
    action('Chơi lại Đêm', retry);
    action('Cài đặt', () => { campaign.settings(); overlay(); });
    action('Về menu', menu);
  } else if (campaign.screen === 'settings') {
    title = 'Cài đặt';
    text = 'Âm lượng, phím điều khiển và tùy chọn trợ năng.';
    $('volume').value = settings.volume;
    $('sensitivity').value = settings.sensitivity;
    $('colorblind').checked = settings.colorblind;
    if ($('reduce-motion')) $('reduce-motion').checked = settings.reduceMotion;
    if ($('large-text')) $('large-text').checked = settings.largeText;
    updateKeyLabels();
    action('Quay lại', () => { campaign.closeSettings(); overlay(); }, true);
  } else if (campaign.screen === 'leaderboard') {
    title = 'Bảng Xếp Hạng';
    text = 'Top 10 người giữ lửa có điểm cao nhất.';
    action('Quay lại', () => { campaign.closeLeaderboard(); overlay(); }, true);
  } else if (campaign.screen === 'result') {
    const won = campaign.lastResult.result === 'won';
    title = won ? `${game.world.name} đã qua bình minh.` : 'Mây ơi, hãy thử lại.';
    text = `${won ? 'Đã giữ đủ đèn sáng tới bình minh.' : game.player.flames ? 'Bình minh tới nhưng chưa đủ đèn sáng.' : 'Ngọn lửa đã tắt.'} Điểm đêm: ${game.score}. Tổng các đêm thắng: ${campaign.total}.`;
    action(won ? 'Đêm kế tiếp' : 'Chơi lại Đêm', won ? () => { campaign.next(); resetNight(); overlay(); } : retry, true);
    action('Bảng xếp hạng', async () => { campaign.leaderboard(); overlay(); await renderLeaderboardTable(); });
    action('Về menu', menu);
  } else if (campaign.screen === 'dawn') {
    title = 'Bình Minh';
    text = `Ba đêm đã sáng, tiếng chuông vang khắp biển mây. Tổng điểm: ${campaign.total}. Cảm ơn người giữ đèn!`;
    action('Chơi hành trình mới', () => { campaign.begin(); resetNight(); overlay(); }, true);
    action('Bảng xếp hạng', async () => { campaign.leaderboard(); overlay(); await renderLeaderboardTable(); });
    action('Về menu', menu);
  }
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
}

function menu() { audio.suspend(); campaign.menu(); resetNight(); overlay(); }
function retry() { audio.suspend(); campaign.retry(); resetNight(); overlay(); }
function pause() {
  if (campaign.screen !== 'playing') return;
  game.step({ pause: true }); campaign.pause(); keys.clear(); audio.suspend(); overlay();
}
function resume() {
  if (campaign.screen !== 'paused') return;
  game.step({ pause: false }); game.step({ pause: true }); campaign.resume(); keys.clear(); accumulator = 0; last = performance.now(); overlay(); startAudio();
}

// Settings event handlers
for (const id of ['volume', 'sensitivity', 'colorblind', 'reduce-motion', 'large-text']) {
  const el = $(id);
  if (!el) continue;
  el.oninput = el.onchange = () => {
    settings = saveSettings(storage, {
      ...settings,
      volume: Number($('volume').value),
      sensitivity: Number($('sensitivity').value),
      colorblind: $('colorblind').checked,
      reduceMotion: $('reduce-motion')?.checked ?? false,
      largeText: $('large-text')?.checked ?? false
    });
    audio.setVolume(settings.volume);
    applyAccessibilitySettings();
    renderHUD();
  };
}

// Key remapping logic
let listeningAction = null;
const rebindMap = {
  'rebind-up': 'up',
  'rebind-down': 'down',
  'rebind-left': 'left',
  'rebind-right': 'right',
  'rebind-jump': 'jump',
  'rebind-dash': 'dash',
  'rebind-interact': 'interact',
  'rebind-pulse': 'pulse',
  'rebind-pause': 'pause'
};

for (const [btnId, act] of Object.entries(rebindMap)) {
  const btn = $(btnId);
  if (!btn) continue;
  btn.onclick = () => {
    listeningAction = act;
    btn.textContent = '...';
    if ($('key-conflict-msg')) $('key-conflict-msg').textContent = 'Nhấn một phím để gán...';
  };
}

if ($('reset-keys-btn')) {
  $('reset-keys-btn').onclick = () => {
    settings = saveSettings(storage, { ...settings, keybindings: { ...DEFAULT_KEYBINDINGS } });
    if ($('key-conflict-msg')) $('key-conflict-msg').textContent = 'Đã đặt lại phím mặc định.';
    updateKeyLabels();
  };
}

// Score submission
if ($('save-score-btn')) {
  $('save-score-btn').onclick = async () => {
    const input = $('player-name');
    const errorEl = $('name-error');
    const name = input ? input.value.trim() : '';
    if (!/^[A-Za-z0-9_À-ỹ\s]{3,12}$/u.test(name)) {
      if (errorEl) errorEl.textContent = 'Tên từ 3-12 ký tự (chữ, số hoặc gạch dưới)';
      return;
    }
    if (errorEl) errorEl.textContent = '';
    const entry = {
      name,
      score: campaign.total,
      nights_won: campaign.wonNights ?? (campaign.lastResult?.result === 'won' ? 1 : 0),
      achieved_at: new Date().toISOString(),
      seed: 2026
    };
    try { await submitLeaderboard(entry); } catch(err) { errorEl.textContent=err.message; return; }
    if (input) input.value = '';
    $('name-form').hidden = true;
    campaign.leaderboard();
    overlay();
    await renderLeaderboardTable();
  };
}

$('pause').onclick = pause;
$('export-board').onclick = async () => {
  const blob = new Blob([JSON.stringify({ entries: await fetchLeaderboard() }, null, 2)], { type:'application/json' });
  const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download='leaderboard.json';link.click();URL.revokeObjectURL(url);
};

addEventListener('keydown', e => {
  if (listeningAction) {
    e.preventDefault();
    e.stopPropagation();
    const conflict = checkKeyConflict(settings.keybindings ?? DEFAULT_KEYBINDINGS, listeningAction, e.code);
    if (conflict) {
      if ($('key-conflict-msg')) $('key-conflict-msg').textContent = `Phím này đang dùng cho "${conflict}". Hãy chọn phím khác!`;
      updateKeyLabels();
      listeningAction = null;
      return;
    }
    const newBindings = { ...(settings.keybindings ?? DEFAULT_KEYBINDINGS), [listeningAction]: e.code };
    settings = saveSettings(storage, { ...settings, keybindings: newBindings });
    if ($('key-conflict-msg')) $('key-conflict-msg').textContent = '';
    updateKeyLabels();
    listeningAction = null;
    return;
  }

  if (['Space', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && campaign.screen === 'playing') e.preventDefault();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
  const pauseKey = settings.keybindings?.pause ?? 'KeyP';
  if (!e.repeat && (e.code === pauseKey || e.code === 'Escape')) {
    if (campaign.screen === 'playing') pause();
    else if (campaign.screen === 'paused') resume();
    return;
  }
  keys.add(e.code);
});

addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', pause);

let dragging = false;
canvas.onpointerdown = e => { dragging = true; canvas.setPointerCapture(e.pointerId); };
canvas.onpointerup = () => dragging = false;
canvas.onpointermove = e => { if (dragging && campaign.screen === 'playing') yaw -= e.movementX * .004 * settings.sensitivity; };
addEventListener('resize', () => {
  if (isBench) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function isActionActive(act) {
  const b = settings.keybindings ?? DEFAULT_KEYBINDINGS;
  const code = b[act];
  if (act === 'dash' && code === 'ShiftLeft') return keys.has(code) || keys.has('ShiftRight');
  return keys.has(code);
}

function renderHUD() {
  if (isBench) return;
  const p = game.player, lit = game.lanterns.filter(l => l.lit).length, time = Math.ceil(game.time);
  $('night').textContent = `Đêm ${game.night} · ${game.world.name}`;
  $('flames').textContent = '♥'.repeat(p.flames) + '♡'.repeat(Math.max(0, 3 - p.flames));
  document.documentElement.style.setProperty('--danger', accessiblePalette(settings.colorblind).danger);
  const urgent = game.time <= 30;
  $('timer').textContent = `${settings.colorblind && urgent ? '⚠ ' : ''}${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('danger', urgent);
  $('progress').textContent = `Đèn ${lit}/${game.lanterns.length} · cần ${Math.ceil(tuning.win_ratio * game.lanterns.length)}`;
  $('score').textContent = `Điểm ${game.score} · Tổng thắng ${campaign.total}`;
  $('carry').replaceChildren(...Array.from({ length: game.capacity }, (_, i) => {
    const cell = document.createElement('i');
    cell.className = i < p.carried ? 'filled' : '';
    return cell;
  }));
  $('carry-label').textContent = `${p.carried}/${game.capacity} đom đóm${p.charmTicks ? ` · Bùa Gió ${(p.charmTicks / 60).toFixed(1)}s` : ''}`;
  $('cooldowns').textContent = `◆ Shift · Lướt ${p.dashCd && !p.charmTicks ? (p.dashCd / 60).toFixed(1) + 's' : 'sẵn sàng'}  |  ✹ F · Tỏa sáng ${p.pulseCd ? (p.pulseCd / 60).toFixed(1) + 's' : 'sẵn sàng'}`;
  canvas.dataset.tick = game.tick; canvas.dataset.simTick = game.simTick; canvas.dataset.night = game.night;

  if (performance.now() > noticeUntil) {
    const near = game.lanterns.filter(l => acceptsLight(l, tuning) && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= 2).sort((a, b) => Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) - Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]) || a.id.localeCompare(b.id))[0];
    $('notice').textContent = near ? near.lit ? `${near.fuel < 30 ? '⚠ ' : ''}E — Châm dầu (${near.fuel.toFixed(1)}/100) · ${near.id}` : `E — ${near.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${near.deposited}/${lightCost(near, tuning)}) · ${near.id}` : game.wind.warning ? '⚠ Lá đang bay… gió mạnh sắp tới!' : '';
  }

  if (performance.now() > subtitleUntil && $('subtitles')) {
    $('subtitles').hidden = true;
  }
}

function updateEntities(name, values, make, update) {
  const map = entities[name], ids = new Set(values.map(v => v.id));
  for (const [id, object] of map) if (!ids.has(id)) { scene.remove(object); map.delete(id); }
  for (const value of values) {
    if (!map.has(value.id)) {
      const obj = make(value); scene.add(obj); map.set(value.id, obj);
    }
    update(map.get(value.id), value);
  }
}

function sync(now) {
  const p = game.player, sec = now / 1000;
  for (const object of worldView.children) {
    if (object.name === 'core-cutaway') object.visible = !(game.night === 3 && p.pos[1] < 6 && Math.hypot(p.pos[0], p.pos[2]) < 8);
  }
  player.position.set(...p.pos);
  player.rotation.y = Math.atan2(game.facing[0], game.facing[1]);
  player.visible = !game.respawnTicks && (!p.invulnTicks || Math.floor(sec * 12) % 2 === 0);

  if (!isBench) {
    camera.position.set(p.pos[0] + Math.sin(yaw) * 17, p.pos[1] + 12, p.pos[2] + Math.cos(yaw) * 17);
    camera.lookAt(p.pos[0], p.pos[1] + .8, p.pos[2]);
  }

  ambient.intensity = .15 + .55 * game.lanterns.filter(l => l.lit).length / game.lanterns.length;

  for (const l of game.lanterns) {
    const { orb, ring, tear, fuelBar, fuelFill } = entities.lanterns.get(l.id).userData;
    const low = l.lit && l.fuel < tuning.low_fuel_threshold;
    const blink = settings.reduceMotion ? true : (!low || game.simTick % 60 < 30);
    orb.scale.y = l.lit ? 1.2 : .96; tear.visible = !l.lit;
    orb.material.color.set(l.lit ? C.lit : C.unlit);
    orb.material.emissive.set(l.lit ? C.core : '#000000');
    orb.material.emissiveIntensity = l.lit && blink ? 1 : 0;
    orb.material.opacity = blink ? 1 : .35;
    ring.material.opacity = safeLight(l, tuning) ? .4 : 0;
    fuelBar.visible = l.lit;
    fuelBar.quaternion.copy(camera.quaternion);
    fuelFill.visible = blink;
    fuelFill.scale.x = l.fuel / tuning.fuel_max;
    fuelFill.position.x = -.75 + .75 * fuelFill.scale.x;
    fuelFill.material.color.set(low ? accessiblePalette(settings.colorblind).danger : C.gold);
  }

  updateEntities('motes', game.motes, () => {
    const g = new THREE.Group();
    mesh(sphere, moteMat, g);
    const halo = mesh(sphere, new THREE.MeshBasicMaterial({ color: C.halo, transparent: true, opacity: .13, depthWrite: false }), g);
    halo.scale.setScalar(2.2);
    return g;
  }, (m, value) => m.position.set(value.pos[0], value.pos[1] + .65 + Math.sin(sec * 2 + value.pos[0]) * .15, value.pos[2]));

  const rimColor = accessiblePalette(settings.colorblind).shadeRim;
  shadeRimMat.color.set(rimColor); eyeMat.color.set(rimColor); shadeMat.emissive.set(rimColor);

  updateEntities('shades', game.shades, () => {
    const g = new THREE.Group();
    const body = mesh(shadeGeo, shadeMat, g);
    mesh(shadeGeo, shadeRimMat, g).scale.setScalar(1.07);
    for (const x of [-.22, .22]) mesh(eyeGeo, eyeMat, g, [x, .16, .57]);
    g.userData.body = body;
    return g;
  }, (m, s) => {
    m.userData.body.material = s.state === 'stunned' ? stunMat : shadeMat;
    m.position.set(...s.pos);
    m.lookAt(p.pos[0], s.pos[1], p.pos[2]);
    m.scale.set(1, 1.2, 1);
  });

  updateEntities('drifters', game.drifters, () => new THREE.Mesh(new THREE.PlaneGeometry(2.5, .35, 5), drifterMat), (m, d) => {
    m.position.set(d.pos[0], d.pos[1] + .7, d.pos[2]);
    m.rotation.set(.3, sec + d.pos[0], Math.sin(sec * 4) * .2);
  });

  updateEntities('charms', game.charms, () => {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(.5, .75, .06), new THREE.MeshBasicMaterial({ color: C.gold }), g);
    mesh(new THREE.BoxGeometry(.4, .64, .08), charmMat, g);
    return g;
  }, (m, c) => {
    m.visible = c.available;
    m.position.set(c.pos[0], c.pos[1] + .8, c.pos[2]);
    m.rotation.y = sec;
  });

  const progress = (now - pulseTime) / 500;
  pulseRing.material.opacity = progress >= 0 && progress < 1 ? 1 - progress : 0;
  pulseRing.scale.setScalar(Math.max(.01, progress * tuning.pulse_radius));
  leaves.visible = game.wind.warning || game.wind.active;
  leaves.children.forEach((m, i) => {
    m.position.set(p.pos[0] + ((sec * 4 + i * 2) % 16) - 8, p.pos[1] + 1 + i % 4, p.pos[2] + Math.sin(i) * 5);
    m.rotation.set(sec, sec + i, 0);
  });

  $('shade-direction').hidden = true;
  if (shadeAlert && now < shadeAlert.until && campaign.screen === 'playing') {
    const local = new THREE.Vector3(...shadeAlert.pos).applyMatrix4(camera.matrixWorldInverse), angle = Math.atan2(local.x, -local.y);
    const el = $('shade-direction'); el.hidden = false; el.style.left = `${50 + Math.sin(angle) * 43}%`; el.style.top = `${50 - Math.cos(angle) * 35}%`; el.textContent = '? B?ng M?c'; el.style.transform = `translate(-50%,-50%) rotate(${angle}rad)`;
  }
  const nearest = game.lanterns.filter(l => !l.lit).sort((a, b) => Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) - Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]))[0];
  $('guide').hidden = true;
  if (nearest && campaign.screen === 'playing') {
    const projected = new THREE.Vector3(nearest.pos[0], nearest.pos[1] + 3, nearest.pos[2]).project(camera);
    if (Math.abs(projected.x) > .95 || Math.abs(projected.y) > .85 || projected.z > 1) {
      const local = new THREE.Vector3(...nearest.pos).applyMatrix4(camera.matrixWorldInverse), angle = Math.atan2(local.x, -local.y);
      $('guide').hidden = false;
      $('guide').style.left = `${50 + Math.sin(angle) * 40}%`;
      $('guide').style.top = `${50 - Math.cos(angle) * 32}%`;
      $('guide').textContent = `▲ ${nearest.id}`;
      $('guide').style.transform = `translate(-50%,-50%) rotate(${angle}rad)`;
    }
  }
}

resetNight();
overlay();

// Benchmark measurement buffers
const benchFrameDts = [];
let benchFirstFrameTime = null;
let benchFinished = false;

function animate(now) {
  requestAnimationFrame(animate);
  const elapsed = Math.min(.25, (now - last) / 1000);
  const dtMs = now - last;
  last = now;

  if (isBench) {
    if (benchFinished) return;
    const origin = benchFirstFrameTime ?? now;
    const benchTimeSec = (now - origin) / 1000;
    const theta = benchTimeSec / 15 * 2 * Math.PI;
    camera.position.set(30 * Math.cos(theta), 15, -30 * Math.sin(theta));
    camera.lookAt(0, 0, 0);
    accumulator += elapsed;
    while (accumulator >= DT) { game.tick++; game.simTick++; game.moveShades(); accumulator -= DT; }
    sync(now);
    renderer.render(scene, camera);
    if (benchFirstFrameTime === null) {
      benchFirstFrameTime = now;
      window.__BENCH_FIRST_FRAME__ = true;
      window.__reportFirstBenchFrame?.();
    }
    const warmupEnd = benchFirstFrameTime + 3000, end = warmupEnd + benchDuration * 1000;
    const measured = Math.min(now, end) - Math.max(now - dtMs, warmupEnd);
    if (measured > 0) benchFrameDts.push(measured);
    if (now >= end) {
      benchFinished = true;
      window.__BENCH_RESULTS__ = { ...frameStatistics(benchFrameDts), renderer: `Three.js r${THREE.REVISION} / WebGLRenderer` };
      window.__BENCH_SCENE__ = { shades: game.shades.length, motes: game.motes.length, states: [...new Set(game.shades.map(s=>s.state))], player: game.player.pos, fuels: game.lanterns.slice(0,3).map(l=>l.fuel), camera: camera.position.toArray(), measured_ms: benchFrameDts.reduce((a,b)=>a+b,0) };
      document.body.dataset.benchDone = 'true';
    }
    return;
  }

  // Normal gameplay loop
  if (campaign.screen === 'playing') {
    accumulator += elapsed;
    while (accumulator >= DT && campaign.screen === 'playing') {
      yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * DT * 1.5;
      const beforeGround = game.player.grounded, beforeWind = game.wind.warning;

      const move = [
        (isActionActive('right') ? 1 : 0) - (isActionActive('left') ? 1 : 0),
        (isActionActive('down') ? 1 : 0) - (isActionActive('up') ? 1 : 0)
      ];

      const events = game.step({
        move,
        cam_yaw_deg: yaw * 180 / Math.PI,
        jump: isActionActive('jump'),
        dash: isActionActive('dash'),
        interact: isActionActive('interact'),
        pulse: isActionActive('pulse')
      });

      if (beforeGround && !game.player.grounded && isActionActive('jump')) audio.effect('jump');
      if (!beforeWind && game.wind.warning) {
        audio.effect('wind_warning');
        showSubtitle('Gió nổi lên! Hãy cẩn thận!');
      }

      // Check audio-visual cues
      if (game.shades.length > prevShadeCount) {
        shadeAlert = { pos: [...game.shades.at(-1).pos], until: performance.now() + 4000 };
        showSubtitle('Bóng Mực xuất hiện!');
      }
      prevShadeCount = game.shades.length;

      const currentSec = Math.ceil(game.time);
      if (currentSec <= 10 && currentSec > 0 && prevTimeSec > 10) {
        showSubtitle('10 giây cuối cùng!');
      }
      prevTimeSec = currentSec;

      const lowLantern = game.lanterns.find(l => l.lit && l.fuel < 30);
      if (lowLantern && !alertedLowLanterns.has(lowLantern.id)) {
        alertedLowLanterns.add(lowLantern.id);
        showSubtitle(`Đèn ${lowLantern.id} sắp tắt (nhiên liệu < 30)!`);
      }
      for (const l of game.lanterns) {
        if (!l.lit || l.fuel >= 30) alertedLowLanterns.delete(l.id);
      }

      for (const e of events) {
        audio.effect(e.name);
        if (e.name === 'pulse') { pulseTime = now; pulseRing.position.set(game.player.pos[0], game.player.pos[1] + .1, game.player.pos[2]); }
        if (e.name === 'lantern_lit') announce(`${e.data.lantern_id} đã sáng!`);
        if (e.name === 'lantern_out') announce(`⚠ ${e.data.lantern_id} đã cạn dầu. Thắp lại cần 5 đốm!`);
        if (e.name === 'refuel') announce(`${e.data.lantern_id} · dầu ${e.data.fuel}/100`);
        if (e.name === 'drifter_steal') announce('Gió Lạc cướp đom đóm! Tỏa sáng để lấy lại.');
        if (e.name === 'game_over') { audio.effect(e.data.result); campaign.complete(game.state, game.score); overlay(); }
      }
      audio.update(game.simTick, game.time);
      accumulator -= DT;
    }
    renderHUD();
  }
  sync(now);
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
