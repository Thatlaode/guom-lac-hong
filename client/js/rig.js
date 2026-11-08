/* =====================================================================
   KHUNG XƯƠNG CHUẨN 65 XƯƠNG (tên kiểu Mixamo, có 30 xương ngón tay) — QĐ-0017
   - Hình nộm tạm sinh bằng code gắn lên xương (sẽ thay bằng model .glb bất kỳ)
   - Ổ cắm (socket) cho vũ khí / hiệu ứng, chỉnh tỉ lệ theo hồ sơ model
   - Hoạt ảnh sinh bằng code áp lên MỌI model có cùng tên xương
   Hồ sơ model: assets/models/<tên>/profile.json (xem Bộ Não: He-thong-Nhan-vat-Khung-xuong.md)
   ===================================================================== */
const RIG_BONES = (() => {
  const B = [['Hips', null, 0, 0.98, 0], ['Spine', 'Hips', 0, 0.1, 0], ['Spine1', 'Spine', 0, 0.12, 0], ['Spine2', 'Spine1', 0, 0.12, 0], ['Neck', 'Spine2', 0, 0.16, 0], ['Head', 'Neck', 0, 0.08, 0], ['HeadTop_End', 'Head', 0, 0.2, 0]];
  for (const [S, sx] of [['Left', 1], ['Right', -1]]) {
    B.push([S + 'Shoulder', 'Spine2', 0.06 * sx, 0.1, 0], [S + 'Arm', S + 'Shoulder', 0.12 * sx, 0, 0], [S + 'ForeArm', S + 'Arm', 0, -0.28, 0], [S + 'Hand', S + 'ForeArm', 0, -0.25, 0]);
    const F = [['Thumb', 0.012 * sx, -0.03, 0.035, 0.03], ['Index', 0.004 * sx, -0.09, 0.025, 0.034], ['Middle', 0, -0.095, 0.008, 0.036], ['Ring', -0.002 * sx, -0.09, -0.01, 0.033], ['Pinky', -0.004 * sx, -0.08, -0.026, 0.027]];
    for (const [f, x, y, z, L] of F) { let par = S + 'Hand'; B.push([S + 'Hand' + f + '1', par, x, y, z]); for (let j = 2; j <= 4; j++) B.push([S + 'Hand' + f + j, S + 'Hand' + f + (j - 1), 0, -L * (j === 4 ? 0.7 : 1), f === 'Thumb' ? 0.006 : 0]); }
    B.push([S + 'UpLeg', 'Hips', 0.1 * sx, -0.05, 0], [S + 'Leg', S + 'UpLeg', 0, -0.43, 0], [S + 'Foot', S + 'Leg', 0, -0.42, 0], [S + 'ToeBase', S + 'Foot', 0, -0.06, 0.12], [S + 'Toe_End', S + 'ToeBase', 0, 0, 0.08]);
  }
  return B;
})();
const RIG_FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
/* tư thế tay: độ gập từng ngón (0 = duỗi, 1 = nắm) */
const HAND_POSES = {
  xoe: { Thumb: 0.1, Index: 0.05, Middle: 0.08, Ring: 0.1, Pinky: 0.12 },
  nam: { Thumb: 0.7, Index: 1, Middle: 1, Ring: 1, Pinky: 1 },
  cam_kiem: { Thumb: 0.55, Index: 0.85, Middle: 0.95, Ring: 0.95, Pinky: 0.95 },
  bat_an: { Thumb: 0.6, Index: 0, Middle: 0, Ring: 1, Pinky: 1 },
  cam_dan: { Thumb: 0.45, Index: 0.55, Middle: 0.6, Ring: 0.65, Pinky: 0.7 },
};
const RIG_SOCKETS = { hand_R: ['RightHand', [0, -0.08, 0.02]], hand_L: ['LeftHand', [0, -0.08, 0.02]], weapon: ['RightHand', [0, -0.07, 0.03]], weapon_L: ['LeftHand', [0, -0.07, 0.03]], back: ['Spine2', [0, 0.08, -0.18]], head_top: ['Head', [0, 0.32, 0]], chest: ['Spine2', [0, 0.02, 0.14]], feet: ['Hips', [0, -0.95, 0]] };
const _rq = new THREE.Quaternion(), _re = new THREE.Euler(), _rv = new THREE.Vector3();
const RIG_SHARED = {}; // vật liệu + hình dùng chung giữa các nhân vật
function rigMat(hex, o) { const k = hex + JSON.stringify(o || {}); return RIG_SHARED[k] || (RIG_SHARED[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.65 }, o || {}))); }

