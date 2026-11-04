/* ===================== Player (Lục Điệp – đan nữ tu tiên) ===================== */
const canvasTex = draw => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); return new T.CanvasTexture(c); };
const sprMat = map => new T.SpriteMaterial({ map, blending: T.AdditiveBlending, depthWrite: false, transparent: true });
const glowMap = col => canvasTex(x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
function makeSword() {
  const g = new T.Group(), jade = mat(0x7dffc0, { emissive: 0x20c080, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.3 }), gold = mat(0xe6b948, { metalness: 0.8, roughness: 0.3 });
  part(new T.CylinderGeometry(0.022, 0.022, 0.2, 8), mat(0x2a1a2e), 0, -0.04, 0, g);
  part(new T.BoxGeometry(0.2, 0.03, 0.05), gold, 0, 0.07, 0, g);
  part(new T.BoxGeometry(0.06, 1.0, 0.014), jade, 0, 0.6, 0, g);
  part(new T.ConeGeometry(0.03, 0.14, 4), jade, 0, 1.17, 0, g);
  const gl = new T.Sprite(sprMat(glowMap('rgba(150,255,200,1)'))); gl.scale.set(0.7, 1.4, 1); gl.position.y = 0.6; g.add(gl);
  return g;
}
const PY = 0.93, hex = c => new T.Color(c);
function leafGeo(w, h, c1, c2) {
  const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * .75, -h * .12, w * .6, -h * .72, 0, -h); s.bezierCurveTo(-w * .6, -h * .72, -w * .75, -h * .12, 0, 0);
  const g = new T.ShapeGeometry(s, 10), q = g.attributes.position, col = [], A = hex(c1), B = hex(c2);
  for (let i = 0; i < q.count; i++) { const k = Math.min(1, -q.getY(i) / h); col.push(A.r + (B.r - A.r) * k, A.g + (B.g - A.g) * k, A.b + (B.b - A.b) * k); }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return g;
}
function eyeTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 52, 50, 36, 0, 0, 7); x.fill();
  const g = x.createRadialGradient(64, 56, 4, 64, 56, 34); g.addColorStop(0, '#2a1740'); g.addColorStop(.35, '#7a4aa8'); g.addColorStop(.8, '#d77ad0'); g.addColorStop(1, '#f3b0e0');
  x.fillStyle = g; x.beginPath(); x.ellipse(64, 54, 28, 34, 0, 0, 7); x.fill();
  x.fillStyle = '#120818'; x.beginPath(); x.ellipse(64, 56, 12, 17, 0, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(53, 42, 7, 0, 7); x.fill(); x.beginPath(); x.arc(74, 68, 4, 0, 7); x.fill();
  x.strokeStyle = '#2b1a22'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.ellipse(64, 52, 50, 36, 0, Math.PI * 1.08, Math.PI * 1.95); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.moveTo(112, 38); x.lineTo(124, 28); x.stroke();
  return new T.CanvasTexture(c);
}
const REST = {
  pelvis: [0, 0, 0], spine: [0.04, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shL: [0.08, 0, -0.1], elL: [-0.3, 0, 0], wrL: [0, 1.45, 0], shR: [-1.25, 0, 0.55], elR: [-1.15, 0, 0], wrR: [-0.35, -0.6, 0],
  hipL: [0, 0, 0], knL: [0.04, 0, 0], anL: [0, 0, 0], hipR: [0, 0, 0], knR: [0.04, 0, 0], anR: [0, 0, 0]
};
class Player {
  constructor() {
    this.g = new T.Group(); this.flip = new T.Group(); this.flip.position.y = 1; this.g.add(this.flip);
    this.root = new T.Group(); this.root.position.y = -1; this.flip.add(this.root); this.fx = new T.Group();
    Object.assign(this, { gy: 0, dead: false, busy: false, wet: false, moveMul: 1, atkRate: 1.6, vy: 0, y: 0, face: 0, pf: 0, turn: 0, atk: -1, speed: 0, t: 0, cyc: 0, wind: 0, landT: 0, blink: 0, nextBlink: 2, pills: [], spawned: false, act: null, flying: false, flyS: 0, runeR: 1.2, B: {}, cu: {}, tg: {}, fcc: { L: 0.3, R: 0.3 }, fing: { L: [], R: [] }, panels: [], chains: [], eyes: [] });
    this.glow = glowMap('rgba(200,255,150,1)');
    const dbl = m => { m.side = T.DoubleSide; return m; };
    const skin = mat(0xf6d8c4, { roughness: 0.5 }), skinD = dbl(mat(0xf6d8c4, { roughness: 0.5 })), white = mat(0xf1f4ea, { roughness: 0.6 }), white2 = dbl(mat(0xeef4e6, { roughness: 0.55 })),
      green = mat(0x3fae5a, { roughness: 0.5 }), gold = mat(0xe6b948, { metalness: 0.85, roughness: 0.28 }), hairM = mat(0x4a3123, { roughness: 0.45 }),
      yellow = mat(0xf3d34a, { emissive: 0x806010, emissiveIntensity: 0.4 }), gem = mat(0x2fe08a, { emissive: 0x14a060, emissiveIntensity: 0.9 }), dark = mat(0x2a1a2e), lip = mat(0xd9505f, { roughness: 0.35 }),
      leafM = dbl(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })), sleeveM = dbl(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, transparent: true, opacity: 0.88 })),
      hairV = dbl(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
    const bone = (n, par, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); par.add(g); this.B[n] = g; this.cu[n] = REST[n].slice(); return g; };
    const flower = (x, y, z, par) => { const f = new T.Group(); f.position.set(x, y, z); par.add(f); part(new T.SphereGeometry(0.022, 8, 6), gold, 0, 0, 0.015, f); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(new T.SphereGeometry(0.02, 8, 6), yellow, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0, f).scale.z = 0.6; } };
    const chain = (par, x, y, z, n, len, mk, o) => {
      const segs = []; let pr = par;
      for (let j = 0; j < n; j++) { const g = new T.Group(); g.position.set(j ? 0 : x, j ? -len : y, j ? 0 : z); pr.add(g); mk(g, j); segs.push(g); pr = g; }
      this.chains.push(Object.assign({ segs, base: 0.05, k: 0.5, f: 2.5, w: 0.05, ph: Math.random() * 6, rz: 0, tz: 0 }, o)); return segs;
    };
    const R = this.root, pel = bone('pelvis', R, 0, PY, 0), spine = bone('spine', pel, 0, 0.06, 0), chest = bone('chest', spine, 0, 0.14, 0), neck = bone('neck', chest, 0, 0.34, 0), head = bone('head', neck, 0, 0.1, 0);
    this.pel = pel;

    // ---- Váy lá nhiều lớp
    for (let i = 0; i < 18; i++) {
      const outer = i < 10, a = (outer ? i / 10 : (i - 10 + 0.5) / 8) * Math.PI * 2, c = Math.cos(a), back = c < -0.3, h = outer ? (back ? 1.0 : 0.72 + (i % 2) * 0.08) : 0.5 + (i % 2) * 0.06;
      const yaw = new T.Group(); yaw.position.y = 0.06; yaw.rotation.y = a; pel.add(yaw); const q = new T.Group(); yaw.add(q);
      q.userData = { base: outer ? 0.26 + (i % 2) * 0.05 : 0.12, c, side: Math.sin(a) > 0 ? 'R' : 'L' };
      part(leafGeo(outer ? 0.34 : 0.26, h, 0xf2f6ec, outer ? 0x3aa858 : 0xcdeede), leafM, 0, 0, 0.14, q); this.panels.push(q);
    }
    part(new T.CylinderGeometry(0.15, 0.27, 0.34, 18, 1, true), white2, 0, -0.1, 0, pel);
    part(new T.SphereGeometry(0.15, 14, 10), white, 0, -0.03, 0, pel).scale.set(1, 0.75, 0.8);

    // ---- Thân (lathe cong) + cổ + trang sức
    const lp = arr => arr.map(([r, y]) => new T.Vector2(r, y));
    part(new T.LatheGeometry(lp([[0.12, -0.2], [0.115, -0.12], [0.122, -0.04], [0.138, 0.05], [0.158, 0.13], [0.158, 0.2], [0.15, 0.22]]), 22), white2, 0, 0, 0, chest).scale.z = 0.78;
    part(new T.LatheGeometry(lp([[0.15, 0.2], [0.152, 0.25], [0.135, 0.3], [0.1, 0.34]]), 22), skinD, 0, 0, 0, chest).scale.z = 0.78;
    const nl = part(new T.TorusGeometry(0.155, 0.014, 6, 26), green, 0, 0.21, 0, chest); nl.rotation.x = Math.PI / 2; nl.scale.y = 0.78;
    [-1, 1].forEach(s => part(new T.BoxGeometry(0.013, 0.2, 0.01), green, s * 0.05, 0.1, 0.122, chest).rotation.z = -s * 0.4);
    part(new T.CylinderGeometry(0.034, 0.04, 0.13, 12), skin, 0, 0.04, 0, neck);
    for (let i = 0; i < 13; i++) { const a = (i - 6) / 6 * 1.15; part(new T.SphereGeometry(0.0085, 6, 6), gold, Math.sin(a) * 0.075, 0.3 - (1 - Math.cos(a)) * 0.05, Math.cos(a) * 0.082, chest); }
    part(new T.SphereGeometry(0.02, 8, 8), gem, 0, 0.255, 0.092, chest);
    [-1, 1].forEach(s => { part(new T.SphereGeometry(0.058, 10, 8), skin, s * 0.165, 0.3, 0, chest); });

    // ---- Đai lưng, hoa, ngọc bội, dải lụa sau lưng
    const obi = part(new T.CylinderGeometry(0.142, 0.15, 0.09, 22), green, 0, 0.0, 0, spine); obi.scale.z = 0.8;
    [-0.045, 0.045].forEach(y => { const r = part(new T.TorusGeometry(0.147, 0.005, 5, 24), gold, 0, y, 0, spine); r.rotation.x = Math.PI / 2; r.scale.y = 0.8; });
    flower(0, 0, 0.125, spine); flower(0.09, -0.01, 0.1, spine);
    chain(spine, 0.11, -0.03, 0.115, 2, 0.1, (g, j) => { part(new T.CylinderGeometry(0.003, 0.003, 0.1, 4), gold, 0, -0.05, 0, g); if (j) part(new T.TorusGeometry(0.022, 0.007, 6, 12), gem, 0, -0.1, 0, g); }, { k: 0.3, f: 3 });
    [-1, 1].forEach(s => chain(spine, s * 0.06, -0.02, -0.12, 2, 0.28, (g, j) => part(leafGeo(0.1 - j * 0.03, 0.3, 0x3fb35e, 0xcfeedd), leafM, 0, 0, 0, g), { base: 0.12, k: 0.9, f: 4, w: 0.08 }));

    // ---- Đầu, mặt
    part(new T.SphereGeometry(0.115, 24, 18), skin, 0, 0.06, 0, head).scale.set(0.92, 1, 0.95);
    part(new T.SphereGeometry(0.1, 18, 14), skin, 0, 0.0, 0.02, head).scale.set(0.8, 0.75, 0.8);
    const et = eyeTex(), em = new T.MeshBasicMaterial({ map: et, transparent: true, color: 0xe8e8e8, side: T.DoubleSide });
    [-1, 1].forEach(s => {
      const e = new T.Mesh(new T.PlaneGeometry(0.062, 0.046), em); e.position.set(s * 0.043, 0.055, 0.106); e.rotation.y = s * 0.38; e.scale.x = -s; head.add(e); this.eyes.push(e);
      const br = part(new T.BoxGeometry(0.04, 0.006, 0.006), hairM, s * 0.046, 0.1, 0.103, head); br.rotation.set(0, s * 0.4, -s * 0.18);
      const bl = new T.Mesh(new T.CircleGeometry(0.018, 14), new T.MeshBasicMaterial({ color: 0xff8fa0, transparent: true, opacity: 0.28 })); bl.position.set(s * 0.065, 0.02, 0.098); bl.rotation.y = s * 0.55; head.add(bl);
      part(new T.SphereGeometry(0.014, 8, 6), skin, s * 0.108, 0.05, 0, head);
      chain(head, s * 0.112, 0.035, 0, 2, 0.04, (g, j) => part(new T.SphereGeometry(j ? 0.013 : 0.008, 8, 6), j ? gem : gold, 0, -0.01, 0, g), { k: 0.25, f: 3.5, w: 0.12 });
    });
    part(new T.SphereGeometry(0.008, 6, 6), mat(0xe3b9a0), 0, 0.03, 0.113, head);
    part(new T.SphereGeometry(0.017, 8, 6), lip, 0, 0.0, 0.1, head).scale.set(1.5, 0.55, 0.6);
    part(new T.SphereGeometry(0.014, 8, 6), lip, 0, -0.008, 0.099, head).scale.set(1.4, 0.5, 0.6);

    // ---- Tóc: mũ tóc, mái, búi nhiều đốt có quán tính, lọn trước
    part(new T.SphereGeometry(0.124, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM, 0, 0.07, -0.01, head).rotation.x = -0.25;
    part(new T.SphereGeometry(0.12, 14, 12), hairM, 0, 0.0, -0.075, head).scale.set(1.05, 1.15, 0.8);
    for (let k = -2; k <= 2; k++) { const m = part(leafGeo(0.075, 0.13 + (k === 0 ? 0.02 : 0), 0x5a3a28, 0x3a2418), hairV, k * 0.036, 0.158, 0.1 - Math.abs(k) * 0.008, head); m.rotation.y = k * 0.28; }
    const R3 = [0.05, 0.04, 0.028, 0.005];
    for (let i = 0; i < 9; i++) chain(head, (i - 4) * 0.026, 0.12, -0.1, 3, 0.3, (g, j) => part(new T.CylinderGeometry(R3[j], R3[j + 1], 0.3, 6), hairM, 0, -0.15, 0, g), { base: 0.04, k: 0.55, f: 2.2 + i * 0.1, w: 0.05, rz: (i - 4) * 0.035, tz: 0.025 });
    [-1, 1].forEach(s => chain(head, s * 0.1, 0.1, 0.06, 2, 0.2, (g, j) => part(new T.CylinderGeometry(0.026 - j * 0.012, 0.018 - j * 0.012, 0.2, 6), hairM, 0, -0.1, 0, g), { base: 0.02, k: 0.3, w: 0.04, tz: 0.02 }));
    // Trâm vàng + ngọc
    for (let k = -2; k <= 2; k++) { const c = part(new T.ConeGeometry(0.02, 0.1, 4), gold, k * 0.04, 0.2 - Math.abs(k) * 0.012, 0.07, head); c.rotation.set(-0.5, 0, -k * 0.3); }
    part(new T.SphereGeometry(0.018, 10, 8), gem, 0, 0.135, 0.108, head);
    [-1, 1].forEach(s => { flower(s * 0.1, 0.15, 0.055, head); chain(head, s * 0.082, 0.15, 0.09, 3, 0.05, (g, j) => part(new T.SphereGeometry(0.01, 6, 6), j % 2 ? gem : gold, 0, -0.02, 0, g), { k: 0.25, f: 3, w: 0.14 }); });

    // ---- Tay: vai trễ, tay áo, khuỷu, cổ tay, bàn tay có ngón
    const arm = (S, sd) => {
      const sh = bone('sh' + S, chest, sd * 0.17, 0.3, 0);
      part(new T.CylinderGeometry(0.043, 0.035, 0.29, 12), skin, 0, -0.145, 0, sh);
      part(new T.SphereGeometry(0.074, 12, 10), white, sd * 0.012, 0, 0, sh).scale.set(1, 0.85, 1);
      part(new T.CylinderGeometry(0.062, 0.088, 0.17, 14, 1, true), white2, 0, -0.08, 0, sh);
      flower(sd * 0.05, 0.02, 0.06, sh);
      const el = bone('el' + S, sh, 0, -0.29, 0);
      part(new T.SphereGeometry(0.035, 10, 8), skin, 0, 0, 0, el); part(new T.CylinderGeometry(0.035, 0.026, 0.27, 12), skin, 0, -0.135, 0, el);
      const wr = bone('wr' + S, el, 0, -0.27, 0);
      part(new T.TorusGeometry(0.03, 0.007, 6, 12), gold, 0, -0.005, 0, wr).rotation.x = Math.PI / 2;
      part(new T.SphereGeometry(0.03, 10, 8), skin, 0, 0, 0, wr);
      part(new T.BoxGeometry(0.052, 0.07, 0.022), skin, 0, -0.05, 0, wr);
      [[-0.019, 0.05], [-0.006, 0.06], [0.007, 0.056], [0.02, 0.044]].forEach(([fx, L], i) => {
        const f1 = new T.Group(); f1.position.set(fx, -0.085, 0); wr.add(f1); part(new T.CylinderGeometry(0.0085, 0.0075, L * 0.55, 6), skin, 0, -L * 0.275, 0, f1);
        const f2 = new T.Group(); f2.position.y = -L * 0.55; f1.add(f2); part(new T.CylinderGeometry(0.0075, 0.006, L * 0.45, 6), skin, 0, -L * 0.225, 0, f2); part(new T.SphereGeometry(0.0065, 6, 6), skin, 0, -L * 0.45, 0, f2);
        if (i === 1 && S === 'R') { part(new T.TorusGeometry(0.01, 0.003, 5, 10), gold, 0, -0.015, 0, f1); part(new T.SphereGeometry(0.008, 6, 6), gem, 0, -0.015, 0.011, f1); }
        this.fing[S].push({ a: f1, b: f2, w: [1, 1.05, 1.1, 1.2][i] });
      });
      const t1 = new T.Group(); t1.position.set(sd * 0.03, -0.035, 0.005); t1.rotation.z = sd * 0.6; wr.add(t1); part(new T.CylinderGeometry(0.0095, 0.008, 0.035, 6), skin, 0, -0.017, 0, t1);
      const t2 = new T.Group(); t2.position.y = -0.035; t1.add(t2); part(new T.CylinderGeometry(0.008, 0.0065, 0.03, 6), skin, 0, -0.015, 0, t2);
      this.fing[S].push({ a: t1, b: t2, w: 0.55 });
      chain(wr, 0, -0.02, 0, 2, 0.2, (g, j) => part(leafGeo(0.15 - j * 0.04, 0.22, 0xeaf7e8, 0x8fe0ad), sleeveM, 0, 0, 0, g), { base: 0.2, k: 0.6, f: 3, w: 0.1, rz: sd * 0.12, tz: 0.03 });
      return wr;
    };
    arm('L', -1); this.hand = arm('R', 1);

    // ---- Chân: đùi - gối - cổ chân - bàn chân
    const leg = (S, sd) => {
      const hip = bone('hip' + S, pel, sd * 0.085, -0.02, 0);
      part(new T.SphereGeometry(0.066, 12, 10), skin, 0, 0, 0, hip); part(new T.CylinderGeometry(0.066, 0.054, 0.44, 12), skin, 0, -0.22, 0, hip);
      part(new T.TorusGeometry(0.06, 0.009, 6, 14), gold, 0, -0.12, 0, hip).rotation.x = Math.PI / 2; part(new T.SphereGeometry(0.012, 6, 6), gem, sd * 0.05, -0.15, 0.03, hip);
      const kn = bone('kn' + S, hip, 0, -0.44, 0);
      part(new T.SphereGeometry(0.052, 10, 8), skin, 0, 0, 0, kn); part(new T.CylinderGeometry(0.052, 0.034, 0.4, 12), skin, 0, -0.2, 0, kn); part(new T.SphereGeometry(0.048, 10, 8), skin, 0, -0.13, -0.012, kn).scale.set(1, 1.35, 1);
      const an = bone('an' + S, kn, 0, -0.4, 0);
      part(new T.SphereGeometry(0.034, 10, 8), skin, 0, 0, 0, an); part(new T.TorusGeometry(0.038, 0.008, 6, 12), gold, 0, 0.025, 0, an).rotation.x = Math.PI / 2;
      part(new T.SphereGeometry(0.05, 12, 10), green, 0, -0.035, 0.04, an).scale.set(0.8, 0.7, 2.1); part(new T.SphereGeometry(0.013, 6, 6), gem, 0, -0.02, 0.1, an);
    };
    leg('L', -1); leg('R', 1);

    // ---- Bướm linh quang
    this.bf = new T.Group(); this.bf.position.set(0.4, 1.7, 0.5); R.add(this.bf);
    part(new T.SphereGeometry(0.03, 8, 8), new T.MeshBasicMaterial({ color: 0xfffbd0 }), 0, 0, 0, this.bf).scale.set(1, 1.8, 1);
    const wm = new T.MeshBasicMaterial({ color: 0xd8ffb0, transparent: true, opacity: 0.85, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    this.wings = [-1, 1].map(s => {
      const pv = new T.Group(); this.bf.add(pv);
      const w1 = new T.Mesh(new T.CircleGeometry(0.13, 16), wm); w1.scale.set(1, 1.3, 1); w1.position.set(s * 0.11, 0.07, 0); pv.add(w1);
      const w2 = new T.Mesh(new T.CircleGeometry(0.085, 14), wm); w2.position.set(s * 0.08, -0.09, 0); pv.add(w2); return pv;
    });
    this.bfLight = new T.PointLight(0xd8ff8a, 1, 7, 2); this.bf.add(this.bfLight);
    const gl = new T.Sprite(sprMat(this.glow)); gl.scale.setScalar(1.0); this.bf.add(gl);
    this.runes = new T.Group(); this.g.add(this.runes);
    [...'丹氣道靈火元'].forEach((ch, i) => {
      const tex = canvasTex(x => { x.font = 'bold 42px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ffd24a'; x.shadowBlur = 8; x.fillStyle = '#ffe58a'; x.fillText(ch, 32, 34); });
      const s = new T.Sprite(sprMat(tex)); s.scale.setScalar(0.4); s.userData = { a: i / 6 * Math.PI * 2, y: 0.5 + (i % 3) * 0.6 }; this.runes.add(s);
    });
  }
  buildExtras() {
    this.sword = makeSword(); this.sword.position.set(0, -0.07, 0.01); this.sword.rotation.x = Math.PI / 2 + 0.15; this.sword.visible = false; this.B.wrR.add(this.sword);
    this.flySword = makeSword(); this.flySword.position.set(0, 0.06, -0.7); this.flySword.rotation.x = Math.PI / 2; this.flySword.visible = false; this.g.add(this.flySword);
    this.ringG = new T.Group(); this.ringG.position.y = 1.1; this.g.add(this.ringG);
    const rg = new T.Mesh(new T.RingGeometry(0.9, 1.15, 48, 1, 0, 4.2), new T.MeshBasicMaterial({ color: 0x9dffd0, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
    rg.rotation.x = -Math.PI / 2; this.ringG.add(rg); this.ring = rg;
    const r2 = rg.clone(); r2.scale.setScalar(0.8); r2.position.y = 0.4; r2.rotation.z = 2; this.ringG.add(r2);
  }
  play(n) {
    if (this.dead) return false; if (n === 4) { this.flying = !this.flying; if (this.flying) this.act = null; return true; }
    if (this.dead || this.busy || this.act || this.flying || this.y > 0.01) return false; this.atk = -1;
    const D = { 1: { n: 'flip', d: 0.94, vy: 7.5 }, 2: { n: 'twist', d: 1.02, vy: 8.2 }, 3: { n: 'dance', d: 3.2, vy: 0 }, 5: { n: 'leap', d: 0.3, vy: 11.5 } }[n];
    if (D) { this.act = { n: D.n, t: 0, d: D.d }; this.vy = D.vy; return true; } return false;
  }
  attack() { if (this.atk < 0 && !this.act && !this.dead && !this.busy) { this.atk = 0; this.spawned = false; return true; } return false; }
  jump() { if (this.y <= 0.001 && !this.flying && !this.act && !this.dead && !this.busy) this.vy = 6.4; }
  spawnPill() {
    const pl = new T.Group(); pl.add(new T.Mesh(new T.SphereGeometry(0.1, 12, 10), new T.MeshBasicMaterial({ color: 0xb8ff8a })));
    const gl = new T.Sprite(sprMat(this.glow)); gl.scale.setScalar(0.9); pl.add(gl); this.bf.getWorldPosition(pl.position);
    this.fx.add(pl); this.onPill && this.onPill(pl);
  }
  update(dt, move, run, world) {
    this.t += dt; const A = this.act; let spd = (run ? 7.4 : 4.3) * this.moveMul;
    if (A) { if (A.n === 'flip' || A.n === 'leap') { move = { x: Math.sin(this.face), z: Math.cos(this.face) }; spd = A.n === 'flip' ? 9.5 : 10; } else move = { x: 0, z: 0 }; }
    else if (this.flying) spd = 17 * (0.85 + this.moveMul * 0.15);
    if (this.dead || this.busy) move = { x: 0, z: 0 };
    const P = this.g.position, len = Math.hypot(move.x, move.z);
    this.wet = !this.flying && this.y < 0.3 && world.inWater(P.x, P.z); if (this.wet && !A) spd *= 0.62;
    if (len > 0) {
      const dx = move.x / len, dz = move.z / len; this.face = lerpAngle(this.face, Math.atan2(dx, dz), Math.min(1, dt * 10));
      const nx = P.x + dx * spd * dt, nz = P.z + dz * spd * dt;
      if (this.flying || this.y > 1.2) { P.x = nx; P.z = nz; }
      else if (world.canStep(P.x, P.z, nx, nz)) { P.x = nx; P.z = nz; }
      else if (world.canStep(P.x, P.z, nx, P.z)) P.x = nx;
      else if (world.canStep(P.x, P.z, P.x, nz)) P.z = nz;
    }
    this.speed += ((len > 0 ? (run ? 1 : 0.55) : 0) - this.speed) * Math.min(1, dt * 6);
    const fd = Math.atan2(Math.sin(this.face - this.pf), Math.cos(this.face - this.pf)); this.turn += (Math.max(-6, Math.min(6, fd / Math.max(dt, 1e-3))) - this.turn) * Math.min(1, dt * 8); this.pf = this.face;
    if (this.y < 1.5) world.collide(P, 0.35);
    const pr = Math.hypot(P.x, P.z), lim = WORLD.R - 5; if (pr > lim) { P.x *= lim / pr; P.z *= lim / pr; }
    const gnd = world.groundY(P.x, P.z);
    if (this.flying) { this.vy = 0; this.y += (3.2 - this.y) * Math.min(1, dt * 3); this.gy += (gnd - this.gy) * Math.min(1, dt * 8); }
    else {
      if (this.y > 0.001) this.gy = gnd; else this.gy += (gnd - this.gy) * Math.min(1, dt * 22);
      this.vy -= (A && A.n === 'leap' && this.vy < 0 ? 5 : 16) * dt; this.y += this.vy * dt;
      if (this.y < 0) { if (this.vy < -3) { this.landT = Math.min(1, -this.vy / 9); this.onLand && this.onLand(-this.vy); } this.y = 0; this.vy = 0; }
    }
    this.g.position.y = this.gy + this.y; this.g.rotation.y = this.face;
    this.animate(dt);
  }
  animate(dt) {
    const t = this.t, s = this.speed, A = this.act, F = this.flip, tg = this.tg, B = this.B;
    for (const n in REST) tg[n] = REST[n].slice();
    const set = (n, x, y = 0, z = 0) => { tg[n] = [x, y, z]; }, add = (n, x, y = 0, z = 0) => { const a = tg[n]; a[0] += x; a[1] += y; a[2] += z; };
    let flare = 0, rate = 12, fcL = 0.3, fcR = 0.3, crouch = this.landT, k = 0; const air = this.y > 0.04 && !this.flying, id = 1 - s;
    this.landT = Math.max(0, this.landT - dt * 3.5); if (s > 0.05) this.cyc += dt * (5 + 4.5 * s);
    const ph = this.cyc, sn = Math.sin(ph), amp = 0.62 * s;
    // đi / chạy: đùi - gối - bàn chân, đối trọng tay, xoay hông ngược vai
    if (!air) {
      [['L', 0], ['R', 1]].forEach(([S, i]) => { const p = ph + i * Math.PI, th = -Math.sin(p) * amp, kn = (0.04 + Math.max(0, Math.cos(p)) * 0.95 * s);
        set('hip' + S, th, 0, 0); set('kn' + S, kn); set('an' + S, -(th + kn) * 0.8 + Math.cos(p) * 0.15 * s); });
      add('shL', sn * amp * 0.9); add('elL', -0.7 * s * (0.5 + 0.5 * sn)); add('shR', Math.sin(ph * 2) * 0.03 * s);
      add('pelvis', 0, sn * 0.14 * s, sn * 0.05 * s); add('spine', 0.1 * s, -sn * 0.2 * s, -sn * 0.05 * s); add('chest', 0, -sn * 0.1 * s); add('head', 0, sn * 0.16 * s);
      crouch += Math.cos(ph * 2) * 0.05 * s;
    } else { set('hipL', -0.55, 0, 0.08); set('knL', 0.95); set('anL', 0.35); set('hipR', 0.15, 0, -0.08); set('knR', 0.55); set('anR', 0.5); add('shL', -0.4, 0, -0.45); flare = 0.4; }
    // idle: thở, chuyển trọng tâm, nhìn quanh
    add('chest', Math.sin(t * 1.6) * 0.015); add('pelvis', 0, 0, Math.sin(t * 0.6) * 0.04 * id); add('spine', 0, 0, -Math.sin(t * 0.6) * 0.02 * id);
    add('head', Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.5) * 0.14 * id, Math.sin(t * 0.4) * 0.03);
    if (!air) { add('knL', Math.max(0, Math.sin(t * 0.6)) * 0.12 * id); add('knR', Math.max(0, -Math.sin(t * 0.6)) * 0.12 * id); }
    add('shL', Math.sin(t * 1.3) * 0.02); add('elR', Math.sin(t * 1.6) * 0.04); add('wrR', Math.sin(t * 1.9) * 0.08);
    // luyện đan (J)
    if (this.atk >= 0) {
      this.atk += dt / 0.9 * this.atkRate; k = Math.sin(Math.min(this.atk, 1) * Math.PI);
      if (this.atk > 0.4 && !this.spawned) { this.spawned = true; this.spawnPill(); } if (this.atk >= 1) this.atk = -1;
      add('shR', -0.7 * k, 0, -0.2 * k); add('elR', -0.5 * k); set('shL', 0.08 - 0.9 * k, 0, -0.1 - 0.5 * k); set('elL', -0.3 - 1.1 * k); add('spine', -0.12 * k); fcL = 0.3 + 0.5 * k;
    }
    // 5 hành động
    if (A) {
      A.t += dt; const u = Math.min(1, A.t / A.d); rate = 22;
      if (A.n === 'flip') {
        F.rotation.x = Math.PI * 2 * ease(u); const tk = Math.sin(Math.min(1, Math.max(0, (u - 0.08) / 0.8)) * Math.PI), ar = -2.8 + 1.7 * tk;
        ['L', 'R'].forEach(S => { set('hip' + S, -1.9 * tk, 0, 0.05); set('kn' + S, 2.0 * tk); set('an' + S, 0.5 * tk); set('sh' + S, ar, 0, S === 'L' ? -0.15 : 0.15); set('el' + S, -0.3 - 0.8 * tk); });
        set('spine', 0.5 * tk); set('chest', 0.3 * tk); set('neck', 0.35 * tk); flare = 0.2 + 0.5 * (1 - tk); fcL = fcR = 0.9 * tk;
      } else if (A.n === 'twist') {
        F.rotation.y = Math.PI * 4 * ease(u); set('shL', 0, 0, -1.4); set('shR', 0, 0, 1.4); set('elL', -0.15); set('elR', -0.15); set('wrL', 0, 0, 0); set('wrR', 0, 0, 0);
        set('hipR', -0.6, 0, -0.1); set('knR', 1.2); set('anR', 0.3); set('hipL', 0.1); set('knL', 0.1); set('spine', 0.05, 0, 0.1); flare = 1; fcL = fcR = 0.1;
      } else if (A.n === 'dance') {
        const d = A.t, show = Math.min(1, d / 0.4) * (1 - Math.max(0, (d - 2.8) / 0.4)), pp = Math.max(0, d - 0.4);
        this.sword.visible = show > 0.02; this.sword.scale.setScalar(Math.max(0.01, show)); F.rotation.y = pp * 3.2 + Math.sin(pp * 3) * 0.4; fcR = 1.25;
        set('shR', -1.6 + Math.sin(pp * 6) * 0.7, Math.cos(pp * 3) * 0.6, 0.4 + Math.cos(pp * 6) * 0.5); set('elR', -0.5 + Math.sin(pp * 6 + 1) * 0.4); set('wrR', Math.sin(pp * 6) * 0.4, 0, 0);
        set('shL', -0.6, 0, -1.2 + Math.sin(pp * 6) * 0.3); set('elL', -0.4);
        set('hipL', -0.5 * Math.max(0, Math.sin(pp * 3)), 0, 0.1); set('knL', 0.2 + 0.7 * Math.max(0, Math.sin(pp * 3))); set('hipR', -0.5 * Math.max(0, -Math.sin(pp * 3)), 0, -0.1); set('knR', 0.2 + 0.7 * Math.max(0, -Math.sin(pp * 3)));
        set('spine', 0.1, Math.sin(pp * 3) * 0.5, 0); set('chest', 0, Math.sin(pp * 3) * 0.3); crouch = Math.max(crouch, 0.35 + 0.25 * Math.sin(pp * 4)); flare = 0.5 + 0.3 * Math.sin(pp * 4);
        this.ring.material.opacity = 0.55 * show * Math.min(1, pp * 2); this.ringG.rotation.y = pp * 7;
      } else {
        F.rotation.x = 0.3 * Math.min(1, A.t * 3); set('hipL', -1.15, 0, 0.1); set('knL', 0.55); set('anL', 0.3); set('hipR', 0.75, 0, -0.1); set('knR', 0.7); set('anR', 0.6);
        set('shL', -0.3, 0, -1.25); set('shR', -0.3, 0, 1.25); set('elL', -0.2); set('elR', -0.2); set('wrR', 0, 0, 0); set('spine', 0.15); set('chest', -0.12); set('head', -0.15); flare = 0.8 + 0.2 * Math.sin(t * 8); fcL = fcR = 0.1;
      }
      if (A.t >= A.d && (A.n === 'dance' || this.y <= 0.001)) { this.act = null; F.rotation.set(0, 0, 0); }
    } else if (this.flying) {
      set('hipL', -0.2, 0, 0.12); set('knL', 0.5); set('anL', 0.2); set('hipR', 0.3, 0, -0.12); set('knR', 0.6); set('anR', 0.3);
      set('spine', 0.12 + s * 0.25); set('shL', -0.35, 0, -1.0); set('elL', -0.2); set('head', -0.1); crouch = Math.max(crouch, 0.3); flare = 0.3 + s * 0.4;
    }
    if (this.dead) { F.rotation.x += (-1.5 - F.rotation.x) * Math.min(1, dt * 6); F.position.y += (0.25 - F.position.y) * Math.min(1, dt * 6); crouch = 0; this.flying = false; } else { F.position.y += (1 - F.position.y) * Math.min(1, dt * 8); }
    if (!(A && A.n === 'dance')) this.sword.visible = false;
    if (!(A && A.n === 'dance')) this.ring.material.opacity = 0;
    ['L', 'R'].forEach(S => { add('hip' + S, -crouch * 0.55); add('kn' + S, crouch * 1.0); add('an' + S, -crouch * 0.45); });
    B.pelvis.position.y = PY - crouch * 0.13;
    const kk = 1 - Math.exp(-dt * rate);
    for (const n in tg) { const c = this.cu[n], g = tg[n]; c[0] += (g[0] - c[0]) * kk; c[1] += (g[1] - c[1]) * kk; c[2] += (g[2] - c[2]) * kk; B[n].rotation.set(c[0], c[1], c[2]); }
    // ngón tay
    const fk = 1 - Math.exp(-dt * 10); this.fcc.L += (fcL - this.fcc.L) * fk; this.fcc.R += (fcR - this.fcc.R) * fk;
    ['L', 'R'].forEach(S => this.fing[S].forEach((f, i) => { const c = this.fcc[S] * f.w + Math.sin(t * 1.5 + i) * 0.03; if (S === 'R' && i === 1 && !A) { f.a.rotation.x = -0.1; f.b.rotation.x = -0.1; } else if (i === 4) { f.a.rotation.x = -c * 0.5; f.b.rotation.x = -c * 0.6; } else { f.a.rotation.x = -c * 1.0; f.b.rotation.x = -c * 1.2; } }));
    // mắt chớp
    this.nextBlink -= dt; if (this.nextBlink < 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 3; } this.blink = Math.max(0, this.blink - dt * 9);
    this.eyes.forEach(e => { e.scale.y = 1 - 0.92 * Math.sin(this.blink * Math.PI); });
    // gió, tóc, lụa, váy
    this.wind += ((s * 0.6 + (air ? 0.4 : 0) + flare * 0.6 + (A ? 0.2 : 0)) - this.wind) * (1 - Math.exp(-dt * 4));
    this.chains.forEach(c => c.segs.forEach((g, j) => { g.rotation.x = c.base + this.wind * c.k * (1 + 0.35 * j) + Math.sin(t * c.f + c.ph + j * 0.9) * c.w * (1 + this.wind * 1.5); g.rotation.z = c.rz + this.turn * c.tz * (1 + 0.3 * j); }));
    const hx = { L: this.cu.hipL[0], R: this.cu.hipR[0] };
    this.panels.forEach((q, i) => { const d = q.userData, h = hx[d.side], lift = d.c > 0 ? Math.max(0, -h) : Math.max(0, h); q.rotation.x = -Math.max(0.06, d.base + this.wind * 0.45 * -d.c + flare * 0.8 + lift * 0.9 + Math.sin(t * 1.5 + i) * 0.025 + crouch * 0.2); });
    // bướm bám theo bàn tay
    const v = new T.Vector3(); this.hand.getWorldPosition(v); this.root.worldToLocal(v); v.y += 0.16 + k * 0.08 + Math.sin(t * 2.5) * 0.02; this.bf.position.lerp(v, 1 - Math.exp(-dt * 9)); this.bf.scale.setScalar(1 + k * 0.7);
    this.wings.forEach((pv, i) => { pv.rotation.y = (i ? -1 : 1) * (0.35 + Math.sin(t * (12 + k * 10)) * 0.6); }); this.bfLight.intensity = 1 + k * 2;
    this.runeR += (((A && (A.n === 'leap' || A.n === 'twist')) ? 2 : 1.2) - this.runeR) * Math.min(1, dt * 4); this.runes.rotation.y = t * (0.6 + k * 3);
    this.runes.children.forEach(r => { const d = r.userData; r.position.set(Math.cos(d.a) * this.runeR, d.y + Math.sin(t * 2 + d.a) * 0.1, Math.sin(d.a) * this.runeR); });
    this.flyS += ((this.flying ? 1 : 0) - this.flyS) * Math.min(1, dt * 6);
    const fs = this.flySword; fs.visible = this.flyS > 0.02; fs.scale.setScalar(1.7 * Math.max(0.01, this.flyS)); fs.rotation.z = Math.sin(t * 3) * 0.06;
  }
}
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
function lerpAngle(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; }

