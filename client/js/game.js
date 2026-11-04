/* ===================== Trò chơi chính: chiến đấu, kho đồ, lưu game ===================== */
const SAVE_KEY = 'lucdiep_save_v1', SET_KEY = 'lucdiep_settings_v1';
const SPAWN = { x: 0, z: -6 };
const ST = (() => { try { return JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) { return {}; } })();

class Game {
  constructor() {
    this.mode = 'loading'; this.keys = {}; this.cd = {}; this.pills = []; this.slams = []; this.potCd = 0; this.invuln = 0; this.combatT = 99; this.target = null; this.targetT = 0; this.slowOn = false; this.ts = 1; this.shake = 0; this.recall = null; this.recallCd = 0; this.pulses = []; this.bfl = null; this.leapPending = false; this.lastFull = -9; this.pauseOpen = false; this.helpOpen = false; this.saveT = 15; this.interactTarget = null; this.quality = ST.quality || 'mid'; this.sound = ST.sound !== false; this.ab = 0; this.hit0 = 0;
    this.state = this.newState(); this.stats = { hp: 100, mp: 50, atk: 10, def: 1, crit: 5, ls: 0, spd: 0, exp: 0, luck: 0 };
    this.step(0.05, 'Khởi tạo đồ họa…', () => this.initGL());
  }
  step(p, text, fn) { $('lfill').style.width = p * 100 + '%'; $('ltext').textContent = text; return new Promise(r => setTimeout(() => { fn && fn(); r(); }, 30)); }
  async boot() {
    await this.step(0.2, 'Kiến tạo núi non, sông suối…', () => { this.world = new World(this.scene); });
    await this.step(0.5, 'Gieo rừng cây, tre trúc, đá núi…', () => { /* world đã dựng thực vật */ });
    await this.step(0.65, 'Triệu hồi yêu thú…', () => {
      this.player = new Player(); this.scene.add(this.player.g); this.scene.add(this.player.fx); this.player.buildExtras(); this.fx = new Fx(this.scene);
      this.plLight = new T.PointLight(0xbfffe0, 0.8, 16, 2); this.scene.add(this.plLight);
      this.mm = new MonsterManager(this); this.drops = new Drops(this);
      this.player.onPill = pl => this.onPill(pl); this.player.onLand = v => this.onLand(v);
    });
    await this.step(0.85, 'Vẽ bản đồ thế giới…', () => { this.mapCanvas = document.createElement('canvas'); this.mapCanvas.width = this.mapCanvas.height = 512; this.world.renderMap(this.mapCanvas); this.ui = new UI(this); this.bind(); });
    await this.step(0.98, 'Hoàn tất!', () => { this.applyQuality(this.quality, true); this.recalc(); this.mode = 'title'; this.cam.yaw = 0.6; this.player.g.position.set(SPAWN.x, 1.55, SPAWN.z); });
    $('loading').classList.add('hidden'); this.showTitle(); this.clock.start(); this.loop();
  }
  initGL() {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); this.renderer.domElement.id = 'gl'; document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.2;
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(55, 1, 0.1, 900);
    this.cam = { yaw: Math.PI, pitch: 0.3, dist: 6.5 }; this.ct = new T.Vector3(0, 2, SPAWN.z); this.ema = 0.016; this.fc = 0; this.maxPR = 1.5; this.pr = 1.2; this.clock = new T.Clock(false);
    if (T.EffectComposer && T.UnrealBloomPass && T.ShaderPass) {
      const cp = new T.EffectComposer(this.renderer); cp.addPass(new T.RenderPass(this.scene, this.camera)); this.bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.5, 0.6, 0.82); cp.addPass(this.bloom);
      this.gradePass = new T.ShaderPass(GradeShader); cp.addPass(this.gradePass); this.composer = cp;
    }
    this.useComposer = !!this.composer; addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { this.renderer.setSize(innerWidth, innerHeight); if (this.composer) this.composer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  applyQuality(q, silent) {
    this.quality = q; const Q = this.world.setQuality(q); this.maxPR = { low: 1, mid: 1.5, high: 2 }[q]; this.pr = Math.min(this.pr, this.maxPR, devicePixelRatio); if (q === 'high') this.pr = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.pr); if (this.composer) this.composer.setPixelRatio(this.pr); this.useComposer = !!this.composer && q !== 'low'; this.resize();
    const seen = new Set(); this.scene.traverse(o => { if (o.material && !seen.has(o.material)) { seen.add(o.material); o.material.needsUpdate = true; } });
    this.mm.activeR = { low: 80, mid: 100, high: 115 }[q]; ST.quality = q; this.saveSettings(); if (this.ui) $('qSel').value = q; Sound.on = this.sound;
  }
  saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify({ quality: this.quality, sound: this.sound })); } catch (e) { } }
  /* ---------- Trạng thái & lưu ---------- */
  newState() { return { v: 1, lvl: 1, exp: 0, gold: 50, hp: 165, mp: 68, bag: Array(30).fill(null), equip: {}, kills: 0, bossKills: {}, buffs: {}, time: 0, x: SPAWN.x, z: SPAWN.z, deaths: 0 }; }
  startNew() {
    this.state = this.newState(); const S = this.state; S.equip.weapon = makeEquip(1, 0, 'weapon'); S.equip.head = makeEquip(1, 0, 'head'); this.addStack('hp1', 5); this.addStack('mp1', 3);
    this.recalc(); S.hp = this.stats.hp; S.mp = this.stats.mp; this.spawnPlayer(SPAWN.x, SPAWN.z); this.beginPlay(); this.ui.toast('Chào mừng Lục Điệp!<br><small style="font-size:14px">Dùng WASD để đi, J để luyện đan. Quái yếu ở gần Linh Đài.</small>', '#7dffb0', 4500); this.save();
  }
  loadGame() { const s = this.readSave(); if (!s) return this.startNew(); this.state = Object.assign(this.newState(), s); this.recalc(); this.state.hp = clamp(this.state.hp, 1, this.stats.hp); this.spawnPlayer(this.state.x, this.state.z); this.beginPlay(); this.ui.toast('Tiếp tục hành trình – Lv.' + this.state.lvl, '#7dffb0'); }
  readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  save(manual) { try { const S = this.state, P = this.player.g.position; S.x = P.x; S.z = P.z; if (this.player.dead) { S.x = SPAWN.x; S.z = SPAWN.z; } localStorage.setItem(SAVE_KEY, JSON.stringify(S)); if (manual) this.ui.toast('Đã lưu game', '#7dffb0', 1200); } catch (e) { if (manual) this.ui.toast('Không thể lưu (trình duyệt chặn bộ nhớ)', '#ff7a7a'); } }
  spawnPlayer(x, z) { const P = this.player; P.dead = false; P.flying = false; P.act = null; P.atk = -1; P.y = 0; P.vy = 0; P.flip.rotation.set(0, 0, 0); P.g.position.set(x, this.world.groundY(x, z), z); P.gy = P.g.position.y; this.ct.set(x, P.gy + 1.2, z); $('death').classList.add('hidden'); this.invuln = 2; }
  beginPlay() { this.mode = 'play'; $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); this.ui.zoneId = -1; Sound.init(); Sound.setOn(this.sound); }
  showTitle() { const has = !!this.readSave(); $('bContinue').style.display = has ? '' : 'none'; $('title').classList.remove('hidden'); $('hud').classList.add('hidden'); this.mode = 'title'; }
  recalc() {
    const S = this.state, L = S.lvl, g = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0, atkp: 0, defp: 0, hpp: 0, spd: 0, ls: 0, exp: 0, luck: 0 };
    for (const k of SLOT_KEYS) { const it = S.equip[k]; if (!it) continue; const s = equipStats(it); for (const a in s) g[a] += s[a]; }
    const b = S.buffs, bv = k => b[k] && b[k].t > 0 ? b[k].val : 0;
    this.stats = { hp: (120 + L * 45 + g.hp) * (1 + g.hpp / 100), mp: 60 + L * 8 + g.mp, atk: (12 + L * 4 + g.atk) * (1 + g.atkp / 100) * (1 + bv('atk')), def: (3 + L * 1.6 + g.def) * (1 + g.defp / 100) * (1 + bv('def')), crit: 5 + g.crit, ls: g.ls, spd: g.spd, exp: g.exp + bv('exp') * 100, luck: g.luck };
    if (this.player) this.player.moveMul = 1 + Math.min(this.stats.spd, 60) / 100; S.hp = Math.min(S.hp, this.stats.hp); S.mp = Math.min(S.mp, this.stats.mp);
  }
  /* ---------- Kho đồ ---------- */
  emptySlot() { return this.state.bag.findIndex(x => !x); }
  countItem(key) { return this.state.bag.reduce((s, it) => s + (it && it.key === key ? it.n : 0), 0); }
  countPills(t) { return this.countItem(t + '1') + this.countItem(t + '2'); }
  addStack(key, n) {
    const bag = this.state.bag; let left = n;
    for (const it of bag) if (it && it.key === key && it.n < 99 && left > 0) { const a = Math.min(99 - it.n, left); it.n += a; left -= a; }
    while (left > 0) { const i = this.emptySlot(); if (i < 0) return false; const a = Math.min(99, left); bag[i] = stackItem(key, a); left -= a; }
    return true;
  }
  removeItem(key, n) { const bag = this.state.bag; for (let i = 0; i < bag.length && n > 0; i++) { const it = bag[i]; if (it && it.key === key) { const a = Math.min(it.n, n); it.n -= a; n -= a; if (it.n <= 0) bag[i] = null; } } }
  pickup(it) {
    const S = this.state, P = this.player.g.position;
    if (it.kind === 'gold') { S.gold += it.n; this.ui.floatText(P.x, P.y + 2.2, P.z, '+' + it.n + ' 💰', 'gold'); Sound.play('gold'); this.ui.refresh(); return true; }
    const col = itemColor(it);
    if (it.kind === 'equip') {
      const i = this.emptySlot(); if (i < 0) return this.bagFull(); S.bag[i] = it; this.ui.log(`Nhặt được <b style="color:${col}">[${esc(it.name)}]</b> <small>Lv.${it.lv} · ${RAR[it.rar].n}</small>`);
      if (it.rar >= 3) { this.ui.toast(`<span style="color:${col}">✦ ${RAR[it.rar].n}: ${esc(it.name)} ✦</span>`, col, 2500); Sound.play('rare'); } else Sound.play('pick');
    } else {
      const free = S.bag.some(x => x && x.key === it.key && x.n < 99) || this.emptySlot() >= 0; if (!free) return this.bagFull(); this.addStack(it.key, it.n); this.ui.log(`Nhặt được <b>${ITEMDEF[it.key].ic} ${ITEMDEF[it.key].name}</b> ×${it.n}`); Sound.play('pick');
    }
    this.ui.refresh(); return true;
  }
  bagFull() { if (this.clock.elapsedTime - this.lastFull > 3) { this.lastFull = this.clock.elapsedTime; this.ui.toast('🎒 Túi đã đầy! Hãy bán bớt đồ (I).', '#ff9a6a', 1800); Sound.play('deny'); } return false; }
  equipItem(i) {
    const S = this.state, it = S.bag[i]; if (!it || it.kind !== 'equip') return; if (S.lvl < it.req) { this.ui.toast('Cần đạt cấp ' + it.req + ' để trang bị', '#ff7a7a', 1400); Sound.play('deny'); return; }
    const old = S.equip[it.slot]; S.equip[it.slot] = it; S.bag[i] = old || null; this.ui.sel = { from: 'eq', k: it.slot }; this.recalc(); Sound.play('ui'); this.ui.refresh();
  }
  unequip(k) { const S = this.state, it = S.equip[k]; if (!it) return; const i = this.emptySlot(); if (i < 0) return this.bagFull(); S.bag[i] = it; S.equip[k] = null; this.ui.sel = { from: 'bag', i }; this.recalc(); Sound.play('ui'); this.ui.refresh(); }
  useBagItem(i) { const it = this.state.bag[i]; if (!it || it.kind !== 'pill') return; this.consume(it.key) && (it.n--, it.n <= 0 && (this.state.bag[i] = null)); this.ui.refresh(); }
  consume(key) {
    const d = ITEMDEF[key], S = this.state, st = this.stats, P = this.player.g.position;
    if (d.heal) { if (S.hp >= st.hp || this.player.dead) { this.ui.toast('Sinh lực đã đầy', '#aaa', 900); return false; } const v = Math.round(st.hp * d.heal); S.hp = Math.min(st.hp, S.hp + v); this.ui.floatText(P.x, P.y + 2.4, P.z, '+' + v, 'heal'); this.fx.sparks(P.x, P.y + 1, P.z, 24, [1, 0.5, 0.6], 2); }
    else if (d.mana) { if (S.mp >= st.mp) { this.ui.toast('Linh lực đã đầy', '#aaa', 900); return false; } const v = Math.round(st.mp * d.mana); S.mp = Math.min(st.mp, S.mp + v); this.ui.floatText(P.x, P.y + 2.4, P.z, '+' + v, 'exp'); this.fx.sparks(P.x, P.y + 1, P.z, 24, [0.4, 0.6, 1], 2); }
    else if (d.buff) { S.buffs[d.buff] = { val: d.val, t: d.dur }; this.recalc(); this.fx.burst(P.x, P.y + 1, P.z, 40); this.ui.log(`Sử dụng <b>${d.name}</b> – ${d.desc}`); }
    Sound.play('drink'); return true;
  }
  usePotion(t) { if (this.potCd > 0 || this.mode !== 'play') return; const key = this.countItem(t + '1') ? t + '1' : this.countItem(t + '2') ? t + '2' : null; if (!key) { this.ui.toast('Hết ' + (t === 'hp' ? 'Hồi Huyết Đan' : 'Hồi Linh Đan'), '#ff9a6a', 1000); Sound.play('deny'); return; } if (this.consume(key)) { this.removeItem(key, 1); this.potCd = 1.5; this.ui.refresh(); } }
  quickUse(i) { const it = this.state.bag[i]; if (!it) return; if (it.kind === 'equip') this.equipItem(i); else if (it.kind === 'pill') this.useBagItem(i); }
  sellBag(i, all) { const S = this.state, it = S.bag[i]; if (!it) return; const n = it.kind === 'equip' || all ? (it.n || 1) : 1, g = itemPrice(it) * n; S.gold += g; if (it.kind === 'equip' || n >= it.n) { S.bag[i] = null; this.ui.sel = null; } else it.n -= n; Sound.play('gold'); this.ui.log(`Bán ${esc(itemName(it))} được <b style="color:#ffd24a">${g}💰</b>`); this.ui.refresh(); }
  dropBag(i) { this.state.bag[i] = null; this.ui.sel = null; Sound.play('ui'); this.ui.refresh(); }
  sortBag() {
    const S = this.state, items = S.bag.filter(Boolean), merged = [], ord = { equip: 0, pill: 1, mat: 2 };
    for (const it of items) { if (it.kind === 'equip') { merged.push(it); continue; } const m = merged.find(x => x.key === it.key && x.n < 99); if (m) { const a = Math.min(99 - m.n, it.n); m.n += a; if (it.n - a > 0) merged.push({ ...it, n: it.n - a }); } else merged.push({ ...it }); }
    merged.sort((a, b) => ord[a.kind] - ord[b.kind] || (a.kind === 'equip' ? b.rar - a.rar || b.lv - a.lv : (a.key > b.key ? 1 : -1))); S.bag = merged.concat(Array(S.bag.length - merged.length).fill(null)); this.ui.sel = null; Sound.play('ui');
  }
  sellJunk() { const S = this.state; let g = 0, c = 0; S.bag.forEach((it, i) => { if (it && ((it.kind === 'equip' && it.rar <= 1) || (it.kind === 'mat' && it.key.startsWith('m_')))) { g += itemPrice(it) * (it.n || 1); c++; S.bag[i] = null; } }); S.gold += g; this.ui.sel = null; this.ui.toast(c ? `Đã bán ${c} món – nhận ${fmt(g)} 💰` : 'Không có đồ phàm để bán', '#ffd24a', 1600); if (c) Sound.play('gold'); }
  shopPrice(k) { return Math.round(ITEMDEF[k].price * (1 + this.state.lvl * 0.06)); }
  buy(key, n) { const S = this.state, p = this.shopPrice(key) * n; if (S.gold < p) return; if (!this.addStack(key, n)) { this.bagFull(); return; } S.gold -= p; Sound.play('gold'); this.ui.refresh(); }
  bagCost() { return 300 * Math.pow((this.state.bag.length - 30) / 6 + 1, 2); }
  expandBag() { const S = this.state, c = this.bagCost(); if (S.bag.length >= 72 || S.gold < c) return; S.gold -= c; for (let i = 0; i < 6; i++) S.bag.push(null); Sound.play('rare'); this.ui.refresh(); }
  craft(i, n) {
    const r = RECIPES[i], S = this.state; let made = 0;
    for (let k = 0; k < n; k++) { if (S.gold < r.gold || !Object.keys(r.need).every(x => this.countItem(x) >= r.need[x])) break; const bag0 = JSON.stringify(S.bag); if (!this.addStack(r.out, r.n)) { S.bag = JSON.parse(bag0); this.bagFull(); break; } Object.keys(r.need).forEach(x => this.removeItem(x, r.need[x])); S.gold -= r.gold; made += r.n; }
    if (made) { this.ui.toast(`Luyện thành công: ${ITEMDEF[r.out].ic} ${ITEMDEF[r.out].name} ×${made}`, '#7dffb0', 1400); Sound.play('rare'); this.fx.burst(this.world.cauldronPos.x, 3, this.world.cauldronPos.z, 40); } this.ui.refresh();
  }
  enhanceCost(it) { const p = it.plus || 0; return { gold: Math.round(equipPrice(it) * 0.5 + it.lv * 25) * (1 + p), yd: 1 + p + Math.floor(it.lv / 25), rate: [100, 100, 100, 85, 70, 55, 45, 35, 28, 20][p] || 20 }; }
  enhance(ref) {
    const S = this.state, it = ref.eq ? S.equip[ref.eq] : S.bag[ref.bag]; if (!it || it.plus >= 10) return; const c = this.enhanceCost(it); if (S.gold < c.gold || this.countItem('yd') < c.yd) return;
    S.gold -= c.gold; this.removeItem('yd', c.yd);
    if (Math.random() * 100 < c.rate) { it.plus = (it.plus || 0) + 1; this.ui.toast(`✦ Cường hóa thành công! ${esc(it.name)} +${it.plus}`, '#7dffb0', 1600); Sound.play('rare'); this.fx.burst(this.world.cauldronPos.x, 3, this.world.cauldronPos.z, 50); } else { this.ui.toast('Cường hóa thất bại… (mất nguyên liệu)', '#ff7a7a', 1600); Sound.play('deny'); }
    this.recalc(); this.ui.refresh();
  }
  /* ---------- Chiến đấu ---------- */
  calcHit(mult, m) {
    const S = this.state, st = this.stats; let raw = st.atk * mult * rnd(0.92, 1.08); const crit = Math.random() * 100 < st.crit; if (crit) raw *= 1.8; raw -= m.def * 0.35;
    const gap = m.lvl - S.lvl; if (gap > 4) raw *= clamp(1 - (gap - 4) * 0.05, 0.25, 1); return { dmg: Math.max(1, Math.round(raw)), crit };
  }
  hitMonster(m, mult, from) {
    const r = this.calcHit(mult, m); m.hurt(r.dmg, r.crit, from || this.player.g.position); this.target = m; this.targetT = 5;
    if (this.stats.ls > 0) this.heal(r.dmg * this.stats.ls / 100); this.combatT = 0;
    const now = this.clock.elapsedTime; if (now - this.hit0 > 0.07) { this.hit0 = now; Sound.play(r.crit ? 'crit' : 'hit'); }
    this.fx.sparks(m.x, m.y + m.baseH * 0.5, m.z, r.crit ? 16 : 7, r.crit ? [1, 0.85, 0.3] : [0.7, 1, 0.8], r.crit ? 4 : 2.5); return r;
  }
  heal(v) { const S = this.state; S.hp = Math.min(this.stats.hp, S.hp + v); }
  hurtPlayer(dmg, mon) {
    if (this.player.dead || this.invuln > 0 || this.mode !== 'play') return 0; const S = this.state, gap = mon.lvl - S.lvl;
    let d = dmg * 100 / (100 + this.stats.def * 0.5) * clamp(1 + gap * 0.03, 0.6, 1.8); d = Math.max(1, Math.round(d * rnd(0.93, 1.07))); S.hp -= d; this.combatT = 0; this.recall = null; $('castbar').classList.add('hidden');
    const P = this.player.g.position; this.ui.floatText(P.x, P.y + 2.3, P.z, '-' + d, 'hurt'); this.ui.flash(); Sound.play('hurt'); this.shake = Math.max(this.shake, 0.18);
    if (S.hp <= 0) { S.hp = 0; this.die(); } return d;
  }
  die() { const S = this.state, P = this.player; P.dead = true; P.flying = false; this.slowOn = false; S.deaths++; S.exp = Math.floor(S.exp * 0.92); Sound.play('die'); this.pulses = []; this.bfl = null; setTimeout(() => { if (P.dead) $('death').classList.remove('hidden'); }, 1600); }
  revive() { const S = this.state; this.recalc(); S.hp = this.stats.hp; S.mp = this.stats.mp; this.spawnPlayer(SPAWN.x, SPAWN.z); this.fx.burst(SPAWN.x, 2.5, SPAWN.z, 80); this.ui.toast('Hồi sinh tại Linh Đài (mất 8% kinh nghiệm hiện có)', '#7dffb0', 2500); this.save(); }
  onKill(m) {
    const S = this.state, st = this.stats; S.kills++; const gap = S.lvl - m.lvl; let k = 1; if (gap > 8) k = Math.max(0.1, 1 - (gap - 8) * 0.1); else if (gap < -2) k = 1 + Math.min(0.5, (-gap - 2) * 0.05);
    const exp = Math.round(m.exp * k * (1 + st.exp / 100)); this.ui.floatText(m.x, m.y + m.baseH + 0.9, m.z, '+' + fmt(exp) + ' EXP', 'exp'); this.giveExp(exp);
    this.fx.burst(m.x, m.y + m.baseH * 0.5, m.z, m.boss ? 160 : 40); Sound.play('die'); if (m.boss) { S.bossKills[m.boss.id] = true; this.ui.toast(`👑 Đã hạ ${esc(m.name)}!`, '#ffd24a', 3500); Sound.play('rare'); this.shake = 0.5; }
    if (this.target === m) this.targetT = 0.5; this.dropLoot(m);
  }
  dropLoot(m) {
    const L = m.lvl, luck = 1 + this.stats.luck / 100, E = m.elite, B = !!m.boss, add = it => this.drops.add(it, m.x, m.z, m.y);
    const piles = B ? 4 : 1; for (let i = 0; i < piles; i++) add({ kind: 'gold', n: Math.round(L * rnd(3, 6) * (E ? 3 : 1) * (B ? 7 : 1)) + rint(1, 6) });
    const yd = B ? rint(8, 14) : E ? rint(1, 3) : Math.random() < 0.3 * luck ? rint(1, 2) : 0; if (yd) add(stackItem('yd', yd));
    if (Math.random() < 0.18 * luck) add(stackItem('herb', rint(1, 3)));
    if (Math.random() < 0.55) add(stackItem('m_' + m.key, rint(1, 2)));
    if (Math.random() < 0.05) add(stackItem('hp1', 1)); if (Math.random() < 0.04) add(stackItem('mp1', 1)); if (L > 30 && Math.random() < 0.03) add(stackItem(Math.random() < 0.5 ? 'hp2' : 'mp2', 1));
    let ne = B ? 3 : E ? (Math.random() < 0.5 ? 2 : 1) : Math.random() < 0.17 * luck ? 1 : 0;
    for (let i = 0; i < ne; i++) { let r = rollRarity(B ? 3 : E ? 0.8 : 0); if (B) r = Math.max(r, i === 0 ? 3 : 2); else if (E) r = Math.max(r, 1); add(makeEquip(L + rint(-1, 2), r)); }
  }
  giveExp(n) {
    const S = this.state; if (S.lvl >= MAX_LV) return; S.exp += n; let up = false;
    while (S.lvl < MAX_LV && S.exp >= expNeed(S.lvl)) { S.exp -= expNeed(S.lvl); S.lvl++; up = true; this.recalc(); S.hp = this.stats.hp; S.mp = this.stats.mp; const un = Object.keys(SKILLS).find(k => SKILLS[k].lv === S.lvl); if (un) this.ui.log(`<b style="color:#7dffb0">Mở khóa kỹ năng ${SKILLS[un].ic} ${SKILLS[un].n} (phím ${un})</b>`); }
    if (S.lvl >= MAX_LV) S.exp = 0;
    if (up) { const P = this.player.g.position; this.fx.burst(P.x, P.y + 1, P.z, 150); this.ui.floatText(P.x, P.y + 2.8, P.z, 'LEVEL UP! Lv.' + S.lvl, 'lvl'); Sound.play('level'); this.ui.toast(`✦ Thăng cấp! Lv.${S.lvl} ✦`, '#7dffb0', 2600); this.ui.log(`<b style="color:#7dffb0">Chúc mừng! Bạn đã đạt cấp ${S.lvl}</b>`); this.ab = 1; this.ui.refresh(); }
  }
  /* ---------- Đan dược bay ---------- */
  attackPlayer() { if (this.mode === 'play' && !this.paused() && this.player.attack()) Sound.play('cast'); }
  onPill(pl) {
    const P = this.player, p = P.g.position, f = P.face, tg = this.mm.nearest(p.x, p.z, 26, f, 1.2) || (this.target && this.target.alive && this.target.active && Math.hypot(this.target.x - p.x, this.target.z - p.z) < 20 ? this.target : null);
    pl.userData = { vx: Math.sin(f) * 18, vy: 0.5, vz: Math.cos(f) * 18, life: 1.5, tgt: tg }; this.pills.push(pl);
  }
  updatePills(dt) {
    for (let i = this.pills.length - 1; i >= 0; i--) {
      const pl = this.pills[i], d = pl.userData, p = pl.position; d.life -= dt;
      const t = d.tgt; if (t && t.alive) { const tx = t.x - p.x, ty = t.y + t.baseH * 0.5 + (t.hover || 0) - p.y, tz = t.z - p.z, l = Math.hypot(tx, ty, tz) || 1, k = Math.min(1, dt * 8); d.vx += (tx / l * 20 - d.vx) * k; d.vy += (ty / l * 20 - d.vy) * k; d.vz += (tz / l * 20 - d.vz) * k; }
      p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt; this.fx.emit(p.x, p.y, p.z, 0, 0.2, 0, 0.35, [0.7, 1, 0.5]); let hit = null;
      this.mm.near(p.x, p.z, 0.5, m => { if (!hit && Math.abs(p.y - (m.y + m.baseH * 0.5 + (m.hover || 0))) < m.baseH * 0.6 + 1.0) hit = m; });
      if (hit || d.life <= 0 || p.y < this.world.heightAt(p.x, p.z) - 0.2) {
        if (hit) { this.hitMonster(hit, 1.15, p); this.mm.near(p.x, p.z, 2.2, m => { if (m !== hit) this.hitMonster(m, 0.35, p); }); }
        this.fx.sparks(p.x, p.y, p.z, 10, [0.7, 1, 0.5], 2); this.fx.pts && 0; this.player.fx.remove(pl); this.pills.splice(i, 1);
      }
    }
  }
  /* ---------- Kỹ năng ---------- */
  pressKey(k) { if (k === 'J') this.attackPlayer(); else if (/^[1-8]$/.test(k)) this.castSkill(+k); }
  aoe(r, mult, x, z) { const P = this.player.g.position; let n = 0; this.mm.near(x ?? P.x, z ?? P.z, r, m => { this.hitMonster(m, mult, { x: x ?? P.x, z: z ?? P.z }); n++; }); return n; }
  castSkill(n) {
    if (this.mode !== 'play' || this.paused() || this.player.dead) return; const S = this.state, sk = SKILLS[n], P = this.player, p = P.g.position, st = this.stats;
    if (S.lvl < sk.lv) { this.ui.toast(`🔒 ${sk.n} mở khóa ở cấp ${sk.lv}`, '#ff9a6a', 1200); Sound.play('deny'); return; }
    if ((this.cd[n] || 0) > 0) return; if (n !== 4 && n !== 6 && S.mp < sk.mp) { this.ui.toast('Không đủ linh lực', '#7ab4ff', 800); Sound.play('deny'); return; }
    const pay = () => { S.mp -= sk.mp; this.cd[n] = sk.cd; this.combatT = 0; Sound.play('skill'); };
    switch (n) {
      case 1: if (!P.play(1)) return; pay(); this.invuln = Math.max(this.invuln, 0.75); break;
      case 2: if (!P.play(2)) return; pay(); this.pulses.push({ t: 0, next: 0.1, n: 4, step: 0.22, r: 3.8, m: 0.9 }); break;
      case 3: if (!P.play(3)) return; pay(); this.pulses.push({ t: 0, next: 0.45, n: 7, step: 0.4, r: 4.8, m: 1.0 }); break;
      case 4: if (P.flying) { P.play(4); this.cd[4] = 1; } else { if (S.mp < 10) { this.ui.toast('Cần ít nhất 10 linh lực để ngự kiếm', '#7ab4ff', 1000); return; } P.play(4); this.cd[4] = 1; Sound.play('skill'); } break;
      case 5: if (!P.play(5)) return; pay(); this.leapPending = true; break;
      case 6: if (this.slowOn) { this.slowOn = false; this.cd[6] = 2; } else { if (S.mp < 10) { this.ui.toast('Cần ít nhất 10 linh lực', '#7ab4ff', 1000); return; } this.slowOn = true; Sound.play('skill'); } break;
      case 7: this.blink(); pay(); break;
      case 8: pay(); this.fx.swarm(p); this.bfl = { t: 0, next: 0.4 }; break;
    }
  }
  blink() {
    const P = this.player.g.position, dx = Math.sin(this.player.face), dz = Math.cos(this.player.face); for (let i = 0; i < 6; i++) this.fx.ghost(P.x + dx * i * 1.3, P.y, P.z + dz * i * 1.3); this.fx.burst(P.x, P.y + 1, P.z, 80);
    let nx = P.x, nz = P.z; for (let s = 0.5; s <= 8; s += 0.5) { const tx = P.x + dx * s, tz = P.z + dz * s; if ((!this.player.flying && !this.world.canStep(nx, nz, tx, tz)) || this.world.nearCollider(tx, tz, 0.4)) break; nx = tx; nz = tz; }
    const r = Math.hypot(nx, nz), lim = WORLD.R - 5; if (r > lim) { nx *= lim / r; nz *= lim / r; } P.x = nx; P.z = nz; this.player.gy = this.world.groundY(nx, nz); P.y = this.player.gy + this.player.y; this.fx.burst(P.x, P.y + 1, P.z, 80); this.ab = 1; this.invuln = Math.max(this.invuln, 0.5);
  }
  onLand(v) { if (this.leapPending && this.player.act && this.player.act.n === 'leap') { this.leapPending = false; const P = this.player.g.position; this.aoe(5.8, 2.6); this.fx.burst(P.x, P.y + 0.3, P.z, 100); this.shake = 0.35; Sound.play('slam'); } }
  updateSkills(dt) {
    const P = this.player.g.position;
    for (let i = this.pulses.length - 1; i >= 0; i--) { const q = this.pulses[i]; q.t += dt; while (q.n > 0 && q.t >= q.next) { q.next += q.step; q.n--; const c = this.aoe(q.r, q.m); this.fx.burst(P.x, P.y + 1, P.z, 18); if (c) Sound.play('hit'); } if (q.n <= 0) this.pulses.splice(i, 1); }
    if (this.bfl) { const b = this.bfl; b.t += dt; if (b.t >= b.next) { b.next += 0.5; const hits = []; this.mm.near(P.x, P.z, 13, m => hits.push(m)); hits.sort((a, c) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(c.x - P.x, c.z - P.z)); hits.slice(0, 5).forEach(m => { this.hitMonster(m, 0.75, P); this.fx.sparks(m.x, m.y + 1.2, m.z, 10, [0.7, 1, 0.5], 2); }); this.heal(this.stats.hp * 0.012); } if (b.t > 4.5) this.bfl = null; }
    if (this.player.flying) { this.state.mp -= (4 + this.state.lvl * 0.04) * dt; if (this.state.mp <= 0) { this.state.mp = 0; this.player.flying = false; this.ui.toast('Hết linh lực – hạ xuống', '#7ab4ff', 1200); } }
    if (this.slowOn) { this.state.mp -= (3 + this.state.lvl * 0.03) * dt; if (this.state.mp <= 0) { this.state.mp = 0; this.slowOn = false; } }
  }
  slamWarn(m) { const R = 6.5 * Math.max(1, m.size * 0.5), g = new T.Mesh(new T.RingGeometry(0.92, 1, 40), new T.MeshBasicMaterial({ color: 0xff3a2a, side: T.DoubleSide, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })), f = new T.Mesh(new T.CircleGeometry(1, 36), new T.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false })); g.add(f); g.rotation.x = -Math.PI / 2; g.position.set(m.x, m.y + 0.2, m.z); g.scale.setScalar(R); this.scene.add(g); this.slams.push({ g, f, t: 0, dur: 1.4, R, m }); Sound.play('boss'); }
  slamHit(m, R) { this.fx.burst(m.x, m.y + 0.5, m.z, 120); this.shake = 0.6; Sound.play('slam'); }
  /* ---------- Hồi thành, tương tác ---------- */
  startRecall() { if (this.mode !== 'play' || this.player.dead) return; if (this.world.isSafe(this.player.g.position.x, this.player.g.position.z)) { this.ui.toast('Bạn đang ở Linh Đài', '#aaa', 900); return; } if (this.recallCd > 0) { this.ui.toast('Hồi thành chưa sẵn sàng (' + Math.ceil(this.recallCd) + 's)', '#ff9a6a', 1000); return; } this.recall = { t: 0 }; $('castbar').classList.remove('hidden'); Sound.play('skill'); }
  doInteract() {
    const it = this.interactTarget; if (!it || this.player.dead) return; it.fn();
  }
  updateInteract() {
    const P = this.player.g.position, w = this.world; let t = null; const cp = w.cauldronPos, np = w.npcPos;
    if (Math.hypot(P.x - cp.x, P.z - cp.z) < 4 || Math.hypot(P.x - np.x, P.z - np.z) < 3.5) t = { text: '[E] Đan Lò · Cửa hàng · Cường hóa', fn: () => this.ui.toggle('shop') };
    else { let best = null, bd = 3; for (const h of w.herbs) { if (!h.alive) continue; const d = Math.hypot(h.x - P.x, h.z - P.z); if (d < bd) { bd = d; best = h; } } if (best) t = { text: '[E] Hái Linh Thảo 🌿', fn: () => this.gather(best) }; }
    this.interactTarget = t;
  }
  gather(h) {
    if (!h.alive) return; const n = rint(1, 3); if (!this.addStack('herb', n)) { this.bagFull(); return; } h.alive = false; h.t = 90; this.world.herbRefresh(this.clock.elapsedTime); this.fx.sparks(h.x, h.y + 0.8, h.z, 18, [0.5, 1, 0.7], 2); this.ui.log(`Hái được <b>🌿 Linh Thảo</b> ×${n}`); Sound.play('pick'); this.ui.refresh();
  }
  /* ---------- Điều khiển ---------- */
  paused() { return this.pauseOpen || this.helpOpen || this.mode !== 'play' || this.ui.anyPanel(); }
  bind() {
    const ui = this.ui;
    addEventListener('keydown', e => {
      if (e.repeat && e.code !== 'KeyJ') { if (e.code === 'Space') e.preventDefault(); return; }
      this.keys[e.code] = true; Sound.init();
      if (this.mode === 'title') return;
      if (e.code === 'Escape') { if (this.helpOpen) this.setHelp(false); else if (ui.anyPanel()) ui.closePanels(); else this.setPause(!this.pauseOpen); return; }
      if (e.code === 'F1') { e.preventDefault(); this.setHelp(!this.helpOpen); return; }
      if (this.pauseOpen || this.helpOpen) return;
      if (e.code === 'Space') { e.preventDefault(); if (this.player.dead) return; this.player.jump(); }
      if (e.code === 'KeyI') ui.toggle('inv'); if (e.code === 'KeyM') ui.toggle('mapPanel'); if (e.code === 'KeyB') ui.toggle('inv');
      if (this.paused()) return;
      if (e.code === 'KeyJ') this.attackPlayer(); if (/^Digit[1-8]$/.test(e.code)) this.castSkill(+e.code.slice(5));
      if (e.code === 'KeyQ') this.usePotion('hp'); if (e.code === 'KeyR') this.usePotion('mp'); if (e.code === 'KeyH') this.startRecall(); if (e.code === 'KeyE') this.doInteract();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    const el = this.renderer.domElement; let drag = null;
    el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button }; el.setPointerCapture(e.pointerId); Sound.init(); });
    el.addEventListener('pointerup', e => { if (drag && drag.btn === 0 && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6 && this.mode === 'play') this.attackPlayer(); drag = null; });
    el.addEventListener('pointermove', e => { if (!drag) return; this.cam.yaw -= (e.clientX - drag.x) * 0.006; this.cam.pitch = clamp(this.cam.pitch + (e.clientY - drag.y) * 0.005, -0.05, 1.3); drag.x = e.clientX; drag.y = e.clientY; });
    el.addEventListener('wheel', e => { this.cam.dist = clamp(this.cam.dist + e.deltaY * 0.005, 3, 16); e.preventDefault(); }, { passive: false }); el.addEventListener('contextmenu', e => e.preventDefault());
    $('bNew').onclick = () => { if (this.readSave() && !confirm('Bắt đầu mới sẽ ghi đè dữ liệu đã lưu. Tiếp tục?')) return; this.startNew(); };
    $('bContinue').onclick = () => this.loadGame(); $('bHelp').onclick = () => this.setHelp(true); $('hClose').onclick = () => this.setHelp(false);
    $('pResume').onclick = () => this.setPause(false); $('pSave').onclick = () => this.save(true); $('pHelp').onclick = () => { this.setPause(false); this.setHelp(true); }; $('pRecall').onclick = () => { this.setPause(false); this.startRecall(); };
    $('pMenu').onclick = () => { this.save(); this.setPause(false); this.showTitle(); }; $('bRevive').onclick = () => this.revive();
    $('qSel').onchange = e => this.applyQuality(e.target.value); $('pSound').onclick = () => { this.sound = !this.sound; Sound.setOn(this.sound); $('pSound').textContent = this.sound ? 'Bật' : 'Tắt'; this.saveSettings(); }; $('pSound').textContent = this.sound ? 'Bật' : 'Tắt';
    addEventListener('beforeunload', () => { if (this.mode === 'play') this.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play') { this.save(); if (!this.paused()) this.setPause(true); } });
  }
  setPause(v) { this.pauseOpen = v; $('pause').classList.toggle('hidden', !v); if (v) $('qSel').value = this.quality; }
  setHelp(v) { this.helpOpen = v; $('help').classList.toggle('hidden', !v); }
  /* ---------- Vòng lặp ---------- */
  loop() {
    requestAnimationFrame(() => this.loop()); if (!this.renderer) return;
    const rdt = Math.min(this.clock.getDelta(), 0.05), T0 = this.clock.elapsedTime, k = this.keys, c = this.cam, S = this.state, P = this.player, p = P.g.position, play = this.mode === 'play', paused = this.paused();
    this.ts += ((this.slowOn && play ? 0.3 : 1) - this.ts) * Math.min(1, rdt * 6);
    const mdt = paused ? 0 : rdt * this.ts, pdt = paused ? 0 : rdt * (0.55 + 0.45 * this.ts);
    if (play && !paused) {
      S.time += rdt;
      const f = { x: -Math.sin(c.yaw), z: -Math.cos(c.yaw) }, r = { x: -f.z, z: f.x }, fw = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), rt = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      P.update(pdt, { x: f.x * fw + r.x * rt, z: f.z * fw + r.z * rt }, k.ShiftLeft || k.ShiftRight, this.world);
      if (k.KeyJ) this.attackPlayer();
      this.invuln = Math.max(0, this.invuln - rdt); this.potCd = Math.max(0, this.potCd - rdt); this.recallCd = Math.max(0, this.recallCd - rdt); this.targetT = Math.max(0, this.targetT - rdt); this.combatT += rdt;
      for (const n in this.cd) if (this.cd[n] > 0) this.cd[n] = Math.max(0, this.cd[n] - rdt);
      for (const n in S.buffs) { const b = S.buffs[n]; if (b.t > 0) { b.t -= rdt; if (b.t <= 0) { this.recalc(); this.ui.log('Hiệu lực đan dược đã hết'); } } }
      const st = this.stats, safe = this.world.isSafe(p.x, p.z);
      if (!P.dead) { S.mp = Math.min(st.mp, S.mp + st.mp * (this.combatT > 4 ? 0.025 : 0.012) * rdt); if (safe) S.hp = Math.min(st.hp, S.hp + st.hp * 0.1 * rdt); else if (this.combatT > 5) S.hp = Math.min(st.hp, S.hp + st.hp * 0.012 * rdt); }
      this.updateSkills(pdt); this.updatePills(pdt); this.updateInteract();
      if (this.recall) { const rc = this.recall; rc.t += rdt; $('castbar').firstElementChild.style.width = rc.t / 3 * 100 + '%'; $('castbar').lastElementChild.textContent = 'Đang hồi thành…'; if (P.speed > 0.2 || P.act || P.flying) { this.recall = null; $('castbar').classList.add('hidden'); } else if (rc.t >= 3) { this.recall = null; $('castbar').classList.add('hidden'); this.fx.burst(p.x, p.y + 1, p.z, 100); this.spawnPlayer(SPAWN.x, SPAWN.z); this.fx.burst(SPAWN.x, 2.5, SPAWN.z, 100); this.recallCd = 30; Sound.play('level'); } }
      this.saveT -= rdt; if (this.saveT <= 0) { this.saveT = 15; if (!P.dead) this.save(); }
      for (const h of this.world.herbs) if (!h.alive) { h.t -= rdt; if (h.t <= 0) { h.alive = true; this.world.herbRefresh(T0); } }
    } else if (this.mode === 'title') { P.update(rdt, { x: 0, z: 0 }, false, this.world); c.yaw += rdt * 0.08; }
    if (play) { this.mm.update(mdt, p, T0, this.camera, rdt * (paused ? 0 : 1)); this.drops.update(paused ? 0 : rdt, p, T0); }
    for (let i = this.slams.length - 1; i >= 0; i--) { const s = this.slams[i]; s.t += mdt; const u = clamp(s.t / s.dur, 0, 1); s.f.scale.setScalar(u); s.g.material.opacity = 0.5 + 0.4 * Math.sin(T0 * 20); if (s.t > s.dur + 0.15 || !s.m.alive) { this.scene.remove(s.g); s.g.geometry.dispose(); s.g.material.dispose(); s.f.geometry.dispose(); s.f.material.dispose(); this.slams.splice(i, 1); } }
    this.world.update(T0, rdt, p, this.camera); this.fx.update(pdt, P, T0); this.plLight.position.set(p.x, p.y + 2.2, p.z); this.plLight.intensity = 0.6 + (play ? 0 : 0.2);
    // camera
    this.ct.lerp(_cv.set(p.x, p.y + 1.25, p.z), 1 - Math.exp(-rdt * 12)); const cp = Math.cos(c.pitch); this.shake *= Math.exp(-rdt * 6);
    let cx = this.ct.x + Math.sin(c.yaw) * cp * c.dist, cz = this.ct.z + Math.cos(c.yaw) * cp * c.dist, cy = this.ct.y + Math.sin(c.pitch) * c.dist;
    cy = Math.max(cy, this.world.groundY(cx, cz) + 0.9); this.camera.position.set(cx + rnd(-1, 1) * this.shake, cy + rnd(-1, 1) * this.shake, cz + rnd(-1, 1) * this.shake); this.camera.lookAt(this.ct);
    this.camera.fov = 55 + P.speed * 6 + (1 - this.ts) * 6 + this.ab * 8 + (P.flying ? 6 : 0); this.camera.updateProjectionMatrix();
    if (this.composer) { this.bloom.strength = 0.5 + (1 - this.ts) * 0.5 + this.ab * 0.6; const u = this.gradePass.uniforms; u.time.value = T0; u.ab.value = 0.0015 + this.ab * 0.012 + (1 - this.ts) * 0.004; u.tint.value = (1 - this.ts) / 0.75; }
    this.ab *= Math.exp(-rdt * 4);
    if (play) { this.ui.updateHud(rdt); this.ui.updateFloaters(rdt, this.camera); }
    this.ema = this.ema * 0.95 + rdt * 0.05;
    if (++this.fc % 90 === 0) { const mx = Math.min(devicePixelRatio, this.maxPR); let pr = this.pr; if (this.ema > 0.024) pr = Math.max(0.6, pr - 0.15); else if (this.ema < 0.0175) pr = Math.min(mx, pr + 0.1); if (Math.abs(pr - this.pr) > 0.01) { this.pr = pr; this.renderer.setPixelRatio(pr); if (this.composer) this.composer.setPixelRatio(pr); this.resize(); } }
    if (this.useComposer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
const _cv = new T.Vector3();
let G;
window.addEventListener('load', () => { G = window.__G = new Game(); setTimeout(() => G.boot(), 60); });
