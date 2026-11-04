/* ===================== Thế giới: địa hình, sông hồ, cây cối, núi đá, làng ===================== */
function mergeParts(parts) {
  const pos = [], nor = [], col = [];
  for (const p of parts) {
    let g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); if (p.m) g.applyMatrix4(p.m); const c = new T.Color(p.c);
    const P = g.attributes.position.array, Nn = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(Nn[i]); }
    for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b);
    g.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere(); return geo;
}
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v3 = new T.Vector3(), _s3 = new T.Vector3();
const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => { _q.setFromEuler(_e.set(rx, ry, rz)); return new T.Matrix4().compose(_v3.set(x, y, z), _q, _s3.set(sx, sy, sz)); };
const cyl = (rt, rb, h, seg = 6) => new T.CylinderGeometry(rt, rb, h, seg);
const cone = (r, h, seg = 7) => new T.ConeGeometry(r, h, seg);
const ico = (r, d = 1) => new T.IcosahedronGeometry(r, d);

function buildTreeKinds() {
  const K = {};
  const pine = (f1, f2, tr) => mergeParts([
    { g: cyl(0.16, 0.24, 1.8), m: M(0, 0.9, 0), c: tr },
    { g: cone(1.55, 2.3), m: M(0, 2.5, 0), c: f1 }, { g: cone(1.2, 2.1), m: M(0, 3.7, 0), c: f2 }, { g: cone(0.8, 1.9), m: M(0, 4.8, 0), c: f1 }]);
  K.pine = { geo: pine(PAL.laRung, PAL.laXanh, PAL.voCayGia), r: 0.35 };
  K.snowpine = { geo: pine(PAL.tuyet, 0xC6D0D2, PAL.voCayGia), r: 0.35 };
  const broad = (c1, c2, tr) => mergeParts([
    { g: cyl(0.2, 0.32, 2.4), m: M(0, 1.2, 0, 0, 0, 0.06), c: tr },
    { g: ico(1.5), m: M(0, 3.3, 0, 0, 0, 0, 1, 0.85, 1), c: c1 }, { g: ico(1.1), m: M(0.9, 2.9, 0.3), c: c2 }, { g: ico(1.0), m: M(-0.8, 3.0, -0.4), c: c2 }, { g: ico(0.9), m: M(0.1, 4.0, 0.2), c: c1 }]);
  K.broad = { geo: broad(PAL.laXanh, PAL.laNon, PAL.thanCay), r: 0.4 };
  K.blossom = { geo: broad(PAL.hoaDao, PAL.hoaSen, PAL.voCayGia), r: 0.4 };
  const bam = [];
  [[0, 0, 9.5], [0.35, 0.2, 8], [-0.3, 0.3, 10.5], [0.1, -0.35, 7.5]].forEach(([x, z, h], i) => {
    bam.push({ g: cyl(0.07, 0.1, h, 5), m: M(x, h / 2, z, 0, 0, (i - 1.5) * 0.02), c: PAL.treXanh });
    for (let k = 1; k < h / 1.6; k++) bam.push({ g: cyl(0.115, 0.115, 0.07, 5), m: M(x, k * 1.6, z, 0, 0, (i - 1.5) * 0.02), c: PAL.reuCo });
    bam.push({ g: cone(0.55, 0.9, 5), m: M(x, h - 0.3, z, 0, 0, 0, 1, 1, 1), c: PAL.laNon });
  });
  K.bamboo = { geo: mergeParts(bam), r: 0.55 };
  const willow = [{ g: cyl(0.25, 0.4, 2.6), m: M(0, 1.3, 0, 0, 0, -0.1), c: PAL.thanCay }, { g: ico(1.9), m: M(-0.2, 3.1, 0, 0, 0, 0, 1.2, 0.6, 1.2), c: PAL.laSen }];
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; willow.push({ g: cone(0.18, 2.2, 4), m: M(Math.cos(a) * 1.9, 2.0, Math.sin(a) * 1.9 - 0.0, Math.PI, 0, 0), c: PAL.laXanh }); }
  K.willow = { geo: mergeParts(willow), r: 0.5 };
  const dead = c => { const p = [{ g: cyl(0.1, 0.3, 4.2, 5), m: M(0, 2.1, 0, 0, 0, 0.05), c }]; for (let i = 0; i < 5; i++) { const a = i * 1.26; p.push({ g: cyl(0.03, 0.09, 1.7, 4), m: M(Math.cos(a) * 0.5, 3.0 + i * 0.25, Math.sin(a) * 0.5, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9 - 0.2), c }); } return mergeParts(p); };
  K.dead = { geo: dead(PAL.goCo), r: 0.35 };
  K.charred = { geo: dead(0x2A211C), r: 0.35 };
  K.boulder = { geo: mergeParts([{ g: new T.DodecahedronGeometry(1, 0), m: M(0, 0.4, 0, 0.3, 0.5, 0, 1.2, 0.8, 1), c: PAL.daNui }, { g: new T.DodecahedronGeometry(0.6, 0), m: M(0.9, 0.2, 0.3), c: PAL.daCo }]), r: 1.0 };
  K.crystal = { geo: mergeParts([{ g: cone(0.5, 3.2, 5), m: M(0, 1.6, 0), c: PAL.hoaLam }, { g: cone(0.35, 2.2, 5), m: M(0.6, 1.0, 0.2, 0, 0, -0.3), c: PAL.loiDien }, { g: cone(0.3, 1.8, 5), m: M(-0.5, 0.8, -0.2, 0, 0, 0.35), c: PAL.kiemKhi }]), r: 0.7, emissive: 0x1E4A6A };
  K.lavarock = { geo: mergeParts([{ g: new T.DodecahedronGeometry(1, 0), m: M(0, 0.5, 0, 0.2, 0.4, 0, 1.1, 1.1, 1), c: PAL.datAm }, { g: cone(0.5, 2.4, 5), m: M(0.5, 1.2, 0.3), c: PAL.doRuou }]), r: 1.0, emissive: 0x5A2010 };
  return K;
}

