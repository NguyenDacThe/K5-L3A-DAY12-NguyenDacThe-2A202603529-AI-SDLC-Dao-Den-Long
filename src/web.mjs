import * as THREE from '../node_modules/three/build/three.module.js';
import { Game, DT } from './game.mjs';
const { tuning } = await (await fetch('../game.contract.json')).json();
const $ = id => document.getElementById(id);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true }); }
catch { $('overlay-title').textContent = 'Trình duyệt cần WebGL'; $('overlay-text').textContent = 'Hãy bật tăng tốc đồ họa hoặc dùng Chrome/Firefox mới.'; $('play').hidden = true; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#141c37'); scene.fog = new THREE.FogExp2('#25223f', .009);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 250);
const ambient = new THREE.HemisphereLight('#b5c5ff', '#373347', 2); scene.add(ambient);
const moon = new THREE.DirectionalLight('#c7d4ff', 2.5); moon.position.set(-20, 40, -15); scene.add(moon);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra });
function mesh(geo, material, parent, pos = [0, 0, 0]) { const m = new THREE.Mesh(geo, material); m.position.set(...pos); parent.add(m); return m; }
const grass = mat('#3b6770'), rock = mat('#343449');
mesh(new THREE.CylinderGeometry(32, 26, 5, 64), rock, scene, [0, -2.6, 0]);
mesh(new THREE.CylinderGeometry(32, 32, .25, 64), grass, scene, [0, -.14, 0]);
mesh(new THREE.CylinderGeometry(34, 29, 1.5, 64), mat('#454258'), scene, [0, -5, 0]);
const cloudMat = mat('#687895', { transparent: true, opacity: .19, depthWrite: false });
for (let i = 0; i < 38; i++) { const a = i * 2.399; mesh(new THREE.SphereGeometry(5 + i % 4, 12, 8), cloudMat, scene, [Math.cos(a) * (38 + i % 7 * 3), -5 - i % 4, Math.sin(a) * (38 + i % 7 * 3)]).scale.y = .32; }
const starPoints = [];
for (let i = 0; i < 200; i++) { const a = i * 2.399, r = 85 + i % 30; starPoints.push(Math.cos(a) * r, 25 + (i * 17) % 65, Math.sin(a) * r); }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3)); scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#f0e3c9', size: .22 })));
// A small path of stones leads to each lantern. Visuals never enter simulation.
for (let j = 0; j < 5; j++) for (let k = 2; k < 18; k += 2) { const a = j * Math.PI * 2 / 5; const m = mesh(new THREE.DodecahedronGeometry(.45, 0), mat('#6a8988'), scene, [Math.sin(a) * k, .05, Math.cos(a) * k]); m.scale.set(1, .18, .8); }
for (let i = 0; i < 30; i++) { const a = i * 2.399, r = 29 + Math.sin(i) * 1.1; mesh(new THREE.DodecahedronGeometry(.4 + (i % 3) * .25), rock, scene, [Math.cos(a) * r, .1, Math.sin(a) * r]); }
const playerGroup = new THREE.Group(); scene.add(playerGroup);
mesh(new THREE.ConeGeometry(.42, 1.05, 8), mat('#6eacc0'), playerGroup, [0, .7, 0]);
mesh(new THREE.SphereGeometry(.29, 12, 8), mat('#f0c9a0'), playerGroup, [0, 1.42, 0]);
mesh(new THREE.ConeGeometry(.72, .32, 24), mat('#e3c78a'), playerGroup, [0, 1.75, 0]);
mesh(new THREE.CylinderGeometry(.045, .045, .65), mat('#5e3b35'), playerGroup, [.55, 1.15, 0]);
mesh(new THREE.SphereGeometry(.18, 12, 8), mat('#ffbd53', { emissive: '#ffb241', emissiveIntensity: 2 }), playerGroup, [.55, .88, 0]);
const personalLight = new THREE.PointLight('#ffc572', 25, 9, 2); personalLight.position.set(.5, 1.5, 0); playerGroup.add(personalLight);
const lanternMeshes = new Map(), shadeMeshes = new Map(), moteMeshes = new Map();
const moteGeo = new THREE.SphereGeometry(.13, 8, 6), moteMat = mat('#fff2a8', { emissive: '#ffc048', emissiveIntensity: 3 });
const shadeGeo = new THREE.SphereGeometry(.65, 12, 8), shadeMat = mat('#2d163f', { emissive: '#722e91', emissiveIntensity: .4 });
const pulseMesh = mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0, side: THREE.DoubleSide }), scene);
pulseMesh.rotation.x = -Math.PI / 2;
let game, running = false, yaw = 0, accumulator = 0, last = performance.now(), pulseTime = -10, noticeUntil = 0;
const keys = new Set();
function reset() {
  game = new Game(tuning, 2026); yaw = 0; accumulator = 0; pulseTime = -10; keys.clear();
  for (const map of [lanternMeshes, shadeMeshes, moteMeshes]) { for (const m of map.values()) scene.remove(m); map.clear(); }
  for (const l of game.lanterns) {
    const group = new THREE.Group(); group.position.set(...l.pos); scene.add(group);
    mesh(new THREE.CylinderGeometry(.15, .22, 3, 8), mat('#5b4149'), group, [0, 1.5, 0]);
    const orb = mesh(new THREE.SphereGeometry(.8, 16, 12), mat('#6e5863'), group, [0, 3.35, 0]); orb.scale.y = 1.2;
    mesh(new THREE.ConeGeometry(1.05, .5, 8), mat('#514451'), group, [0, 4.6, 0]);
    const light = new THREE.PointLight('#ffbd61', 0, 18, 2); light.position.y = 3; group.add(light);
    const ring = mesh(new THREE.RingGeometry(4.9, 5, 64), new THREE.MeshBasicMaterial({ color: '#ffd189', side: THREE.DoubleSide, transparent: true, opacity: 0 }), group, [0, .03, 0]); ring.rotation.x = -Math.PI / 2;
    group.userData = { orb, light, ring }; lanternMeshes.set(l.id, group);
  }
  updateHUD(); sync(0);
}
function announce(text) { $('notice').textContent = text; noticeUntil = performance.now() + 2600; }
function showOverlay(title, text, button) { $('overlay-title').textContent = title; $('overlay-text').textContent = text; $('play').textContent = button; $('overlay').hidden = false; }
function updateHUD() {
  const p = game.player, lit = game.lanterns.filter(l => l.lit).length, time = Math.ceil(game.time);
  $('stats').innerHTML = `<div>Ngọn lửa <strong>${'♥'.repeat(p.flames)}${'♡'.repeat(Math.max(0, 3 - p.flames))}</strong></div><div>Đom đóm <strong>${p.carried} / ${tuning.carry_capacity}</strong></div><div>Đèn đã thắp <strong>${lit} / 5</strong></div><div>Bình minh <strong>${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}</strong> · Điểm <strong>${game.score}</strong></div>`;
  $('lanterns').innerHTML = game.lanterns.map(l => `<div class="lamp ${l.lit ? 'lit' : ''}" title="${l.deposited}/10 đốm">${l.id}</div>`).join('');
}
function sync(seconds) {
  playerGroup.position.set(...game.player.pos);
  const inputX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), inputZ = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  if (inputX || inputZ) playerGroup.rotation.y = Math.atan2(inputX, inputZ) + yaw;
  playerGroup.visible = game.tick >= game.invulnUntil || Math.floor(seconds * 12) % 2 === 0;
  const target = new THREE.Vector3(...game.player.pos);
  camera.position.set(target.x + Math.sin(yaw) * 15, target.y + 12, target.z + Math.cos(yaw) * 15); camera.lookAt(target.x, target.y + .8, target.z);
  for (const l of game.lanterns) { const { orb, light, ring } = lanternMeshes.get(l.id).userData; orb.material.color.set(l.lit ? '#ffce6b' : '#6e5863'); orb.material.emissive.set(l.lit ? '#ffae43' : '#000000'); orb.material.emissiveIntensity = l.lit ? 2 : 0; light.intensity = l.lit ? 85 : 0; ring.material.opacity = l.lit ? .35 : 0; }
  ambient.intensity = 2 + game.lanterns.filter(l => l.lit).length * .18;
  const active = new Set(game.motes.map(m => m.id));
  for (const [id, m] of moteMeshes) if (!active.has(id)) { scene.remove(m); moteMeshes.delete(id); }
  for (const m of game.motes) { if (!moteMeshes.has(m.id)) moteMeshes.set(m.id, mesh(moteGeo, moteMat, scene)); moteMeshes.get(m.id).position.set(m.pos[0], .7 + Math.sin(seconds * 2 + Number(m.id.slice(1))) * .2, m.pos[2]); }
  for (const s of game.shades) {
    if (!shadeMeshes.has(s.id)) { const g = new THREE.Group(); const body = mesh(shadeGeo, shadeMat, g, [0, .9, 0]); body.scale.y = 1.3; for (const x of [-.22, .22]) mesh(new THREE.SphereGeometry(.09, 8, 6), mat('#d9a9ff', { emissive: '#d9a9ff', emissiveIntensity: 2 }), g, [x, 1.1, -.55]); scene.add(g); shadeMeshes.set(s.id, g); }
    const g = shadeMeshes.get(s.id); g.position.set(s.pos[0], s.pos[1] + Math.sin(seconds * 3) * .12, s.pos[2]); g.lookAt(game.player.pos[0], g.position.y, game.player.pos[2]); g.rotation.z = s.state === 'stunned' ? Math.sin(seconds * 12) * .25 : 0;
  }
  const progress = (performance.now() - pulseTime) / 650;
  pulseMesh.material.opacity = progress >= 0 && progress < 1 ? 1 - progress : 0; pulseMesh.scale.setScalar(Math.max(.01, progress * tuning.pulse_radius));
}
$('play').onclick = () => { if (game.state !== 'playing') reset(); running = true; keys.clear(); accumulator = 0; last = performance.now(); $('overlay').hidden = true; };
function pause() { if (!running || game.state !== 'playing') return; running = false; keys.clear(); showOverlay('Giữ lửa một chút.', 'Đêm đang tạm dừng. Tiếp tục khi bạn sẵn sàng.', 'Tiếp tục'); }
$('pause').onclick = pause;
addEventListener('keydown', e => { if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Escape') pause(); keys.add(e.code); });
addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', pause);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
reset();
function animate(now) {
  requestAnimationFrame(animate); const elapsed = Math.min(.15, (now - last) / 1000); last = now;
  if (running) {
    accumulator += elapsed;
    while (accumulator >= DT && running) {
      yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * DT * 1.5;
      const events = game.step({ move: [(keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0)], cam_yaw_deg: yaw * 180 / Math.PI, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyF') });
      for (const event of events) {
        if (event.name === 'pulse') { pulseTime = now; pulseMesh.position.set(game.player.pos[0], .1, game.player.pos[2]); announce('Ánh sáng xua Bóng Mực!'); }
        if (event.name === 'deposit') announce(`Đã nạp ${event.data.amount} đốm vào ${event.data.lantern_id}`);
        if (event.name === 'lantern_lit') announce('Một ngọn đèn thức giấc. Đảo sáng thêm!');
        if (event.name === 'player_hit') announce('Bóng Mực chạm Mây! Hãy tìm đèn đã thắp.');
      }
      accumulator -= DT;
      if (game.state !== 'playing') { running = false; showOverlay(game.state === 'won' ? 'Đảo Bến lại sáng rồi.' : 'Đêm nay khép lại.', `${game.state === 'won' ? 'Mây đã thắp đủ 5 Đèn Lồng Lớn.' : game.player.flames ? 'Bình minh đã đến trước khi đủ đèn.' : 'Mây đã hết ngọn lửa.'} Điểm của bạn: ${game.score}.`, 'Chơi lại đêm 1'); }
    }
    updateHUD();
  }
  sync(now / 1000);
  if (now > noticeUntil) {
    const l = game.lanterns.find(l => !l.lit && Math.hypot(l.pos[0] - game.player.pos[0], l.pos[2] - game.player.pos[2]) <= tuning.interact_radius);
    $('notice').textContent = l ? `${l.id} · ${l.deposited}/10 đốm · Nhấn E để nạp` : '';
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
