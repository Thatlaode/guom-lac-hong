/* =====================================================================
   🤖 Người máy — luôn gắn nhãn, độ khó do Admin chọn (QĐ-0023)
   Gửi "ý định" qua đúng cổng như người thật (onMsg) → không gian lận.
   ===================================================================== */
const GLH = require('../shared/rules.js');
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function botInit(P, M) {
  P.brain = { think: rnd(0, 0.5), react: 0, goal: null, tgt: null, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, stuck: 0, flyT: 0, wander: null, lastDodge: 0 };
}

function nearestEnemy(P, M, maxD) {
  let best = null, bd = maxD; for (const q of M.players.values()) { if (q === P || !q.alive || !M.isEnemy(P, q)) continue; if (M.canSee && !M.canSee(P, q)) continue; const d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; best = q; } } return best ? { q: best, d: bd } : null;
}
function nearestMon(P, M, maxD) {
  let best = null, bd = maxD; for (const m of M.mons.values()) { if (!m.alive || m.lvl > P.lvl + 2 || (m.boss && P.lvl < 11)) continue; const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd) { bd = d; best = m; } } return best ? { m: best, d: bd } : null;
}
function aimAt(P, tx, tz, tvx, tvz, spd, bs) {
  let x = tx, z = tz; if (spd && bs.lead > 0) { const t = Math.hypot(tx - P.x, tz - P.z) / spd; x += tvx * t * bs.lead; z += tvz * t * bs.lead; }
  const d = Math.max(2, Math.hypot(x - P.x, z - P.z)), errM = bs.aimErr * 5; // sai số ngắm tính theo mét (giống người thật)
  return Math.atan2(x - P.x, z - P.z) + (Math.random() - 0.5) * 2 * errM / d;
}
/* di chuyển theo hướng a, tránh dốc; kẹt lâu thì cưỡi diều */
function walk(P, M, a, dt, k = 1) {
  if (P.cc.stun > 0 || P.cc.root > 0 || P.opening || P.respecing) return;
  const spd = (P.flying ? GLH.FLY.spd : GLH.BASE_SPD * P.st.spd * (1 - P.cc.slow)) * k, st = spd * dt, T = M.T;
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const b = a + off, nx = P.x + Math.sin(b) * st, nz = P.z + Math.cos(b) * st;
    if (!P.flying && M.blockMove) { const [bx, bz] = M.blockMove(P.x, P.z, nx, nz); if (Math.hypot(bx - nx, bz - nz) > 0.02) continue; }
    if (P.flying || (T.canStep(P.x, P.z, nx, nz) && !T.inWater(nx, nz)) || (T.canStep(P.x, P.z, nx, nz) && off === 0)) { P.x = nx; P.z = nz; if (Math.abs(off) < 0.7) P.face = b; P.brain.stuck = Math.max(0, P.brain.stuck - dt); P.lastIn = M.t; return; }
  }
  P.brain.stuck += dt;
  if (P.brain.stuck > 1.2 && !P.flying && P.mp > 40) { M.onMsg(P, { t: 'sk', i: 'fly' }); P.brain.flyT = rnd(2.5, 4); P.brain.stuck = 0; }
}

