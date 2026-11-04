/* ===================== Quái vật: mô hình, AI, rớt đồ ===================== */
const _mc = {};
const MC = (color, o = {}) => { const k = color + JSON.stringify(o); return _mc[k] || (_mc[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, flatShading: true }, o))); };
const sphG = new T.SphereGeometry(1, 10, 8), boxG = new T.BoxGeometry(1, 1, 1), cylG = new T.CylinderGeometry(1, 1, 1, 7), coneG = new T.ConeGeometry(1, 1, 6);
function sp(parent, mat, x, y, z, sx, sy = sx, sz = sx) { const m = new T.Mesh(sphG, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; }
function bx(parent, mat, x, y, z, sx, sy, sz) { const m = new T.Mesh(boxG, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; }
function cy(parent, mat, x, y, z, r, h) { const m = new T.Mesh(cylG, mat); m.position.set(x, y, z); m.scale.set(r, h, r); m.castShadow = true; parent.add(m); return m; }
function co(parent, mat, x, y, z, r, h, rx = 0, rz = 0) { const m = new T.Mesh(coneG, mat); m.position.set(x, y, z); m.scale.set(r, h, r); m.rotation.set(rx, 0, rz); m.castShadow = true; parent.add(m); return m; }
const eyeM = col => new T.MeshBasicMaterial({ color: col });

function buildModel(t, color) {
  const g = new T.Group(), body = MC(color, t.glow ? { emissive: t.glow, emissiveIntensity: 0.12 } : {}), acc = MC(t.c2, t.glow ? { emissive: t.glow, emissiveIntensity: 0.7 } : {}), dark = MC(0x151515), ey = eyeM(t.glow ? t.glow : 0xffe060);
  const named = (o, n) => { o.name = n; return o; };
  switch (t.arch) {
    case 'quad': case 'dragon': {
      const dr = t.arch === 'dragon', B = dr ? [1.1, 1.0, 2.4] : t.body, lh = dr ? 1.2 : t.legH, hd = dr ? 0.75 : t.head, by = B[1], bodyY = lh + by * 0.9;
      sp(g, body, 0, bodyY, 0, B[0], by, B[2]);
      if (t.stripes) for (let i = -2; i <= 2; i++) bx(g, acc, 0, bodyY + by * 0.75, i * B[2] * 0.3, B[0] * 1.5, 0.06, 0.07);
      const hy = bodyY + by * (dr ? 1.3 : 0.55), hz = B[2] * (dr ? 1.25 : 0.95), head = new T.Group(); head.position.set(0, hy, hz); named(head, 'head'); g.add(head);
      if (dr) { sp(g, body, 0, bodyY + by * 0.9, B[2] * 0.7, 0.55, 0.55, 0.7); sp(g, body, 0, bodyY + by * 1.15, B[2] * 0.98, 0.45, 0.45, 0.5); }
      sp(head, body, 0, 0, 0, hd, hd * 0.9, hd);
      if (t.snout || dr) sp(head, acc.clone ? MC(t.c2) : acc, 0, -hd * 0.25, hd * 0.85, hd * 0.55, hd * 0.4, hd * 0.65);
      [-1, 1].forEach(s => {
        sp(head, ey, s * hd * 0.45, hd * 0.25, hd * 0.78, hd * 0.14);
        if (t.ears) { const r = t.ears; if (r > 0.25) co(head, body, s * hd * 0.4, hd * 1.3, -hd * 0.1, hd * 0.2, r * 2.2, 0, s * -0.15); else co(head, body, s * hd * 0.6, hd * 0.85, 0, hd * 0.3, r * 1.5, 0, s * -0.3); }
        if (t.tusk) co(head, MC(t.c2), s * hd * 0.5, -hd * 0.3, hd * 0.95, hd * 0.12, hd * 0.55, -0.4, s * 0.3);
        if (t.horns || dr) co(head, MC(dr ? 0x888070 : t.c2), s * hd * 0.5, hd * 0.9, -hd * 0.1, hd * (dr ? 0.18 : 0.15), hd * (dr ? 1.6 : 1.1), -0.5, s * -0.35);
      });
      if (t.tail) { const tl = dr ? 2.2 : t.tail; co(g, body, 0, bodyY + by * 0.15, -B[2] * (dr ? 1.2 : 1.0) - tl * 0.35, dr ? 0.5 : 0.1 + tl * 0.12, tl * 1.5, -1.9, 0); }
      const lr = Math.max(0.05, B[0] * 0.2), lH = lh + by * 0.5;
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => { const leg = new T.Group(); leg.position.set(sx * B[0] * 0.7, bodyY - by * 0.3, sz * B[2] * 0.55); named(leg, 'leg' + i); cy(leg, body, 0, -lH / 2, 0, lr, lH); bx(leg, dark, 0, -lH, lr * 0.8, lr * 2.2, lr * 1.0, lr * 3); g.add(leg); });
      if (dr) {
        [-1, 1].forEach(s => { const w = new T.Group(); w.position.set(s * 0.7, bodyY + by * 0.9, 0.4); named(w, s < 0 ? 'wingL' : 'wingR'); bx(w, MC(0x2a0a18, { side: T.DoubleSide }), s * 2.2, 0, -0.3, 4.4, 0.06, 2.6); cy(w, body, s * 2.0, 0.03, 0.6, 0.06, 4.4).rotation.z = Math.PI / 2; for (let i = 0; i < 4; i++) cy(w, body, s * (0.8 + i * 1.1), 0.0, -0.8, 0.04, 2.4).rotation.x = 1.4; g.add(w); });
        for (let i = 0; i < 6; i++) co(g, acc, 0, bodyY + by * 1.05, B[2] * 0.8 - i * 0.55, 0.12, 0.45);
      }
      break;
    }
    case 'spider': {
      sp(g, body, 0, 0.75, 0, 0.55, 0.45, 0.65); sp(g, body, 0, 0.9, -0.85, 0.6, 0.55, 0.8); sp(g, acc, 0, 1.05, -0.95, 0.2, 0.08, 0.3);
      [-1, 1].forEach(s => { sp(g, ey, s * 0.2, 0.9, 0.55, 0.1); sp(g, ey, s * 0.1, 0.98, 0.6, 0.07); });
      for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, k = i % 4, leg = new T.Group(); leg.position.set(s * 0.4, 0.8, 0.3 - k * 0.28); named(leg, 'leg' + i); const u = cy(leg, body, s * 0.45, 0.15, 0, 0.05, 1.0); u.rotation.z = s * -1.0; const l2 = cy(leg, body, s * 0.95, -0.35, 0, 0.04, 1.1); l2.rotation.z = s * 0.25; g.add(leg); }
      break;
    }
    case 'snake': {
      for (let i = 0; i < 9; i++) { const r = 0.2 - i * 0.012; const s = sp(g, i % 2 ? acc : body, 0, 0.2, -i * 0.3, r * 1.3, r * 1.1, 0.24); named(s, 'seg' + i); }
      const h = sp(g, body, 0, 0.26, 0.28, 0.25, 0.18, 0.3); named(h, 'seg-1'); sp(g, ey, 0.1, 0.34, 0.45, 0.05); sp(g, ey, -0.1, 0.34, 0.45, 0.05); sp(g, MC(0xff4060), 0, 0.2, 0.62, 0.02, 0.02, 0.14);
      break;
    }
    case 'toad': {
      sp(g, body, 0, 0.55, 0, 0.75, 0.55, 0.85); sp(g, acc, 0, 0.35, 0.2, 0.55, 0.3, 0.6);
      [-1, 1].forEach(s => { sp(g, body, s * 0.35, 1.0, 0.45, 0.2); sp(g, ey, s * 0.35, 1.05, 0.58, 0.1); sp(g, body, s * 0.7, 0.3, -0.45, 0.35, 0.28, 0.5); sp(g, body, s * 0.55, 0.15, 0.55, 0.15, 0.12, 0.3); });
      for (let i = 0; i < 6; i++) sp(g, acc, Math.cos(i * 1.1) * 0.5, 0.95 + (i % 2) * 0.1, -0.2 - Math.sin(i * 1.1) * 0.3, 0.1);
      break;
    }
    case 'golem': {
      bx(g, body, 0, 1.5, 0, 1.1, 1.2, 0.7); bx(g, body, 0, 2.4, 0.05, 0.6, 0.55, 0.55); bx(g, acc, 0, 1.6, 0.36, 0.3, 0.3, 0.08); sp(g, MC(0xffa040, { emissive: 0xff7000, emissiveIntensity: 1 }), 0, 2.45, 0.34, 0.14, 0.05, 0.06);
      bx(g, body, 0.78, 2.05, 0, 0.5, 0.5, 0.5); bx(g, body, -0.78, 2.05, 0, 0.5, 0.5, 0.5);
      [-1, 1].forEach((s, i) => { const a = new T.Group(); a.position.set(s * 0.85, 1.95, 0); named(a, 'leg' + (i + 2)); bx(a, body, 0, -0.6, 0, 0.35, 1.2, 0.35); bx(a, MC(t.color, {}), 0, -1.3, 0.05, 0.5, 0.5, 0.5); g.add(a); const l = new T.Group(); l.position.set(s * 0.35, 0.95, 0); named(l, 'leg' + i); bx(l, body, 0, -0.45, 0, 0.45, 0.95, 0.45); g.add(l); });
      for (let i = 0; i < 4; i++) co(g, MC(0x5a5a58), (i - 1.5) * 0.28, 2.15, -0.35, 0.12, 0.4);
      break;
    }
    case 'wraith': {
      const gm = MC(color, { emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.82 });
      co(g, gm, 0, 0.95, 0, 0.55, 1.5, Math.PI, 0); sp(g, gm, 0, 1.85, 0, 0.32, 0.36, 0.32);
      [-1, 1].forEach(s => { sp(g, eyeM(0xffffff), s * 0.12, 1.9, 0.27, 0.07, 0.04, 0.03); sp(g, gm, s * 0.6, 1.3, 0.2, 0.14); co(g, gm, s * 0.45, 1.2, 0.1, 0.1, 0.7, 0, s * 0.8); });
      for (let i = 0; i < 4; i++) co(g, gm, (i - 1.5) * 0.25, 0.1, 0, 0.1, 0.7, Math.PI, 0);
      g.userData.hover = 0.7; break;
    }
    case 'bird': {
      sp(g, body, 0, 1.3, 0, 0.45, 0.45, 0.8); sp(g, body, 0, 1.6, 0.75, 0.28); co(g, MC(0xffd040), 0, 1.57, 1.05, 0.08, 0.3, Math.PI / 2, 0); [-1, 1].forEach(s => sp(g, eyeM(0x000000), s * 0.13, 1.68, 0.92, 0.05));
      [-1, 1].forEach(s => { const w = new T.Group(); w.position.set(s * 0.3, 1.45, 0); named(w, s < 0 ? 'wingL' : 'wingR'); bx(w, acc, s * 0.8, 0, -0.1, 1.6, 0.05, 0.9); bx(w, body, s * 1.2, 0, -0.35, 1.0, 0.04, 0.5); g.add(w); });
      co(g, acc, 0, 1.25, -1.0, 0.18, 1.1, -1.9, 0); co(g, body, 0.15, 1.2, -0.95, 0.1, 0.9, -1.8, 0.2); co(g, body, -0.15, 1.2, -0.95, 0.1, 0.9, -1.8, -0.2);
      g.userData.hover = 1.0; break;
    }
  }
  g.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
  return g;
}

