// Pure view builder; no entities or randomness are added to gameplay.
export function buildWorldView(THREE, world, palette) {
  const root = new THREE.Group();
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .9 });
  const ground = material(palette.ground), stone = material(palette.stone), bamboo = material(palette.bamboo), pad = material(palette.pad);
  const add = (geometry, mat, position) => { const m = new THREE.Mesh(geometry, mat); m.position.set(...position); root.add(m); return m; };
  for (const island of world.islands) {
    const [x, , z] = island.center, r = island.radius;
    add(new THREE.CylinderGeometry(r, r * .8, 5, 64), stone, [x, -2.6, z]);
    add(new THREE.CylinderGeometry(r, r, .2, 64), ground, [x, -.1, z]);
  }
  if (world.bridge) {
    const b = world.bridge;
    add(new THREE.BoxGeometry(b.maxX - b.minX, .16, b.maxZ - b.minZ), bamboo, [(b.minX + b.maxX) / 2, -.08, 0]);
    for (let x = b.minX; x < b.maxX; x += .6) add(new THREE.BoxGeometry(.5, .08, 4), bamboo, [x, .04, 0]);
  }
  if (world.night === 3) {
    // Extrude a half annulus rather than overlapping a full circular platform.
    const shape = new THREE.Shape();
    shape.moveTo(24, 0); shape.absarc(0, 0, 24, 0, Math.PI, false);
    shape.lineTo(-12, 0); shape.absarc(0, 0, 12, Math.PI, 0, true); shape.closePath();
    const terrace = add(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 48 }), ground, [0, 3, 0]);
    terrace.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(8, 8, 6, 64), ground, [0, 3, 0]).name = 'core-cutaway';
    for (const ramp of world.ramps) {
      const a = ramp.degrees * Math.PI / 180;
      // Thin ramp top, from radius 30 at y=0 to radius 24 at y=3.
      const rampMesh = add(new THREE.BoxGeometry(3, .1, Math.hypot(6, 3)), stone, [27 * Math.cos(a), 1.5, 27 * Math.sin(a)]);
      const inward = new THREE.Vector3(-Math.cos(a), .5, -Math.sin(a)).normalize();
      rampMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), inward);
    }
    const tower = world.tower;
    add(new THREE.CylinderGeometry(tower.radius, tower.radius, tower.height - 1, 24), stone, [0, 9.5, 0]).name = 'core-cutaway';
    add(new THREE.ConeGeometry(2.8, 1, 12), bamboo, [0, 13.5, 0]).name = 'core-cutaway';
    add(new THREE.SphereGeometry(.65, 12, 8), pad, [0, 12.6, 0]).name = 'core-cutaway';
  }
  for (const p of world.pads) {
    const disk = add(new THREE.CylinderGeometry(p.radius, p.radius, .1, 24), pad, [p.pos[0], p.pos[1] + .05, p.pos[2]]);
    disk.name = 'jump-pad';
  }
  root.userData.dispose = () => {
    const materials = new Set();
    root.traverse(obj => { obj.geometry?.dispose(); if (obj.material) materials.add(obj.material); });
    for (const mat of materials) mat.dispose();
  };
  return root;
}