const RIVERS = [{ a: 0.95, ph: 1.2, w: 5.5 }, { a: 3.05, ph: 4.1, w: 6.5 }, { a: 5.2, ph: 2.2, w: 5 }];

class World {
  constructor(scene) {
    this.scene = scene; this.N = new Noise(20240);
    this.cols = new Map(); this.cellSize = 6;
    this.res = 2.5; this.n = Math.round(WORLD.SIZE / this.res) + 1; this.half = WORLD.SIZE / 2;
    this.initWaterBodies(); this.buildGrid();
    scene.background = new T.Color(PAL.suong); scene.fog = new T.FogExp2(PAL.suong, 0.0045);
    this.hemi = new T.HemisphereLight(0xC9D6DA, PAL.datAm, 0.62); scene.add(this.hemi);
    this.moon = new T.DirectionalLight(0xFFE6C0, 1.0); this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moon.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 }); this.moon.shadow.bias = -0.0006; this.moon.shadow.normalBias = 0.05;
    scene.add(this.moon); scene.add(this.moon.target);
    this.rim = new T.DirectionalLight(0xA8C4D8, 0.18); this.rim.position.set(10, 8, -12); scene.add(this.rim);
    this.skyG = new T.Group(); scene.add(this.skyG);
    this.buildTerrain(); this.buildWater(); this.addSky(); this.addStars(); this.addMoon();
    this.treeMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
    this.chunks = []; this.buildVegetation(); this.addVillage(); this.addFireflies(); this.spawnHerbs();
    this.drawDist = 200; this.fogC = new T.Color(PAL.suong); this.tgtFog = new T.Color(PAL.suong); this.zoneNow = ZONES[0];
  }
  /* ---------- Địa hình ---------- */
  initWaterBodies() {
    this.riverPts = RIVERS.map(R => { const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18, r = 345 - t * (345 - 44), ang = R.a + Math.sin(t * 5 + R.ph) * 0.3 + t * 0.55; pts.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, w: R.w * (0.75 + 0.5 * Math.sin(t * 9 + R.ph)) * (0.8 + t * 0.2 + (1 - t) * 0.2) }); } return pts; });
    const r = mulberry32(777); this.lakes = [];
    for (let i = 0; i < 8; i++) { const a = r() * 6.283, d = 85 + r() * 215; this.lakes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 14 + r() * 18 }); }
  }
  rawHeight(x, z) {
    const N = this.N, d = Math.hypot(x, z);
    let h = 2.4 + N.fbm(x * 0.006, z * 0.006, 3) * 4.2 + N.fbm(x * 0.022 + 31, z * 0.022 - 17, 3) * 1.5;
    const zb = smooth(200, 250, d) * 0.28 + smooth(110, 160, d) * 0.1;
    const mm = smooth(0.0, 0.42, N.fbm(x * 0.0042 + 9, z * 0.0042 + 3, 2) + zb);
    const rg = N.ridge(x * 0.0095 + 4, z * 0.0095 - 8, 4), amp = 12 + 30 * smooth(120, 270, d);
    h += mm * Math.pow(rg, 2.4) * amp * 1.5;
    h = mix(1.4, h, smooth(20, 46, d));
    for (const pts of this.riverPts) {
      let best = 1e9;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z; let t = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz); t = clamp(t, 0, 1);
        const u = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)) - mix(a.w, b.w, t); if (u < best) best = u;
      }
      if (best < 8) h = mix(h, -1.5 - Math.max(0, -best) * 0.05, smooth(8, 0, best));
    }
    for (const L of this.lakes) { const dd = Math.hypot(x - L.x, z - L.z); if (dd < L.r * 1.5) h = mix(h, -2.2 + (dd / L.r) * 1.0, smooth(L.r * 1.45, L.r * 0.7, dd)); }
    h += smooth(WORLD.R - 28, WORLD.R, d) * 75;
    return h;
  }
  buildGrid() {
    const n = this.n; this.H = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) this.H[j * n + i] = this.rawHeight(i * this.res - this.half, j * this.res - this.half);
  }
  heightAt(x, z) {
    const n = this.n, gx = (x + this.half) / this.res, gz = (z + this.half) / this.res;
    if (gx < 0 || gz < 0 || gx >= n - 1 || gz >= n - 1) return 40;
    const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, H = this.H, a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i], d = H[(j + 1) * n + i + 1];
    return fx + fz < 1 ? a + (b - a) * fx + (c - a) * fz : d + (b - d) * (1 - fz) + (c - d) * (1 - fx);
  }
  groundY(x, z) { return Math.max(this.heightAt(x, z), WORLD.WATER - 0.7); }
  inWater(x, z) { return this.heightAt(x, z) < WORLD.WATER - 0.05; }
  slopeAt(x, z) { const e = 1.2; return Math.hypot(this.heightAt(x + e, z) - this.heightAt(x - e, z), this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e); }
  canStep(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0); if (d < 1e-5) return true; return this.groundY(x1, z1) - this.groundY(x0, z0) <= 0.95 * d + 0.02; }
  dd(x, z) { return Math.hypot(x, z) + this.N.fbm(x * 0.012 + 5, z * 0.012 - 9, 2) * 16; }
  zoneAt(x, z) { const d = this.dd(x, z); for (let i = ZONES.length - 1; i > 0; i--) if (d >= ZONES[i].from) return ZONES[i]; return ZONES[0]; }
  isSafe(x, z) { return Math.hypot(x, z) < WORLD.VILLAGE; }
  groundColor(dd, n01, out) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < ZONES.length; i++) {
      const Z = ZONES[i], w = (i === 0 ? 1 : smooth(Z.from - 8, Z.from + 8, dd)) - (i === ZONES.length - 1 ? 0 : smooth(Z.to - 8, Z.to + 8, dd));
      if (w <= 0) continue; const a = Z.ground[0], c = Z.ground[1];
      r += w * mix((a >> 16 & 255), (c >> 16 & 255), n01); g += w * mix((a >> 8 & 255), (c >> 8 & 255), n01); b += w * mix((a & 255), (c & 255), n01);
    }
    out[0] = r / 255; out[1] = g / 255; out[2] = b / 255; return out;
  }
  vertexColor(x, z, h, out) {
    const N = this.N, dd = this.dd(x, z), n01 = N.fbm(x * 0.05, z * 0.05, 2) * 0.5 + 0.5;
    this.groundColor(dd, clamp(n01, 0, 1), out);
    const sl = this.slopeAt(x, z), rk = smooth(0.55, 1.1, sl), snow = smooth(26, 36, h) * (dd > 255 ? 1 : 0.35);
    const d = Math.hypot(x, z), vil = 1 - smooth(18, 26, d), wet = smooth(0.9, -0.3, h);
    const fl = 0.9 + N.n2(x * 0.3, z * 0.3) * 0.12;
    out[0] = mix(out[0], 0.42, rk * 0.8); out[1] = mix(out[1], 0.41, rk * 0.8); out[2] = mix(out[2], 0.38, rk * 0.8);
    out[0] = mix(out[0], 0.9, snow); out[1] = mix(out[1], 0.95, snow); out[2] = mix(out[2], 1.0, snow);
    out[0] = mix(out[0], 0.29, wet * 0.7); out[1] = mix(out[1], 0.23, wet * 0.7); out[2] = mix(out[2], 0.19, wet * 0.7);
    out[0] = mix(out[0], 0.34, vil * 0.7); out[1] = mix(out[1], 0.36, vil * 0.7); out[2] = mix(out[2], 0.3, vil * 0.7);
    out[0] *= fl; out[1] *= fl; out[2] *= fl; return out;
  }
  buildTerrain() {
    const seg = this.n - 1, geo = new T.PlaneGeometry(WORLD.SIZE, WORLD.SIZE, seg, seg); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, col = new Float32Array(P.count * 3), tmp = [0, 0, 0];
    for (let k = 0; k < P.count; k++) {
      const x = P.getX(k), z = P.getZ(k), h = this.heightAt(x, z); P.setY(k, h); this.vertexColor(x, z, h, tmp); col[k * 3] = tmp[0]; col[k * 3 + 1] = tmp[1]; col[k * 3 + 2] = tmp[2];
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) { const v = 150 + Math.random() * 100 | 0; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.4})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 0.6 + Math.random() * 4, 0, 7); x.fill(); }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(170, 170); tex.anisotropy = 4;
    this.terrain = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: tex })); this.terrain.receiveShadow = true; this.scene.add(this.terrain);
  }
  buildWater() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#9ad0d8'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.25})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const sx = Math.random() * 128, sy = Math.random() * 128; x.moveTo(sx, sy); x.quadraticCurveTo(sx + 12, sy + 6, sx + 24, sy); x.stroke(); }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(60, 60); this.waterTex = tex;
    this.water = new T.Mesh(new T.PlaneGeometry(WORLD.SIZE, WORLD.SIZE), new T.MeshPhongMaterial({ color: 0x1f7a8a, map: tex, transparent: true, opacity: 0.72, shininess: 120, specular: 0x99ffee, depthWrite: false }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = WORLD.WATER; this.water.renderOrder = 1; this.scene.add(this.water);
  }
  /* ---------- Va chạm ---------- */
  addCollider(x, z, r) { const k = Math.floor(x / this.cellSize) * 4096 + Math.floor(z / this.cellSize); let a = this.cols.get(k); if (!a) this.cols.set(k, a = []); a.push({ x, z, r }); }
  collide(p, rad) {
    const cs = this.cellSize, cx = Math.floor(p.x / cs), cz = Math.floor(p.z / cs);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.cols.get((cx + i) * 4096 + cz + j); if (!a) continue;
      for (const o of a) { const ox = p.x - o.x, oz = p.z - o.z, min = o.r + rad, d2 = ox * ox + oz * oz; if (d2 < min * min && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = o.x + ox / d * min; p.z = o.z + oz / d * min; } }
    }
  }
  nearCollider(x, z, r) { const cs = this.cellSize, cx = Math.floor(x / cs), cz = Math.floor(z / cs); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = this.cols.get((cx + i) * 4096 + cz + j); if (a) for (const o of a) if (Math.hypot(x - o.x, z - o.z) < o.r + r) return true; } return false; }
  validSpot(x, z, clear = 1.5) { return Math.hypot(x, z) < WORLD.R - 12 && this.heightAt(x, z) > 0.7 && this.slopeAt(x, z) < 0.5 && !this.nearCollider(x, z, clear); }
  findSpot(x, z, maxR = 40, clear = 1.5) {
    if (this.validSpot(x, z, clear)) return { x, z };
    for (let r = 2; r < maxR; r += 2) for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (this.validSpot(px, pz, clear)) return { x: px, z: pz }; }
    return { x, z };
  }
  /* ---------- Trời ---------- */
  addSky() {
    this.skyU = { time: { value: 0 }, hz: { value: new T.Color(PAL.troiChan) }, zen: { value: new T.Color(PAL.troiDinh) } };
    const m = new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vD;uniform float time;uniform vec3 hz,zen;
      void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);vec3 c=mix(hz,zen,pow(h,.55));
      vec2 p=d.xz/(d.y+.15)*1.6+vec2(time*.004,time*.002);float w=sin(p.x*1.7+sin(p.y*1.3))*.5+.5;w*=sin(p.y*2.1-p.x*.7+time*.01)*.5+.5;
      float cl=smoothstep(.45,.85,w)*smoothstep(.02,.25,h);c=mix(c,vec3(.97,.94,.88),cl*.55);
      float sun=pow(max(0.,dot(d,normalize(vec3(-.55,.35,.4)))),180.);c+=vec3(1.,.86,.6)*sun*1.2;gl_FragColor=vec4(c,1.);}` });
    const s = new T.Mesh(new T.SphereGeometry(520, 32, 16), m); s.renderOrder = -1; s.frustumCulled = false; this.skyG.add(s);
  }
  addStars() {
    const p = [];
    for (let i = 0; i < 600; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2 + 0.1, r = 450; p.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    const st = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 })); st.frustumCulled = false; this.skyG.add(st);
  }
  addMoon() { const m = new T.Mesh(new T.SphereGeometry(24, 24, 16), new T.MeshBasicMaterial({ color: PAL.tienQuang, fog: false })); m.position.set(-280, 180, 210); this.skyG.add(m); }
  addFireflies() {
    const n = 220; this.ff = { n, base: new Float32Array(n * 3), pos: new Float32Array(n * 3) };
    for (let i = 0; i < n; i++) this.ff.base.set([rnd(-40, 40), 0.4 + Math.random() * 4.5, rnd(-40, 40)], i * 3);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.ff.pos, 3)); this.ff.g = g;
    const pt = new T.Points(g, new T.PointsMaterial({ size: 0.34, map: glowMap('rgba(255,240,190,1)'), color: 0xFFF1BC, opacity: 0.55, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); pt.frustumCulled = false; this.scene.add(pt);
  }
  /* ---------- Cây cối & đá ---------- */
  buildVegetation() {
    const K = this.kinds = buildTreeKinds(), rng = mulberry32(4242), CH = 70, nc = Math.ceil(WORLD.SIZE / CH), buckets = new Map(), sp = 3.1;
    const add = (kind, x, z, sc, y, ry) => {
      const cx = Math.floor((x + this.half) / CH), cz = Math.floor((z + this.half) / CH), key = cx * 100 + cz; let b = buckets.get(key); if (!b) buckets.set(key, b = { cx, cz, k: {} });
      (b.k[kind] || (b.k[kind] = [])).push({ x, z, sc, y, ry }); this.addCollider(x, z, K[kind].r * sc * (kind === 'bamboo' ? 0.7 : 0.55));
    };
    const N = this.N, bossSpots = BOSSES.map(b => ({ x: Math.cos(b.ang) * b.d, z: Math.sin(b.ang) * b.d }));
    for (let gz = -WORLD.R; gz < WORLD.R; gz += sp) for (let gx = -WORLD.R; gx < WORLD.R; gx += sp) {
      const x = gx + rng() * sp, z = gz + rng() * sp, d = Math.hypot(x, z); if (d > WORLD.R - 14 || d < WORLD.VILLAGE + 3) continue;
      const h = this.heightAt(x, z); if (h < 0.8) continue; const sl = this.slopeAt(x, z); if (sl > 0.6) continue;
      let nb = false; for (const s of bossSpots) if (Math.hypot(x - s.x, z - s.z) < 13) { nb = true; break; } if (nb) continue;
      let onRiver = false; // chừa bờ nước
      if (h < 1.3) continue;
      const zn = this.zoneAt(x, z).id, forest = N.fbm(x * 0.018 + 11, z * 0.018 + 5, 3), r = rng(), sc = 0.8 + rng() * 0.8, y = h - 0.1, ry = rng() * 6.28;
      const dens = clamp(forest * 1.6 + 0.35, 0, 1);
      switch (zn) {
        case 1: if (r < 0.62 * dens + 0.05) add('bamboo', x, z, sc * 0.9, y, ry); else if (r < 0.7 * dens + 0.1) add(rng() < 0.3 ? 'blossom' : 'broad', x, z, sc, y, ry); else if (r > 0.985) add('boulder', x, z, 0.6 + rng() * 0.9, y, ry); break;
        case 2: if (r < 0.2 * dens) add('broad', x, z, sc, y, ry); else if (r < 0.22 * dens + 0.015) add('blossom', x, z, sc, y, ry); else if (r > 0.985) add('boulder', x, z, 0.6 + rng() * 1.0, y, ry); break;
        case 3: if (r < 0.7 * dens + 0.08) add('pine', x, z, sc * 1.15, y, ry); else if (r > 0.985) add('boulder', x, z, 0.6 + rng(), y, ry); break;
        case 4: if (r < 0.28 * dens + 0.03) add('willow', x, z, sc * 1.1, y, ry); else if (r < 0.34 * dens) add('dead', x, z, sc, y, ry); else if (r > 0.99) add('boulder', x, z, 0.6 + rng(), y, ry); break;
        case 5: if (r < 0.1 * dens + 0.01) add('dead', x, z, sc, y, ry); else if (r > 0.94) add('boulder', x, z, 0.7 + rng() * 1.6, y, ry); break;
        case 6: if (r < 0.34 * dens + 0.02) add('snowpine', x, z, sc * 1.1, y, ry); else if (r > 0.975) add('crystal', x, z, 0.8 + rng() * 1.2, y, ry); else if (r > 0.95) add('boulder', x, z, 0.7 + rng(), y, ry); break;
        case 7: if (r < 0.1 * dens + 0.015) add('charred', x, z, sc, y, ry); else if (r > 0.95) add('lavarock', x, z, 0.8 + rng() * 1.3, y, ry); break;
      }
    }
    const col = new T.Color();
    buckets.forEach(b => {
      const g = new T.Group(); g.userData = { x: (b.cx + 0.5) * CH - this.half, z: (b.cz + 0.5) * CH - this.half }; g.frustumCulled = false;
      for (const kind in b.k) {
        const arr = b.k[kind], K0 = K[kind], mat = K0.emissive ? new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true, emissive: K0.emissive, emissiveIntensity: 0.9 }) : this.treeMat;
        const im = new T.InstancedMesh(K0.geo, mat, arr.length); im.frustumCulled = false; im.castShadow = !K0.emissive;
        arr.forEach((o, i) => { im.setMatrixAt(i, M(o.x, o.y, o.z, 0, o.ry, 0, o.sc, kind === 'boulder' ? o.sc * (0.7 + (i % 3) * 0.2) : o.sc * (0.9 + (i % 4) * 0.08), o.sc)); const v = 0.78 + ((i * 37) % 100) / 100 * 0.4; im.setColorAt(i, col.setRGB(v, v * (0.95 + (i % 5) * 0.025), v)); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; g.add(im);
      }
      this.scene.add(g); this.chunks.push(g);
    });
    this.treeCount = [...buckets.values()].reduce((s, b) => s + Object.values(b.k).reduce((a, v) => a + v.length, 0), 0);
  }
  /* ---------- Làng Linh Đài ---------- */
  addVillage() {
    const sc = this.scene, vy = 1.4; this.cauldronPos = { x: 2.3, z: 1.0 }; this.npcPos = { x: -3.2, z: 2.4 };
    const stone = mat(PAL.daCo, { roughness: 0.9 }), bronze = mat(PAL.dongCo, { metalness: 0.7, roughness: 0.4 });
    const plat = part(new T.CylinderGeometry(3.6, 3.8, 0.3, 40), stone, 0, vy - 0.05, 0, sc); plat.castShadow = false;
    const plat2 = part(new T.CylinderGeometry(9.5, 10, 0.18, 48), mat(PAL.daNui, { roughness: 0.95 }), 0, vy - 0.12, 0, sc); plat2.castShadow = false;
    const ring = new T.Mesh(new T.RingGeometry(2.7, 2.85, 48), new T.MeshBasicMaterial({ color: PAL.vangKim, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = vy + 0.13; sc.add(ring);
    const ring2 = new T.Mesh(new T.RingGeometry(8.4, 8.55, 64), new T.MeshBasicMaterial({ color: PAL.phuong, side: T.DoubleSide, transparent: true, opacity: 0.45, blending: T.AdditiveBlending })); ring2.rotation.x = -Math.PI / 2; ring2.position.y = vy + 0.0; sc.add(ring2); this.vRing = ring2;
    // lò đan
    const cy = vy + 0.15, cx = this.cauldronPos.x, cz = this.cauldronPos.z;
    part(new T.CylinderGeometry(0.5, 0.4, 0.6, 16), bronze, cx, cy + 0.7, cz, sc);
    const rim = part(new T.TorusGeometry(0.5, 0.05, 8, 20), bronze, cx, cy + 1.0, cz, sc); rim.rotation.x = Math.PI / 2;
    [0, 2.1, 4.2].forEach(a => part(new T.CylinderGeometry(0.07, 0.05, 0.6, 8), bronze, cx + Math.cos(a) * 0.35, cy + 0.15, cz + Math.sin(a) * 0.35, sc));
    this.flame = part(new T.ConeGeometry(0.3, 0.6, 8), new T.MeshStandardMaterial({ color: PAL.phuong, emissive: PAL.hoaDiem, emissiveIntensity: 1.8 }), cx, cy + 1.35, cz, sc);
    const l = new T.PointLight(PAL.phuong, 1.4, 10, 2); l.position.set(cx, cy + 1.6, cz); sc.add(l); this.addCollider(cx, cz, 0.7);
    // đèn lồng
    const pole = mat(PAL.goCo), glow = new T.MeshStandardMaterial({ color: 0xE8302A, emissive: 0xFF5A1A, emissiveIntensity: 1.4 }); // đèn lồng đỏ
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283 + 0.4, x = Math.cos(a) * 9, z = Math.sin(a) * 9;
      part(new T.CylinderGeometry(0.07, 0.09, 2.6, 8), pole, x, vy + 1.3, z, sc); part(new T.SphereGeometry(0.28, 12, 10), glow, x, vy + 2.7, z, sc);
      if (i % 2 === 0) { const L2 = new T.PointLight(0xFFB47A, 0.9, 13, 2); L2.position.set(x, vy + 2.7, z); sc.add(L2); } this.addCollider(x, z, 0.3);
    }
    // đình nhỏ
    const px = -6.5, pz = 5.5, wood = mat(PAL.goCo), roof = mat(PAL.doRuou, { roughness: 0.6 });
    [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([dx, dz]) => { part(new T.CylinderGeometry(0.12, 0.14, 2.8, 8), wood, px + dx, vy + 1.4, pz + dz, sc); this.addCollider(px + dx, pz + dz, 0.2); });
    part(new T.ConeGeometry(3.0, 1.4, 4), roof, px, vy + 3.5, pz, sc).rotation.y = Math.PI / 4; part(new T.BoxGeometry(3.6, 0.15, 3.6), wood, px, vy + 2.85, pz, sc);
    part(new T.BoxGeometry(2.6, 0.6, 1.2), wood, px, vy + 0.4, pz - 1.0, sc);
    // dược sư (NPC)
    this.npc = this.makeNPC(); this.npc.position.set(this.npcPos.x, vy + 0.15, this.npcPos.z); this.npc.rotation.y = 0.9; sc.add(this.npc); this.addCollider(this.npcPos.x, this.npcPos.z, 0.5);
    // trận pháp ở các boss
    this.arenas = [];
    BOSSES.forEach(b => {
      const p = this.findSpot(Math.cos(b.ang) * b.d, Math.sin(b.ang) * b.d, 40, 2.5); b.x = p.x; b.z = p.z; b.y = this.heightAt(p.x, p.z);
      const rg = new T.Mesh(new T.RingGeometry(5.6, 5.9, 48), new T.MeshBasicMaterial({ color: 0xff5a4a, side: T.DoubleSide, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false })); rg.rotation.x = -Math.PI / 2; rg.position.set(p.x, b.y + 0.12, p.z); sc.add(rg);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, x = p.x + Math.cos(a) * 7.5, z = p.z + Math.sin(a) * 7.5, hh = 2.5 + (i % 2); part(new T.BoxGeometry(0.9, hh, 0.9), mat(PAL.daCo, { roughness: 0.9 }), x, this.heightAt(x, z) + hh / 2 - 0.2, z, sc).rotation.y = a; this.addCollider(x, z, 0.65); }
    });
  }
  makeNPC() {
    const g = new T.Group(), robe = mat(PAL.doSon, { roughness: 0.6 }), skin = mat(0xf0d0b8), hat = mat(0x3a2a1e), gold = mat(0xe6b948, { metalness: 0.8, roughness: 0.3 });
    part(new T.CylinderGeometry(0.25, 0.5, 1.2, 12), robe, 0, 0.6, 0, g); part(new T.SphereGeometry(0.2, 12, 10), skin, 0, 1.45, 0, g);
    part(new T.CylinderGeometry(0.34, 0.34, 0.04, 14), hat, 0, 1.62, 0, g); part(new T.ConeGeometry(0.22, 0.28, 10), hat, 0, 1.76, 0, g);
    part(new T.BoxGeometry(0.1, 0.5, 0.5), robe, 0.32, 0.95, 0.12, g).rotation.x = -0.6; part(new T.BoxGeometry(0.1, 0.5, 0.5), robe, -0.32, 0.95, 0.12, g).rotation.x = -0.6;
    part(new T.TorusGeometry(0.27, 0.03, 6, 14), gold, 0, 0.82, 0, g).rotation.x = Math.PI / 2;
    const bead = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshBasicMaterial({ color: PAL.tienQuang })); bead.position.set(0, 1.0, 0.6); g.add(bead);
    const gl = new T.Sprite(sprMat(glowMap('rgba(160,255,210,1)'))); gl.scale.setScalar(1.2); gl.position.copy(bead.position); g.add(gl);
    const tex = canvasTex(x => { x.font = 'bold 34px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffe58a'; x.fillText('丹', 32, 40); });
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.setScalar(0.7); s.position.y = 2.3; g.add(s); g.userData.sign = s; return g;
  }
  /* ---------- Linh thảo ---------- */
  spawnHerbs() {
    const rng = mulberry32(99), arr = this.herbs = [];
    for (let i = 0; i < 520 && arr.length < 260; i++) {
      const a = rng() * 6.283, d = 26 + Math.pow(rng(), 0.8) * (WORLD.R - 50), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.heightAt(x, z) < 0.9 || this.slopeAt(x, z) > 0.45 || this.nearCollider(x, z, 0.6)) continue; arr.push({ x, z, y: this.heightAt(x, z), alive: true, t: 0 });
    }
    const n = arr.length; this.herbPos = new Float32Array(n * 3);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.herbPos, 3)); this.herbG = g;
    this.herbPts = new T.Points(g, new T.PointsMaterial({ size: 0.95, map: glowMap('rgba(255,225,140,1)'), color: PAL.hoaMai, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); this.herbPts.frustumCulled = false; this.scene.add(this.herbPts);
    this.herbMesh = new T.InstancedMesh(mergeParts([{ g: cone(0.12, 0.55, 5), m: M(0, 0.27, 0, 0.0, 0, 0.0), c: PAL.laNon }, { g: cone(0.1, 0.4, 5), m: M(0.15, 0.2, 0, 0, 0, -0.6), c: PAL.laXanh }, { g: cone(0.1, 0.4, 5), m: M(-0.15, 0.2, 0.05, 0, 0, 0.6), c: PAL.laXanh }]), new T.MeshStandardMaterial({ vertexColors: true, emissive: PAL.laRung, emissiveIntensity: 0.8 }), n); this.herbMesh.frustumCulled = false; this.scene.add(this.herbMesh);
    arr.forEach((h, i) => this.herbMesh.setMatrixAt(i, M(h.x, h.y, h.z, 0, i, 0, 1.4)));
    this.herbMesh.instanceMatrix.needsUpdate = true; this.herbRefresh(0);
  }
  herbRefresh(time) { this.herbs.forEach((h, i) => { this.herbPos[i * 3] = h.x; this.herbPos[i * 3 + 1] = h.alive ? h.y + 0.9 + Math.sin(time * 1.5 + i) * 0.12 : -999; this.herbPos[i * 3 + 2] = h.z; this.herbMesh.setMatrixAt(i, h.alive ? M(h.x, h.y, h.z, 0, i, 0, 1.4) : M(0, -999, 0)); }); this.herbG.attributes.position.needsUpdate = true; this.herbMesh.instanceMatrix.needsUpdate = true; }
  /* ---------- Cập nhật mỗi khung hình ---------- */
  update(time, dt, P, camera) {
    this.skyU.time.value = time; this.skyG.position.set(P.x, 0, P.z);
    const sx = Math.round(P.x), sz = Math.round(P.z); this.moon.position.set(sx - 18, P.y + 30, sz + 14); this.moon.target.position.set(sx, P.y, sz); this.moon.target.updateMatrixWorld();
    this.water.position.x = Math.round(P.x / 5) * 0; this.waterTex.offset.set(time * 0.012, time * 0.007);
    const dd2 = this.drawDist * this.drawDist, hs = 50;
    for (const c of this.chunks) { const u = c.userData, dx = Math.max(0, Math.abs(u.x - P.x) - hs), dz = Math.max(0, Math.abs(u.z - P.z) - hs); c.visible = dx * dx + dz * dz < dd2; }
    // đom đóm bám theo người chơi
    const f = this.ff, b = f.base, q = f.pos;
    for (let i = 0; i < f.n; i++) {
      const bx = ((b[i * 3] - P.x) % 80 + 120) % 80 - 40, bz = ((b[i * 3 + 2] - P.z) % 80 + 120) % 80 - 40;
      q[i * 3] = P.x + bx + Math.sin(time * 0.3 + i * 1.3) * 0.7; q[i * 3 + 1] = this.groundY(P.x + bx, P.z + bz) + b[i * 3 + 1] + Math.sin(time * 0.6 + i) * 0.4; q[i * 3 + 2] = P.z + bz + Math.cos(time * 0.28 + i * 0.9) * 0.7;
    }
    f.g.attributes.position.needsUpdate = true;
    // sương mù theo vùng
    const Z = this.zoneAt(P.x, P.z); this.zoneNow = Z; this.tgtFog.setHex(Z.fog); this.fogC.lerp(this.tgtFog, 1 - Math.exp(-dt * 1.2));
    this.scene.fog.color.copy(this.fogC); this.scene.background.copy(this.fogC); this.scene.fog.density += (Z.fogD * this.fogMul - this.scene.fog.density) * (1 - Math.exp(-dt * 1.2));
    this.skyU.hz.value.copy(this.fogC).lerp(this._chan || (this._chan = new T.Color(PAL.troiChan)), 0.55);
    this.vRing.rotation.z = time * 0.1; this.vRing.material.opacity = 0.45 + Math.sin(time * 2) * 0.15; this.flame.scale.y = 1 + Math.sin(time * 9) * 0.12; this.flame.rotation.y = time * 2;
    this.npc.userData.sign.position.y = 2.3 + Math.sin(time * 2) * 0.05;
    this.herbPts.material.size = 0.85 + Math.sin(time * 3) * 0.1;
  }
  setQuality(q) {
    const Q = { low: { dist: 120, shadow: 0, map: 1024, fogMul: 1.35 }, mid: { dist: 175, shadow: 1, map: 1024, fogMul: 1.0 }, high: { dist: 240, shadow: 1, map: 2048, fogMul: 0.8 } }[q];
    this.drawDist = Q.dist; this.fogMul = Q.fogMul; this.moon.castShadow = !!Q.shadow;
    if (this.moon.shadow.mapSize.x !== Q.map) { this.moon.shadow.mapSize.set(Q.map, Q.map); if (this.moon.shadow.map) { this.moon.shadow.map.dispose(); this.moon.shadow.map = null; } }
    return Q;
  }
  /* ---------- Bản đồ ---------- */
  renderMap(canvas) {
    const S = canvas.width, ctx = canvas.getContext('2d'), img = ctx.createImageData(S, S), tmp = [0, 0, 0], k = WORLD.SIZE / S;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i + 0.5) * k - this.half, z = (j + 0.5) * k - this.half, h = this.heightAt(x, z), o = (j * S + i) * 4, d = Math.hypot(x, z);
      if (d > WORLD.R) { img.data[o] = 8; img.data[o + 1] = 12; img.data[o + 2] = 14; img.data[o + 3] = 255; continue; }
      if (h < WORLD.WATER) { img.data[o] = 30; img.data[o + 1] = 110; img.data[o + 2] = 150; img.data[o + 3] = 255; continue; }
      this.vertexColor(x, z, h, tmp); const sh = 0.75 + clamp(h / 40, 0, 0.6) * 0.8;
      img.data[o] = clamp(tmp[0] * 255 * sh * 1.5, 0, 255); img.data[o + 1] = clamp(tmp[1] * 255 * sh * 1.5, 0, 255); img.data[o + 2] = clamp(tmp[2] * 255 * sh * 1.5, 0, 255); img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
}
