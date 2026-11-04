/* =====================================================================
   Trận đấu — server quyết định mọi thứ (QĐ: server-authoritative)
   ===================================================================== */
const GLH = require('../shared/rules.js');
const { botThink, botInit } = require('./bot.js');
const PR = require('../shared/props.js');

const rnd = (a, b) => a + Math.random() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const r2 = v => Math.round(v * 100) / 100;

const ITEM_NAMES = {
  weapon: ['Gậy Tre', 'Dao Rựa', 'Gươm Sắt', 'Gươm Bạc', 'Gươm Vàng'],
  armor: ['Áo Nâu', 'Áo Vải Dày', 'Áo Giáp Da', 'Áo Giáp Đồng', 'Áo Giáp Vảy'],
  head: ['Khăn Rằn', 'Nón Lá', 'Mũ Da', 'Mũ Đồng', 'Mũ Lông Chim'],
  boots: ['Dép Cói', 'Giày Vải', 'Giày Da', 'Giày Đồng', 'Giày Mây'],
  ring: ['Nhẫn Đồng', 'Nhẫn Bạc', 'Nhẫn Ngọc', 'Nhẫn Vàng', 'Nhẫn Rồng'],
  amulet: ['Bùa Tre', 'Bùa Gỗ', 'Bùa Bạc', 'Bùa Ngọc', 'Bùa Trống Đồng'],
};
const BOT_NAMES = ['Gươm', 'Thuốc', 'Cọc', 'Lửa', 'Núi'];

let NEXT_ID = 1;
const nid = () => NEXT_ID++;

