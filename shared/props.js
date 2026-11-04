/* =====================================================================
   VẬT THỂ CHIẾN THUẬT TRÊN BẢN ĐỒ (QĐ-0035) — dùng chung server + client
   bui  : bụi cỏ — đứng trong là ẨN với kẻ địch ở ngoài (trừ khi lại rất gần hoặc vừa ra đòn)
   nha  : nhà tranh — vách chặn đường & đạn, có CỬA để chui vào; ở trong cũng được che
   cay  : cây — chặn đạn & đường, có MÁU, đánh gãy được (đổ xuống, mở đường)
   da   : tảng đá — chặn đạn & đường, không phá được
   Server sinh vị trí theo hạt giống trận, gửi cho client trong gói 'start'.
   ===================================================================== */
(function (root) {
  const P = {};
  P.KIND = {
    bui: { n: 'Bụi cỏ', r: 2.0, hide: true },
    nha: { n: 'Nhà tranh', r: 3.2, wall: 0.28, door: 0.42, hide: true },  // door: nửa góc mở cửa (rad)
    cay: { n: 'Cây', r: 0.55, hp: 260, block: true },
    da: { n: 'Tảng đá', r: 1.1, block: true },
  };
  P.HIDE = { near: 4.2, revealT: 1.6 };   // lại gần hơn near mét thì thấy; ra đòn → lộ trong revealT giây
  P.COUNT = { bui: 150, nha: 14, cay: 110, da: 55 };
  P.GRID = 8;
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  /* sinh vật thể quanh tâm (cx, cz) bán kính R. ok(x,z) = chỗ đứng hợp lệ; avoid = các điểm cần chừa */
  P.generate = (seed, cx, cz, R, ok, avoid = []) => {
    const r = rng(seed), out = [], far = (x, z, d) => out.every(o => Math.hypot(o.x - x, o.z - z) > d + o.r) && avoid.every(([ax, az, ad]) => Math.hypot(ax - x, az - z) > ad);
    const place = (k, n, minGap, tries = 30) => { let made = 0; for (let i = 0; i < n * tries && made < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!ok(x, z) || !far(x, z, minGap)) continue; const K = P.KIND[k], o = { id: out.length + 1, k, x: +x.toFixed(2), z: +z.toFixed(2), r: K.r * (k === 'bui' ? 0.8 + r() * 0.5 : k === 'da' ? 0.8 + r() * 0.7 : 1), rot: +(r() * 6.283).toFixed(3), v: (r() * 1000) | 0 }; if (K.hp) o.hp = K.hp; out.push(o); made++; } };
    place('nha', P.COUNT.nha, 9); // xóm nhà tranh trước
    // bụi cỏ: một phần mọc quanh nhà và ven xóm, phần còn lại rải theo cụm
    for (const h of out.filter(o => o.k === 'nha')) for (let j = 0; j < 2; j++) { const a = r() * 6.283, d = 5 + r() * 3, x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d; if (ok(x, z) && far(x, z, 0.5)) out.push({ id: out.length + 1, k: 'bui', x: +x.toFixed(2), z: +z.toFixed(2), r: 1.8, rot: r() * 6.28, v: (r() * 1000) | 0 }); }
    place('bui', P.COUNT.bui, 1.2); place('cay', P.COUNT.cay, 1.5); place('da', P.COUNT.da, 1.5);
    return out;
  };
  /* chỉ mục lưới để tra nhanh */
  P.index = (list) => { const g = new Map(), G = P.GRID; for (const o of list) { const rr = o.r + 0.6, x0 = Math.floor((o.x - rr) / G), x1 = Math.floor((o.x + rr) / G), z0 = Math.floor((o.z - rr) / G), z1 = Math.floor((o.z + rr) / G); for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 4096 + j; let a = g.get(k); if (!a) g.set(k, a = []); a.push(o); } } return g; };
  P.near = (idx, x, z) => idx.get(Math.floor(x / P.GRID) * 4096 + Math.floor(z / P.GRID)) || [];
  const ang = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  P.inDoor = (o, x, z) => ang(Math.atan2(x - o.x, z - o.z), o.rot) < P.KIND.nha.door;
  /* chặn di chuyển: trả về [x, z] đã chỉnh. rad = bán kính thân */
  P.blockMove = (idx, x0, z0, x1, z1, rad = 0.45) => {
    let x = x1, z = z1;
    for (const o of P.near(idx, x1, z1)) {
      if (o.dead) continue; const K = P.KIND[o.k];
      if (K.block) { const d = Math.hypot(x - o.x, z - o.z), m = o.r + rad; if (d < m) { const k = d > 1e-4 ? m / d : 1; x = o.x + (x - o.x) * k; z = o.z + (z - o.z) * k; } }
      else if (o.k === 'nha') {
        const R = o.r, w = K.wall + rad, d0 = Math.hypot(x0 - o.x, z0 - o.z), d1 = Math.hypot(x - o.x, z - o.z);
        if (Math.abs(d1 - R) < w || (d0 - R) * (d1 - R) < 0) { if (P.inDoor(o, x, z) && P.inDoor(o, x0, z0)) continue; // đi qua cửa
          const inside = d0 < R, tgt = inside ? R - w : R + w, k = d1 > 1e-4 ? tgt / d1 : 1; x = o.x + (x - o.x) * k; z = o.z + (z - o.z) * k; }
      }
    }
    return [x, z];
  };
  /* đạn đi từ (x0,z0) tới (x1,z1) có bị chặn? trả về vật chặn (hoặc null) */
  P.blockShot = (idx, x0, z0, x1, z1, y) => {
    for (const o of P.near(idx, x1, z1)) {
      if (o.dead || o.k === 'bui') continue; const d1 = Math.hypot(x1 - o.x, z1 - o.z);
      if (o.k === 'nha') { const d0 = Math.hypot(x0 - o.x, z0 - o.z); if ((d0 - o.r) * (d1 - o.r) <= 0 && !P.inDoor(o, x1, z1)) return o; }
      else if (d1 < o.r + 0.1) return o;
    }
    return null;
  };
  /* đang núp trong vật nào (bụi hoặc nhà)? */
  P.cover = (idx, x, z) => { for (const o of P.near(idx, x, z)) { if (o.dead || !P.KIND[o.k].hide) continue; const d = Math.hypot(x - o.x, z - o.z); if (d < (o.k === 'nha' ? o.r - 0.2 : o.r)) return o; } return null; };
  root.GLH_PROPS = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
