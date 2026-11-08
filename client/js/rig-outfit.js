/* =====================================================================
   TRANG PHỤC "KIM" — nâng cấp ngoại hình Dòng 1 (Thần Kiếm, nam) và Dòng 2 (Ngân Châm, nữ)
   theo concept_chuẩn.png (hệ Kim: vàng – nâu – hoa văn lá).
   - Không thêm file model: toàn bộ phụ kiện dựng bằng code, gắn lên xương nhân vật Quaternius có sẵn.
   - Bật bằng cờ  kim: 'nam' | 'nu'  trong CHAR_LOOK (rig.js). Dòng nào không có cờ này → không đổi gì.
   - Muốn chỉnh: đổi bảng màu CL, hoặc số đo trong kimNam() / kimNu() (đơn vị mét, không gian nhân vật:
     +Y lên, +Z trước mặt, +X bên trái nhân vật; chân ở y=0, vai ≈1.42, eo ≈1.0, đỉnh đầu ≈1.78).
   - Cần nạp SAU rig.js:  <script src="js/rig.js"></script><script src="js/rig-outfit.js"></script>
   ===================================================================== */
(function () {
  'use strict';
  /* ---- bảng màu (sửa tại đây để đổi tông cả bộ) ---- */
  const CL = { gold: 0xd09828, goldL: 0xefca66, goldD: 0x8a5a14, amber: 0xd98322, brown: 0x58361c, brownD: 0x2a190c, cream: 0xe9d49a };

  const GEO = {}; // hình dùng chung giữa mọi nhân vật (tiết kiệm bộ nhớ)
  const matV = () => rigMat(0xffffff, { vertexColors: true, side: THREE.DoubleSide, metalness: 0.3, roughness: 0.5, emissive: 0x160d03 });
  const matM = (hex, o) => rigMat(hex, Object.assign({ side: THREE.DoubleSide, metalness: 0.5, roughness: 0.35, emissive: 0x160d03 }, o || {}));

  function shape(pts) { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; }
  /* gộp nhiều lớp màu (nền + viền + sọc) thành MỘT hình có màu theo đỉnh → mỗi mảnh vải chỉ tốn 1 draw call */
  function merged(key, parts) {
    if (GEO[key]) return GEO[key];
    const pos = [], col = [], idx = []; let base = 0;
    for (const p of parts) {
      const g = new THREE.ShapeGeometry(shape(p.pts)), pa = g.attributes.position, ia = g.index, c = new THREE.Color(p.c);
      for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), p.z || 0); col.push(c.r, c.g, c.b); }
      for (let i = 0; i < ia.count; i++) idx.push(ia.getX(i) + base);
      base += pa.count; g.dispose();
    }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    G.setIndex(idx); G.computeVertexNormals(); return (GEO[key] = G);
  }
  const panelPts = (w, h, tip, yo = 0, k = 1) => { const t = h * (1 - tip); return [[-w / 2 * k, yo], [w / 2 * k, yo], [w * 0.56 * k, yo - t], [0, yo - h], [-w * 0.56 * k, yo - t]]; };
  /* mảnh vải rủ xuống (gốc ở y=0, mũi nhọn ở dưới): c1 = màu nền, c2 = viền mỏng, c3 = sọc giữa (hoặc null)
     zs = -1: mặt hoa văn quay về phía -Z (dùng cho áo choàng sau lưng) */
  function panelMesh(w, h, c1, c2, c3, tip = 0.2, zs = 1) {
    const key = ['p', w, h, c1, c2, c3, tip, zs].join('|');
    const parts = [{ pts: panelPts(w, h, tip), c: c2, z: 0 }, { pts: panelPts(w, h * 0.93, tip, -h * 0.02, 0.8), c: c1, z: 0.006 * zs }];
    if (c3 != null) parts.push({ pts: panelPts(w * 0.16, h * 0.72, 0.15, -h * 0.07), c: c3, z: 0.012 * zs });
    const m = new THREE.Mesh(merged(key, parts), matV()); m.castShadow = false; return m;
  }
  /* lá nhọn chĩa lên (gốc ở y=0): dùng cho vương miện, cổ áo, giáp vai */
  function leafMesh(w, h, c1, c2) {
    const key = ['l', w, h, c1, c2].join('|');
    const L = (k, hh, yo) => [[-w * k, yo], [w * k, yo], [w * 0.85 * k, yo + hh * 0.5], [0, yo + hh], [-w * 0.85 * k, yo + hh * 0.5]];
    const m = new THREE.Mesh(merged(key, [{ pts: L(1, h, 0), c: c1, z: 0 }, { pts: L(0.4, h * 0.78, h * 0.05), c: c2, z: 0.005 }]), matV()); m.castShadow = false; return m;
  }
  const kitePts = (w, h, yo = 0) => [[0, yo + h / 2], [w / 2, yo], [0, yo - h / 2], [-w / 2, yo]];
  function kiteMesh(w, h, c1, c2) {
    const key = ['k', w, h, c1, c2].join('|');
    return new THREE.Mesh(merged(key, [{ pts: kitePts(w, h), c: c1, z: 0 }, { pts: kitePts(w * 0.55, h * 0.55), c: c2, z: 0.006 }]), matV());
  }

  /* ---- gắn vào xương theo TOẠ ĐỘ NHÂN VẬT (không cần biết trục xương) ---- */
  function charPos(ctx, boneName) { const v = new THREE.Vector3(); ctx.b[boneName].getWorldPosition(v); return ctx.m.worldToLocal(v); }
  function put(ctx, boneName, obj, pos, rot) { attachInCharSpace(ctx.m, ctx.b[boneName] || ctx.m, obj, pos, rot || [0, 0, 0]); return obj; }
  /* bản lề: trả về nhóm "swing" để xoay lắc (vải bay theo tốc độ chạy) */
  function hinge(ctx, boneName, pos, rot) { const h = new THREE.Object3D(), sw = new THREE.Group(); h.add(sw); put(ctx, boneName, h, pos, rot); return sw; }
  /* ref: xương làm mốc để bù độ nghiêng (pelvis | spine_03) · cx: mức bù 0..1 (1 = luôn rủ thẳng theo trọng lực) */
  function sway(ctx, g, o) { ctx.sway.push(Object.assign({ g, b: [g.rotation.x, g.rotation.y, g.rotation.z], amp: 0.035, f: 2.6, ph: Math.random() * 6, kx: 0, kz: 0, ref: null, cx: 0.85 }, o)); return g; }
  /* vòng bọc quanh chi (bao tay, bắp tay, ống chân): từ xương A tới xương B, đoạn t0..t1 */
  function band(ctx, a, bn, t0, t1, r0, r1, color, o) {
    const A = charPos(ctx, a), B = charPos(ctx, bn), d = new THREE.Vector3().subVectors(B, A), L = d.length();
    const mid = A.clone().addScaledVector(d, (t0 + t1) / 2), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L * (t1 - t0), 12, 1, true), matM(color, o)); m.castShadow = false;
    put(ctx, a, m, mid.toArray(), [e.x, e.y, e.z]); return m;
  }

  /* ---- vương miện lá: n lá xoè quanh đầu, lá phía trước cao hơn ---- */
  function crown(ctx, o) {
    const g = new THREE.Group(), n = o.n, R = o.r || 0.105;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 6, 24), matM(CL.gold)); ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let i = 0; i < n; i++) {
      const phi = i / n * Math.PI * 2, front = 0.5 + 0.5 * Math.cos(phi - (o.peak || 0)), h = o.hMin + (o.hMax - o.hMin) * Math.pow(front, o.pow || 1.2);
      const holder = new THREE.Group(); holder.position.set(Math.sin(phi) * R, 0, Math.cos(phi) * R); holder.rotation.y = phi;
      const lf = leafMesh(o.w, h, i % 2 ? CL.gold : CL.goldL, CL.goldD); lf.rotation.x = (o.tilt || 0.4) * (0.7 + 0.6 * (1 - front)); holder.add(lf); g.add(holder);
    }
    put(ctx, 'Head', g, [-0.02, 1.7 + (o.dy || 0), 0.02 + (o.dz || 0)]); return g;
  }
  /* ---- giáp vai chồng lớp: 3 tấm lá úp xuống vai ---- */
  function pauldron(ctx, side, o) {
    const s = side, root = new THREE.Group();
    for (let i = 0; i < o.layers; i++) {
      const droop = new THREE.Group(); droop.rotation.z = -(o.droop + i * 0.28);
      const lay = new THREE.Group(); lay.rotation.x = -Math.PI / 2; droop.add(lay);
      const lf = leafMesh(o.w + i * 0.012, o.len + i * 0.05, i % 2 ? CL.goldL : CL.gold, CL.goldD); lf.rotation.z = -Math.PI / 2; lay.add(lf);
      droop.position.y = -i * 0.026; root.add(droop);
    }
    root.scale.x = s; put(ctx, 'spine_03', root, [s * o.x, o.y, o.z || 0]); return root;
  }

  /* =====================================================================
     DÒNG 1 · THẦN KIẾM (nam) — áo choàng vàng dài, giáp vai chồng, đai ngọc, tà áo trước/sau
     ===================================================================== */
  function kimNam(ctx) {
    // vương miện lá
    crown(ctx, { n: 11, hMin: 0.1, hMax: 0.25, w: 0.034, tilt: 0.42, peak: 0, dy: 0.05, dz: -0.01 });
    // giáp vai + cổ áo dựng
    for (const s of [1, -1]) {
      pauldron(ctx, s, { layers: 3, len: 0.17, w: 0.075, droop: 0.28, x: 0.17, y: 1.43 });
      const wing = leafMesh(0.055, 0.2, CL.gold, CL.goldD); const hh = new THREE.Group(); hh.add(wing); hh.rotation.set(-0.15, s * 0.5, -s * 0.5); put(ctx, 'spine_03', hh, [s * 0.1, 1.46, -0.07]);
    }
    // mảnh ngực hình thoi + đai lưng + ngọc đai
    put(ctx, 'spine_03', kiteMesh(0.19, 0.3, CL.gold, CL.brown), [0, 1.24, 0.118]);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 28), matM(CL.gold)); belt.rotation.x = Math.PI / 2; belt.scale.set(1.12, 0.82, 1); put(ctx, 'spine_01', belt, [0, 1.02, -0.02]);
    const med = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 18), matM(CL.goldL)); med.rotation.x = Math.PI / 2; put(ctx, 'spine_01', med, [0, 1.02, 0.125]);
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), matM(0xc8341f, { metalness: 0.2, roughness: 0.3 })); put(ctx, 'spine_01', jewel, [0, 1.02, 0.138]);
    // tà áo: giữa (vàng, sọc nâu), hai bên trước (nâu sẫm), hai bên sườn (nâu viền vàng)
    const skirt = (phi, R, y, w, h, c1, c2, c3, flare, kf, kb) => {
      const sw = hinge(ctx, 'pelvis', [Math.sin(phi) * R, y, Math.cos(phi) * R], [0, phi, 0]); sw.rotation.x = -flare;
      sw.add(panelMesh(w, h, c1, c2, c3)); sway(ctx, sw, { kx: kf, amp: 0.03, ref: 'pelvis' }); return sw;
    };
    skirt(0, 0.2, 1.0, 0.22, 0.92, CL.gold, CL.goldL, CL.brown, 0.14, -0.3);
    for (const s of [1, -1]) {
      skirt(s * 0.42, 0.2, 1.0, 0.19, 0.86, CL.brownD, CL.gold, null, 0.2, -0.25);
      skirt(s * 1.1, 0.2, 1.0, 0.24, 0.88, CL.brown, CL.gold, CL.goldD, 0.24, -0.08);
      skirt(s * 1.8, 0.2, 1.0, 0.24, 0.92, CL.brown, CL.gold, null, 0.24, 0.2);
      skirt(s * 2.5, 0.19, 1.0, 0.24, 0.94, CL.brownD, CL.gold, null, 0.22, 0.28);
    }
    // áo choàng sau lưng: 7 mảnh xoè, mảnh ngoài dài hơn
    for (let i = 0; i < 7; i++) {
      const k = i - 3, x = k * 0.06, len = 1.15 + Math.abs(k) * 0.09;
      const sw = hinge(ctx, 'spine_03', [x, 1.44, -0.13 - 0.012 * (3 - Math.abs(k))], [0, 0, 0]);
      sw.rotation.set(0.1 + Math.abs(k) * 0.035, 0, k * 0.1); sw.add(panelMesh(0.22, len, i % 2 ? CL.amber : CL.gold, CL.goldL, i % 2 ? CL.brown : CL.goldD, 0.18, -1));
      sway(ctx, sw, { kx: 0.3, kz: k * 0.1, amp: 0.05, ph: i * 0.7, ref: 'spine_03', cx: 0.8 });
    }
    // bao tay + ống chân vàng
    for (const s of ['l', 'r']) {
      band(ctx, 'lowerarm_' + s, 'hand_' + s, 0.1, 0.9, 0.066, 0.052, CL.gold);
      band(ctx, 'calf_' + s, 'foot_' + s, 0.12, 0.82, 0.088, 0.066, CL.gold);
    }
  }

  /* =====================================================================
     DÒNG 2 · NGÂN CHÂM (nữ) — mũ lông vũ vàng, yếm giáp, váy xẻ nhiều lớp, dải lụa bay
     ===================================================================== */
  function kimNu(ctx) {
    crown(ctx, { n: 13, hMin: 0.12, hMax: 0.3, w: 0.028, tilt: 0.5, peak: 0, pow: 0.9, r: 0.1 });
    // yếm giáp vàng ôm ngực + vai nhỏ + cổ áo
    const cor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.145, 0.2, 18, 1, true, -0.58 * Math.PI, 1.16 * Math.PI), matM(CL.gold)); cor.scale.set(1.0, 1, 0.82); put(ctx, 'spine_02', cor, [0, 1.2, 0.0]);
    put(ctx, 'spine_03', kiteMesh(0.12, 0.2, CL.goldL, CL.brown), [0, 1.3, 0.108]);
    for (const s of [1, -1]) {
      pauldron(ctx, s, { layers: 2, len: 0.12, w: 0.055, droop: 0.35, x: 0.17, y: 1.43 });
      band(ctx, s > 0 ? 'upperarm_l' : 'upperarm_r', s > 0 ? 'lowerarm_l' : 'lowerarm_r', 0.2, 0.55, 0.062, 0.058, CL.gold);
    }
    // đai lưng + ngọc
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 28), matM(CL.gold)); belt.rotation.x = Math.PI / 2; belt.scale.set(1.12, 0.82, 1); put(ctx, 'spine_01', belt, [0, 1.0, -0.02]);
    const med = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 18), matM(CL.goldL)); med.rotation.x = Math.PI / 2; put(ctx, 'spine_01', med, [0, 1.0, 0.118]);
    // váy dài xẻ trước-phải: lớp trong (nâu) + lớp ngoài (vàng hổ phách), 9 mảnh quanh hông
    const PH = [38, 72, 108, 148, 180, -148, -108, -72, -38].map(d => d * Math.PI / 180);
    PH.forEach((phi, i) => {
      const back = Math.abs(phi) > 2.2, inner = i % 2 === 1;
      const sw = hinge(ctx, 'pelvis', [Math.sin(phi) * (inner ? 0.17 : 0.2), 0.98, Math.cos(phi) * (inner ? 0.17 : 0.2)], [0, phi, 0]);
      sw.rotation.x = -(0.2 + (back ? 0.05 : 0)); sw.add(panelMesh(0.25, back ? 0.96 : 0.86, inner ? CL.brown : CL.amber, inner ? CL.gold : CL.goldL, inner ? null : CL.goldD, 0.22));
      sway(ctx, sw, { kx: back ? 0.3 : -0.25, kz: 0, amp: 0.045, ph: i, ref: 'pelvis' });
      if (inner) ctx.lodHide.push(sw);
    });
    // dải lụa vàng bay từ vai + eo: chuỗi 4 đốt lắc lệch pha → uốn sóng, bay ra sau khi chạy
    const silk = (bn, pos, c, side, len) => {
      let parent = hinge(ctx, bn, pos, [0, 0, 0]); const segL = len / 4;
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Group(); parent.add(seg); seg.add(panelMesh(0.1 - i * 0.012, segL * 1.05, c, CL.goldD, null, 0.0, 1));
        if (i === 0) seg.rotation.set(0.12, 0, side * 0.3); else { seg.position.y = -segL * 0.98; seg.rotation.set(0.05, 0, side * 0.05); }
        sway(ctx, seg, { kx: 0.22, kz: side * 0.08, amp: 0.16, f: 2.4, ph: i * 0.9 + (side > 0 ? 0 : 1.3), ref: i === 0 ? bn : null, cx: 0.6 }); ctx.lodHide.push(seg); parent = seg;
      }
    };
    silk('spine_03', [0.11, 1.42, -0.11], CL.gold, 1, 1.25); silk('spine_03', [-0.11, 1.42, -0.11], CL.goldL, -1, 1.25);
    silk('pelvis', [0.19, 1.0, -0.05], CL.amber, 1, 1.0); silk('pelvis', [-0.19, 1.0, -0.05], CL.amber, -1, 1.0);
    for (const s of ['l', 'r']) {
      band(ctx, 'lowerarm_' + s, 'hand_' + s, 0.1, 0.9, 0.06, 0.05, CL.gold);
      band(ctx, 'calf_' + s, 'foot_' + s, 0.1, 0.85, 0.082, 0.062, CL.gold);
    }
  }

  /* ---- hàm được rig.js gọi trong useChar ---- */
  window.applyKimOutfit = function (rig, m, b, look) {
    if (!look.kim || !b.pelvis || !b.spine_03 || !b.Head) return;
    m.updateMatrixWorld(true);
    const ctx = { m, b, sway: [], lodHide: [] };
    try { (look.kim === 'nu' ? kimNu : kimNam)(ctx); } catch (e) { console.warn('[Kim] lỗi dựng trang phục', e); return; }
    ctx.refs = {}; const qM = m.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const n of ['pelvis', 'spine_03']) ctx.refs[n] = { bone: b[n], q0: b[n].getWorldQuaternion(new THREE.Quaternion()).premultiply(qM).invert(), d: new THREE.Euler() };
    rig._ox = ctx; rig._oxHide = ctx.lodHide;
  };
  /* ---- vải bay theo tốc độ chạy + gió nhẹ; dải lụa chạy mô phỏng ---- */
  const _oq1 = new THREE.Quaternion(), _oq2 = new THREE.Quaternion();
  const _upd = Rig.prototype.update;
  Rig.prototype.update = function (dt, s) {
    _upd.call(this, dt, s); const O = this._ox; if (!O) return;
    const sp = Math.min(1.2, this._sp || 0), t = this.t, m = this.model;
    if (m) { // độ nghiêng hiện tại của hông / lưng so với lúc mặc đồ (trong không gian nhân vật)
      const qM = m.getWorldQuaternion(_oq1).invert();
      for (const n in O.refs) { const R = O.refs[n]; R.bone.getWorldQuaternion(_oq2).premultiply(qM).multiply(R.q0); R.d.setFromQuaternion(_oq2, 'YXZ'); }
    }
    for (const e of O.sway) {
      const w = Math.sin(t * e.f + e.ph) * e.amp * (0.4 + sp), R = e.ref && O.refs[e.ref], dx = R ? R.d.x * e.cx : 0, dz = R ? R.d.z * e.cx : 0;
      e.g.rotation.set(e.b[0] + e.kx * sp + w - dx, e.b[1], e.b[2] + e.kz * sp + w * 0.5 - dz);
    }
  };
  const _lod = Rig.prototype.setLOD;
  Rig.prototype.setLOD = function (level) { _lod.call(this, level); if (this._oxHide) for (const o of this._oxHide) o.visible = level < 2; };
})();