class Match {
  constructor(srv, opts) {
    this.srv = srv; this.T = srv.terrain; this.id = 'tran-' + nid(); this.mode = opts.mode || 'solo';
    this.cfg = Object.assign({}, srv.config()); this.FA = GLH.buildFactions(this.cfg.tune); this.tune = this.FA._tune; delete this.FA._tune; this.FON = Object.keys(this.FA).filter(k => this.FA[k].on); if (!this.FON.length) this.FON = ['kiem']; this.bs = GLH.BOT_SKILL[this.cfg.botSkill] || GLH.BOT_SKILL.thuong;
    this.players = new Map(); this.mons = new Map(); this.projs = []; this.zonesFx = []; this.pulses = []; this.drops = new Map(); this.chests = new Map(); this.slams = [];
    this.events = []; this.t = 0; this.over = false; this.ended = false; this.place = 0; this.bossDone = false; this.headless = !!opts.headless;
    this.size = this.mode === 'practice' ? 1 + (this.cfg.practiceBots | 0) : (this.cfg.matchSize | 0) || 18;
    for (const c of opts.humans || []) this.addPlayer({ conn: c, name: c.name, fk: c.fk, touch: c.touch });
    if (this.cfg.fillBots || this.mode === 'practice' || this.headless) { let i = 0; while (this.players.size < this.size) { const fk = this.FON[i % this.FON.length]; this.addPlayer({ bot: true, fk, name: '🤖 Người máy ' + this.FA[fk].short + ' ' + String(Math.floor(i / this.FON.length) + 1).padStart(2, '0') }); i++; } }
    this.humans = [...this.players.values()].filter(p => !p.bot).length;
    this.setupArena(); this.setupProps(); this.spawnMonsters(); this.placePlayers();
  }
  /* ---------------- Khởi tạo ---------------- */
  addPlayer(o) {
    const F = this.FA[o.fk] && this.FA[o.fk].on ? o.fk : this.FON[0], P = {
      id: nid(), name: String(o.name || 'Người chơi').slice(0, 24), bot: !!o.bot, conn: o.conn || null, fk: F, touch: !!o.touch,
      x: 0, z: 0, y: 0, face: 0, alive: true, lvl: 1, exp: 0, pot: Object.assign({}, this.FA[F].pot0), potFree: 0, skl: [1, 0, 0], sklFree: 0,
      eq: {}, bag: [], cd: { b: 0, s0: 0, s1: 0, s2: 0, dodge: 0, fly: 0, pot: 0 }, buffs: {}, shield: { v: 0, t: 0 }, cc: { stun: 0, root: 0, slow: 0, slowT: 0, burn: 0, burnT: 0, burnSrc: null },
      inv: 2, flying: false, items: { bomau: 2, bohoi: 1, chen: 0, ruou: 0 }, respecFree: GLH.RESPEC.freePerMatch, kills: 0, dmg: 0, place: 0,
      lastHitT: -99, lastFightT: -99, lastIn: 0, moveBonus: 0, opening: null, respecing: null, vay: false, lastAtk: null,
    };
    P.st = GLH.calcStats(this.FA[F], 1, P.pot, {}, {}); P.hits = 0; P.dodgeT = -99; P.hp = P.st.hp; P.mp = P.st.mp;
    if (P.bot) botInit(P, this);
    this.players.set(P.id, P); return P;
  }
  setupArena() {
    let cx = 0, cz = 0;
    for (let k = 0; k < 40; k++) { const a = Math.random() * 6.283, d = Math.random() * GLH.MATCH.arenaMaxD; cx = Math.cos(a) * d; cz = Math.sin(a) * d; if (this.T.okSpot(cx, cz)) break; }
    this.zone = { pi: 0, stage: 'wait', t0: 0, cur: { x: cx, z: cz, r: GLH.ZONE_R0 }, from: null, next: null };
    this.zone.next = this.nextCircle(this.zone.cur, GLH.ZONE_PHASES[0].r);
  }
  /* vật thể chiến thuật: bụi cỏ, nhà tranh, cây đánh gãy, đá (QĐ-0035) */
  setupProps() {
    const Z = this.zone.cur; this.propSeed = (Math.random() * 1e9) | 0;
    this.props = this.cfg.props === false ? [] : PR.generate(this.propSeed, Z.x, Z.z, Z.r * 0.95, (x, z) => this.T.okSpot(x, z) && !this.T.inWater(x, z), [[0, 0, 26]]);
    this.propById = new Map(this.props.map(o => [o.id, o])); this.pidx = PR.index(this.props);
  }
  blockMove(x0, z0, x1, z1) { return PR.blockMove(this.pidx, x0, z0, x1, z1); }
  /* người q có bị người xem P nhìn thấy không (núp bụi/nhà) */
  canSee(P, q) {
    if (P === q || !q.cov || !P.alive) return true; if (!this.isEnemy(P, q)) return true;
    if (this.t - q.lastFightT < PR.HIDE.revealT) return true; if (P.cov && P.cov === q.cov) return true;
    return Math.hypot(P.x - q.x, P.z - q.z) < PR.HIDE.near;
  }
  hitProp(o, src, mult) {
    if (!o || o.dead || o.k !== 'cay' || !src || !src.st) return; o.hp -= src.st.atk * mult * 0.9; src.lastFightT = this.t;
    if (o.hp > 0) { this.emit('prop', o.id, r2(o.hp / PR.KIND.cay.hp)); return; }
    o.dead = true; const a = Math.atan2(o.x - src.x, o.z - src.z); this.emit('propx', o.id, r2(a)); this.emit('sfxAt', 'SFX-TREE-FALL', r2(o.x), r2(o.z));
    if (Math.random() < 0.15) { const d = { id: nid(), kind: 'it', key: 'bomau', n: 1, x: o.x + Math.sin(a) * 2, z: o.z + Math.cos(a) * 2, t: this.t }; this.drops.set(d.id, d); this.emit('drop', d.id, r2(d.x), r2(d.z), 'it', 0, GLH.ITEMS.bomau.n); }
  }
  propsInArc(P, face, r, arc, cb) { for (const o of this.props) { if (o.dead || o.k !== 'cay') continue; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d > r + o.r) continue; if (arc < 3.1 && Math.abs(angDiff(Math.atan2(o.x - P.x, o.z - P.z), face)) > arc + Math.atan2(o.r, Math.max(d, 0.3))) continue; cb(o); } }
  nextCircle(c, r) {
    const maxOff = Math.max(0, c.r - r) * 0.9;
    for (let k = 0; k < 30; k++) { const a = Math.random() * 6.283, d = Math.random() * maxOff, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (r < 5 || this.T.okSpot(x, z)) return { x, z, r }; }
    return { x: c.x, z: c.z, r };
  }
  randSpot(cx, cz, rMin, rMax) {
    for (let k = 0; k < 60; k++) { const a = Math.random() * 6.283, d = rnd(rMin, rMax), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (this.T.okSpot(x, z)) return { x, z }; }
    return { x: cx, z: cz };
  }
  spawnMonsters() {
    if (!this.cfg.monsters) return; const Z = this.zone.cur, R0 = Z.r;
    for (let c = 0; c < GLH.MON.camps; c++) {
      const s = this.randSpot(Z.x, Z.z, 12, R0 * 0.95), d = Math.hypot(s.x - Z.x, s.z - Z.z), ring = clamp(Math.floor((1 - d / R0) * 5), 0, 4), types = GLH.TYPES_BY_RING[ring];
      const key = types[rint(0, types.length - 1)], L = GLH.MON.lvlAt(d, R0), n = rint(GLH.MON.perCamp[0], GLH.MON.perCamp[1]);
      for (let i = 0; i < n; i++) { const p = this.randSpot(s.x, s.z, 0, 4); this.addMon(key, clamp(L + rint(-1, 1), 1, 12), p.x, p.z, { elite: Math.random() < GLH.MON.eliteP }); }
    }
  }
  addMon(key, L, x, z, o = {}) {
    const t = this.T.MTYPES[key], E = o.elite ? 1 : 0, B = o.boss ? 1 : 0, cfg = this.cfg;
    const m = {
      id: nid(), key, lvl: L, elite: !!E, boss: !!B, x, z, hx: x, hz: z, face: Math.random() * 6.28, state: 'idle', timer: rnd(1, 4), alive: true, tgt: null, atkCd: rnd(0.5, 1.5), respawnT: 0,
      maxHp: Math.round(GLH.MON.hp(L) * t.hp * (E ? 3 : 1) * (B ? 28 : 1) * cfg.monHpMul), atk: GLH.MON.atk(L) * t.atk * (E ? 1.3 : 1) * (B ? 2.2 : 1) * cfg.monAtkMul,
      def: GLH.MON.def(L) * (B ? 1.5 : 1), spd: t.spd * (B ? 0.85 : 1), aggro: B ? 24 : (t.aggro || 0) * (E ? 1.2 : 1), passive: !!t.passive, ranged: B ? 18 : t.ranged || 0,
      exp: GLH.MON.exp(L) * (t.exp || 1) * (E ? 3 : 1) * (B ? 25 : 1), size: (B ? 1 : t.sc) * (E ? 1.25 : 1), name: (E ? 'Đầu Đàn ' : '') + (GLH.MON_NAME[key] || t.name), slamCd: 6,
    };
    m.hp = m.maxHp; m.range = (B ? 4 : 1.7) * Math.max(1, m.size * 0.9); m.rad = 0.45 * Math.max(0.8, m.size) * (B ? 2.5 : 1);
    this.mons.set(m.id, m); return m;
  }
  placePlayers() {
    const Z = this.zone.cur, list = [...this.players.values()], n = list.length, a0 = Math.random() * 6.283;
    const spawns = [];
    list.forEach((P, i) => { const a = a0 + i / n * 6.283; let x = Z.x + Math.cos(a) * Z.r * 0.72, z = Z.z + Math.sin(a) * Z.r * 0.72; if (!this.T.okSpot(x, z)) { const s = this.randSpot(x, z, 0, 18); x = s.x; z = s.z; } P.x = x; P.z = z; P.face = Math.atan2(Z.x - x, Z.z - z); P.lastIn = 0; spawns.push([x, z]); });
    for (const m of [...this.mons.values()]) if (spawns.some(([x, z]) => Math.hypot(m.x - x, m.z - z) < 16)) this.mons.delete(m.id); // điểm thả an toàn
  }
  startInfo(P) {
    return {
      t: 'start', id: this.id, you: P.id, mode: this.mode, cfg: { preset: this.cfg.preset, botSkill: this.cfg.botSkill, aimAssist: P.touch ? this.cfg.aimAssistTouch : this.cfg.aimAssistPc }, tune: this.tune,
      players: [...this.players.values()].map(q => [q.id, q.name, q.fk, q.bot ? 1 : 0, r2(q.x), r2(q.z), r2(q.face)]),
      mons: [...this.mons.values()].map(m => [m.id, m.key, m.lvl, m.elite ? 1 : 0, m.boss ? 1 : 0, r2(m.x), r2(m.z), m.maxHp, m.name]),
      zone: this.zoneMsg(), size: this.players.size, props: this.props.map(o => [o.id, o.k, o.x, o.z, r2(o.r), o.rot, o.v]),
    };
  }
  /* ---------------- Vòng lặp ---------------- */
  tick(dt) {
    if (this.ended) return; this.t += dt;
    this.updateZone(dt); this.updateBoss(dt); this.updateChests(dt);
    for (const P of this.players.values()) { if (P._px !== undefined) { P._vx = (P.x - P._px) / dt; P._vz = (P.z - P._pz) / dt; } P._px = P.x; P._pz = P.z; this.updatePlayer(P, dt); }
    for (const P of this.players.values()) P.cov = P.alive && !P.flying ? PR.cover(this.pidx, P.x, P.z) : null;
    for (const P of this.players.values()) if (P.bot && P.alive) botThink(P, this, dt);
    this.updateMons(dt); this.updateProjs(dt); this.updateZonesFx(dt); this.updatePulses(dt); this.updateSlams(dt);
    this.checkEnd();
  }
  emit(...e) { if (e[0] === 'heal') { const P = this.players.get(e[1]); if (P) P.healed = (P.healed || 0) + (e[2] || 0); } this.events.push(e); }
  zoneMsg() { const Z = this.zone, ph = GLH.ZONE_PHASES[Math.min(Z.pi, GLH.ZONE_PHASES.length - 1)]; const dur = (Z.stage === 'wait' ? ph.wait : ph.shrink) / this.cfg.zoneSpeedMul; return [r2(Z.cur.x), r2(Z.cur.z), r2(Z.cur.r), Z.next ? r2(Z.next.x) : 0, Z.next ? r2(Z.next.z) : 0, Z.next ? r2(Z.next.r) : 0, Z.stage === 'wait' ? 0 : Z.stage === 'shrink' ? 1 : 2, Z.stage === 'done' ? 0 : r2(Math.max(0, dur - (this.t - Z.t0))), Z.pi]; }
  updateZone(dt) {
    const Z = this.zone; if (Z.stage === 'done') { this.zoneDamage(dt, GLH.ZONE_PHASES[GLH.ZONE_PHASES.length - 1].dps); return; }
    const ph = GLH.ZONE_PHASES[Z.pi], sm = this.cfg.zoneSpeedMul, el = this.t - Z.t0;
    if (Z.stage === 'wait') {
      if (el >= ph.wait / sm) { Z.stage = 'shrink'; Z.t0 = this.t; Z.from = Object.assign({}, Z.cur); this.emit('zonephase', Z.pi, 1); this.emit('msg', 'Vòng Sương đang thu hẹp!', '#ff9a6a'); }
      else if (ph.wait / sm - el < 10 && !Z.warned) { Z.warned = true; this.emit('msg', 'Vòng Sương thu sau 10 giây!', '#ffd24a'); this.emit('sfx', 'SFX-ZONE-WARN'); }
    } else {
      const u = clamp(el / (ph.shrink / sm), 0, 1), F = Z.from, N = Z.next; Z.cur = { x: F.x + (N.x - F.x) * u, z: F.z + (N.z - F.z) * u, r: F.r + (N.r - F.r) * u };
      if (u >= 1) {
        Z.pi++; Z.warned = false;
        if (Z.pi >= GLH.ZONE_PHASES.length) { Z.stage = 'done'; Z.next = null; this.emit('zonephase', Z.pi, 2); }
        else { Z.stage = 'wait'; Z.t0 = this.t; Z.next = this.nextCircle(Z.cur, GLH.ZONE_PHASES[Z.pi].r); this.emit('zonephase', Z.pi, 0); const nc = GLH.ZONE_PHASES[Z.pi].chests; if (nc && this.cfg.chests) this.dropChests(nc); }
      }
    }
    this.zoneDamage(dt, ph.dps);
  }
  zoneDamage(dt, dps) {
    const Z = this.zone.cur;
    for (const P of this.players.values()) { if (!P.alive) continue; if (Math.hypot(P.x - Z.x, P.z - Z.z) > Z.r) { P.hp -= P.st.hp * dps * this.cfg.zoneDpsMul * dt; P.inSuong = true; if (P.hp <= 0) this.killPlayer(P, null, 'suong'); } else P.inSuong = false; }
  }
  /* ---------------- Hòm Diều ---------------- */
  dropChests(n) {
    const N = this.zone.next;
    for (let i = 0; i < n; i++) { const s = this.randSpot(N.x, N.z, 0, Math.max(4, N.r * 0.8)), c = { id: nid(), x: s.x, z: s.z, landAt: this.t + GLH.CHEST.warn, opened: false }; this.chests.set(c.id, c); this.emit('chest', c.id, r2(c.x), r2(c.z), GLH.CHEST.warn); }
    this.emit('msg', 'Hòm Diều sắp rơi!', '#ffd24a'); this.emit('sfx', 'SFX-SUPPLY-DROP');
  }
  updateChests(dt) {
    for (const P of this.players.values()) {
      const o = P.opening; if (!o) continue; const c = this.chests.get(o.id);
      if (!P.alive || !c || c.opened || Math.hypot(P.x - c.x, P.z - c.z) > 3 || this.t < c.landAt) { P.opening = null; continue; }
      if (this.t - o.t0 >= GLH.CHEST.openT) { P.opening = null; c.opened = true; this.chests.delete(c.id); this.emit('chestOpen', c.id, P.id); this.giveChest(P); }
    }
  }
  giveChest(P) {
    const L = Math.max(P.lvl, 6), n = rint(1, 2); for (let i = 0; i < n; i++) this.offerEquip(P, this.makeEquip(L + 2, Math.random() < 0.35 ? 4 : 3));
    this.addItem(P, 'bomau', 2); if (Math.random() < GLH.CHEST.pChen) this.addItem(P, 'chen', 1); this.addItem(P, 'ruou', 1);
    this.toast(P, 'Mở Hòm Diều: đồ quý + đồ dùng!', '#ffd24a');
  }
  /* ---------------- Trùm ---------------- */
  updateBoss(dt) {
    if (this.bossDone || !this.cfg.boss || this.t < GLH.MON.bossAt) return; this.bossDone = true;
    const c = this.zone.next || this.zone.cur, s = this.randSpot(c.x, c.z, 0, Math.max(3, c.r * 0.3)), m = this.addMon('dragon', GLH.MON.bossLvl, s.x, s.z, { boss: true });
    m.name = 'Chúa Thuồng Luồng'; this.emit('madd', m.id, m.key, m.lvl, 0, 1, r2(m.x), r2(m.z), m.maxHp, m.name);
    this.emit('msg', 'Chúa Thuồng Luồng đã trồi lên!', '#ff7a5a'); this.emit('sfx', 'SFX-BOSS-SPAWN');
  }
  /* ---------------- Người chơi ---------------- */
  recalc(P) {
    const g = {}; for (const k of GLH.SLOT_KEYS) { const it = P.eq[k]; if (!it) continue; for (const a in it.stats) g[a] = (g[a] || 0) + it.stats[a]; }
    const b = { atk: (P.buffs.atk && P.buffs.atk.t > 0 ? P.buffs.atk.v : 0) + (P.buffs.ruou && P.buffs.ruou.t > 0 ? P.buffs.ruou.v : 0) + (P.vay ? 0.2 : 0), def: P.vay ? 0.2 : 0, spd: P.buffs.spd && P.buffs.spd.t > 0 ? P.buffs.spd.v : 0, dr: P.buffs.dr && P.buffs.dr.t > 0 ? P.buffs.dr.v : 0 };
    const k = P.st ? P.hp / P.st.hp : 1; P.st = GLH.calcStats(this.FA[P.fk], P.lvl, P.pot, g, b); P.hp = Math.min(P.st.hp, P.hp); if (P._scale) { P.hp = k * P.st.hp; P._scale = false; } P.mp = Math.min(P.st.mp, P.mp);
  }
  updatePlayer(P, dt) {
    if (!P.alive) return; const c = P.cd; for (const k in c) if (c[k] > 0) c[k] = Math.max(0, c[k] - dt);
    P.inv = Math.max(0, P.inv - dt); P.moveBonus = Math.max(0, P.moveBonus - dt * 6);
    const cc = P.cc; cc.stun = Math.max(0, cc.stun - dt); cc.root = Math.max(0, cc.root - dt); cc.slowT = Math.max(0, cc.slowT - dt); if (cc.slowT <= 0) cc.slow = 0;
    if (cc.burnT > 0) { cc.burnT -= dt; this.rawDamage(P, cc.burn * dt, cc.burnSrc); if (!P.alive) return; }
    let re = false; for (const k in P.buffs) { const b = P.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) re = true; } } if (re) this.recalc(P);
    if (P.shield.t > 0) { P.shield.t -= dt; if (P.shield.t <= 0) P.shield.v = 0; }
    const calm = this.t - P.lastFightT > 4;
    P.mp = Math.min(P.st.mp, P.mp + P.st.mp * (calm ? 0.03 : 0.012) * dt);
    if (this.t - P.lastFightT > 5 && !P.inSuong) P.hp = Math.min(P.st.hp, P.hp + P.st.hp * 0.025 * dt);
    if (P.flying) { P.mp -= GLH.FLY.drain * dt; if (P.mp <= 0) { P.mp = 0; P.flying = false; this.emit('fly', P.id, 0); } }
    if (P.respecing && (this.t - P.respecing.t0 >= GLH.RESPEC.castT)) { P.respecing = null; this.doRespec(P); }
    // nhặt đồ rơi
    for (const d of this.drops.values()) { if (Math.abs(d.x - P.x) > 2.2 || Math.abs(d.z - P.z) > 2.2) continue; if (Math.hypot(d.x - P.x, d.z - P.z) > 2.0) continue; this.tryPick(P, d); }
  }
  addItem(P, k, n) { const max = GLH.ITEMS[k].max, had = P.items[k] || 0; P.items[k] = Math.min(max, had + n); return P.items[k] > had; }
  tryPick(P, d) {
    if (d.by === P.id && this.t - d.t < 4) return;                         // vừa tự vứt → không nhặt lại ngay
    if (d.kind === 'it') { if (this.addItem(P, d.key, d.n)) { this.drops.delete(d.id); this.emit('undrop', d.id, P.id); this.emit('sfxAt', 'SFX-PICK', r2(d.x), r2(d.z)); } }
    else if (d.kind === 'eq') {
      if (this.offerEquip(P, d.item, true)) { this.drops.delete(d.id); this.emit('undrop', d.id, P.id); return; }
      if (P.bag.length < GLH.BAG_MAX && !P.bot) { P.bag.push(d.item); this.drops.delete(d.id); this.emit('undrop', d.id, P.id); this.emit('sfxAt', 'SFX-PICK', r2(d.x), r2(d.z)); this.toast(P, 'Cất vào túi: ' + d.item.name, GLH.RAR[d.item.rar].c); }
    }
  }
  /* ---- VOICE & CHAT (QĐ-0048): máy chủ chỉ CHUYỂN TIN báo hiệu WebRTC giữa 2 người cùng trận; tiếng nói đi thẳng giữa 2 máy ---- */
  rtc(P, m) {
    const Q = this.players.get(m.to); if (!Q || Q === P || !Q.conn || Q.bot) return;
    const near = Math.hypot(Q.x - P.x, Q.z - P.z) < GLH.VOICE.range + 15, mate = P.team && P.team === Q.team; if (!near && !mate && m.k !== 'bye') return;
    const sig = m.sig; if (!sig || JSON.stringify(sig).length > 12000) return; this.srv.send(Q.conn, { t: 'rtc', from: P.id, k: m.k, sig });
  }
  chat(P, m) {
    const text = String(m.text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!text) return;
    if (this.t - (P.chatT || -9) < 0.8) return; P.chatT = this.t; const ch = m.ch === 'team' ? 'team' : 'all';
    if (ch === 'team' && !P.team) return this.toast(P, 'Đánh Lẻ không có đồng đội — kênh Đội dùng ở chế độ Đánh Đội', '#ff9a6a');
    for (const Q of this.players.values()) if (Q.conn && (ch === 'all' || Q.team === P.team)) this.srv.send(Q.conn, { t: 'chat', ch, from: P.id, name: P.name, fk: P.fk, text });
  }
  /* ---- TÚI ĐỒ (QĐ-0046): nhặt · vứt · mặc · tháo ---- */
  dropAt(P, kind, o) { const a = Math.random() * 6.283, d = Object.assign({ id: nid(), kind, x: P.x + Math.cos(a) * 2.3, z: P.z + Math.sin(a) * 2.3, t: this.t, by: P.id }, o); this.drops.set(d.id, d); this.emit('drop', d.id, r2(d.x), r2(d.z), kind, kind === 'eq' ? d.item.rar : 0, kind === 'eq' ? d.item.name : GLH.ITEMS[d.key].n); return d; }
  inv(P, m) {
    if (!P.alive) return; const i = m.i | 0, sl = GLH.SLOT_KEYS.includes(m.slot) ? m.slot : null;
    switch (m.a) {
      case 'eq': { const it = P.bag[i]; if (!it) return; const old = P.eq[it.slot]; P.eq[it.slot] = it; P.bag.splice(i, 1); if (old) P.bag.push(old); this.recalc(P); this.emit('sfxAt', 'SFX-EQUIP', r2(P.x), r2(P.z)); return; }
      case 'un': { if (!sl || !P.eq[sl]) return; if (P.bag.length >= GLH.BAG_MAX) return this.toast(P, 'Túi đầy — vứt bớt đồ trước', '#ff9a6a'); P.bag.push(P.eq[sl]); delete P.eq[sl]; this.recalc(P); return; }
      case 'drop': { const it = P.bag[i]; if (!it) return; P.bag.splice(i, 1); this.dropAt(P, 'eq', { item: it }); return; }
      case 'dropEq': { if (!sl || !P.eq[sl]) return; const it = P.eq[sl]; delete P.eq[sl]; this.recalc(P); this.dropAt(P, 'eq', { item: it }); return; }
      case 'dropIt': { const k = m.k; if (!GLH.ITEMS[k] || !(P.items[k] > 0)) return; const n = Math.min(P.items[k], Math.max(1, m.n | 0)); P.items[k] -= n; this.dropAt(P, 'it', { key: k, n }); return; }
    }
  }
  score(it) { const s = it.stats; return (s.atk || 0) * 3 + (s.def || 0) * 2 + (s.hp || 0) * 0.25 + (s.mp || 0) * 0.2 + (s.crit || 0) * 6 + (s.atkp || 0) * 4 + (s.defp || 0) * 3 + (s.hpp || 0) * 3 + (s.spd || 0) * 3 + (s.ls || 0) * 5 + (s.exp || 0) + (s.luck || 0); }
  offerEquip(P, it, fromGround) { const cur = P.eq[it.slot]; if (cur && this.score(cur) >= this.score(it)) return false; P.eq[it.slot] = it; if (cur && !P.bot) { if (P.bag.length < GLH.BAG_MAX) P.bag.push(cur); else this.dropAt(P, 'eq', { item: cur }); } this.recalc(P); if (P.conn) this.srv.send(P.conn, { t: 'eqd', slot: it.slot, name: it.name, rar: it.rar }); this.emit('sfxAt', it.rar >= 3 ? 'SFX-PICK-RARE' : 'SFX-EQUIP', r2(P.x), r2(P.z)); return true; }
  makeEquip(L, rar, slot) { const it = this.T.makeEquip(clamp(L, 1, 20), rar, slot); it.name = ITEM_NAMES[it.slot][clamp(it.rar, 0, 4)] + (it.rar >= 1 ? ' ' + GLH.RAR[it.rar].n : ''); it.stats = this.T.equipStats(it); return it; }
  giveExp(P, n) {
    if (P.lvl >= GLH.MATCH.maxLvl) return; P.exp += n * this.cfg.expMul;
    while (P.lvl < GLH.MATCH.maxLvl && P.exp >= GLH.expNeed(P.lvl)) { P.exp -= GLH.expNeed(P.lvl); P.lvl++; P.potFree += GLH.POT_PER_LVL; P.sklFree++; P._scale = true; this.recalc(P); P.mp = P.st.mp; this.emit('lvl', P.id, P.lvl); if (P.bot) this.botAutoSpend(P); }
    if (P.lvl >= GLH.MATCH.maxLvl) P.exp = 0;
  }
  botAutoSpend(P) { this.autoPot(P); for (const i of [2, 0, 1, 0, 1]) this.upgrade(P, i); for (let k = 0; k < 3; k++) for (const i of [2, 0, 1]) this.upgrade(P, i); }
  autoPot(P) { const a = this.FA[P.fk].auto, tot = a.str + a.agi + a.vit + a.ene; let i = 0; const seq = []; for (const k of GLH.POT_KEYS) for (let j = 0; j < a[k]; j++) seq.push(k); while (P.potFree > 0 && tot > 0) { P.pot[seq[i % seq.length]]++; P.potFree--; i++; } this.recalc(P); }
  upgrade(P, i) { const sk = this.FA[P.fk].skills[i]; if (!sk || P.sklFree <= 0) return false; const cur = P.skl[i]; if (cur >= sk.max || P.lvl < sk.lv[cur]) return false; P.skl[i]++; P.sklFree--; return true; }
  doRespec(P) { const p0 = this.FA[P.fk].pot0; let back = 0; for (const k of GLH.POT_KEYS) { back += P.pot[k] - p0[k]; P.pot[k] = p0[k]; } P.potFree += back; let sb = 0; P.skl = P.skl.map((v, i) => { const keep = i === 0 ? 1 : 0; sb += v - keep; return keep; }); P.sklFree += sb; this.recalc(P); this.emit('sfxAt', 'SFX-RESPEC', r2(P.x), r2(P.z)); this.toast(P, 'Đã gột điểm! Cộng lại điểm sức và điểm chiêu.', '#7dffb0'); }
  toast(P, text, col) { if (P.conn) this.srv.send(P.conn, { t: 'toast', text, col }); }
  /* ---------------- Ý định từ client ---------------- */
  onMsg(P, m) {
    if (this.ended) return;
    switch (m.t) {
      case 'in': return this.onMove(P, m);
      case 'atk': return this.basic(P, m);
      case 'sk': return this.cast(P, m);
      case 'pot': return this.potion(P, m.k);
      case 'inv': return this.inv(P, m);
      case 'rtc': return this.rtc(P, m);
      case 'chat': return this.chat(P, m);
      case 'pt': if (m.auto) { if (P.potFree > 0) this.autoPot(P); } else if (GLH.POT_KEYS.includes(m.k) && P.potFree > 0) { const n = clamp(m.n | 0 || 1, 1, P.potFree); P.pot[m.k] += n; P.potFree -= n; this.recalc(P); } return;
      case 'up': this.upgrade(P, m.i | 0); return;
      case 'respec': return this.startRespec(P);
      case 'open': { const c = this.chests.get(m.id); if (P.alive && c && !c.opened && this.t >= c.landAt && Math.hypot(P.x - c.x, P.z - c.z) < 3) { P.opening = { id: c.id, t0: this.t }; this.emit('opening', P.id, c.id); } return; }
      case 'cancel': P.opening = null; P.respecing = null; return;
    }
  }
  startRespec(P) {
    if (!P.alive) return; if (this.t - P.lastFightT < GLH.RESPEC.calm) return this.toast(P, 'Phải ngừng đánh nhau 5 giây mới gột điểm được', '#ff9a6a');
    if (P.respecFree > 0) P.respecFree--; else if (P.items.chen > 0) P.items.chen--; else return this.toast(P, 'Hết lượt gột điểm. Cần Chén Nước Gột (có trong Hòm Diều).', '#ff9a6a');
    P.respecing = { t0: this.t }; this.emit('cast', P.id, 'respec', r2(P.face), r2(P.x), r2(P.z), 0, 0);
  }
  canAct(P) { return P.alive && P.cc.stun <= 0 && !P.flying; }
  onMove(P, m) {
    if (!P.alive) return; const x = +m.x, z = +m.z; if (!isFinite(x) || !isFinite(z)) return;
    if (typeof m.face === 'number' && isFinite(m.face)) P.face = m.face; P.y = clamp(+m.y || 0, -2, 80); P.touch = !!m.touch;
    const now = this.t, dt = clamp(now - P.lastIn, 0.02, 0.5); P.lastIn = now;
    let spd = P.flying ? GLH.FLY.spd : GLH.BASE_SPD * P.st.spd * (1 - P.cc.slow);
    if (P.cc.stun > 0 || P.cc.root > 0) spd = 0; if (P.opening || P.respecing) { if (Math.hypot(x - P.x, z - P.z) > 0.5) { P.opening = null; P.respecing = null; } }
    const allow = spd * dt * 1.4 + 0.35 + P.moveBonus, d = Math.hypot(x - P.x, z - P.z);
    let nx = x, nz = z, corr = false;
    if (d > allow) { const k = allow / d; nx = P.x + (x - P.x) * k; nz = P.z + (z - P.z) * k; corr = d > allow + 0.6; }
    if (!P.flying) { const [bx, bz] = this.blockMove(P.x, P.z, nx, nz); if (Math.hypot(bx - nx, bz - nz) > 0.6) corr = true; nx = bx; nz = bz; }
    const lim = 335, rr = Math.hypot(nx, nz); if (rr > lim) { nx *= lim / rr; nz *= lim / rr; corr = true; }
    P.x = nx; P.z = nz; if (corr && P.conn) this.srv.send(P.conn, { t: 'corr', x: r2(P.x), z: r2(P.z) });
  }
  potion(P, k) {
    if (!P.alive || P.cd.pot > 0) return; const it = GLH.ITEMS[k]; if (!it || !(P.items[k] > 0)) return;
    if (k === 'bomau') { if (P.hp >= P.st.hp) return; const v = P.st.hp * it.heal; P.hp = Math.min(P.st.hp, P.hp + v); this.emit('heal', P.id, Math.round(v)); }
    else if (k === 'bohoi') { if (P.mp >= P.st.mp) return; P.mp = Math.min(P.st.mp, P.mp + P.st.mp * it.mana); }
    else if (k === 'ruou') { P.buffs.ruou = { v: it.atkB, t: it.dur }; this.recalc(P); }
    else return;
    P.items[k]--; P.cd.pot = 1.5; this.emit('sfxAt', k === 'bohoi' ? 'SFX-POT-MP' : 'SFX-POT-HP', r2(P.x), r2(P.z));
  }
  /* aim assist: Admin chỉnh góc (QĐ-0023). Chỉ hút nhẹ trong nón nhỏ — vẫn phải ngắm */
  assist(P, face, range) {
    const A = P.touch ? this.cfg.aimAssistTouch : this.cfg.aimAssistPc; if (!(A > 0) || P.bot) return face;
    let best = null, bd = A; for (const q of this.players.values()) { if (q === P || !q.alive || !this.isEnemy(P, q)) continue; const d = Math.hypot(q.x - P.x, q.z - P.z); if (d > range) continue; const ad = Math.abs(angDiff(Math.atan2(q.x - P.x, q.z - P.z), face)); if (ad < bd) { bd = ad; best = q; } }
    return best ? Math.atan2(best.x - P.x, best.z - P.z) : face;
  }
  isEnemy(a, b) { return a !== b && !(a.team && a.team === b.team); }
  basic(P, m) {
    if (!this.canAct(P) || P.cd.b > 0 || P.opening) return; const F = this.FA[P.fk], B = F.basic; P.cd.b = B.cd; P.lastFightT = this.t;
    let face = isFinite(m.face) ? +m.face : P.face; face = this.assist(P, face, B.range || B.r + 1); P.face = face;
    this.emit('cast', P.id, 'b', r2(face), r2(P.x), r2(P.z), 0, 0);
    if (B.t === 'melee') this.melee(P, face, B.r, B.arc, B.m, false, { slow: B.slow, slowT: B.slowT, basic: true });
    else this.fire(P, face, B, B.m, false, B.fx);
  }
  melee(P, face, r, arc, mult, skill, o = {}) {
    const hitOne = (tg, tx, tz, rad, isMon) => { const d = Math.hypot(tx - P.x, tz - P.z); if (d > r + rad) return; const ad = Math.abs(angDiff(Math.atan2(tx - P.x, tz - P.z), face)), tol = arc + Math.atan2(rad, Math.max(d, 0.3)); if (ad > tol) return; const prec = ad < GLH.SKILL.meleeCenter ? GLH.SKILL.meleeCenterMul : 1; isMon ? this.hitMon(P, tg, mult * prec, skill, prec > 1) : this.hitPlayer(P, tg, mult * prec, Object.assign({ skill, prec: prec > 1 }, o)); if (!isMon && o.kb) this.knock(P, tg, o.kb); };
    for (const q of this.players.values()) if (q.alive && this.isEnemy(P, q)) hitOne(q, q.x, q.z, GLH.SKILL.hitR, false);
    for (const mo of this.mons.values()) if (mo.alive) hitOne(mo, mo.x, mo.z, mo.rad, true);
    this.propsInArc(P, face, r, arc, o => this.hitProp(o, P, mult));
  }
  /* hất văng: đẩy mục tiêu ra xa người ra đòn */
  knock(src, tg, dist) { if (!tg.alive || tg.inv > 0) return; const a = Math.atan2(tg.x - src.x, tg.z - src.z); const f = tg.flying; this.moveAlong(tg, a, dist); tg.flying = f; tg.opening = null; tg.respecing = null; }
  fire(P, face, def, mult, skill, fx, extra = {}) {
    const n = def.count || 1, sp = def.spread || 0;
    for (let i = 0; i < n; i++) {
      const a = face + (i - (n - 1) / 2) * sp, pr = { id: nid(), own: P.id, x: P.x, z: P.z, dx: Math.sin(a), dz: Math.cos(a), spd: def.spd, range: def.range, trav: 0, r: def.r, m: mult, skill, def, hit: new Set(), y0: this.T.groundY(P.x, P.z) + 1.2 };
      this.projs.push(pr); this.emit('proj', pr.id, P.id, fx || 'pill', r2(P.x), r2(P.z), r2(pr.dx), r2(pr.dz), pr.spd, pr.range);
    }
  }
  cast(P, m) {
    const k = m.i, face0 = isFinite(m.face) ? +m.face : P.face;
    if (k === 'fly') { if (!P.alive || P.cc.stun > 0 || P.cd.fly > 0) return; if (P.flying) { P.flying = false; } else { if (P.mp < GLH.FLY.minMp) return this.toast(P, 'Hết hơi — cần ít nhất 15 hơi để cưỡi diều', '#7ab4ff'); P.flying = true; P.opening = null; } P.cd.fly = GLH.FLY.cd; this.emit('fly', P.id, P.flying ? 1 : 0); return; }
    if (k === 'dodge') {
      if (!P.alive || P.cc.stun > 0 || P.cc.root > 0 || P.cd.dodge > 0 || P.mp < GLH.DODGE.mp) return; P.mp -= GLH.DODGE.mp; P.cd.dodge = GLH.DODGE.cd; P.inv = Math.max(P.inv, GLH.DODGE.inv);
      const a = isFinite(m.dir) ? +m.dir : face0; this.moveAlong(P, a, GLH.DODGE.dist); P.dodgeT = this.t; this.emit('cast', P.id, 'dodge', r2(a), r2(P.x), r2(P.z), 0, 0); return;
    }
    const i = k | 0, F = this.FA[P.fk], sk = F.skills[i], lv = P.skl[i]; if (!sk || !this.canAct(P) || P.opening) return;
    if (lv <= 0) return this.toast(P, 'Chưa học chiêu này — cộng điểm chiêu trước', '#ff9a6a');
    const cdk = 's' + i; if (P.cd[cdk] > 0) return; if (P.mp < sk.mp) return this.toast(P, 'Hết hơi', '#7ab4ff');
    P.mp -= sk.mp; P.cd[cdk] = sk.cd * (1 - 0.04 * (lv - 1)); P.lastFightT = this.t;
    const mult = sk.m + (sk.up || 0) * (lv - 1); let face = this.assist(P, face0, sk.range || sk.dist || 12); P.face = face;
    let tx = isFinite(m.tx) ? +m.tx : P.x + Math.sin(face) * (sk.range || 8) * 0.7, tz = isFinite(m.tz) ? +m.tz : P.z + Math.cos(face) * (sk.range || 8) * 0.7;
    if (sk.range) { const d = Math.hypot(tx - P.x, tz - P.z); if (d > sk.range) { tx = P.x + (tx - P.x) / d * sk.range; tz = P.z + (tz - P.z) / d * sk.range; } }
    this.emit('cast', P.id, i, r2(face), r2(P.x), r2(P.z), r2(tx), r2(tz));
    switch (sk.t) {
      case 'dash': { const x0 = P.x, z0 = P.z; this.moveAlong(P, face, sk.dist); P.inv = Math.max(P.inv, 0.15); P.dodgeT = this.t; this.lineHit(P, x0, z0, P.x, P.z, sk.r, mult, { kb: sk.kb, face }); break; }
      case 'cone': this.melee(P, face, sk.r, sk.arc, mult, true, { kb: sk.kb, stun: sk.stun, slow: sk.slow, slowT: sk.slowT, root: sk.root }); break;
      case 'nova': this.pulses.push({ own: P.id, n: sk.pulses || 1, step: sk.step || 0, next: this.t + 0.05, r: sk.r, m: mult, healP: sk.healP || 0, stun: sk.stun || 0, slow: sk.slow || 0 }); break;
      case 'proj': this.fire(P, face, sk, mult, true, sk.fx || F.basic.fx); break;
      case 'zone': { const z = { id: nid(), own: P.id, x: tx, z: tz, r: sk.r, at: this.t + sk.delay, n: sk.pulses, step: sk.step, m: mult, slow: sk.slow || 0, slowT: sk.slowT || 0, endStun: sk.endStun || 0 }; this.zonesFx.push(z); this.emit('zone', z.id, r2(tx), r2(tz), sk.r, sk.delay, P.fk, sk.pulses, sk.step); break; }
      case 'buff': {
        if (sk.heal) { const v = P.st.hp * (sk.heal + (sk.up || 0) * (lv - 1)); P.hp = Math.min(P.st.hp, P.hp + v); this.emit('heal', P.id, Math.round(v)); }
        if (sk.spdB) P.buffs.spd = { v: sk.spdB, t: sk.dur }; if (sk.atkB) P.buffs.atk = { v: sk.atkB + (sk.up || 0) * (lv - 1), t: sk.dur }; if (sk.dr) P.buffs.dr = { v: sk.dr + (sk.up || 0) * (lv - 1), t: sk.dur };
        if (sk.nova) this.pulses.push({ own: P.id, n: 1, step: 0, next: this.t + 0.1, r: sk.nova.r, m: sk.nova.m * (1 + 0.1 * (lv - 1)) }); this.recalc(P); break;
      }
      case 'blink': { this.moveAlong(P, sk.back ? face + Math.PI : face, sk.dist); P.dodgeT = this.t; if (sk.spdB) { P.buffs.spd = { v: sk.spdB, t: sk.dur }; this.recalc(P); } P.inv = Math.max(P.inv, 0.2); P.shield = { v: P.st.hp * (sk.shield + (sk.up || 0) * (lv - 1)), t: sk.dur }; break; }
      case 'leap': { const d = Math.min(sk.dist, Math.hypot(tx - P.x, tz - P.z)) || sk.dist, a = Math.atan2(tx - P.x, tz - P.z); this.moveAlong(P, isFinite(a) ? a : face, d, true); this.pulses.push({ own: P.id, n: 1, step: 0, next: this.t + 0.45, r: sk.r, m: mult, stun: sk.stun }); break; }
    }
  }
  moveAlong(P, a, dist, ignoreSlope) {
    const dx = Math.sin(a), dz = Math.cos(a); let x = P.x, z = P.z;
    for (let s = 0.5; s <= dist + 1e-6; s += 0.5) { const nx = P.x + dx * s, nz = P.z + dz * s; if (!P.flying && !ignoreSlope && !this.T.canStep(x, z, nx, nz)) break; if (Math.hypot(nx, nz) > 335) break; if (!P.flying) { const [bx, bz] = this.blockMove(x, z, nx, nz); if (Math.hypot(bx - nx, bz - nz) > 0.05) { x = bx; z = bz; break; } } x = nx; z = nz; }
    P.x = x; P.z = z; P.moveBonus = 2; P.lastIn = this.t; this.emit('tp', P.id, r2(x), r2(z)); if (P.conn) this.srv.send(P.conn, { t: 'corr', x: r2(x), z: r2(z), hard: 1 });
  }
  lineHit(P, x0, z0, x1, z1, r, mult, o = {}) {
    const seg = (tx, tz) => { const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz || 1; let u = clamp(((tx - x0) * dx + (tz - z0) * dz) / L2, 0, 1); return Math.hypot(tx - (x0 + dx * u), tz - (z0 + dz * u)); };
    for (const q of this.players.values()) if (q.alive && this.isEnemy(P, q)) { const d = seg(q.x, q.z); if (d < r + GLH.SKILL.hitR) { this.hitPlayer(P, q, mult * (d < GLH.SKILL.precisionR ? GLH.SKILL.precisionMul : 1), { skill: true, prec: d < GLH.SKILL.precisionR }); if (o.kb) this.knock(P, q, o.kb); } }
    for (const mo of this.mons.values()) if (mo.alive && seg(mo.x, mo.z) < r + mo.rad) this.hitMon(P, mo, mult, true);
  }
  /* ---------------- Sát thương ---------------- */
  hitPlayer(src, tg, mult, o = {}) {
    if (!tg.alive || tg.inv > 0) return 0; const S = src.st, SP = this.FA[src.fk].passive, TP = this.FA[tg.fk].passive, G = this.tune.g;
    const ph = G.phase[Math.min(this.zone.pi, G.phase.length - 1)] || 1;
    let raw = S.atk * mult * rnd(0.95, 1.05) * this.cfg.dmgMul * GLH.SKILL.pvpMul * ph; if (o.skill) raw *= S.amp;
    let fl = 0; if (Math.random() * 100 < S.crit) { raw *= GLH.SKILL.critMul; fl |= 1; } if (o.prec) fl |= 2;
    const em = GLH.elemMod(this.FA[src.fk].elem, this.FA[tg.fk].elem); if (em > 1) fl |= 4; raw *= em;
    /* ---- Tâm Pháp người ra đòn ---- */
    let extraSlow = 0, extraStun = 0;
    switch (SP.k) {
      case 'execute': if (tg.hp / tg.st.hp < SP.below) { raw *= 1 + SP.mul; fl |= 8; } break;
      case 'precCdr': if (o.prec) { raw *= 1 + SP.mul; for (const k of ['s0', 's1', 's2']) src.cd[k] = Math.max(0, src.cd[k] - SP.cdr); } break;
      case 'vsSlow': if (tg.cc.slow > 0 || tg.cc.root > 0) raw *= 1 + SP.mul; break;
      case 'afterDodge': if (this.t - src.dodgeT < SP.win) { raw *= 1 + SP.mul; extraSlow = SP.slow; src.dodgeT = -99; fl |= 8; } break;
      case 'vsBurn': if (tg.cc.burnT > 0) raw *= 1 + SP.mul; break;
      case 'nthStun': src.hits = (src.hits || 0) + 1; if (src.hits > SP.every) { src.hits = 0; extraStun = SP.stun; fl |= 8; } break;
    }
    /* ---- Tâm Pháp người chịu đòn ---- */
    if (TP.k === 'projDr' && o.proj) raw *= 1 - TP.dr;
    if (TP.k === 'lastStand' && tg.hp / tg.st.hp < TP.below) raw *= 1 - TP.dr;
    const d = raw * GLH.mitigate(tg.st.def) * (1 - tg.st.dr);
    const stun = Math.max(o.stun || 0, extraStun), slow = Math.max(o.slow || 0, extraSlow);
    if (stun) tg.cc.stun = Math.max(tg.cc.stun, stun); if (o.root) tg.cc.root = Math.max(tg.cc.root, o.root); if (slow) { tg.cc.slow = Math.max(tg.cc.slow, slow); tg.cc.slowT = Math.max(tg.cc.slowT, o.slowT || 1.5); }
    let burn = o.burn || 0; if (SP.k === 'burnOnHit' && o.basic) burn = Math.max(burn, SP.burn);
    if (burn) { tg.cc.burn = S.atk * burn; tg.cc.burnT = 3; tg.cc.burnSrc = src; }
    if (stun || o.root) { tg.opening = null; tg.respecing = null; if (stun && tg.flying) { tg.flying = false; this.emit('fly', tg.id, 0); } }
    src.dmg += d; tg.taken = (tg.taken || 0) + d; src.lastFightT = this.t; if (S.ls > 0) src.hp = Math.min(S.hp, src.hp + d * S.ls / 100);
    if (SP.k === 'skillHeal' && o.skill) src.hp = Math.min(S.hp, src.hp + d * SP.p);
    const fs = this.fstat(src.fk); fs.dmg += d;
    this.emit('hit', 'p', tg.id, Math.round(d), fl, src.id); this.rawDamage(tg, d, src); return d;
  }
  fstat(fk) { this.fst = this.fst || {}; return this.fst[fk] || (this.fst[fk] = { dmg: 0, kills: 0 }); }
  rawDamage(tg, d, src) {
    if (!tg.alive) return; if (tg.shield.v > 0) { const a = Math.min(tg.shield.v, d); tg.shield.v -= a; d -= a; }
    tg.hp -= d; tg.lastFightT = this.t; tg.lastHitT = this.t; tg.opening = null; tg.respecing = null; if (src) tg.lastAtk = src;
    if (tg.hp <= 0) this.killPlayer(tg, src && src.id ? src : null);
  }
  killPlayer(P, killer, how) {
    if (!P.alive) return; for (const it of P.bag) this.dropAt(P, 'eq', { item: it }); P.bag = []; P.alive = false; P.aliveT = this.t; P.hp = 0; P.flying = false; P.opening = null;
    const alive = [...this.players.values()].filter(q => q.alive).length; P.place = alive + 1;
    if (killer && killer.alive !== undefined && killer !== P && this.players.has(killer.id)) {
      killer.kills++; this.fstat(killer.fk).kills++; this.giveExp(killer, GLH.killExp(P.lvl)); const half = k => { const n = Math.floor((P.items[k] || 0) / 2); if (n) this.addItem(killer, k, n); }; ['bomau', 'bohoi', 'chen'].forEach(half);
    } else if (P.lastAtk && P.lastAtk.alive && P.lastAtk !== P && this.t - P.lastHitT < 8) { P.lastAtk.kills++; killer = P.lastAtk; }
    this.emit('die', 'p', P.id, killer ? killer.id : 0, P.place, how || '');
    if (P.conn) this.srv.send(P.conn, { t: 'dead', place: P.place, by: killer ? killer.name : how === 'suong' ? 'Vòng Sương' : '—', n: this.players.size });
  }
  hitMon(src, m, mult, skill, prec) {
    if (!m.alive) return 0; const S = src.st; let raw = S.atk * mult * rnd(0.95, 1.05) * this.cfg.dmgMul; if (skill) raw *= S.amp;
    let fl = 0; if (Math.random() * 100 < S.crit) { raw *= GLH.SKILL.critMul; fl |= 1; } if (prec) { fl |= 2; }
    const d = raw * GLH.mitigate(m.def); m.hp -= d; src.dmg += d; if (S.ls > 0) src.hp = Math.min(S.hp, src.hp + d * S.ls / 100);
    if (!m.passive) { m.tgt = src.id; if (m.state !== 'windup') m.state = 'chase'; } else { m.state = 'flee'; m.timer = 3; m.tgt = src.id; }
    this.emit('hit', 'm', m.id, Math.round(d), fl, src.id);
    if (m.hp <= 0) this.killMon(m, src); return d;
  }
  killMon(m, killer) {
    m.alive = false; m.state = 'dead'; m.respawnT = this.t + (m.boss ? 1e9 : rnd(GLH.MON.respawn[0], GLH.MON.respawn[1])); this.emit('die', 'm', m.id, killer ? killer.id : 0, 0, '');
    if (!killer) return; this.giveExp(killer, m.exp);
    const lm = this.cfg.lootMul, drop = (kind, o) => { const a = Math.random() * 6.283, r = rnd(0.5, 1.6), d = Object.assign({ id: nid(), kind, x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r, t: this.t }, o); this.drops.set(d.id, d); this.emit('drop', d.id, r2(d.x), r2(d.z), kind, kind === 'eq' ? d.item.rar : 0, kind === 'eq' ? d.item.name : GLH.ITEMS[d.key].n); };
    if (m.boss) { killer.vay = true; this.recalc(killer); this.emit('msg', killer.name + ' đã hạ Chúa Thuồng Luồng — nhận Vảy Thuồng Luồng!', '#ffd24a'); this.emit('sfx', 'SFX-BOSS-DIE'); for (let i = 0; i < 3; i++) drop('eq', { item: this.makeEquip(m.lvl, i === 0 ? 4 : 3) }); drop('it', { key: 'chen', n: 1 }); drop('it', { key: 'bomau', n: 2 }); return; }
    const ne = m.elite ? rint(1, 2) : Math.random() < 0.22 * lm ? 1 : 0;
    for (let i = 0; i < ne; i++) { let r = this.T.rollRarity(m.elite ? 0.8 : 0); if (m.elite) r = Math.max(r, 1); drop('eq', { item: this.makeEquip(m.lvl + rint(0, 2), clamp(r, 0, 4)) }); }
    if (Math.random() < 0.15 * lm) drop('it', { key: 'bomau', n: 1 }); if (Math.random() < 0.1 * lm) drop('it', { key: 'bohoi', n: 1 }); if (Math.random() < 0.015 * lm) drop('it', { key: 'chen', n: 1 });
  }
  /* ---------------- Quái ---------------- */
  updateMons(dt) {
    const plist = [...this.players.values()].filter(p => p.alive);
    for (const m of this.mons.values()) {
      if (!m.alive) { if (this.t >= m.respawnT && !plist.some(p => Math.hypot(p.x - m.hx, p.z - m.hz) < 22)) { Object.assign(m, { alive: true, hp: m.maxHp, x: m.hx, z: m.hz, state: 'idle', tgt: null }); this.emit('mrespawn', m.id, r2(m.x), r2(m.z)); } continue; }
      m.atkCd -= dt; m.slamCd -= dt; let tg = m.tgt ? this.players.get(m.tgt) : null; if (tg && (!tg.alive || tg.flying)) { tg = null; m.tgt = null; }
      if (!tg && !m.passive && m.aggro > 0 && m.state !== 'return') { let bd = m.aggro; for (const p of plist) { if (p.flying) continue; const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < bd) { bd = d; tg = p; } } if (tg) { m.tgt = tg.id; m.state = 'chase'; } }
      const home = Math.hypot(m.x - m.hx, m.z - m.hz);
      if (m.state === 'flee') { m.timer -= dt; if (tg) this.monStep(m, Math.atan2(m.x - tg.x, m.z - tg.z), m.spd * 1.1, dt); if (m.timer <= 0) { m.state = 'return'; m.tgt = null; } continue; }
      if (tg && home > (m.boss ? 40 : 30)) { m.state = 'return'; m.tgt = null; tg = null; }
      if (m.state === 'return') { if (home < 1.5) { m.state = 'idle'; m.hp = m.maxHp; } else { this.monStep(m, Math.atan2(m.hx - m.x, m.hz - m.z), m.spd * 1.3, dt); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt); } continue; }
      if (m.state === 'windup') { m.timer -= dt; if (tg) m.face = Math.atan2(tg.x - m.x, tg.z - m.z); if (m.timer <= 0) { m.state = 'chase'; m.atkCd = m.boss ? 1.6 : rnd(1.1, 1.6); if (tg) { if (m.ranged) this.monShot(m, tg); else if (Math.hypot(tg.x - m.x, tg.z - m.z) < m.range + 1.0) this.monHit(m, tg, 1); } } continue; }
      if (tg) {
        const d = Math.hypot(tg.x - m.x, tg.z - m.z), a = Math.atan2(tg.x - m.x, tg.z - m.z);
        if (m.boss && m.slamCd <= 0 && d < 9) { m.slamCd = 6.5; const s = { m, x: m.x, z: m.z, r: 7, at: this.t + 1.4 }; this.slams.push(s); this.emit('slam', m.id, r2(m.x), r2(m.z), 7, 1.4); m.state = 'windup'; m.timer = 1.4; continue; }
        if (d <= (m.ranged || m.range) && m.atkCd <= 0) { m.state = 'windup'; m.timer = m.boss ? 0.8 : 0.55; m.face = a; continue; }
        if (d > (m.ranged ? m.ranged * 0.8 : m.range * 0.8)) this.monStep(m, a, m.spd, dt); else m.face = a;
        m.state = 'chase';
      } else { m.timer -= dt; if (m.timer <= 0) { m.timer = rnd(2, 5); if (Math.random() < 0.5) { m.state = 'wander'; m.wa = Math.random() * 6.283; } else m.state = 'idle'; } if (m.state === 'wander' && home < 8) this.monStep(m, m.wa, m.spd * 0.35, dt); else if (m.state === 'wander') this.monStep(m, Math.atan2(m.hx - m.x, m.hz - m.z), m.spd * 0.4, dt); }
    }
  }
  monStep(m, a, spd, dt) { const nx = m.x + Math.sin(a) * spd * dt, nz = m.z + Math.cos(a) * spd * dt; m.face = a; if (this.T.canStep(m.x, m.z, nx, nz) || m.boss) { m.x = nx; m.z = nz; } }
  monHit(m, P, k) {
    if (!P.alive || P.inv > 0) return; let d = m.atk * k * rnd(0.93, 1.07) * GLH.mitigate(P.st.def) * (1 - P.st.dr) * clamp(1 + (m.lvl - P.lvl) * 0.03, 0.7, 1.5);
    this.emit('hit', 'p', P.id, Math.round(d), 0, -m.id); this.rawDamage(P, d, null);
  }
  monShot(m, tg) { const a = Math.atan2(tg.x - m.x, tg.z - m.z), pr = { id: nid(), own: -m.id, mon: m, x: m.x, z: m.z, dx: Math.sin(a), dz: Math.cos(a), spd: m.boss ? 18 : 14, range: (m.ranged || 12) + 4, trav: 0, r: m.boss ? 0.9 : 0.45, m: 1, hit: new Set(), def: {}, y0: this.T.groundY(m.x, m.z) + 1.2 }; this.projs.push(pr); this.emit('proj', pr.id, -m.id, m.boss ? 'fire' : 'mon', r2(m.x), r2(m.z), r2(pr.dx), r2(pr.dz), pr.spd, pr.range); }
  updateSlams() { for (let i = this.slams.length - 1; i >= 0; i--) { const s = this.slams[i]; if (this.t < s.at) continue; this.slams.splice(i, 1); if (!s.m.alive) continue; for (const p of this.players.values()) if (p.alive && Math.hypot(p.x - s.x, p.z - s.z) < s.r) this.monHit(s.m, p, 1.9); } }
  /* ---------------- Đạn bay thẳng (né được) ---------------- */
  updateProjs(dt) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i], owner = pr.mon ? null : this.players.get(pr.own); let dead = false, move = pr.spd * dt;
      while (move > 0 && !dead) {
        const st = Math.min(0.6, move); move -= st; const x0 = pr.x, z0 = pr.z; pr.x += pr.dx * st; pr.z += pr.dz * st; pr.trav += st;
        if (this.T.heightAt(pr.x, pr.z) > pr.y0 + 1.2) { dead = true; break; }  // núi chặn đạn → địa hình là chiến thuật
        { const ob = PR.blockShot(this.pidx, x0, z0, pr.x, pr.z); if (ob) { if (owner && ob.k === 'cay') this.hitProp(ob, owner, pr.m); dead = true; break; } } // cây, đá, vách nhà chặn đạn
        const lat = (tx, tz) => { const dx = pr.x - x0, dz = pr.z - z0, L2 = dx * dx + dz * dz || 1, u = clamp(((tx - x0) * dx + (tz - z0) * dz) / L2, 0, 1); return Math.hypot(tx - (x0 + dx * u), tz - (z0 + dz * u)); };
        if (pr.mon) { for (const p of this.players.values()) { if (!p.alive || pr.hit.has(p.id)) continue; if (lat(p.x, p.z) < pr.r + GLH.SKILL.hitR) { pr.hit.add(p.id); this.monHit(pr.mon, p, 1); dead = true; break; } } }
        else if (owner) {
          for (const p of this.players.values()) {
            if (!p.alive || !this.isEnemy(owner, p) || pr.hit.has(p.id)) continue; const l = lat(p.x, p.z); if (l >= pr.r + GLH.SKILL.hitR) continue;
            pr.hit.add(p.id); const prec = l < GLH.SKILL.precisionR, D = pr.def; this.hitPlayer(owner, p, pr.m * (prec ? GLH.SKILL.precisionMul : 1), { skill: pr.skill, prec, slow: D.slow, slowT: D.slowT, root: D.root, burn: D.burn, stun: D.stun, proj: true, basic: !pr.skill });
            if (D.splash) this.splash(owner, pr.x, pr.z, D.splash, pr.m * (D.splashM || 0.4), p); if (!D.pierce) { dead = true; break; }
          }
          if (!dead) for (const m of this.mons.values()) {
            if (!m.alive || pr.hit.has('m' + m.id)) continue; const l = lat(m.x, m.z); if (l >= pr.r + m.rad) continue;
            pr.hit.add('m' + m.id); this.hitMon(owner, m, pr.m, pr.skill, l < GLH.SKILL.precisionR); if (pr.def.splash) this.splash(owner, pr.x, pr.z, pr.def.splash, pr.m * (pr.def.splashM || 0.4), m); if (!pr.def.pierce) { dead = true; break; }
          }
        }
        if (pr.trav >= pr.range) dead = true;
      }
      if (dead) { this.projs.splice(i, 1); this.emit('px', pr.id, r2(pr.x), r2(pr.z)); }
    }
  }
  splash(owner, x, z, r, mult, except) {
    for (const p of this.players.values()) if (p !== except && p.alive && this.isEnemy(owner, p) && Math.hypot(p.x - x, p.z - z) < r) this.hitPlayer(owner, p, mult, {});
    for (const m of this.mons.values()) if (m !== except && m.alive && Math.hypot(m.x - x, m.z - z) < r) this.hitMon(owner, m, mult, false);
  }
  areaHit(owner, x, z, r, mult, o) {
    for (const t of PR.near(this.pidx, x, z)) if (!t.dead && t.k === 'cay' && Math.hypot(t.x - x, t.z - z) < r + t.r) this.hitProp(t, owner, mult);
    let n = 0; for (const p of this.players.values()) if (p.alive && this.isEnemy(owner, p) && Math.hypot(p.x - x, p.z - z) < r + GLH.SKILL.hitR) { this.hitPlayer(owner, p, mult, Object.assign({ skill: true }, o)); n++; }
    for (const m of this.mons.values()) if (m.alive && Math.hypot(m.x - x, m.z - z) < r + m.rad) { this.hitMon(owner, m, mult, true); if (o.stun && !m.boss) { m.state = 'idle'; m.timer = o.stun; } n++; } return n;
  }
  updateZonesFx() {
    for (let i = this.zonesFx.length - 1; i >= 0; i--) {
      const z = this.zonesFx[i], own = this.players.get(z.own); if (!own) { this.zonesFx.splice(i, 1); continue; }
      while (z.n > 0 && this.t >= z.at) { z.n--; z.at += z.step || 0.01; const last = z.n === 0; this.areaHit(own, z.x, z.z, z.r, z.m, { slow: z.slow, slowT: z.slowT, stun: last ? z.endStun : 0 }); this.emit('pulse', r2(z.x), r2(z.z), z.r, own.fk); }
      if (z.n <= 0) this.zonesFx.splice(i, 1);
    }
  }
  updatePulses() {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const q = this.pulses[i], own = this.players.get(q.own); if (!own || !own.alive) { this.pulses.splice(i, 1); continue; }
      while (q.n > 0 && this.t >= q.next) { q.n--; q.next += q.step || 0.01; this.areaHit(own, own.x, own.z, q.r, q.m, { stun: q.stun, slow: q.slow, slowT: 1 }); if (q.healP) own.hp = Math.min(own.st.hp, own.hp + own.st.hp * q.healP); this.emit('pulse', r2(own.x), r2(own.z), q.r, own.fk); }
      if (q.n <= 0) this.pulses.splice(i, 1);
    }
  }
  /* ---------------- Kết thúc ---------------- */
  checkEnd() {
    if (this.over) { if (this.t >= this.endAt) this.finish(); return; }
    const alive = [...this.players.values()].filter(p => p.alive), humansAlive = alive.filter(p => !p.bot).length;
    if (alive.length <= 1 || (this.humans > 0 && humansAlive === 0 && !this.headless)) { this.over = true; this.endAt = this.t + (alive.length <= 1 ? 3 : 2.5); if (alive.length === 1) { alive[0].place = 1; this.emit('msg', alive[0].name + ' là Người Đứng Cuối!', '#ffd24a'); } }
  }
  finish() {
    this.ended = true; const list = [...this.players.values()];
    const aliveSorted = list.filter(p => p.alive).sort((a, b) => b.hp - a.hp); aliveSorted.forEach((p, i) => { p.place = i + 1; });
    const board = list.slice().sort((a, b) => a.place - b.place).map(p => [p.name, p.fk, p.place, p.kills, p.bot ? 1 : 0, Math.round(p.dmg), p.lvl, Math.round(p.taken || 0), Math.round(p.healed || 0), Math.round(p.aliveT ?? this.t)]);
    for (const P of list) {
      if (!P.conn) continue; let rank = null;
      if (this.mode === 'solo') rank = this.srv.store.applyResult(P.name, P.place, list.length, P.kills, this.humans, list.length, P.fk);
      this.srv.send(P.conn, { t: 'end', place: P.place, n: list.length, kills: P.kills, dmg: Math.round(P.dmg), lvl: P.lvl, rank, board, practice: this.mode === 'practice' });
    }
    this.result = { board, t: this.t, humans: this.humans, preset: this.cfg.preset, tuneV: this.tune.v, list: list.map(p => ({ fk: p.fk, place: p.place, kills: p.kills, dmg: Math.round(p.dmg), bot: p.bot, lvl: p.lvl })) };
    if (this.srv.recordFactions) this.srv.recordFactions(this.result);
  }
  /* ---------------- Gửi trạng thái ---------------- */
  snapshotFor(P) {
    const V = GLH.MATCH.viewR, fl = q => (q.alive ? 1 : 0) | (q.flying ? 2 : 0) | (q.cc.stun > 0 ? 4 : 0) | (q.cc.root > 0 ? 8 : 0) | (q.shield.v > 0 ? 16 : 0) | (q.inv > 0 ? 32 : 0) | (q.opening || q.respecing ? 64 : 0) | (q.cc.slow > 0 ? 128 : 0) | (q.inSuong ? 256 : 0) | (q.cov ? 512 : 0);
    const cx = P.alive ? P.x : (this.spec(P) || P).x, cz = P.alive ? P.z : (this.spec(P) || P).z;
    const p = []; for (const q of this.players.values()) if (this.canSee(P, q)) p.push([q.id, r2(q.x), r2(q.z), r2(q.y), r2(q.face), Math.round(q.hp), q.st.hp, q.lvl, fl(q)]);
    const m = []; for (const mo of this.mons.values()) { if (Math.abs(mo.x - cx) > V || Math.abs(mo.z - cz) > V) continue; m.push([mo.id, r2(mo.x), r2(mo.z), r2(mo.face), Math.round(mo.hp), mo.maxHp, mo.alive ? (mo.state === 'windup' ? 2 : mo.state === 'idle' ? 0 : 1) : 3]); }
    return { t: 's', tm: r2(this.t), a: [...this.players.values()].filter(q => q.alive).length, z: this.zoneMsg(), p, m };
  }
  spec(P) { if (P.alive) return P; let k = P.specId && this.players.get(P.specId); if (!k || !k.alive) { k = [...this.players.values()].find(q => q.alive); P.specId = k && k.id; } return k; }
  meFor(P) {
    const F = this.FA[P.fk], cd = {}; for (const k in P.cd) cd[k] = r2(P.cd[k]);
    const pk = it => [it.name, it.rar, it.stats, it.lv, it.slot]; const eq = {}; for (const k of GLH.SLOT_KEYS) if (P.eq[k]) eq[k] = pk(P.eq[k]); const bag = P.bag.map(pk);
    const buffs = []; for (const k in P.buffs) if (P.buffs[k].t > 0) buffs.push([k, r2(P.buffs[k].t)]); if (P.vay) buffs.push(['vay', -1]); if (P.shield.v > 0) buffs.push(['shield', r2(P.shield.t)]);
    return { t: 'me', hp: Math.round(P.hp), mhp: P.st.hp, mp: Math.round(P.mp), mmp: P.st.mp, lvl: P.lvl, exp: Math.round(P.exp), need: GLH.expNeed(P.lvl), pot: P.pot, potFree: P.potFree, skl: P.skl, sklFree: P.sklFree, cd, items: P.items, eq, bag, buffs,
      st: { atk: Math.round(P.st.atk), def: Math.round(P.st.def), crit: r2(P.st.crit), spd: r2(P.st.spd), amp: r2(P.st.amp) }, cc: { stun: r2(P.cc.stun), root: r2(P.cc.root), slow: r2(P.cc.slow) },
      respecFree: P.respecFree, kills: P.kills, fly: P.flying, alive: P.alive, opening: P.opening ? r2((this.t - P.opening.t0) / GLH.CHEST.openT) : P.respecing ? r2((this.t - P.respecing.t0) / GLH.RESPEC.castT) : -1, spec: P.alive ? 0 : (this.spec(P) || {}).id || 0, calm: this.t - P.lastFightT >= GLH.RESPEC.calm };
  }
}
module.exports = { Match };