const _tpl = {}, _hgt = {};
function modelFor(key, t, color) { const k = key + color; if (!_tpl[k]) { _tpl[k] = buildModel(t, color); const bb = new T.Box3().setFromObject(_tpl[k]); _hgt[k] = bb.max.y; } return _tpl[k]; }

/* thanh máu 3D & vòng hào quang */
const barBg = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, depthTest: false }), barPlane = new T.PlaneGeometry(1, 0.13);
const barFg = { n: new T.MeshBasicMaterial({ color: 0x5aff8a, depthTest: false }), e: new T.MeshBasicMaterial({ color: 0xffc040, depthTest: false }), b: new T.MeshBasicMaterial({ color: 0xff4a3a, depthTest: false }) };
const ringGeo = new T.RingGeometry(0.7, 0.85, 28), ringMats = { e: new T.MeshBasicMaterial({ color: 0xffc040, side: T.DoubleSide, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false }), b: new T.MeshBasicMaterial({ color: 0xff3a30, side: T.DoubleSide, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false }) };
const shotGeo = new T.SphereGeometry(0.28, 8, 6);
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 64; const x = c.getContext('2d'); x.font = 'bold 30px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 192, 42); x.fillStyle = color; x.fillText(text, 192, 42);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false })); s.scale.set(4.2, 0.7, 1); s.renderOrder = 998; return s;
}