function botThink(P, M, dt) {
  const B = P.brain, bs = M.bs, Z = M.zone, cur = Z.cur, nxt = Z.next || cur;
  B.think -= dt; B.strafeT -= dt; if (B.strafeT <= 0) { B.strafeT = rnd(0.6, 1.6); B.strafe *= -1; }
  if (P.flying) { B.flyT -= dt; if (B.flyT <= 0 && M.T.okSpot(P.x, P.z)) M.onMsg(P, { t: 'sk', i: 'fly' }); }
  if (P.potFree > 0) M.autoPot(P);
  // dùng đồ
  if (P.hp < P.st.hp * 0.4 && P.items.bomau > 0) M.onMsg(P, { t: 'pot', k: 'bomau' });
  if (P.mp < P.st.mp * 0.25 && P.items.bohoi > 0) M.onMsg(P, { t: 'pot', k: 'bohoi' });
  if (P.items.ruou > 0 && B.tgt) M.onMsg(P, { t: 'pot', k: 'ruou' });
  // né đạn
  if (bs.dodgeP > 0 && P.cd.dodge <= 0 && M.t - B.lastDodge > 1.2) {
    for (const pr of M.projs) { if (pr.own === P.id || pr.mon) continue; const own = M.players.get(pr.own); if (own && !M.isEnemy(own, P)) continue; const dx = P.x - pr.x, dz = P.z - pr.z, d = Math.hypot(dx, dz); if (d > 7) continue; const along = dx * pr.dx + dz * pr.dz; if (along < 0) continue; const lat = Math.abs(dx * pr.dz - dz * pr.dx); if (lat < 1.2 && Math.random() < bs.dodgeP) { B.lastDodge = M.t; M.onMsg(P, { t: 'sk', i: 'dodge', dir: Math.atan2(pr.dz * B.strafe, -pr.dx * B.strafe) }); break; } }
  }
  // 1) chạy sương
  const dCur = Math.hypot(P.x - cur.x, P.z - cur.z), dNext = Math.hypot(P.x - nxt.x, P.z - nxt.z), zmsg = M.zoneMsg(), tLeft = zmsg[7];
  const needRun = dCur > cur.r - 3 || (Z.stage === 'shrink' && dNext > nxt.r * 0.85) || (Z.stage === 'wait' && tLeft < 25 && dNext > nxt.r * 0.9);
  const F = M.FA[P.fk], ranged = F.basic.t === 'proj', want = ranged ? Math.min(11, F.basic.range * 0.65) : Math.min(2.6, F.basic.r * 0.7);
  const en = nearestEnemy(P, M, 16), low = P.hp < P.st.hp * 0.3, hpr = P.hp / P.st.hp;
  if (hpr < 0.45) B.rest = true; else if (hpr > 0.8) B.rest = false;
  // chọn mục tiêu (có độ trễ phản xạ)
  if (B.think <= 0) {
    B.think = bs.react * rnd(0.7, 1.3);
    const hunted = P.lastAtk && P.lastAtk.alive && M.t - P.lastHitT < 3 ? P.lastAtk : null, early = M.t < 90 + 60 * (1 - bs.fight);
    if (hunted && hunted.id) { B.tgt = { kind: 'p', id: hunted.id }; }
    else if (en && (!early || (en.d < 6 && P.hp / P.st.hp > 0.6)) && (!low || en.q.hp < P.hp) && (P.hp / P.st.hp > bs.fight || en.q.hp / en.q.st.hp < P.hp / P.st.hp)) { B.tgt = { kind: 'p', id: en.q.id }; }
    else { const mo = B.rest ? null : nearestMon(P, M, Z.pi === 0 && Z.stage === 'wait' ? 40 : 28); B.tgt = mo && !needRun ? { kind: 'm', id: mo.m.id } : null; }
    // mở Hòm Diều gần
    if (!en) for (const c of M.chests.values()) { if (M.t >= c.landAt && Math.hypot(c.x - P.x, c.z - P.z) < 30) { B.chest = c.id; break; } }
  }
  if (needRun && !(B.tgt && B.tgt.kind === 'p' && en && en.d < 8)) { walk(P, M, Math.atan2(nxt.x - P.x, nxt.z - P.z), dt); if (dCur > cur.r + 6 && P.mp > 50 && !P.flying && M.t - B.lastDodge > 2) { M.onMsg(P, { t: 'sk', i: 'fly' }); B.flyT = 4; } return; }
  if (B.rest && !en && M.props && !needRun) { // nghỉ: tìm bụi cỏ / nhà tranh gần để núp hồi máu
    if (!B.hide || B.hide.dead) { let best = null, bd = 22; for (const o of M.props) { if (o.k !== 'bui' && o.k !== 'nha') continue; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < bd) { bd = d; best = o; } } B.hide = best; }
    if (B.hide) { const o = B.hide, tx = o.k === 'nha' ? o.x + Math.sin(o.rot) * (Math.hypot(P.x - o.x, P.z - o.z) > o.r ? o.r + 1 : 0) : o.x, tz = o.k === 'nha' ? o.z + Math.cos(o.rot) * (Math.hypot(P.x - o.x, P.z - o.z) > o.r ? o.r + 1 : 0) : o.z; if (Math.hypot(tx - P.x, tz - P.z) > 0.8) walk(P, M, Math.atan2(tx - P.x, tz - P.z), dt); return; }
  } else B.hide = null;
  if (B.rest && !(B.tgt && B.tgt.kind === 'p')) { let th = null, td = 14; for (const m of M.mons.values()) { if (!m.alive || m.tgt !== P.id) continue; const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < td) { td = d; th = m; } } if (th) { B.tgt = null; walk(P, M, Math.atan2(P.x - th.x, P.z - th.z), dt); return; } }
  if (low && !en && B.tgt && B.tgt.kind === 'm') { const m = M.mons.get(B.tgt.id); if (m) { B.tgt = null; walk(P, M, Math.atan2(P.x - m.x, P.z - m.z), dt); return; } }
  if (low && en && en.d < 14) { const away = Math.atan2(P.x - en.q.x, P.z - en.q.z); walk(P, M, away + B.strafe * 0.4, dt); if (P.cd.dodge <= 0 && Math.random() < 0.05) M.onMsg(P, { t: 'sk', i: 'dodge', dir: away }); return; }
  // Hòm Diều
  if (B.chest && !B.tgt) { const c = M.chests.get(B.chest); if (!c || c.opened) B.chest = null; else { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d > 2) walk(P, M, Math.atan2(c.x - P.x, c.z - P.z), dt); else if (!P.opening) M.onMsg(P, { t: 'open', id: c.id }); return; } }
  // 2) đánh mục tiêu
  let T = null, tx, tz, tvx = 0, tvz = 0;
  if (B.tgt) {
    if (B.tgt.kind === 'p') { const q = M.players.get(B.tgt.id); if (q && q.alive && Math.hypot(q.x - P.x, q.z - P.z) > 26) B.tgt = null; else if (q && q.alive) { T = q; tx = q.x; tz = q.z; tvx = q._vx || 0; tvz = q._vz || 0; } else B.tgt = null; }
    else { const m = M.mons.get(B.tgt.id); if (m && m.alive) { T = m; tx = m.x; tz = m.z; } else B.tgt = null; }
  }
  if (T) {
    const d = Math.hypot(tx - P.x, tz - P.z), a = Math.atan2(tx - P.x, tz - P.z);
    if (P.flying && d < 25) M.onMsg(P, { t: 'sk', i: 'fly' });
    if (d > want + 1) walk(P, M, a, dt); else if (ranged && d < want - 4) walk(P, M, a + Math.PI, dt, 0.8); else if (B.tgt.kind === 'p') walk(P, M, a + B.strafe * Math.PI / 2, dt, 0.7);
    const B0 = F.basic, rangeB = B0.t === 'melee' ? B0.r + 0.5 : B0.range * 0.9;
    const face = aimAt(P, tx, tz, tvx, tvz, B0.spd, bs);
    if (d < rangeB) M.onMsg(P, { t: 'atk', face });
    if (Math.random() < bs.skillP * dt * 2.5) {
      for (let i = 2; i >= 0; i--) { const sk = F.skills[i]; if (P.skl[i] <= 0 || P.cd['s' + i] > 0 || P.mp < sk.mp) continue;
        const r = sk.range || sk.dist || sk.r || 8, ok = sk.t === 'buff' ? (sk.heal ? P.hp < P.st.hp * 0.7 : d < 8) : sk.t === 'nova' ? d < sk.r : sk.t === 'blink' ? (P.hp < P.st.hp * 0.5 && d < 6) : d < r;
        if (!ok) continue; if (sk.ult && B.tgt.kind === 'm' && !T.boss && !T.elite) continue;
        M.onMsg(P, { t: 'sk', i, face: sk.t === 'blink' ? (sk.back ? a : a + Math.PI) : aimAt(P, tx, tz, tvx, tvz, sk.spd, bs), tx: tx + (Math.random() - 0.5) * bs.aimErr * 8, tz: tz + (Math.random() - 0.5) * bs.aimErr * 8 }); break; }
    }
  } else {
    // 3) đi về phía tâm sương, lang thang
    if (!B.home) B.home = { x: P.x, z: P.z };
    const farmPhase = Z.pi === 0 && Z.stage === 'wait';
    if (!B.wander || Math.hypot(B.wander.x - P.x, B.wander.z - P.z) < 4 || Math.random() < 0.003) {
      if (farmPhase) { const a = Math.random() * 6.283, r = Math.random() * 28; B.wander = { x: B.home.x + Math.cos(a) * r, z: B.home.z + Math.sin(a) * r }; }
      else { const a0 = Math.atan2(P.z - nxt.z, P.x - nxt.x), a = a0 + (Math.random() - 0.5) * 0.9, r = nxt.r * (0.5 + Math.random() * 0.35); B.wander = { x: nxt.x + Math.cos(a) * r, z: nxt.z + Math.sin(a) * r }; } }
    walk(P, M, Math.atan2(B.wander.x - P.x, B.wander.z - P.z), dt, 0.9);
  }
}
module.exports = { botThink, botInit };