class Rig {
  constructor(o = {}) {
    this.o = o; this.g = new THREE.Group(); this.root = new THREE.Group(); this.g.add(this.root);
    this.B = {}; this.rest = {}; this.fingerMeshes = []; this.smallMeshes = []; this.parts = []; this.sockets = {};
    this.act = null; this.t = Math.random() * 10; this.cyc = 0; this.lean = 0; this.fly = 0; this.deadT = 0; this.hp = { L: 'xoe', R: o.handR || 'cam_kiem' };
    this.profile = Object.assign({ scale: 1, offsetY: 0, rotY: 0, armDown: 0, fxScale: 1, sockets: {} }, o.profile || {});
    this.buildBones(); this.buildDummy(o); this.buildSockets(); this.g.scale.setScalar(this.profile.scale);
  }
  buildBones() {
    for (const [n, p, x, y, z] of RIG_BONES) { const b = new THREE.Bone(); b.name = n; b.position.set(x, y, z); (p ? this.B[p] : this.root).add(b); this.B[n] = b; this.rest[n] = new THREE.Quaternion(); }
  }
  /* ---------- Hình nộm tạm (đơn giản, có ngón tay) ---------- */
  buildDummy(o) {
    const col = o.hex || 0x8a8a8a, skin = rigMat(0xe8c4a4, { roughness: 0.55 }), cloth = rigMat(col, { roughness: 0.7 }), pants = rigMat(0x3a2c24), dark = rigMat(0x2a1e18), hat = rigMat(0xd9c48a, { roughness: 0.8 }), belt = rigMat(0xb03a2e);
    const add = (bone, geo, mat, px, py, pz, small) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; this.B[bone].add(m); this.parts.push(m); if (small) this.smallMeshes.push(m); return m; };
    const limb = (bone, child, r0, r1, mat, small) => { const c = this.B[child].position, L = c.length(), g = RIG_SHARED['cyl' + r0 + r1 + L.toFixed(3)] || (RIG_SHARED['cyl' + r0 + r1 + L.toFixed(3)] = new THREE.CylinderGeometry(r1, r0, L, 7)); const m = add(bone, g, mat, c.x / 2, c.y / 2, c.z / 2, small); m.quaternion.setFromUnitVectors(_rv.set(0, 1, 0), c.clone().normalize()); return m; };
    const G = (k, f) => RIG_SHARED[k] || (RIG_SHARED[k] = f());
    add('Hips', G('hips', () => new THREE.BoxGeometry(0.3, 0.16, 0.2)), pants, 0, 0, 0);
    add('Spine1', G('torso', () => new THREE.CylinderGeometry(0.17, 0.15, 0.34, 8)), cloth, 0, 0.05, 0);
    add('Spine2', G('chest', () => new THREE.BoxGeometry(0.36, 0.2, 0.22)), cloth, 0, 0.06, 0);
    add('Spine', G('belt', () => new THREE.CylinderGeometry(0.16, 0.16, 0.06, 8)), belt, 0, 0.02, 0, true);
    add('Hips', G('skirt', () => new THREE.CylinderGeometry(0.17, 0.24, 0.3, 8, 1, true)), cloth, 0, -0.12, 0);
    limb('Neck', 'Head', 0.05, 0.05, skin, true);
    add('Head', G('head', () => new THREE.SphereGeometry(0.11, 12, 10)), skin, 0, 0.1, 0.01);
    const nonLa = add('Head', G('nonla', () => new THREE.ConeGeometry(0.27, 0.16, 16)), hat, 0, 0.27, 0); // nón lá
    add('Head', G('eye', () => new THREE.SphereGeometry(0.014, 6, 4)), dark, 0.04, 0.11, 0.1, true); add('Head', G('eye', () => null), dark, -0.04, 0.11, 0.1, true);
    for (const S of ['Left', 'Right']) {
      limb(S + 'Arm', S + 'ForeArm', 0.05, 0.045, cloth); limb(S + 'ForeArm', S + 'Hand', 0.042, 0.035, skin);
      add(S + 'Hand', G('palm', () => new THREE.BoxGeometry(0.035, 0.08, 0.07)), skin, 0, -0.04, 0);
      for (const f of RIG_FINGERS) for (let j = 1; j <= 3; j++) { const m = limb(S + 'Hand' + f + j, S + 'Hand' + f + (j + 1), 0.011, 0.01, skin, true); this.fingerMeshes.push(m); }
      limb(S + 'UpLeg', S + 'Leg', 0.075, 0.06, pants); limb(S + 'Leg', S + 'Foot', 0.055, 0.045, pants);
      add(S + 'Foot', G('foot', () => new THREE.BoxGeometry(0.08, 0.06, 0.2)), dark, 0, -0.05, 0.06);
    }
    this.nonLa = nonLa;
  }
  buildSockets() {
    for (const k in RIG_SOCKETS) { const [bone, pos] = RIG_SOCKETS[k], ov = this.profile.sockets[k] || {}, s = new THREE.Object3D(); s.name = 'socket_' + k; const b = this.B[ov.bone || bone]; s.position.fromArray(ov.pos || pos); if (ov.rot) s.rotation.fromArray(ov.rot); if (ov.scale) s.scale.setScalar(ov.scale); b.add(s); this.sockets[k] = s; }
  }
  attach(socket, obj) { this.sockets[socket].add(obj); return obj; }
  socketWorld(socket, v = new THREE.Vector3()) { return this.sockets[socket].getWorldPosition(v); }
  setLOD(level) { const f = level < 1, s = level < 2; for (const m of this.fingerMeshes) m.visible = f; for (const m of this.smallMeshes) m.visible = s; }
  /* ---------- Nạp model .glb bất kỳ (khung xương tên kiểu Mixamo) ---------- */
  loadModel(url, profile, done) {
    if (!THREE.GLTFLoader) return done && done(false);
    new THREE.GLTFLoader().load(url, gltf => {
      const P = this.profile = Object.assign(this.profile, profile || {}), map = P.boneMap || {}, found = {};
      gltf.scene.traverse(o => { if (!o.isBone) return; let n = map[o.name] || o.name.replace(/^mixamorig[:_]?/i, ''); if (this.B[n] && !found[n]) found[n] = o; });
      if (!found.Hips) { console.warn('[Rig] model không có xương Hips — bỏ qua', url); return done && done(false); }
      for (const m of this.parts) m.visible = false;
      this.root.add(gltf.scene); gltf.scene.scale.setScalar(P.modelScale || 1); gltf.scene.position.y = P.offsetY || 0; gltf.scene.rotation.y = P.rotY || 0;
      for (const n in found) { this.B[n] = found[n]; this.rest[n] = found[n].quaternion.clone(); }
      for (const k in this.sockets) { const s = this.sockets[k], ov = P.sockets[k] || {}; (this.B[ov.bone || RIG_SOCKETS[k][0]]).add(s); }
      gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.g.scale.setScalar(P.scale || 1); this.model = gltf; done && done(true, Object.keys(found).length);
    }, undefined, () => done && done(false));
  }
  /* ---------- Hoạt ảnh ---------- */
  play(n) { const D = { slash: 0.42, cast: 0.38, spin: 0.75, dash: 0.35, leap: 0.65, buff: 0.6, dodge: 0.45, hit: 0.22, respec: 1.5, open: 3 }[n] || 0.4; this.act = { n, t: 0, d: D }; }
  pose(n, x, y, z) { const b = this.B[n]; if (!b) return; _re.set(x, y, z); _rq.setFromEuler(_re); b.quaternion.copy(this.rest[n]).multiply(_rq); }
  hand(S, poseName, k = 1) {
    const P = HAND_POSES[poseName] || HAND_POSES.xoe, sg = S === 'Left' ? -1 : 1;
    for (const f of RIG_FINGERS) { const c = P[f] * k; for (let j = 1; j <= 3; j++) f === 'Thumb' ? this.pose(S + 'Hand' + f + j, c * 0.5, 0, sg * c * 0.6) : this.pose(S + 'Hand' + f + j, c * (j === 1 ? 1.2 : 1.4), 0, 0); }
  }
  update(dt, s) {
    this.t += dt; const A = this.act; if (A) { A.t += dt; if (A.t >= A.d) this.act = null; }
    const sp = Math.min(1.4, s.speed || 0), dead = s.dead, ad = this.profile.armDown || 0; this.cyc += dt * (4 + sp * 7) * (sp > 0.05 ? 1 : 0);
    this.fly += ((s.fly ? 1 : 0) - this.fly) * Math.min(1, dt * 5);
    const c = this.cyc, sw = Math.sin(c), br = Math.sin(this.t * 2) * 0.03, u = A ? A.t / A.d : 0;
    let hipY = 0, rootRx = 0, rootRy = 0, rootRz = 0;
    // thân & chân
    const leg = 0.75 * sp * (1 - this.fly);
    this.pose('Hips', 0, Math.sin(c) * 0.1 * sp, 0); hipY = Math.abs(Math.cos(c)) * 0.05 * sp;
    this.pose('Spine', 0.08 * sp + br, -Math.sin(c) * 0.08 * sp, 0); this.pose('Spine1', br, 0, 0); this.pose('Spine2', 0.03, -Math.sin(c) * 0.06 * sp, 0); this.pose('Neck', -0.05 * sp, 0, 0); this.pose('Head', 0, 0, 0);
    this.pose('LeftUpLeg', -sw * leg - this.fly * 0.6, 0, 0.03); this.pose('RightUpLeg', sw * leg - this.fly * 0.2, 0, -0.03);
    this.pose('LeftLeg', Math.max(0, Math.cos(c)) * leg * 1.1 + this.fly * 1.0, 0, 0); this.pose('RightLeg', Math.max(0, -Math.cos(c)) * leg * 1.1 + this.fly * 0.4, 0, 0);
    this.pose('LeftFoot', 0, 0, 0); this.pose('RightFoot', 0, 0, 0);
    // tay
    let la = [sw * 0.6 * sp + 0.05, 0, 0.12 + ad], ra = [-sw * 0.6 * sp + 0.05, 0, -0.12 - ad], lf = [-0.25 - 0.3 * sp, 0, 0], rf = [-0.3 - 0.3 * sp, 0, 0], hl = 'xoe', hr = this.hp.R;
    if (this.fly > 0.05) { la = [0, 0, 1.0 * this.fly + ad]; ra = [0, 0, -1.0 * this.fly - ad]; lf = [0, 0, 0.2]; rf = [0, 0, -0.2]; }
    if (A) {
      const e = Math.sin(Math.min(1, u) * Math.PI);
      switch (A.n) {
        case 'slash': ra = [-1.6 + u * 2.6, 0, -0.6 - ad + e * 0.3]; rf = [-0.4, 0, 0]; rootRy = (u - 0.4) * 0.9; break;
        case 'cast': ra = [-1.45 * e - 0.1, 0, -0.15 - ad]; rf = [-0.1 * e, 0, 0]; hr = 'bat_an'; la = [-0.5 * e, 0, 0.3 + ad]; break;
        case 'spin': rootRy = u * Math.PI * 2; la = [0, 0, 1.3 + ad]; ra = [0, 0, -1.3 - ad]; break;
        case 'dash': rootRx = 0.4 * e; ra = [-1.2, 0, -0.4 - ad]; la = [0.6, 0, 0.3 + ad]; break;
        case 'leap': hipY += Math.sin(u * Math.PI) * 1.4; la = [-2.4 * e, 0, 0.3 + ad]; ra = [-2.4 * e, 0, -0.3 - ad]; hr = 'nam'; break;
        case 'buff': la = [-2.6 * e, 0, 0.4 + ad]; ra = [-2.6 * e, 0, -0.4 - ad]; hl = hr = 'xoe'; break;
        case 'dodge': rootRx = u * Math.PI * 2; hipY += Math.sin(u * Math.PI) * 0.5; break;
        case 'hit': rootRx = -0.2 * e; break;
        case 'respec': case 'open': la = [-1.2, 0, 0.5 + ad]; ra = [-1.2, 0, -0.5 - ad]; hl = hr = 'bat_an'; hipY -= 0.2; break;
      }
    }
    if (s.stun) { rootRz = Math.sin(this.t * 9) * 0.12; }
    this.pose('LeftShoulder', 0, 0, 0); this.pose('RightShoulder', 0, 0, 0);
    this.pose('LeftArm', la[0], la[1], la[2]); this.pose('RightArm', ra[0], ra[1], ra[2]); this.pose('LeftForeArm', lf[0], lf[1], lf[2]); this.pose('RightForeArm', rf[0], rf[1], rf[2]);
    this.pose('LeftHand', 0, 0, 0); this.pose('RightHand', 0, 0, 0); this.hand('Left', hl); this.hand('Right', hr);
    // gục / chết
    if (dead) { this.deadT = Math.min(1, this.deadT + dt * 2.2); rootRx = -1.45 * this.deadT; hipY = -0.75 * this.deadT; } else this.deadT = 0;
    this.root.position.y = hipY + (this.profile.offsetY || 0) * 0 + (dead ? 0.15 * this.deadT : 0);
    this.root.rotation.set(rootRx, rootRy + (this.profile.rotY || 0) * 0, rootRz);
  }
}
/* =====================================================================
   VŨ KHÍ (QĐ-0032) — mỗi Dòng một loại, đặt đúng tay + chỗ cất (hông / lưng)
   Trong ổ "weapon" (xương hand_r): lưỡi chĩa theo −Y, CHUÔI nằm ở gốc tọa độ.
   Model .glb (lưỡi theo +Y) được xoay lật trong WeaponLib. Thay model: sửa WEAPON_DEF.
   len: chiều dài thật (m) · grip: dời chuôi (m, dương = đẩy vũ khí ra trước tay)
   twin: cầm hai tay (tay trái cầm bản sao) · sheath: hip | back
   ===================================================================== */