class Monster {
  constructor(MM, typeKey, lvl, x, z, o = {}) {
    const t = MTYPES[typeKey]; Object.assign(this, { MM, key: typeKey, t, lvl, elite: !!o.elite, boss: o.boss || null, camp: o.camp || 0, hx: x, hz: z, x, z, y: 0, face: Math.random() * 6.28, state: 'idle', timer: rnd(1, 4), alive: true, active: false, mesh: null, kx: 0, kz: 0, respawn: 0, hurtT: 0, engaged: 0, ph: Math.random() * 6, mv: 0, deadT: 0, atkCd: rnd(0.5, 1.5), squash: 0 });
    const L = lvl, E = this.elite ? 1 : 0, B = this.boss ? 1 : 0;
    this.name = this.boss ? this.boss.name : (this.elite ? 'Tinh Anh ' : '') + t.name;
    this.maxHp = Math.round(18 * Math.pow(L, 1.35) * t.hp * (E ? 3.2 : 1) * (B ? (this.boss.final ? 16 : 11) : 1)) + 10;
    this.atk = (8 + 3.2 * L) * t.atk * (E ? 1.35 : 1) * (B ? 1.7 : 1); this.def = L * 1.4 * (B ? 1.4 : 1);
    this.spd = t.spd * (E ? 1.08 : 1) * (B ? 0.9 : 1); this.size = (this.boss ? (this.boss.sc || 1) : 1) * t.sc * (E ? 1.28 : 1);
    this.aggro = B ? 22 : t.aggro * (E ? 1.2 : 1); this.leash = B ? 55 : this.aggro * 2.2 + 10;
    this.exp = 6 * Math.pow(L, 1.5) * t.exp * (E ? 3 : 1) * (B ? 30 : 1);
    this.range = (B ? 3.2 : 1.7) * Math.max(1, this.size * 0.9); if (t.ranged) this.range = t.ranged;
    this.hp = this.maxHp; this.rad = 0.45 * Math.max(0.8, this.size);
  }
  build() {
    const color = this.boss ? this.boss.color : this.t.color, tpl = modelFor(this.key, this.t, color), m = new T.Group();
    this.model = tpl.clone(true); this.model.scale.setScalar(this.size); m.add(this.model);
    this.legs = [0, 1, 2, 3, 4, 5, 6, 7].map(i => this.model.getObjectByName('leg' + i)).filter(Boolean);
    this.segs = []; for (let i = -1; i < 9; i++) { const s = this.model.getObjectByName('seg' + i); if (s) this.segs.push(s); }
    this.wings = ['wingL', 'wingR'].map(n => this.model.getObjectByName(n)).filter(Boolean); this.headO = this.model.getObjectByName('head');
    this.hover = tpl.userData.hover || 0; this.baseH = _hgt[this.key + color] * this.size;
    const bar = new T.Group(), bg = new T.Mesh(barPlane, barBg), fg = new T.Mesh(barPlane, barFg[this.boss ? 'b' : this.elite ? 'e' : 'n']); bg.scale.x = 1.45; bg.renderOrder = 996; fg.renderOrder = 997; fg.position.z = 0.001; bar.add(bg, fg); bar.position.y = this.baseH + 0.7 + this.hover; bar.visible = false; m.add(bar); this.bar = bar; this.barFg = fg;
    if (this.elite || this.boss) { const r = new T.Mesh(ringGeo, ringMats[this.boss ? 'b' : 'e']); r.rotation.x = -Math.PI / 2; r.position.y = 0.1; r.scale.setScalar(this.size * 1.3 + 0.4); m.add(r); this.ring = r; }
    if (this.boss) { const lb = labelSprite(this.name + '  Lv.' + this.lvl, '#ff9a8a'); lb.position.y = this.baseH + 1.6 + this.hover; m.add(lb); this.label = lb; }
    else if (this.elite) { const lb = labelSprite('★ ' + this.name + ' Lv.' + this.lvl, '#ffd060'); lb.position.y = this.baseH + 1.4 + this.hover; m.add(lb); this.label = lb; }
    this.mesh = m; this.MM.G.scene.add(m); this.updateBar();
  }
  unbuild() { if (this.mesh) { this.MM.G.scene.remove(this.mesh); this.mesh = null; } }
  updateBar() { const r = clamp(this.hp / this.maxHp, 0, 1); this.barFg.scale.x = Math.max(0.001, r * 1.4); this.barFg.position.x = -(1.4 - r * 1.4) / 2; }
  hurt(dmg, crit, from) {
    if (!this.alive) return;
    this.hp -= dmg; this.engaged = 6; this.hurtT = 0.15; this.squash = 1; this.updateBar(); this.MM.G.ui.floatText(this.x, this.y + this.baseH + 0.3, this.z, Math.round(dmg), crit ? 'crit' : 'dmg');
    if (from) { const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1, k = this.boss ? 0.5 : crit ? 4.5 : 2.2; this.kx += dx / d * k; this.kz += dz / d * k; }
    if (this.hp <= 0) { this.die(); return; }
    if (this.t.passive) { this.state = 'flee'; this.timer = 4; } else if (this.state === 'idle' || this.state === 'wander' || this.state === 'return') { this.state = 'chase'; }
    this.MM.alertCamp(this);
  }
  die() { this.alive = false; this.state = 'dead'; this.deadT = 0; this.respawn = this.boss ? 300 : rnd(22, 40); this.hp = 0; this.updateBar(); this.MM.G.onKill(this); }
  reset() { this.alive = true; this.hp = this.maxHp; this.x = this.hx; this.z = this.hz; this.state = 'idle'; this.timer = rnd(1, 3); this.kx = this.kz = 0; this.engaged = 0; this.deadT = 0; if (this.mesh) { this.model.scale.setScalar(this.size); this.model.rotation.set(0, 0, 0); this.updateBar(); } }
  update(dt, P, world) {
    const G = this.MM.G, pl = G.player, pdx = P.x - this.x, pdz = P.z - this.z, pd = Math.hypot(pdx, pdz);
    this.engaged = Math.max(0, this.engaged - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.atkCd -= dt; this.squash = Math.max(0, this.squash - dt * 5);
    if (!this.alive) { this.deadT += dt; if (this.mesh) { const u = clamp(this.deadT / 0.9, 0, 1); this.model.scale.setScalar(this.size * (1 - u * 0.9)); this.model.rotation.z = u * 1.4; this.model.position.y = -u * 0.4; this.bar.visible = false; if (this.deadT > 0.9) this.mesh.visible = false; } return; }
    let mvx = 0, mvz = 0, sp = 0;
    const goTo = (tx, tz, k) => { const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz); if (d < 0.05) return d; this.face = lerpAngle(this.face, Math.atan2(dx, dz), Math.min(1, dt * 8)); sp = this.spd * k; mvx = dx / d * sp; mvz = dz / d * sp; return d; };
    const safe = world.isSafe(P.x, P.z) || pl.dead;
    switch (this.state) {
      case 'idle': this.timer -= dt; if (this.timer < 0) { this.state = 'wander'; this.timer = rnd(1.5, 3.5); this.wx = this.hx + rnd(-6, 6); this.wz = this.hz + rnd(-6, 6); }
        if (!this.t.passive && !safe && pd < this.aggro) this.state = 'chase'; break;
      case 'wander': this.timer -= dt; if (goTo(this.wx, this.wz, 0.35) < 0.6 || this.timer < 0) { this.state = 'idle'; this.timer = rnd(2, 5); }
        if (!this.t.passive && !safe && pd < this.aggro) this.state = 'chase'; break;
      case 'flee': this.timer -= dt; { const dx = this.x - P.x, dz = this.z - P.z, d = Math.hypot(dx, dz) || 1; goTo(this.x + dx / d * 5, this.z + dz / d * 5, 1.3); } if (this.timer < 0) { this.state = 'return'; } break;
      case 'chase': {
        if (safe || pd > this.leash || Math.hypot(this.x - this.hx, this.z - this.hz) > (this.boss ? 70 : 48)) { this.state = 'return'; break; }
        this.face = lerpAngle(this.face, Math.atan2(pdx, pdz), Math.min(1, dt * 10));
        const wantRange = this.t.ranged ? this.range * 0.85 : this.range;
        if (pd > wantRange * (this.t.ranged ? 0.9 : 0.95)) goTo(P.x, P.z, 1); else if (this.atkCd <= 0) { this.state = 'windup'; this.timer = this.boss ? 0.85 : 0.55; this.slam = this.boss && pd < 12 && Math.random() < 0.4; if (this.slam) { this.timer = 1.4; this.sx = this.x; this.sz = this.z; this.MM.G.slamWarn(this); } }
        else if (this.t.ranged && pd < this.range * 0.45) { const dx = this.x - P.x, dz = this.z - P.z, d = Math.hypot(dx, dz) || 1; goTo(this.x + dx / d * 3, this.z + dz / d * 3, 0.7); }
        break;
      }
      case 'windup': {
        this.timer -= dt; this.face = lerpAngle(this.face, Math.atan2(pdx, pdz), Math.min(1, dt * 6));
        if (this.timer <= 0) {
          if (this.slam) { const R = 6.5 * Math.max(1, this.size * 0.5); if (Math.hypot(P.x - this.sx, P.z - this.sz) < R) G.hurtPlayer(this.atk * 1.9, this); G.slamHit(this, R); }
          else if (this.t.ranged || (this.boss && this.key === 'dragon' && pd > 9)) this.MM.shoot(this, P);
          else if (pd < this.range * 1.35 + 0.4) G.hurtPlayer(this.atk * rnd(0.85, 1.15), this);
          this.state = 'chase'; this.atkCd = (this.boss ? 1.6 : 1.4) + rnd(0, 0.5);
        }
        break;
      }
      case 'return': { const d = goTo(this.hx, this.hz, 1.2); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * dt); this.updateBar(); if (d < 1.2) { this.state = 'idle'; this.timer = 2; } if (!safe && pd < this.aggro * 0.6 && !this.t.passive && this.hp > this.maxHp * 0.99) this.state = 'chase'; break; }
    }
    const slow = this.y < 0 ? 0.6 : 1;
    this.x += (mvx * slow + this.kx) * dt; this.z += (mvz * slow + this.kz) * dt; const kd = Math.exp(-dt * 7); this.kx *= kd; this.kz *= kd;
    this._p = this._p || { x: 0, z: 0 }; this._p.x = this.x; this._p.z = this.z; world.collide(this._p, this.rad); this.x = this._p.x; this.z = this._p.z;
    this.mv += ((sp > 0 ? 1 : 0) - this.mv) * Math.min(1, dt * 8); this.ph += dt * (3 + sp * 1.5);
    this.y = world.groundY(this.x, this.z);
  }
  animate(dt, cam, time) {
    if (!this.mesh) return; const m = this.mesh, mv = this.mv, ph = this.ph;
    m.position.set(this.x, this.y + (this.hover ? this.hover + Math.sin(time * 2 + this.ph) * 0.15 : 0) + (this.t.arch === 'toad' ? Math.abs(Math.sin(ph * 0.7)) * 0.5 * mv : 0), this.z); m.rotation.y = this.face;
    if (!this.alive) { return; }
    const amp = 0.7 * mv; this.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph * 1.6 + (i % 2 ? Math.PI : 0) + (i >> 1) * Math.PI * 0.5) * amp; });
    this.segs.forEach((s, i) => { s.position.x = Math.sin(ph * 1.5 - i * 0.8) * (0.12 + 0.1 * mv) * (i * 0.1 + 0.3); });
    this.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(time * 6 + this.ph) * 0.5; });
    const wd = this.state === 'windup' ? 1 - clamp(this.timer / 0.6, 0, 1) : 0, sq = 1 + this.squash * 0.2 + wd * 0.18 + Math.sin(time * 2 + this.ph) * 0.012;
    this.model.scale.set(this.size * (2 - sq), this.size * sq, this.size * (2 - sq)); if (this.headO && this.state === 'windup') this.headO.rotation.x = -0.4 * wd; else if (this.headO) this.headO.rotation.x = 0;
    if (this.state === 'windup') { this.model.position.z = -wd * 0.35; } else this.model.position.z = 0; this.model.position.y = 0;
    const showBar = this.boss ? this.state === 'chase' || this.state === 'windup' || this.engaged > 0 : (this.engaged > 0 || this.elite && this.state === 'chase');
    this.bar.visible = showBar && this.hp < this.maxHp + 1; if (this.bar.visible) this.bar.quaternion.copy(cam.quaternion);
    if (this.ring) this.ring.rotation.z = time * 0.5;
  }
}

