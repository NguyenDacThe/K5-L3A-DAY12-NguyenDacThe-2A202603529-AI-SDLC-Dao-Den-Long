// Contract v1.1 geometry. Coordinates are metres; positions describe feet.
const point = (radius, degrees, y = 0, cx = 0) => {
  const a = degrees * Math.PI / 180;
  return [cx + Math.cos(a) * radius, y, Math.sin(a) * radius];
};
const ring = (count, radius, offset = 0, y = 0, cx = 0) => Array.from({ length: count }, (_, i) => point(radius, offset + i * 360 / count, y, cx));
export const NIGHT_NAMES = ['Đảo Bến', 'Hai Bờ Mây', 'Đảo Chuông Gió'];
export function createWorld(night) {
  if (![1, 2, 3].includes(night)) throw new Error('night phải là 1, 2 hoặc 3');
  const world = {
    night, name: NIGHT_NAMES[night - 1], spawn: [0, 0, 0], islands: [], lanternPositions: [], motePoints: [], shadePoints: [], pads: [], charmPoints: [],
    shadeIntervalTicks: [480, 420, 360][night - 1], shadeLimit: [6, 8, 10][night - 1]
  };
  if (night === 1) {
    world.islands = [{ center: [0, 0, 0], radius: 40 }];
    world.lanternPositions = [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]];
    world.motePoints = [...ring(8, 12), ...ring(16, 33)];
    world.shadePoints = ring(12, 37, 15);
  } else if (night === 2) {
    world.islands = [0, 70].map(x => ({ center: [x, 0, 0], radius: 28 }));
    world.bridge = { minX: 26, maxX: 44, minZ: -2, maxZ: 2 };
    world.lanternPositions = [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]];
    world.motePoints = [0, 70].flatMap(x => [...ring(4, 10, 0, 0, x), ...ring(8, 22, 0, 0, x)]);
    world.shadePoints = [0, 70].flatMap(x => ring(8, 26, 22.5, 0, x));
    world.pads = [{ pos: [20, 0, 18], radius: 1, vy: 14, speed: 24, target: [70, 0, 0] }, { pos: [50, 0, -18], radius: 1, vy: 14, speed: 24, target: [0, 0, 0] }];
    world.charmPoints = [[35, 0, 0]];
  } else {
    world.islands = [{ center: [0, 0, 0], radius: 45 }];
    world.lanternPositions = [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]];
    world.motePoints = [...ring(18, 34), ...Array.from({ length: 8 }, (_, i) => point(18, 20 * (i + 1), 3)), ...ring(4, 5, 45, 6)];
    world.shadePoints = ring(16, 43);
    world.ramps = [30, 150].map(degrees => ({ degrees, width: 3, bottomRadius: 30, topRadius: 24, height: 3 }));
    world.tower = { pos: [0, 6, 0], radius: 2, height: 8 };
    world.pads = [{ pos: [0, 3, 13], radius: 1, vy: 12, speed: 8, direction: [0, -1] }];
    world.charmPoints = [[30, 0, 25], [-30, 0, 25]];
  }
  return world;
}
export function terrainHeight(world, x, z) {
  let floor = null;
  if (world.islands.some(i => Math.hypot(x - i.center[0], z - i.center[2]) <= i.radius)) floor = 0;
  const b = world.bridge;
  if (b && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) floor = 0;
  if (world.night !== 3 || floor === null) return floor;
  const radius = Math.hypot(x, z);
  if (radius <= 8) return 6;
  if (radius >= 12 && radius <= 24 && z > 0) return 3;
  for (const ramp of world.ramps) {
    const a = ramp.degrees * Math.PI / 180, along = x * Math.cos(a) + z * Math.sin(a), across = -x * Math.sin(a) + z * Math.cos(a);
    if (Math.abs(across) <= ramp.width / 2 && along >= 24 && along <= 30) return (30 - along) / 2;
  }
  return floor;
}
export function blockedByTower(world, pos) {
  return !!world.tower && pos[1] >= 6 && pos[1] < 14 && Math.hypot(pos[0], pos[2]) < world.tower.radius;
}
export function padAt(world, pos, grounded) {
  return grounded ? world.pads.find(p => Math.abs(pos[1] - p.pos[1]) < .05 && Math.hypot(pos[0] - p.pos[0], pos[2] - p.pos[2]) <= p.radius) : undefined;
}
export function launchVelocity(pad, pos) {
  let [dx, dz] = pad.direction ?? [pad.target[0] - pos[0], pad.target[2] - pos[2]];
  const length = Math.hypot(dx, dz); dx /= length; dz /= length;
  return [dx * pad.speed, pad.vy, dz * pad.speed];
}
