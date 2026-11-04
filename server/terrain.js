/* Địa hình phía server: nạp đúng code world.js của client trong máy ảo Node,
   để server và client có cùng độ cao / độ dốc / vùng (TEST-0000). */
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = path.join(__dirname, '..', 'client', 'js');

function loadTerrain() {
  const ctx = { console, Math, Float32Array, Uint8Array, Map, Set, Array, Object, JSON };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  for (const f of ['lib/three.min.js', 'core.js', 'util.js', 'data.js', 'world.js'])
    vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
  const World = vm.runInContext('World', ctx), Noise = vm.runInContext('Noise', ctx);
  const W = Object.create(World.prototype);
  Object.assign(W, { N: new Noise(20240), res: 2.5, half: 350, cols: new Map(), cellSize: 6 });
  W.n = Math.round(700 / W.res) + 1;
  W.initWaterBodies(); W.buildGrid();
  const api = {
    WORLD: vm.runInContext('WORLD', ctx),
    MTYPES: vm.runInContext('MTYPES', ctx),
    makeEquip: vm.runInContext('makeEquip', ctx),
    equipStats: vm.runInContext('equipStats', ctx),
    rollRarity: vm.runInContext('rollRarity', ctx),
    heightAt: (x, z) => W.heightAt(x, z),
    groundY: (x, z) => W.groundY(x, z),
    inWater: (x, z) => W.inWater(x, z),
    slopeAt: (x, z) => W.slopeAt(x, z),
    canStep: (x0, z0, x1, z1) => W.canStep(x0, z0, x1, z1),
    zoneAt: (x, z) => W.zoneAt(x, z),
    // chỗ đứng hợp lệ: trên mặt nước, không quá dốc, trong bản đồ
    okSpot: (x, z) => Math.hypot(x, z) < W.half - 40 && W.heightAt(x, z) > 0.4 && W.slopeAt(x, z) < 0.55,
  };
  return api;
}
module.exports = { loadTerrain };