class MonsterManager {
  constructor(G) {
    this.G = G; this.list = []; this.shots = []; this.activeR = 105; const world = G.world, rng = mulberry32(31337);
    let camps = 0; const target = 230, starters = 20;
    for (let tries = 0; tries < 9000 && camps < target; tries++) {
      const st = camps < starters, a = rng() * 6.283, d = st ? 27 + rng() * 38 : 32 + Math.sqrt(rng()) * (WORLD.R - 62), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!world.validSpot(x, z, 2) || world.nearCollider(x, z, 2.5)) continue;
      const Z = world.zoneAt(x, z); if (Z.id === 0) continue;
      let tooNear = false; for (const b of BOSSES) if (Math.hypot(x - b.x, z - b.z) < 14) { tooNear = true; break; } if (tooNear) continue;
      const types = Object.keys(MTYPES).filter(k => MTYPES[k].zones.includes(Z.id)); if (!types.length) continue; camps++;
      const n = rint(2, Z.id === 1 ? 5 : 4), tp = types[Math.floor(rng() * types.length)];
      for (let i = 0; i < n; i++) {
        const sp = world.findSpot(x + (rng() - 0.5) * 9, z + (rng() - 0.5) * 9, 12, 1.2), lvl = clamp(monsterLevelAt(Math.hypot(sp.x, sp.z)) + Math.floor(rng() * 5) - 2, 1, MAX_LV);
        const m = new Monster(this, rng() < 0.7 ? tp : types[Math.floor(rng() * types.length)], lvl, sp.x, sp.z, { elite: rng() < 0.06, camp: camps }); m.y = world.groundY(sp.x, sp.z); this.list.push(m);
      }
    }
    BOSSES.forEach(b => { const lvl = clamp(monsterLevelAt(Math.hypot(b.x, b.z)) + 3, 1, MAX_LV), m = new Monster(this, b.base, lvl, b.x, b.z, { boss: b, camp: 9000 + camps }); b.mon = m; m.y = world.groundY(b.x, b.z); this.list.push(m); });
    this.total = this.list.length;
    // đạn kẻ địch dùng chung
    this.shotMats = {};
  }
  alertCamp(m) { if (!m.camp) return; for (const o of this.list) if (o !== m && o.camp === m.camp && o.alive && o.active && (o.state === 'idle' || o.state === 'wander') && !o.t.passive && Math.hypot(o.x - m.x, o.z - m.z) < 14) o.state = 'chase'; }
  shoot(m, P) {
    const col = m.boss ? 0xff5020 : m.t.glow || m.t.c2, mt = this.shotMats[col] || (this.shotMats[col] = new T.MeshBasicMaterial({ color: col })), mesh = new T.Mesh(shotGeo, mt), gl = new T.Sprite(sprMat(glowMap('rgba(255,255,255,1)'))); gl.material.color.setHex(col); gl.scale.setScalar(1.8); mesh.add(gl);
    const sx = m.x, sy = m.y + m.baseH * 0.6 + (m.hover || 0), sz = m.z; mesh.position.set(sx, sy, sz); const dx = P.x - sx, dz = P.z - sz, dy = P.y + 1.0 - sy, d = Math.hypot(dx, dz, dy), v = 13 + (m.boss ? 3 : 0);
    this.G.scene.add(mesh); this.shots.push({ mesh, vx: dx / d * v, vy: dy / d * v, vz: dz / d * v, life: 2.6, dmg: m.atk * 0.9 * (m.boss ? 1.1 : 1), m }); m.model.rotation.x = 0;
  }
  update(dt, P, time, cam, rdt) {
    const G = this.G, world = G.world, ar = Math.min(this.activeR, world.drawDist * 0.7), ar2 = ar * ar;
    for (const m of this.list) {
      const dx = m.x - P.x, dz = m.z - P.z, d2 = dx * dx + dz * dz, near = d2 < ar2;
      if (!m.alive && m.respawn > 0) { m.respawn -= rdt; if (m.respawn <= 0) { if (d2 > 35 * 35 || !near) { m.reset(); } else m.respawn = 3; } }
      if (near && !m.active) { m.active = true; if (!m.mesh) m.build(); m.mesh.visible = !(!m.alive && m.deadT > 0.9); }
      else if (!near && m.active && d2 > (ar + 25) * (ar + 25)) { m.active = false; m.unbuild(); if (m.alive && m.state !== 'idle') { m.state = 'idle'; m.x = m.hx; m.z = m.hz; m.hp = m.maxHp; } }
      if (m.active) { m.update(dt, P, world); m.animate(dt, cam, time); }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.life -= dt; const p = s.mesh.position; p.x += s.vx * dt; p.y += s.vy * dt; p.z += s.vz * dt;
      let hit = false; if (!G.player.dead && Math.hypot(p.x - P.x, p.z - P.z) < 0.9 && Math.abs(p.y - (P.y + 1)) < 1.4) { G.hurtPlayer(s.dmg, s.m); hit = true; }
      if (hit || s.life <= 0 || p.y < world.heightAt(p.x, p.z)) { G.fx.sparks(p.x, p.y, p.z, 10, [1, 0.6, 0.3], 2.5); G.scene.remove(s.mesh); s.mesh.children.forEach(c => c.material && c.material.dispose && c.material.dispose()); this.shots.splice(i, 1); }
    }
  }
  near(x, z, r, fn) { const r2 = r * r; for (const m of this.list) { if (!m.alive || !m.active) continue; const dx = m.x - x, dz = m.z - z, rr = r + m.rad; if (dx * dx + dz * dz < rr * rr) fn(m); } }
  nearest(x, z, r, face, arc) {
    let best = null, bd = 1e9; for (const m of this.list) { if (!m.alive || !m.active) continue; const dx = m.x - x, dz = m.z - z, d = Math.hypot(dx, dz); if (d > r) continue; if (arc !== undefined) { let da = Math.atan2(dx, dz) - face; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > arc) continue; } if (d < bd) { bd = d; best = m; } } return best;
  }
}

