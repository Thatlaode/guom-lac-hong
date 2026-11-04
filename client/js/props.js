/* =====================================================================
   VẼ VẬT THỂ CHIẾN THUẬT (QĐ-0035): bụi cỏ, nhà tranh, cây đánh gãy, tảng đá
   Mô hình cây/bụi/đá: Quaternius Ultimate Nature (CC0) — nhuộm lại theo bảng màu PAL.
   Nhà tranh: vẽ bằng code (vách đất, mái rạ, cửa trước) — mái mờ đi khi mình ở trong.
   Luật va chạm / ẩn nấp: shared/props.js (dùng chung với server).
   ===================================================================== */
const TN = 'assets/models/thien-nhien/';
const PROP_MODELS = {
  bui: ['bush-1', 'bush-2', 'bush-berries-1', 'bush-1'],
  cay: ['common-tree-1', 'common-tree-2', 'common-tree-3', 'willow-1', 'pine-tree-1', 'birch-tree-1'],
  da: ['rock-moss-1', 'rock-1', 'rock-3', 'rock-moss-3', 'rock-5'],
  trangTri: ['grass', 'flowers', 'plant-1'],
};
/* tên vật liệu trong model → màu bảng màu */
const PROP_RECOLOR = { Green: [PAL.laXanh, PAL.coTuNhien, PAL.laNon], DarkGreen: [PAL.laRung, PAL.coRung], Wood: [PAL.thanCay], LightWood: [PAL.goCo], Rock: [PAL.daNui, PAL.daCo], Berry: [PAL.hoaDao, PAL.hoaMai, PAL.hoaSen], White: [PAL.trangNga], Black: [PAL.voCayGia], Cyan: [PAL.hoaLam], Yellow: [PAL.hoaMai], Pink: [PAL.hoaSen], Hay: [PAL.hoaCuc], Mushroom_Top: [PAL.doSon], Mushroom_Bottom: [PAL.trangNga] };
class PropsView {
  constructor(scene, list, world) {
    this.scene = scene; this.W = world; this.g = new THREE.Group(); scene.add(this.g); this.items = new Map(); this.falling = [];
    this.list = list.map(([id, k, x, z, r, rot, v]) => ({ id, k, x, z, r, rot, v }));
    this.idx = GLH_PROPS.index(this.list); this.byId = new Map(this.list.map(o => [o.id, o]));
    this.mats = {}; this.build();
  }
  mat(name, v) { const cols = PROP_RECOLOR[name] || [0x888888], c = cols[v % cols.length], k = name + c; return this.mats[k] || (this.mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: /Rock/.test(name) ? 0.8 : /Wood/.test(name) ? 0.7 : 0.85, flatShading: true })); }
  async model(name) { const g = await CharLib.load(TN + name + '.glb'); return g.scene; }
  async build() {
    for (const o of this.list) {
      const y = this.W.groundY(o.x, o.z), grp = new THREE.Group(); grp.position.set(o.x, y, o.z); grp.rotation.y = o.rot; this.g.add(grp); o.g = grp; this.items.set(o.id, o);
      if (o.k === 'nha') { this.hut(o, grp); continue; }
      const names = PROP_MODELS[o.k], src = await this.model(names[o.v % names.length]).catch(() => null); if (!src) continue;
      const m = src.clone(true); m.traverse(n => { if (n.isMesh) { n.material = this.mat(n.material.name, o.v); n.castShadow = o.k !== 'bui'; n.receiveShadow = true; } });
      if (o.k === 'bui') { const s = o.r / 0.72; m.scale.set(s, 1.35 + (o.v % 5) * 0.06, s); } // bụi cao ~1.6 m, đủ che người cúi
      else if (o.k === 'cay') m.scale.setScalar(2.1 + (o.v % 7) * 0.08);
      else m.scale.setScalar(o.r / 0.42);
      grp.add(m); o.m = m;
      if (o.k === 'bui') for (let i = 0; i < 3; i++) { const t = await this.model(PROP_MODELS.trangTri[(o.v + i) % 3]).catch(() => null); if (!t) continue; const d = t.clone(true); d.traverse(n => { if (n.isMesh) n.material = this.mat(n.material.name, o.v + i); }); const a = i * 2.1 + o.v, rr = o.r * 0.9; d.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); d.scale.setScalar(1.1); grp.add(d); }
    }
  }
  /* nhà tranh vách đất mái rạ — 8 cạnh khớp vòng va chạm, khoảng trống ở hướng rot là cửa */
  hut(o, grp) {
    const R = o.r, H = 2.3, n = 8, wall = new THREE.MeshStandardMaterial({ color: PAL.datThuong, roughness: 0.95, flatShading: true }), post = new THREE.MeshStandardMaterial({ color: PAL.goCo, roughness: 0.8 }), thatch = new THREE.MeshStandardMaterial({ color: PAL.cat, roughness: 1, flatShading: true, transparent: true, opacity: 1 });
    const side = 2 * R * Math.sin(Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283; // giữa cạnh i ở góc a (đo như atan2(x,z)); cạnh 0 = cửa, đúng hướng rot
      const isDoor = i === 0, x = Math.sin(a) * R * Math.cos(Math.PI / n), z = Math.cos(a) * R * Math.cos(Math.PI / n);
      if (isDoor) { for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 0.16), post); p.position.set(x + Math.cos(a) * s * side * 0.42, H / 2, z - Math.sin(a) * s * side * 0.42); grp.add(p); } const lin = new THREE.Mesh(new THREE.BoxGeometry(side, 0.18, 0.18), post); lin.position.set(x, H - 0.1, z); lin.rotation.y = a; grp.add(lin); continue; }
      const w = new THREE.Mesh(new THREE.BoxGeometry(side + 0.05, H, 0.26), wall); w.position.set(x, H / 2, z); w.rotation.y = a; w.castShadow = true; w.receiveShadow = true; grp.add(w);
    }
    // mái rạ + nóc
    const roof = new THREE.Mesh(new THREE.ConeGeometry(R + 1.1, 2.4, n, 1, true), thatch); roof.position.y = H + 1.15; roof.rotation.y = Math.PI / n; roof.castShadow = true; grp.add(roof);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(R + 1.15, 0.35, n, 1, true), new THREE.MeshStandardMaterial({ color: PAL.coGia, roughness: 1, flatShading: true, transparent: true })); roof2.position.y = H + 0.08; roof2.rotation.y = Math.PI / n; grp.add(roof2);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.5, 6), post); top.position.y = H + 2.45; grp.add(top);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, n), new THREE.MeshStandardMaterial({ color: PAL.datAm, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; floor.receiveShadow = true; grp.add(floor);
    // đồ trong nhà: chõng tre, đống rơm
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.9), new THREE.MeshStandardMaterial({ color: PAL.treXanh, roughness: 0.8 })); bed.position.set(Math.sin(Math.PI) * 1.6, 0.23, Math.cos(Math.PI) * 1.6); grp.add(bed);
    o.roofs = [roof, roof2, top];
  }
  /* mình đứng trong nhà → mái mờ để nhìn thấy bên trong */
  update(dt, me, t) {
    const inHut = me ? GLH_PROPS.cover(this.idx, me.x, me.z) : null;
    for (const o of this.list) if (o.roofs) { const want = inHut === o ? 0.18 : 1; for (const r of o.roofs) { if (!r.material.transparent) continue; r.material.opacity += (want - r.material.opacity) * Math.min(1, dt * 6); r.material.depthWrite = r.material.opacity > 0.9; } }
    for (let i = this.falling.length - 1; i >= 0; i--) { const f = this.falling[i]; f.t += dt; const u = Math.min(1, f.t / 1.1); f.o.g.rotation.x = 0; f.pivot.rotation.x = (u * u) * Math.PI / 2 * 0.98; if (f.t > 7) { f.o.g.position.y -= dt * 0.6; if (f.t > 10) { this.g.remove(f.o.g); this.falling.splice(i, 1); } } }
    for (const o of this.list) if (o.shake > 0) { o.shake -= dt; if (o.m) o.m.rotation.z = Math.sin(t * 40) * 0.04 * o.shake; }
  }
  hit(id) { const o = this.byId.get(id); if (o) o.shake = 0.5; return o; }
  fall(id, a) {
    const o = this.byId.get(id); if (!o || o.dead) return o; o.dead = true; if (!o.m) return o;
    // cây đổ theo hướng bị đánh: xoay quanh gốc
    const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ'; pivot.rotation.y = a - o.rot; o.g.add(pivot); const inner = new THREE.Group(); inner.rotation.y = -(a - o.rot); pivot.add(inner); o.g.remove(o.m); inner.add(o.m);
    this.falling.push({ o, pivot, t: 0 }); return o;
  }
}