const VK = 'assets/models/vu-khi/';
const WEAPON_DEF = {
  guom: { file: 'kho-guom-38.glb', len: 0.95, grip: 0, spin: 0, sheath: 'hip', hand: 'cam_kiem' },           // 🔴 gói gươm chưa rõ giấy phép
  dao: { file: 'kho-dao-358.glb', len: 0.95, grip: 0, spin: Math.PI / 2, sheath: 'hip', hand: 'cam_kiem' },   // 🔴 như trên
  dao_doi: { file: 'q-dagger.glb', len: 0.48, grip: 0, spin: 0, twin: true, sheath: 'hip', hand: 'cam_kiem' },
  thuong: { file: 'q-spear.glb', len: 2.1, grip: 0.3, spin: 0, sheath: 'back', hand: 'cam_kiem' },
  bua: { file: 'q-hammer-double.glb', len: 1.2, grip: 0.15, spin: 0, sheath: 'back', hand: 'nam' },
  dui_chieng: { file: 'q-hammer-small.glb', len: 0.62, grip: 0, spin: 0, sheath: 'back', hand: 'nam', gong: true },
  gay_tre: { proc: 'tre', len: 1.9, grip: 0.65, sheath: 'back', hand: 'cam_kiem' },
  den_long: { proc: 'denlong', len: 1.25, grip: 0.25, sheath: 'back', hand: 'cam_kiem' },
  quat_la: { proc: 'quat', len: 0.45, grip: 0.05, sheath: 'hip', hand: 'cam_kiem', gourd: true },
  lua: { proc: 'lua', len: 0.3, grip: 0, sheath: 'hip', hand: 'xoe', ribbon: true },
};
const WeaponLib = {
  cache: {},
  load(file) { return this.cache[file] || (this.cache[file] = CharLib.load(VK + file).then(g => { const sc = g.scene; sc.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(sc); return { scene: sc, minY: b.min.y, maxY: b.max.y }; })); },
  /* trả về Group: gốc = chuôi, lưỡi theo −Y */
  async make(kind) {
    const D = WEAPON_DEF[kind] || WEAPON_DEF.guom, g = new THREE.Group(); g.name = 'vk_' + kind;
    if (D.proc) { g.add(procWeapon(D.proc, D)); return g; }
    const W = await this.load(D.file), m = W.scene.clone(true), L = W.maxY - W.minY, k = D.len / L;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.metalness = Math.min(0.85, (o.material.metalness || 0) + 0.25); o.material.roughness = Math.max(0.25, (o.material.roughness || 0.6) - 0.15); } });
    const inner = new THREE.Group(); inner.add(m); m.scale.setScalar(k); inner.rotation.set(Math.PI, D.spin || 0, 0); inner.position.y = W.minY * k / 2 + (D.grip || 0); g.add(inner); // tay nắm giữa chuôi
    return g;
  },
};
/* vũ khí vẽ bằng code (gậy tre, đèn lồng, quạt lá, dải lụa) — lưỡi/đầu theo −Y */
function procWeapon(kind, D) {
  const g = new THREE.Group(), M = rigMat, add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); k.castShadow = true; g.add(k); return k; };
  if (kind === 'tre') { // gậy tre ngà: các đốt + mắt tre
    const n = 7, L = D.len, seg = L / n, top = D.grip;
    for (let i = 0; i < n; i++) { add(new THREE.CylinderGeometry(0.019, 0.021, seg * 0.96, 8), M(i % 2 ? 0x9cba4a : 0xa8c454, { roughness: 0.55 }), 0, top - seg * (i + 0.5), 0); add(new THREE.TorusGeometry(0.021, 0.006, 5, 10), M(0x6a7a2a), 0, top - seg * (i + 1), 0, Math.PI / 2); }
    add(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 8), M(0x7a1e1e, { roughness: 0.8 }), 0, 0, 0); // quấn vải chỗ cầm
  } else if (kind === 'denlong') { // cán tre + đèn lồng đỏ phát sáng
    add(new THREE.CylinderGeometry(0.013, 0.015, D.len, 6), M(0x8a6a3a), 0, D.grip - D.len / 2, 0);
    const y = D.grip - D.len - 0.12; add(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), M(0x2a1a10), 0, y + 0.06, 0);
    const lamp = add(new THREE.SphereGeometry(0.13, 14, 10), M(0xe8302a, { emissive: 0xff4a1a, emissiveIntensity: 0.9, roughness: 0.6 }), 0, y - 0.13, 0); lamp.scale.y = 1.25;
    add(new THREE.CylinderGeometry(0.06, 0.08, 0.035, 10), M(0xd4a83a, { metalness: 0.6 }), 0, y - 0.0, 0); add(new THREE.CylinderGeometry(0.08, 0.06, 0.035, 10), M(0xd4a83a, { metalness: 0.6 }), 0, y - 0.29, 0);
    add(new THREE.ConeGeometry(0.02, 0.14, 5), M(0xffd24a), 0, y - 0.38, 0, Math.PI);
  } else if (kind === 'quat') { // quạt lá xòe
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), M(0x6a4a2a), 0, -0.02, 0);
    const fan = add(new THREE.CircleGeometry(0.32, 14, -Math.PI * 0.32, Math.PI * 0.64), M(0x5fae4a, { side: THREE.DoubleSide, roughness: 0.75 }), 0, -0.08, 0, 0, Math.PI / 2, -Math.PI / 2);
    for (let i = 0; i < 7; i++) { const a = -0.95 + i * 0.32; add(new THREE.BoxGeometry(0.006, 0.3, 0.006), M(0x3a5a20), 0, -0.08 - Math.cos(a) * 0.15, Math.sin(a) * 0.15, -a); }
    fan.renderOrder = 1;
  } else if (kind === 'lua') { add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), M(0xa8e6ff, { emissive: 0x2a8ab0, emissiveIntensity: 0.4 }), 0, 0, 0, Math.PI / 2); }
  return g;
}
/* vũ khí tạm cho hình nộm (khi chưa nạp được model) */
function rigWeapon(fk, hex) {
  const F = (typeof GLH !== 'undefined' && GLH.FACTIONS[fk]) || {}, D = WEAPON_DEF[F.weapon] || WEAPON_DEF.guom, g = new THREE.Group(); g.isProcWeapon = true;
  if (D.proc) g.add(procWeapon(D.proc, D)); else { const k = new THREE.Mesh(new THREE.BoxGeometry(0.03, D.len, 0.012), rigMat(0xdde4ea, { metalness: 0.8, roughness: 0.3 })); k.position.y = -D.len / 2 + D.grip; g.add(k); }
  return g;
}
/* dải lụa mềm bay theo tay (mô phỏng chuỗi điểm, đặt trong không gian thế giới) */
class Ribbon {
  constructor(color, n = 18, seg = 0.13, w = 0.07) {
    this.n = n; this.seg = seg; this.w = w; this.p = []; this.v = []; for (let i = 0; i < n; i++) { this.p.push(new THREE.Vector3()); this.v.push(new THREE.Vector3()); }
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 2 * 3), idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.4, emissive: color, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 })); this.mesh.frustumCulled = false; this.init = false;
  }
  update(dt, anchor, t) {
    const P = this.p, n = this.n; if (!this.init) { for (let i = 0; i < n; i++) P[i].copy(anchor).y -= i * this.seg; this.init = true; }
    P[0].copy(anchor); const g = 4.5 * dt * dt, damp = 0.9;
    for (let i = 1; i < n; i++) { const p = P[i], v = this.v[i]; v.multiplyScalar(damp); p.add(v); p.y -= g * 12; p.x += Math.sin(t * 3 + i * 0.5) * 0.004; p.z += Math.cos(t * 2.3 + i * 0.4) * 0.004; }
    for (let k = 0; k < 2; k++) for (let i = 1; i < n; i++) { const a = P[i - 1], b = P[i], d = b.distanceTo(a) || 1e-4, f = (d - this.seg) / d; const old = b.clone(); b.x -= (b.x - a.x) * f; b.y -= (b.y - a.y) * f; b.z -= (b.z - a.z) * f; this.v[i].add(old.sub(b).multiplyScalar(-0.5)); }
    const pos = this.mesh.geometry.attributes.position.array, side = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) { dir.subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize(); side.crossVectors(dir, up); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize().multiplyScalar(this.w * (1 - i / n * 0.5)); const o = i * 6; pos[o] = P[i].x + side.x; pos[o + 1] = P[i].y + side.y; pos[o + 2] = P[i].z + side.z; pos[o + 3] = P[i].x - side.x; pos[o + 4] = P[i].y - side.y; pos[o + 5] = P[i].z - side.z; }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.computeVertexNormals();
  }
}