/* ===================== Vật phẩm rơi dưới đất ===================== */
const _dm = {};
class Drops {
  constructor(G) { this.G = G; this.list = []; this.tex = {}; this.beamGeo = new T.CylinderGeometry(0.04, 0.04, 4, 6); this.coreGeo = new T.OctahedronGeometry(0.2); }
  colorOf(it) { return it.kind === 'gold' ? '#ffd24a' : it.kind === 'equip' ? RAR[it.rar].c : it.kind === 'pill' ? '#ff8aa0' : it.key === 'yd' ? '#c070ff' : it.key === 'herb' ? '#7dffb0' : '#cfe8ff'; }
  add(it, x, z, y0) {
    const G = this.G, hex = this.colorOf(it), g = new T.Group(), col = new T.Color(hex);
    const tex = this.tex[hex] || (this.tex[hex] = glowMap(hex)); const gl = new T.Sprite(sprMat(tex)); gl.scale.setScalar(it.kind === 'equip' ? 1.4 + it.rar * 0.2 : 1.0); g.add(gl);
    const core = new T.Mesh(this.coreGeo, _dm[hex] || (_dm[hex] = new T.MeshBasicMaterial({ color: col }))); if (it.kind === 'gold') core.scale.set(1, 0.4, 1); g.add(core);
    if (it.kind === 'equip' && it.rar >= 2) { const b = new T.Mesh(this.beamGeo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false })); b.position.y = 2; g.add(b); }
    const a = Math.random() * 6.283, r = rnd(0.4, 1.8), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, gy = G.world.groundY(px, pz) + 0.55; g.position.set(x, y0 + 1, z); G.scene.add(g);
    this.list.push({ it, g, core, tx: px, tz: pz, ty: gy, t: 0, life: 150, vx: (px - x) * 3, vz: (pz - z) * 3, vy: 5, ph: Math.random() * 6 });
    if (this.list.length > 160) this.remove(0);
  }
  remove(i) { const d = this.list[i]; this.G.scene.remove(d.g); d.g.traverse(o => { if (o.material && o.material.opacity !== undefined && o.geometry === this.beamGeo) o.material.dispose(); }); this.list.splice(i, 1); }
  update(dt, P, time) {
    const G = this.G; this.nearest = null; let nd = 4;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i], p = d.g.position; d.t += dt; d.life -= dt;
      if (d.t < 0.6) { p.x += d.vx * dt; p.z += d.vz * dt; d.vy -= 18 * dt; p.y += d.vy * dt; const gy = G.world.groundY(p.x, p.z) + 0.55; if (p.y < gy) { p.y = gy; d.vy = Math.abs(d.vy) * 0.3; } }
      else { const gy = G.world.groundY(p.x, p.z) + 0.55 + Math.sin(time * 2.5 + d.ph) * 0.1; p.y += (gy - p.y) * Math.min(1, dt * 8); }
      d.core.rotation.y = time * 2 + d.ph;
      const dx = P.x - p.x, dz = P.z - p.z, dist = Math.hypot(dx, dz);
      if (d.t > 0.5 && !G.player.dead) {
        if (dist < 5) { const k = Math.min(1, dt * (6 + (5 - dist) * 2.5)); p.x += dx * k; p.z += dz * k; }
        if (dist < 1.4 && Math.abs(p.y - (P.y + 0.8)) < 2.5) { if (G.pickup(d.it)) { this.remove(i); continue; } else d.t = 0.5; }
      }
      if (d.life <= 0) this.remove(i);
    }
  }
}