/* =====================================================================
   NHÂN VẬT THẬT + HOẠT ẢNH QUAY SẴN (Quaternius CC0 — cùng khung 65 xương)
   Thân: đầu (dau-nam/nu) + áo (ao-nam/nu = Nông dân, ao-nam-2/ao-nu-2 = Lữ khách) + tóc gắn xương Head
   Hoạt ảnh: hoat-anh-1/2.glb → AnimationMixer; tự ghép thêm clip RÚT / CẤT vũ khí từ các tư thế có sẵn
   Đổi ngoại hình theo Dòng: sửa CHAR_LOOK; đổi động tác: sửa ANIM_SET
   ===================================================================== */
const QB = 'assets/models/quaternius/';
const STD2UE = (() => {
  const m = { Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck_01', Head: 'Head' }, F = { Thumb: 'thumb', Index: 'index', Middle: 'middle', Ring: 'ring', Pinky: 'pinky' };
  for (const [S, s] of [['Left', 'l'], ['Right', 'r']]) {
    Object.assign(m, { [S + 'Shoulder']: 'clavicle_' + s, [S + 'Arm']: 'upperarm_' + s, [S + 'ForeArm']: 'lowerarm_' + s, [S + 'Hand']: 'hand_' + s, [S + 'UpLeg']: 'thigh_' + s, [S + 'Leg']: 'calf_' + s, [S + 'Foot']: 'foot_' + s, [S + 'ToeBase']: 'ball_' + s, [S + 'Toe_End']: 'ball_leaf_' + s });
    for (const f in F) for (let j = 1; j <= 4; j++) m[S + 'Hand' + f + j] = F[f] + '_0' + j + (j === 4 ? '_leaf_' : '_') + s;
  }
  return m;
})();
/* Ngoại hình 10 Dòng — outfit: 1 = áo Nông dân, 2 = áo Lữ khách (có mũ trùm, giáp vai)
   tint: màu nhuộm áo · hood: đội mũ trùm · nonLa/khan/tram: đồ vẽ bằng code (thuần Việt) */
const CHAR_LOOK = {
  kiem: { sex: 'nam', outfit: 2, hood: false, tint: 0x8a5a2c, skin: 0xc8946e, skinMul: [2.3, 2.05, 1.9], hair: 'hair_buzzed', hairCol: 0x15100c, kim: 'nam' }, // 🆙 bản Kim theo concept (trang phục: rig-outfit.js)
  tram: { sex: 'nu', outfit: 2, hood: false, tint: 0x9a6a30, skin: 0xd09c76, skinMul: [2.4, 2.15, 2.0], hair: 'hair_long', hairCol: 0x120e0c, kim: 'nu' }, // 🆙 bản Kim theo concept (trang phục: rig-outfit.js)
  tre: { sex: 'nam', outfit: 1, tint: 0x9fcf7a, hair: 'hair_buzzed', hairCol: 0x1a1410, nonLa: true },
  duoc: { sex: 'nu', outfit: 1, tint: 0x9fdca8, hair: 'hair_buns', hairCol: 0x1a1410, khan: 0x4f9a5a },
  bang: { sex: 'nam', outfit: 2, hood: true, tint: 0x86b2e6, hair: null },
  lua: { sex: 'nu', outfit: 1, tint: 0xb2e8f6, hair: 'hair_long', hairCol: 0x120e0c, nonLa: true },
  hoa: { sex: 'nam', outfit: 2, hood: false, tint: 0xf08a60, hair: 'hair_buzzed', hairCol: 0x1a1410, khan: 0xc0301e },
  gao: { sex: 'nu', outfit: 2, hood: true, tint: 0xf07a74, hair: 'hair_long', hairCol: 0x120e0c },
  thach: { sex: 'nam', outfit: 1, tint: 0xc8a070, hair: null, khan: 0x6a4a2a },
  chieng: { sex: 'nu', outfit: 2, hood: false, tint: 0xe6c070, hair: 'hair_buns', hairCol: 0x120e0c, khan: 0xd4a020 },
};
/* Bộ động tác theo Dòng: tên chung trong game → tên clip */
const ANIM_SET = {
  _chung: { idle: 'Idle_Loop', idleArmed: 'Sword_Idle', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', run: 'Sprint_Loop', jumpStart: 'Jump_Start', jumpLoop: 'Jump_Loop', jumpLand: 'Jump_Land', fly: 'NinjaJump_Idle_Loop',
    armUpper: 'Sword_Idle', dodge: 'Roll', hit: 'Hit_Chest', hitBig: 'Hit_Knockback', stun: 'Hit_Head', die: 'Death01', open: 'Chest_Open', respec: 'Fixing_Kneeling', drink: 'Consume', victory: 'Dance_Loop', lobby: 'Idle_FoldArms_Loop',
    slash: ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'], stab: ['Sword_Attack', 'Sword_Regular_C'], cast: 'Spell_Simple_Shoot', spin: 'Sword_Heavy_Combo', dash: 'Sword_Dash', leap: 'NinjaJump_Start', buff: 'Spell_Simple_Enter', ult: 'Spell_Simple_Enter',
    draw: 'Draw_Hip', sheathe: 'Sheathe_Hip', block: 'Sword_Block' },
  kiem: { cast: 'Sword_Attack', ult: 'Sword_Heavy_Combo' },
  tram: { cast: ['OverhandThrow', 'Spell_Simple_Shoot'], dodge: 'Roll', ult: 'OverhandThrow', idleArmed: 'Sword_Idle' },
  tre: { slash: ['Sword_Regular_A', 'Sword_Regular_B', 'Melee_Hook'], spin: 'Sword_Heavy_Combo', draw: 'Draw_Back', sheathe: 'Sheathe_Back' },
  duoc: { cast: ['OverhandThrow', 'Spell_Simple_Shoot'], buff: 'Consume', spin: 'Spell_Simple_Enter', dash: 'Roll', idleArmed: 'Spell_Simple_Idle_Loop', armUpper: 'Spell_Simple_Idle_Loop' },
  bang: { dash: 'Shield_Dash', draw: 'Draw_Back', sheathe: 'Sheathe_Back' },
  lua: { cast: ['Sword_Regular_A', 'Sword_Regular_B'], slash: ['Sword_Regular_B', 'Sword_Regular_A'], spin: 'Sword_Heavy_Combo', idleArmed: 'Spell_Simple_Idle_Loop', armUpper: 'Spell_Simple_Idle_Loop' },
  hoa: { spin: 'Sword_Heavy_Combo', ult: 'Sword_Heavy_Combo' },
  gao: { idleArmed: 'Idle_Lantern_Loop', armUpper: 'Idle_Lantern_Loop', idle: 'Idle_Lantern_Loop', draw: 'Draw_Back', sheathe: 'Sheathe_Back' },
  thach: { slash: ['Sword_Regular_A', 'Melee_Hook', 'Sword_Regular_B'], spin: 'Melee_Hook', dash: 'Shield_Dash', ult: 'Sword_Heavy_Combo', draw: 'Draw_Back', sheathe: 'Sheathe_Back' },
  chieng: { slash: ['Sword_Regular_A', 'Sword_Regular_B'], ult: 'Spell_Simple_Enter', draw: 'Draw_Back', sheathe: 'Sheathe_Back' },
};
const UPPER_RX = /^(spine_0[23]|neck|Head|clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/;
const LOWER_RX = /^(root|pelvis|spine_01|thigh|calf|foot|ball)/;
/* Ghép clip mới từ các tư thế lấy trong clip có sẵn: keys = [[clip, giây trong clip, thời điểm trong clip mới], ...] */
function poseClip(C, name, keys, rx) {
  const base = C[keys[0][0]], tracks = [];
  for (const tr of base.tracks) {
    const bn = tr.name.split('.')[0]; if (rx && !rx.test(bn)) continue; const times = [], vals = []; let ok = true;
    for (const [cn, t, at] of keys) { const src = C[cn] && C[cn].tracks.find(x => x.name === tr.name); if (!src) { ok = false; break; } const I = src.createInterpolant(), v = I.evaluate(Math.min(t, C[cn].duration)); times.push(at); vals.push(...v); }
    if (ok) tracks.push(new tr.constructor(tr.name, times, vals));
  }
  return new THREE.AnimationClip(name, keys[keys.length - 1][2], tracks);
}
const CharLib = {
  L: null, cache: {}, tpl: {}, clips: null, clipsP: null, failed: false,
  load(url) { this.L = this.L || new THREE.GLTFLoader(); return this.cache[url] || (this.cache[url] = new Promise((ok, no) => this.L.load(url, ok, undefined, no))); },
  async allClips() {
    if (this.clips) return this.clips; if (!this.clipsP) this.clipsP = Promise.all([this.load(QB + 'hoat-anh-1.glb'), this.load(QB + 'hoat-anh-2.glb')]).then(([a, b]) => {
      const C = {}; for (const c of [...a.animations, ...b.animations]) C[c.name] = c;
      /* RÚT / CẤT vũ khí (tự ghép): tay phải với ra chỗ cất rồi về thế thủ */
      const thr = C.OverhandThrow, rb = C.Sword_Regular_B;
      if (thr && C.Sword_Idle && C.Idle_Loop) {
        C.Draw_Back = poseClip(C, 'Draw_Back', [['Idle_Loop', 0, 0], ['OverhandThrow', thr.duration * 0.28, 0.2], ['Sword_Idle', 0, 0.48]], UPPER_RX);
        C.Sheathe_Back = poseClip(C, 'Sheathe_Back', [['Sword_Idle', 0, 0], ['OverhandThrow', thr.duration * 0.28, 0.26], ['Idle_Loop', 0, 0.55]], UPPER_RX);
      }
      if (rb && C.Sword_Idle && C.Idle_Loop) {
        C.Draw_Hip = poseClip(C, 'Draw_Hip', [['Idle_Loop', 0, 0], ['Sword_Regular_B', 0.02, 0.18], ['Sword_Idle', 0, 0.42]], UPPER_RX);
        C.Sheathe_Hip = poseClip(C, 'Sheathe_Hip', [['Sword_Idle', 0, 0], ['Sword_Regular_B', 0.02, 0.24], ['Idle_Loop', 0, 0.5]], UPPER_RX);
      }
      for (const k of Object.keys(C)) { const c = C[k]; const sub = (rx, s) => new THREE.AnimationClip(k + s, c.duration, c.tracks.filter(t => rx.test(t.name.split('.')[0]))); if (!C[k + '#U']) C[k + '#U'] = sub(UPPER_RX, '#U'); if (!C[k + '#L']) C[k + '#L'] = sub(LOWER_RX, '#L'); }
      for (const k in C) C[k].tracks = C[k].tracks.filter(t => !(t.name.startsWith('root.') && t.name.endsWith('position'))); // giữ tại chỗ
      return (this.clips = C);
    }); return this.clipsP;
  },
  async template(fk) {
    if (this.tpl[fk]) return this.tpl[fk];
    return (this.tpl[fk] = (async () => {
      const Lk = CHAR_LOOK[fk] || CHAR_LOOK.kiem, head = await this.load(QB + 'dau-' + Lk.sex + '.glb'), ao = await this.load(QB + 'ao-' + Lk.sex + (Lk.outfit === 2 ? '-2' : '') + '.glb');
      const root = THREE.SkeletonUtils.clone(head.scene), bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
      const aoS = THREE.SkeletonUtils.clone(ao.scene), meshes = []; aoS.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
      for (const m of meshes) {
        if (/Hood/.test(m.name) && !Lk.hood) continue; // bỏ mũ trùm nếu Dòng này không đội
        const sk = new THREE.Skeleton(m.skeleton.bones.map(b => bones[b.name]), m.skeleton.boneInverses); root.add(m); m.bind(sk, m.bindMatrix);
        const mats = Array.isArray(m.material) ? m.material : [m.material]; m.material = mats.map(mt => { const c = mt.clone(); if (/Peasant|Ranger/.test(mt.name)) { c.color.setHex(Lk.tint); c.roughness = 0.78; } if (/Regular/.test(mt.name)) { c.map = null; c.color.setHex(Lk.skin || 0xb07a5a); c.roughness = 0.7; } return c; }); if (m.material.length === 1) m.material = m.material[0];
      }
      if (Lk.skinMul) root.traverse(o => { if (o.isMesh && o.material && /Superhero/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.setRGB(Lk.skinMul[0], Lk.skinMul[1], Lk.skinMul[2]); o.material.roughness = 0.62; } }); // 🆙 màu da theo Dòng
      root.updateMatrixWorld(true); const H = bones.Head, inv = new THREE.Matrix4().copy(H.matrixWorld).invert();
      if (Lk.hair && !Lk.hood) { const hs = THREE.SkeletonUtils.clone((await this.load(QB + Lk.hair + '.glb')).scene); hs.updateMatrixWorld(true); hs.applyMatrix4(inv); hs.position.y += 0.012; hs.scale.multiplyScalar(1.04); hs.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(Lk.hairCol || 0x1a1410); } }); H.add(hs); }
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      return { root, look: Lk };
    })());
  },
};
/* đặt vật vào xương sao cho trong KHÔNG GIAN NHÂN VẬT nó nằm ở pos (m) và xoay rot (Euler) — không cần biết trục xương */
function attachInCharSpace(model, bone, obj, pos, rot) {
  model.updateMatrixWorld(true); const mw = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(pos), new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rot)), new THREE.Vector3(1, 1, 1));
  const charW = model.matrixWorld.clone(), boneInv = new THREE.Matrix4().copy(bone.matrixWorld).invert(), local = boneInv.multiply(charW).multiply(mw);
  local.decompose(obj.position, obj.quaternion, obj.scale); bone.add(obj); return obj;
}
/* chỗ cất vũ khí (không gian nhân vật: +Z = trước mặt, +X = bên trái nhân vật) */
const SHEATH = {
  hip: { bone: 'pelvis', pos: [0.19, 0.95, -0.06], rot: [-0.45, 0, -0.15] },          // hông trái, mũi chúc xuống-sau
  back: { bone: 'spine_03', pos: [0, 1.32, -0.2], rot: [0, 0, Math.PI - 0.6] },      // chéo sau lưng, chuôi trên vai phải
  hip2: { bone: 'pelvis', pos: [-0.19, 0.95, -0.06], rot: [-0.45, 0, 0.15] },         // hông phải (dao thứ hai)
};
Rig.prototype.useChar = async function (fk) {
  try {
    const F0 = GLH.FACTIONS[fk] || {}, WD0 = WEAPON_DEF[F0.weapon] || WEAPON_DEF.guom;
    const [T, C, W1, W2] = await Promise.all([CharLib.template(fk), CharLib.allClips(), WeaponLib.make(F0.weapon || 'guom'), WD0.twin ? WeaponLib.make(F0.weapon) : null]); if (this.disposed) return;
    /* từ đây trở xuống KHÔNG await — tránh xương bị hoạt ảnh tạm uốn sai trong lúc chờ */
    const m = THREE.SkeletonUtils.clone(T.root), b = {}; m.traverse(o => { if (o.isBone) b[o.name] = o; });
    for (const p of this.parts) p.visible = false; this.root.add(m); this.model = m; this.look = T.look; this.fk = fk; this.bones = b;
    for (const k in STD2UE) if (b[STD2UE[k]]) this.B[k] = b[STD2UE[k]];
    // ổ cắm: dời sang xương của model
    const SOCK = { weapon: ['hand_r', [0.08, 0.02, 0.0], [0, 0, Math.PI / 2]], weapon_L: ['hand_l', [-0.08, -0.02, 0.0], [0, 0, -Math.PI / 2]], hand_R: ['hand_r', [0.08, 0, 0]], hand_L: ['hand_l', [0.08, 0, 0]], back: ['spine_03', [0, 0.1, -0.18]], head_top: ['Head', [0, 0.2, 0.02]], chest: ['spine_03', [0, 0.05, 0.14]], feet: ['pelvis', [0, -0.95, 0]] };
    if (!this.sockets.weapon_L) { this.sockets.weapon_L = new THREE.Object3D(); }
    for (const k in SOCK) { const s = this.sockets[k], d = SOCK[k], ov = (this.profile.sockets || {})[k] || {}; if (!s) continue; (b[ov.bone || d[0]] || this.root).add(s); s.position.fromArray(ov.pos || d[1]); s.rotation.fromArray(ov.rot || d[2] || [0, 0, 0]); }
    const L = T.look;
    if (L.nonLa) { const nl = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.17, 18), rigMat(0xd9c48a, { roughness: 0.85 })); nl.position.set(0, 0.03, 0); nl.castShadow = true; this.sockets.head_top.add(nl); }
    if (L.khan) { const kh = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.016, 6, 20), rigMat(L.khan, { roughness: 0.9 })); kh.rotation.x = Math.PI / 2 - 0.3; kh.position.set(0, -0.02, -0.01); kh.scale.set(1, 1.18, 1); this.sockets.head_top.add(kh); }
    if (L.tram) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 5), rigMat(0xe8eef4, { metalness: 0.9, roughness: 0.2 })); tr.rotation.z = 1.1; tr.position.set(0, -0.02, -0.08); this.sockets.head_top.add(tr); }
    if (L.kim && typeof applyKimOutfit === 'function') applyKimOutfit(this, m, b, L); // 🆙 trang phục Kim (rig-outfit.js)
    /* vũ khí thật */
    const F = GLH.FACTIONS[fk] || {}, wk = F.weapon || 'guom', WD = WEAPON_DEF[wk] || WEAPON_DEF.guom; this.wk = wk; this.WD = WD; this.hp.R = WD.hand || 'cam_kiem';
    for (const s of [this.sockets.weapon]) for (const c of [...s.children]) if (c.isProcWeapon) s.remove(c);
    const sh = SHEATH[WD.sheath] || SHEATH.hip; this.sheathS = attachInCharSpace(m, b[sh.bone] || m, new THREE.Object3D(), sh.pos, sh.rot);
    this.weapons = [W1];
    if (WD.twin && W2) { this.weapons.push(W2); const s2 = SHEATH.hip2; this.sheathS2 = attachInCharSpace(m, b[s2.bone] || m, new THREE.Object3D(), s2.pos, s2.rot); }
    if (WD.gourd) { const gd = new THREE.Group(), gm = rigMat(0xc89a4a, { roughness: 0.6 }); for (const [r, y] of [[0.07, -0.1], [0.05, 0.0]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), gm); s.position.y = y; gd.add(s); } attachInCharSpace(m, b.pelvis || m, gd, [-0.2, 0.9, 0.04], [0, 0, 0.2]); }
    if (WD.gong) { const gg = new THREE.Group(), br = rigMat(0xc8962a, { metalness: 0.75, roughness: 0.35 }); const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 24), br); disc.rotation.x = Math.PI / 2; gg.add(disc); const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), br); boss.position.z = -0.02; gg.add(boss); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 6, 24), br); gg.add(rim); attachInCharSpace(m, b.spine_03 || m, gg, [0, 1.25, -0.2], [0, 0, 0]); }
    if (WD.ribbon) { this.ribbons = [new Ribbon(0x9ae0ff), new Ribbon(0xc8f0ff)]; for (const r of this.ribbons) this.g.add(r.mesh); }
    this.armed = null; this.setArmed(false, true);
    this.mixer = new THREE.AnimationMixer(m); this.C = C; this.A = {}; this.set = Object.assign({}, ANIM_SET._chung, ANIM_SET[fk] || {}); this.loco = null; this.shot = null; this.combo = 0; this.air = false; this.upper = null;
    this.setLoco('idle', 0);
  } catch (e) { console.warn('[Rig] không nạp được nhân vật thật, dùng hình nộm', e); CharLib.failed = true; }
};
/* cầm (armed) / cất vũ khí — đổi chỗ vũ khí giữa tay và chỗ cất */
Rig.prototype.setArmed = function (on, instant) {
  if (!this.weapons || this.armed === on) return; this.armed = on;
  const put = () => { const [w1, w2] = this.weapons; if (on) { this.sockets.weapon.add(w1); if (w2) this.sockets.weapon_L.add(w2); } else { this.sheathS.add(w1); if (w2) (this.sheathS2 || this.sheathS).add(w2); } };
  clearTimeout(this._armT); if (this.onArm && this.mixer) this.onArm(on); if (instant || !this.mixer) put(); else { this.playShot(on ? 'draw' : 'sheathe', { upper: true, ts: 1 }); this._armT = setTimeout(put, on ? 200 : 260); }
};
Rig.prototype.act_ = function (clipName) { const k = clipName; if (this.A[k]) return this.A[k]; const c = this.C[k]; if (!c) return null; return (this.A[k] = this.mixer.clipAction(c)); };
Rig.prototype.clipOf = function (n) { let v = this.set[n]; if (Array.isArray(v)) { v = v[this.combo % v.length]; this.combo++; } return v; };
/* đi/đứng/chạy — 3 lớp: chân (loco) · nửa trên cầm vũ khí (upper) · đòn đánh (shot) */
Rig.prototype.setLoco = function (n, fade = 0.2, ts = 1) {
  const armedIdle = this.armed && n === 'idle', clip = armedIdle ? this.set.idleArmed : this.set[n];
  const lowerOnly = (this.shot && this.shot.upper) || (this.armed && !armedIdle && n !== 'fly' && n !== 'jumpLoop'), key = clip + (lowerOnly ? '#L' : '');
  if (!(this.loco && this.loco.key === key)) {
    const a = this.act_(key); if (!a) return; a.enabled = true; a.setLoop(THREE.LoopRepeat); a.timeScale = ts; a.setEffectiveWeight(1);
    if (this.loco) { this.loco.a.fadeOut(fade); a.reset(); if (this.loco.clip === clip) a.syncWith(this.loco.a); a.fadeIn(fade).play(); } else a.reset().play();
    this.loco = { key, clip, a, n };
  } else { this.loco.a.timeScale = ts; this.loco.n = n; }
  // lớp nửa trên khi đang cầm vũ khí mà di chuyển: giữ thế thủ (tay cầm vũ khí không vung)
  const wantU = this.armed && lowerOnly && !(this.shot && this.shot.upper) ? this.set.armUpper + '#U' : null;
  if ((this.upper && this.upper.key) !== wantU) { if (this.upper) this.upper.a.fadeOut(fade); this.upper = null; if (wantU) { const u = this.act_(wantU); if (u) { u.reset(); u.setLoop(THREE.LoopRepeat); u.setEffectiveWeight(1); u.fadeIn(fade).play(); this.upper = { key: wantU, a: u }; } } }
};
Rig.prototype.playShot = function (n, o = {}) {
  if (!this.mixer) return false; const clip = this.clipOf(n); if (!clip || !this.C[clip]) return false;
  if (this.shot && this.shot.n === 'die') return false; if (n === 'hit' && this.shot) return false;
  const upper = !!o.upper, key = clip + (upper ? '#U' : ''), a = this.act_(key); if (!a) return false;
  if (this.shot && this.shot.a !== a) this.shot.a.fadeOut(0.1);
  a.reset(); a.setLoop(n === 'die' ? THREE.LoopOnce : o.loop ? THREE.LoopRepeat : THREE.LoopOnce); a.clampWhenFinished = true; a.timeScale = o.ts || 1; a.setEffectiveWeight(1); a.fadeIn(0.08).play();
  const dur = this.C[key].duration / a.timeScale; this.shot = { n, a, upper, until: this.t + (o.dur || dur) - 0.12, loop: !!o.loop };
  if (this.upper) { this.upper.a.fadeOut(0.08); this.upper = null; }
  if (!upper && this.loco) this.loco.a.fadeOut(0.08); else if (upper) { const ln = this.loco ? this.loco.n : 'idle'; this.loco && this.loco.a.fadeOut(0.1); this.loco = null; this.setLoco(ln, 0.1); }
  return true;
};
Rig.prototype.endShot = function (fade = 0.18) { if (!this.shot) return; this.shot.a.fadeOut(fade); this.shot = null; const ln = this.loco ? this.loco.n : 'idle'; if (this.loco) this.loco.a.fadeOut(fade); this.loco = null; this.setLoco(ln, fade); };
Rig.prototype.updateAnim = function (dt, s) {
  const sp = s.speed || 0, moving = sp > 0.12;
  if (s.dead) { if (!this.shot || this.shot.n !== 'die') { this.shot = null; if (this.upper) { this.upper.a.fadeOut(0.1); this.upper = null; } this.playShot('die', { dur: 99 }); } this.mixer.update(dt); return; }
  if (this.shot && this.shot.n === 'die') { this.endShot(0.3); }
  // tự rút / cất vũ khí: đang giao tranh → cầm; yên 6 giây hoặc cưỡi diều → cất
  if (s.fly && this.armed) this.setArmed(false); else if (!s.fly && s.combat !== undefined) { if (s.combat && !this.armed) this.setArmed(true, !!(this.shot && !this.shot.upper)); else if (!s.combat && this.armed && !this.shot) this.setArmed(false); }
  // trên không: nhảy / cưỡi diều
  const air = !!s.air && !s.fly;
  if (air && !this.air && !(this.shot && !this.shot.upper)) this.playShot('jumpStart', { ts: 1.4, upper: false });
  if (!air && this.air && s.landV > 3) { this.playShot('jumpLand', { ts: 1.6 }); }
  this.air = air;
  if (this.shot && !this.shot.loop && this.t > this.shot.until) this.endShot();
  if (this.shot && this.shot.loop && !(s.opening || s.respec)) this.endShot();
  let n = 'idle', ts = 1;
  if (s.fly) n = 'fly'; else if (air) n = 'jumpLoop'; else if (s.stun) n = 'idle'; else if (moving) { if (sp < 0.45) { n = 'walk'; ts = Math.max(0.6, sp / 0.3); } else if (sp < 0.82) { n = 'jog'; ts = 0.9 + sp * 0.3; } else { n = 'run'; ts = 0.95 + (sp - 0.82) * 0.5; } }
  if (!this.shot || this.shot.upper) this.setLoco(n, 0.2, ts); else if (this.loco) this.loco.n = n;
  this.mixer.update(dt);
  if (this.ribbons) { this.g.updateMatrixWorld(true); const wp = new THREE.Vector3(); this.ribbons.forEach((r, i) => { (i ? this.sockets.hand_L : this.sockets.hand_R).getWorldPosition(wp); this.g.worldToLocal(wp); r.update(dt, wp, this.t + i); }); }
};
/* ghi đè play/update cũ: có model thật thì dùng hoạt ảnh quay sẵn */
const _rigPlay = Rig.prototype.play, _rigUpdate = Rig.prototype.update;
Rig.prototype.play = function (n, o = {}) {
  if (!this.mixer) return _rigPlay.call(this, n === 'stab' ? 'slash' : n);
  const attack = ['slash', 'stab', 'cast', 'spin', 'dash', 'leap', 'ult', 'buff'].includes(n); if (attack) { this.combatT = this.t; if (!this.armed) this.setArmed(true, true); }
  const upperOk = ['slash', 'stab', 'cast', 'buff', 'drink', 'ult', 'hit'].includes(n), moving = (this._sp || 0) > 0.12 || this.air;
  if (n === 'open' || n === 'respec') return this.playShot(n, { loop: true });
  if (n === 'ult') return this.playShot('ult', { upper: moving, ts: 1.15 });
  return this.playShot(n, { upper: upperOk && moving, ts: n === 'slash' || n === 'stab' ? 1.35 : n === 'cast' ? 1.5 : n === 'dodge' ? 1.5 : n === 'dash' ? 1.4 : 1.1 });
};
Rig.prototype.update = function (dt, s) {
  if (!this.mixer) return _rigUpdate.call(this, dt, s);
  this.t += dt; this._sp = s.speed || 0;
  if (s.combat === undefined) s = Object.assign({}, s, { combat: this.t - (this.combatT || -99) < 6 || !!this.forceArmed });
  this.updateAnim(dt, s);
  this.root.position.y = 0; this.root.rotation.set(0, 0, s.stun ? Math.sin(this.t * 9) * 0.06 : 0);
};
Rig.prototype.setLOD = function (level) { if (!this.mixer) { for (const m of this.fingerMeshes) m.visible = level < 1; for (const m of this.smallMeshes) m.visible = level < 2; } if (this.ribbons) for (const r of this.ribbons) r.mesh.visible = level < 2; this.lod = level; };
