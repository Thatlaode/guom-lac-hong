/* =====================================================================
   GƯƠM LẠC HỒNG — client chơi mạng (PC + điện thoại chung trận)
   Server quyết định; client vẽ, nội suy, gửi ý định. Tên hiển thị thuần Việt.
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ECODE = { kiem: 'KIEM', tram: 'TRAM', tre: 'TRE', duoc: 'DUOC', bang: 'BANG', lua: 'LUA', hoa: 'HOA', gao: 'GAO', thach: 'THACH', chieng: 'CHIENG' };
const DCODE = { kiem: 'THANKIEM', tram: 'NGANCHAM', tre: 'THIETTRUC', duoc: 'BACHTHAO', bang: 'HAITHUONG', lua: 'THUYTIEN', hoa: 'VIEMDAO', gao: 'HOALIEN', thach: 'THIETSON', chieng: 'DONGCO' };
const DICON = { kiem: '⚔️', tram: '🪡', tre: '🎋', duoc: '🌿', bang: '🔱', lua: '🎐', hoa: '🔥', gao: '🏮', thach: '⛰️', chieng: '🔔' };
const FXCOL = { pill: [0.6, 1, 0.5], vine: [0.4, 1, 0.4], water: [0.5, 0.8, 1], fire: [1, 0.55, 0.2], mon: [1, 0.4, 0.8], needle: [0.92, 0.95, 1], needleBig: [1, 1, 1], silk: [0.6, 0.92, 1], gong: [1, 0.82, 0.35], petal: [1, 0.3, 0.25] };
const FXSIZE = { fire: 1.3, needle: 0.45, needleBig: 1.1, silk: 1.0, gong: 1.7, petal: 1.25 };
const SETK = 'glh_settings_v1';
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();

class OnlineGame {
  constructor() {
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.S = Object.assign({ name: '', fk: 'kiem', grade: 'coPhong', tagName: true, tagHp: true, tagMon: 'engaged', tagSize: 1, gyro: 'off', gyroSens: 1, gyroInvX: false, gyroInvY: false, quality: this.isTouch ? 'low' : 'mid', sens: 1, invY: false, fpv: false, btn: 1, dmgNum: true, fps: false, vib: true }, this.loadSet());
    this.mode = 'loading'; this.keys = {}; this.players = new Map(); this.mons = new Map(); this.projs = new Map(); this.drops = new Map(); this.chests = new Map(); this.zfx = [];
    this.cam = { yaw: 0, pitch: 0.18, dist: 4.6 }; this.ct = new THREE.Vector3(); this.me = null; this.my = null; this.snapZone = null; this.fl = []; this.flPool = []; this.shake = 0; this.lastFight = -99;
    this.input = { mx: 0, mz: 0, atk: false }; this.sendT = 0; this.serverT = 0; this.tm = 0; this.ema = 0.016; this.fc = 0; this.pr = 1;
    if (this.isTouch) document.body.classList.add('touch');
  }
  loadSet() { try { return JSON.parse(localStorage.getItem(SETK)) || {}; } catch (e) { return {}; } }
  saveSet() { try { localStorage.setItem(SETK, JSON.stringify(this.S)); } catch (e) { } }
  step(p, text, fn) { $('lfill').style.width = p * 100 + '%'; $('ltext').textContent = text; return new Promise(r => setTimeout(() => { fn && fn(); r(); }, 30)); }
  async boot() {
    try { const t = await fetch('/api/tune').then(r => r.json()); if (t && t.f) GLH.setTune(t); } catch (e) { } // số liệu Admin đang dùng
    if (!GLH.FACTIONS[this.S.fk] || !GLH.FACTIONS[this.S.fk].on) this.S.fk = GLH.FACTION_ON[0] || 'kiem';
    await Assets.load(); await Audio2.load(); Audio2.memeOn = this.S.meme !== false; if (Assets.url('LOGO-MAIN')) { $('logoL').innerHTML = Assets.icon('LOGO-MAIN', 'GƯƠM LẠC HỒNG', 'logoimg'); }
    await this.step(0.1, 'Khởi tạo đồ họa…', () => this.initGL());
    await this.step(0.3, 'Dựng núi sông, rừng tre…', () => { applyPaletteToZones(); this.world = new World(this.scene); });
    await this.step(0.7, 'Gọi gió, thắp đèn…', () => {
      this.fx = new Fx(this.scene); this.mapCanvas = document.createElement('canvas'); this.mapCanvas.width = this.mapCanvas.height = 512; this.world.renderMap(this.mapCanvas);
      this.suong = this.makeSuong(); this.camLight = new THREE.PointLight(0xffe6c0, 0.6, 18, 2); this.scene.add(this.camLight);
      this.preview = new Rig({ hex: GLH.FACTIONS[this.S.fk].hex }); this.previewW = this.preview.attach('weapon', rigWeapon(this.S.fk)); this.scene.add(this.preview.g); this.preview.useChar(this.S.fk);
    });
    await this.step(0.8, 'Gọi các Dòng võ…', null); try { await Promise.race([Promise.all([CharLib.allClips(), CharLib.template(this.S.fk)]), new Promise(r => setTimeout(r, 25000))]); } catch (e) { }
    GLH.FACTION_KEYS.forEach(fk => CharLib.template(fk).catch(() => { }));
    await this.step(0.9, 'Mở sân đình…', () => { this.hud = new Hud(this); TouchGuard.init(this); Voice.init(this); this.applyQuality(this.S.quality); this.bindInput(); this.connect(); });
    $('loading').classList.add('hidden'); this.showHome(); this.clock = new THREE.Clock(); this.loop();
  }
  initGL() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.isTouch, powerPreference: 'high-performance' }); r.domElement.id = 'gl'; document.body.insertBefore(r.domElement, document.body.firstChild);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
    if (THREE.EffectComposer && THREE.UnrealBloomPass) { const cp = new THREE.EffectComposer(r); cp.addPass(new THREE.RenderPass(this.scene, this.camera)); this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.6, 0.82); cp.addPass(this.bloom); this.grade = new THREE.ShaderPass(GradeShaderV); cp.addPass(this.grade); this.composer = cp; }
    addEventListener('resize', () => this.resize()); this.resize();
  }
  /* bộ lọc màu do người chơi chọn (QĐ-0034) */
  applyGrade(k) {
    const g = GRADES[k] || GRADES.coPhong; this.S.grade = GRADES[k] ? k : 'coPhong';
    if (this.grade) { const u = this.grade.uniforms; u.sat.value = g.sat; u.con.value = g.con; u.temp.value = g.temp; u.sh.value.set(...g.sh); u.hi.value.set(...g.hi); u.shK.value = g.shK; u.hiK.value = g.hiK; }
    if (this.bloom) this.bloom.strength = g.bloom; this.renderer.toneMappingExposure = 1.0 * g.exp;
    this.renderer.domElement.style.filter = this.useComposer ? '' : gradeCss(g);
  }
  resize() { this.renderer.setSize(innerWidth, innerHeight); if (this.composer) this.composer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  applyQuality(q) {
    this.S.quality = q; const W = { low: 'low', mid: 'mid', high: 'high', ultra: 'high' }[q] || 'mid'; this.world.setQuality(W);
    this.maxPR = { low: 0.85, mid: 1.25, high: 1.6, ultra: 2 }[q] || 1.25; this.pr = Math.min(devicePixelRatio, this.maxPR); this.renderer.setPixelRatio(this.pr); if (this.composer) this.composer.setPixelRatio(this.pr);
    this.useComposer = !!this.composer && q !== 'low'; this.applyGrade(this.S.grade); this.renderer.shadowMap.enabled = q !== 'low'; this.resize(); this.saveSet();
    const seen = new Set(); this.scene.traverse(o => { if (o.material && !seen.has(o.material)) { seen.add(o.material); o.material.needsUpdate = true; } });
  }
  /* ---------------- Mạng ---------------- */
  connect() {
    const ws = this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => { $('net').classList.add('hidden'); this.hello(); };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onNet(m); };
    ws.onclose = () => { $('net').classList.remove('hidden'); setTimeout(() => this.connect(), 2000); if (this.mode === 'play' || this.mode === 'lobby') { this.mode = 'home'; this.endMatchView(); this.showHome(); } };
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  hello() { this.send({ t: 'hello', name: this.S.name || 'Người chơi', fk: this.S.fk, touch: this.isTouch }); }
  onNet(m) {
    switch (m.t) {
      case 'welcome': this.serverPreset = m.preset; break;
      case 'lobby': this.hud.lobby(m); break;
      case 'start': if (m.tune) GLH.setTune(m.tune); this.startMatch(m); break;
      case 's': this.onSnap(m); break;
      case 'me': this.my = m; break;
      case 'e': for (const e of m.e) this.onEvent(e); break;
      case 'corr': if (this.me) { if (m.hard) { this.me.cx = m.x; this.me.cz = m.z; this.me.smooth = 1; } else { this.me.x = m.x; this.me.z = m.z; } } break;
      case 'toast': this.hud.toast(m.text, m.col); break;
      case 'eqd': this.hud.feed(`Mặc <b style="color:${GLH.RAR[m.rar].c}">${esc(m.name)}</b>`); break;
      case 'dead': this.announce('BI-LOAI'); this.hud.dead(m); Audio2.bgm('BGM-DEFEAT'); break;
      case 'rtc': Voice.onSignal(m); break;
      case 'chat': Voice.onChat(m); break;
      case 'end': TouchGuard.stop(); Voice.closeAll(); Voice.setTalk(false); if (m.place === 1) { this.announce('THANG'); this.me && this.say(this.me, 'THANG', { pri: true }); } this.hud.result(m); this.mode = 'result'; this.unlock(); Audio2.bgm(m.place === 1 ? 'BGM-VICTORY' : 'BGM-DEFEAT'); break;
    }
  }
  queue(mode) { this.S.name = ($('pname').value || '').trim().slice(0, 18) || this.S.name || 'Người chơi'; this.saveSet(); Audio2.init(); this.hello(); this.send({ t: 'queue', mode }); if (mode !== 'practice') { this.mode = 'lobby'; this.hud.show('lobby'); Audio2.bgm('BGM-LOBBY'); } Audio2.play('UI-CLICK'); }
  /* ---------------- Bắt đầu / kết thúc trận ---------------- */
  startMatch(m) {
    this.endMatchView(); this.mode = 'play'; TouchGuard.start(); if (this.S.mic === 'open') Voice.enable(); this.myId = m.you; this.ks = {}; this.fb = false; this.alive = 0; setTimeout(() => { this.announce('BAT-DAU'); setTimeout(() => this.me && this.say(this.me, 'VAO'), 1600); }, 1200); this.aimAssist = m.cfg.aimAssist; this.matchSize = m.size; this.preview.g.visible = false;
    for (const [id, name, fk, bot, x, z, face] of m.players) this.addPlayer(id, name, fk, bot, x, z, face);
    for (const a of m.mons) this.addMon(...a);
    if (this.propsV) this.scene.remove(this.propsV.g); this.propsV = m.props ? new PropsView(this.scene, m.props, this.world) : null; this.pidx = this.propsV ? this.propsV.idx : null; this.snapN = 0;
    this.me = this.players.get(this.myId); this.me.isMe = true; this.me.x = this.me.tx; this.me.z = this.me.tz; this.cam.yaw = this.me.face; this.me.tag.visible = false;
    this.zone = m.zone; this.hud.show('hud'); this.hud.startMatch(m); Audio2.play('UI-MATCH-FOUND'); Audio2.bgm('BGM-MATCH-CALM'); this.matchT0 = performance.now();
    if (this.isTouch) this.hud.goFull();
  }
  endMatchView() {
    for (const p of this.players.values()) this.scene.remove(p.rig.g); this.players.clear();
    for (const mo of this.mons.values()) if (mo.mesh) this.scene.remove(mo.mesh); this.mons.clear();
    for (const p of this.projs.values()) this.scene.remove(p.mesh); this.projs.clear();
    for (const d of this.drops.values()) this.scene.remove(d.g); this.drops.clear();
    for (const c of this.chests.values()) this.scene.remove(c.g); this.chests.clear();
    for (const z of this.zfx) this.scene.remove(z.g); this.zfx = []; for (const k in Audio2.loops) Audio2.loop(k, false); this.me = null; this.my = null; this.suong.visible = false;
  }
  leave() { this.send({ t: 'leave' }); this.mode = 'home'; this.endMatchView(); this.showHome(); }
  showHome() { this.mode = 'home'; this.unlock(); this.hud.show('home'); this.preview.g.visible = true; Audio2.bgm('BGM-TITLE'); }
  /* ---------------- Thực thể ---------------- */
  addPlayer(id, name, fk, bot, x, z, face) {
    const F = GLH.FACTIONS[fk], rig = new Rig({ hex: F.hex, handR: fk === 'duoc' ? 'cam_dan' : fk === 'thach' ? 'nam' : 'cam_kiem' }); rig.attach('weapon', rigWeapon(fk)); rig.onArm = on => Audio2.play(on ? 'SFX-DRAW' : 'SFX-SHEATHE', rig.g.position.x, rig.g.position.z, { vol: 0.6 }); rig.useChar(fk);
    const tag = this.nameTag((bot ? '' : '') + name, F.col); tag.position.y = 2.25; rig.g.add(tag);
    const bar = this.hpBar(); bar.position.y = 2.02; rig.g.add(bar);
    this.scene.add(rig.g); const P = { id, name, fk, bot: !!bot, rig, tag, bar, x, z, y: 0, jy: 0, vy: 0, tjy: 0, tx: x, tz: z, face, tface: face, buf: [], alive: true, fly: false, hp: 1, mhp: 1, lvl: 1, fl: 1, speed: 0, gy: this.world.groundY(x, z) };
    rig.g.position.set(x, P.gy, z); this.players.set(id, P); this.loadModelFor(P); return P;
  }
  loadModelFor(P) { const u = Assets.url('CHAR-' + ECODE[P.fk] + '-BASE'); if (!u) return; fetch(u).then(r => r.json()).then(pf => { const base = u.replace(/[^/]+$/, ''); P.rig.loadModel(base + (pf.file || 'model.glb'), pf); }).catch(() => { }); }
  nameTag(text, col) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 72; const x = c.getContext('2d'); x.font = 'bold 34px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 256, 48); x.fillStyle = col; x.fillText(text, 256, 48);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false })); s.scale.set(3.4, 0.48, 1); s.renderOrder = 998; return s;
  }
  hpBar() { const g = new THREE.Group(), bg = new THREE.Mesh(barPlane, barBg), fg = new THREE.Mesh(barPlane, barFg.b); bg.scale.x = 1.05; bg.renderOrder = 996; fg.renderOrder = 997; fg.position.z = 0.001; g.add(bg, fg); g.userData.fg = fg; return g; }
  setBar(bar, r) { const fg = bar.userData.fg; r = Math.max(0, Math.min(1, r)); fg.scale.x = Math.max(0.001, r); fg.position.x = -(1 - r) / 2; }
  addMon(id, key, lvl, elite, boss, x, z, maxHp, name) {
    const t = MTYPES[key]; if (!t) return; const mo = { id, key, t, lvl, elite: !!elite, boss: !!boss, x, z, tx: x, tz: z, face: 0, tface: 0, hp: maxHp, maxHp, st: 0, mv: 0, ph: Math.random() * 6, name, mesh: null, alive: true, seen: 0 }; this.mons.set(id, mo); return mo;
  }
  buildMon(mo) {
    const t = mo.t, color = mo.boss ? 0x2a4a3a : t.color, tpl = modelFor(mo.key, t, color), g = new THREE.Group(), model = tpl.clone(true), size = (mo.boss ? 2.6 : t.sc) * (mo.elite ? 1.25 : 1);
    model.scale.setScalar(size); g.add(model); mo.model = model; mo.size = size; mo.legs = [0, 1, 2, 3, 4, 5, 6, 7].map(i => model.getObjectByName('leg' + i)).filter(Boolean); mo.wings = ['wingL', 'wingR'].map(n => model.getObjectByName(n)).filter(Boolean);
    mo.segs = []; for (let i = -1; i < 9; i++) { const s = model.getObjectByName('seg' + i); if (s) mo.segs.push(s); } mo.hover = tpl.userData.hover || 0; mo.baseH = (_hgt[mo.key + color] || 1) * size;
    const bar = this.hpBar(); bar.position.y = mo.baseH + 0.6 + mo.hover; bar.visible = false; g.add(bar); mo.bar = bar; if (mo.boss) mo.bar.userData.fg.material = barFg.b; else mo.bar.userData.fg.material = mo.elite ? barFg.e : barFg.n;
    if (mo.elite || mo.boss) { const lb = labelSprite((mo.boss ? '' : '★ ') + mo.name + ' · ' + mo.lvl, mo.boss ? '#ff9a8a' : '#ffd060'); lb.position.y = mo.baseH + 1.3 + mo.hover; lb.visible = false; g.add(lb); const r = new THREE.Mesh(ringGeo, ringMats[mo.boss ? 'b' : 'e']); r.rotation.x = -Math.PI / 2; r.position.y = 0.1; r.scale.setScalar(size * 1.3 + 0.4); g.add(r); mo.ring = r; }
    mo.mesh = g; this.scene.add(g);
  }
  makeSuong() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(160,80,220,0)'); gr.addColorStop(0.5, 'rgba(170,90,230,.5)'); gr.addColorStop(1, 'rgba(120,40,180,.9)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`; x.fillRect(Math.random() * 64, Math.random() * 256, 2, 30); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(40, 1); this.suongTex = tex;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 70, 128, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); m.visible = false; m.renderOrder = 5; this.scene.add(m); return m;
  }
  /* ---------------- Snapshot & sự kiện ---------------- */
  onSnap(m) {
    if (this.alive && m.a < this.alive) for (const c of [10, 5, 3, 2]) if (this.alive > c && m.a <= c) { this.announce('CON-' + c); break; }
    this.serverT = m.tm; this.alive = m.a; this.zone = m.z; const now = performance.now();
    this.snapN = (this.snapN || 0) + 1;
    for (const a of m.p) {
      const [id, x, z, y, face, hp, mhp, lvl, fl] = a, P = this.players.get(id); if (!P) continue; P.seen = this.snapN;
      P.hp = hp; P.mhp = mhp; P.lvl = lvl; P.fl = fl; const alive = !!(fl & 1); if (P.alive && !alive) P.rig.play('hit'); P.alive = alive; P.fly = !!(fl & 2);
      if (P.isMe) { if (!alive) { P.x = x; P.z = z; } continue; }
      P.buf.push({ t: now, x, z, y, face }); P.tjy = Math.max(0, Math.min(3, y)); if (P.buf.length > 12) P.buf.shift();
    }
    for (const a of m.m) { const [id, x, z, face, hp, maxHp, st] = a, mo = this.mons.get(id); if (!mo) continue; mo.tx = x; mo.tz = z; mo.tface = face; mo.hp = hp; mo.maxHp = maxHp; mo.st = st; mo.seen = now; if (st === 3 && mo.alive) { mo.alive = false; mo.deadT = 0; } else if (st !== 3 && !mo.alive) { mo.alive = true; mo.x = x; mo.z = z; } }
  }
  P(id) { return this.players.get(id); }
  /* ---------- Lồng tiếng + phụ đề (QĐ-0033) ---------- */
  say(P, act, o = {}) {
    if (!P) return; const me = this.me, near = me ? Math.hypot(P.x - me.x, P.z - me.z) : 0; if (!P.isMe && !(o.pri && near < 30)) return;
    const text = Audio2.voice(P.fk, act, { who: P.id, x: P.isMe ? undefined : P.x, z: P.isMe ? undefined : P.z, pri: o.pri, gap: o.gap });
    if (text && this.S.sub !== false && near < 25) this.floatText(P.x, P.rig.g.position.y + 2.5, P.z, '“' + text + '”', 'vo');
  }
  announce(ev) { const t = Audio2.announce(ev); if (t) { this.hud.center('📣 ' + esc(t), '#ffe28a'); } }
  onKill(P, K) {
    const ks = this.ks || (this.ks = {}), st = id => ks[id] || (ks[id] = { streak: 0, times: [] }), now = this.tm;
    if (!this.fb) { this.fb = true; this.announce('HA-DAU'); }
    const vs = st(P.id); if (vs.streak >= 3 && K) this.announce('CHAN-CHUOI'); vs.streak = 0;
    const mm = (th, X, ch) => { if (Math.random() > ch || !X) return false; const near = this.me ? Math.hypot(X.x - this.me.x, X.z - this.me.z) : 99; if (!X.isMe && near > 25) return false; const t = Audio2.meme(th, { x: X.isMe ? undefined : X.x, z: X.isMe ? undefined : X.z }); if (t && this.S.sub !== false) this.floatText(X.x, X.rig.g.position.y + 2.5, X.z, '“' + t + '”', 'vo meme'); if (t) Audio2.voLast[X.id] = performance.now() / 1000; return !!t; };
    if (!mm('BIHA', P, P.isMe ? 0.55 : 0.25)) this.say(P, 'BI-HA', { pri: true });
    if (!K) return; const s = st(K.id); s.streak++; s.times = s.times.filter(t => now - t < 10); s.times.push(now);
    const n = s.times.length; if (n >= 2) this.announce('HA-' + Math.min(5, n)); else if ([3, 5, 8].includes(s.streak)) this.announce('CHUOI-' + s.streak);
    if (!mm('HA', K, K.isMe ? 0.45 : 0.2)) this.say(K, s.streak >= 3 ? 'HA-LIENTIEP' : 'HA', { pri: true });
  }
  onEvent(e) {
    const me = this.me, my = me && me.id;
    switch (e[0]) {
      case 'hit': {
        const [, tt, id, d, fl, src] = e, t = tt === 'p' ? this.P(id) : this.mons.get(id); if (!t) return; const tp = tt === 'p' ? t.rig.g.position : (t.mesh ? t.mesh.position : { x: t.x, y: 0, z: t.z }), h = tt === 'p' ? 1.9 : (t.baseH || 1);
        if (id === my && tt === 'p') { this.hitT = this.tm; this.hud.hurt(); Audio2.play('SFX-HURT'); this.shake = Math.max(this.shake, 0.12); this.lastFight = this.tm; if (this.S.dmgNum) this.floatText(tp.x, tp.y + h, tp.z, '-' + d, 'hurt'); if (this.S.vib && navigator.vibrate && d > (this.my ? this.my.mhp * 0.08 : 50)) navigator.vibrate(30); }
        else if (src === my) { this.lastFight = this.tm; const cls = fl & 2 ? 'prec' : fl & 1 ? 'crit' : fl & 4 ? 'elem' : 'dmg'; if (this.S.dmgNum) this.floatText(tp.x, tp.y + h, tp.z, (fl & 2 ? '◎ ' : '') + d + (fl & 1 ? '!' : ''), cls); this.hud.hitMark(fl); Audio2.play(fl & 2 ? 'SFX-PRECISION' : fl & 1 ? 'SFX-CRIT' : fl & 4 ? 'SFX-ELEM-KHAC' : 'SFX-' + ECODE[me.fk] + '-1-HIT'); }
        else if (src > 0) { const S = this.P(src); if (S) Audio2.play('SFX-' + ECODE[S.fk] + '-BASIC-HIT', tp.x, tp.z, { vol: 0.7 }); } else if (src < 0 && tt === 'p') Audio2.play('SFX-MON-HIT', tp.x, tp.z, { vol: 0.6 });
        if (tt === 'p') { t.rig.play('hit'); this.fx.sparks(tp.x, tp.y + 1.1, tp.z, fl & 3 ? 14 : 7, fl & 2 ? [1, 0.9, 0.3] : [1, 0.5, 0.4], 2.5); } else if (t.mesh) { t.squash = 1; t.engaged = 4; this.fx.sparks(tp.x, tp.y + h * 0.5, tp.z, 6, [0.8, 1, 0.8], 2); }
        break;
      }
      case 'heal': { const P = this.P(e[1]); if (P && this.S.dmgNum && Math.hypot(P.x - me.x, P.z - me.z) < 30) this.floatText(P.x, P.rig.g.position.y + 2.1, P.z, '+' + e[2], 'heal'); if (P) this.fx.sparks(P.x, P.rig.g.position.y + 1, P.z, 18, [0.5, 1, 0.6], 2); break; }
      case 'cast': {
        const [, id, k, face, x, z, tx, tz] = e, P = this.P(id); if (!P) return; const F = GLH.FACTIONS[P.fk];
        if (!P.isMe) { P.tface = face; } else { if (k === 'dodge') { } }
        if (k === 'b') { P.rig.play(F.basic.anim); Audio2.play('SFX-' + ECODE[P.fk] + '-BASIC-CAST', x, z); }
        else if (k === 'dodge') { P.rig.play('dodge'); Audio2.play('SFX-DODGE', x, z); for (let i = 0; i < 4; i++) this.fx.ghost(x, P.rig.g.position.y, z); }
        else if (k === 'respec') { P.rig.play('respec'); this.fx.burst(x, P.rig.g.position.y + 1, z, 60); }
        else { const sk = F.skills[k]; P.rig.play(sk.ult ? 'ult' : (sk.anim || 'cast')); { const t = sk.ult && (P.isMe || (this.me && Math.hypot(P.x - this.me.x, P.z - this.me.z) < 25)) && Math.random() < 0.3 ? Audio2.meme('CHIEU', { x: P.isMe ? undefined : P.x, z: P.isMe ? undefined : P.z }) : ''; if (t) { this.S.sub !== false && this.floatText(P.x, P.rig.g.position.y + 2.5, P.z, '“' + t + '”', 'vo meme'); } else this.say(P, sk.ult ? 'CHIEULON' : 'CHIEU' + (k + 1), { pri: sk.ult, gap: 0.6 }); } Audio2.play('SFX-' + ECODE[P.fk] + '-' + (sk.ult ? 'ULT' : (k + 1)) + '-CAST', x, z); this.fx.burst(x, P.rig.g.position.y + 1, z, sk.ult ? 80 : 30); if (sk.fx === 'swarm') this.fx.swarm(P.rig.g.position); if (sk.t === 'cone') { const c = GLH.ELEM[F.elem].c, cc = new THREE.Color(c); for (let i = 0; i < 18; i++) { const a = face + (Math.random() - 0.5) * 2 * sk.arc, r = sk.r * (0.3 + Math.random() * 0.7); this.fx.sparks(x + Math.sin(a) * r, P.rig.g.position.y + 0.9, z + Math.cos(a) * r, 3, [cc.r, cc.g, cc.b], 2); } } if (P.isMe) this.lastFight = this.tm; }
        break;
      }
      case 'tp': { const P = this.P(e[1]); if (!P) return; for (let i = 0; i < 5; i++) this.fx.ghost(P.x + (e[2] - P.x) * i / 5, P.rig.g.position.y, P.z + (e[3] - P.z) * i / 5); if (!P.isMe) { P.buf.length = 0; P.x = e[2]; P.z = e[3]; } break; }
      case 'proj': {
        const [, id, own, fx, x, z, dx, dz, spd, range] = e, col = FXCOL[fx] || [1, 1, 1], g = new THREE.Sprite(sprMat(this.glowTex(fx))), y0 = this.world.groundY(x, z) + 1.2; g.scale.setScalar(FXSIZE[fx] || 0.9); g.position.set(x, y0, z); this.scene.add(g);
        this.projs.set(id, { mesh: g, x, z, y: y0, dx, dz, spd, range, trav: 0, col, fx }); if (own < 0) Audio2.play('SFX-MON-SHOT', x, z, { vol: 0.6 }); break;
      }
      case 'px': { const p = this.projs.get(e[1]); if (p) { this.fx.sparks(e[2], p.y, e[3], 12, p.col, 3); this.scene.remove(p.mesh); this.projs.delete(e[1]); } break; }
      case 'zone': { const [, id, x, z, r, delay, fk, n, step] = e; this.addZoneFx(x, z, r, delay + (n - 1) * step + 0.3, GLH.ELEM[GLH.FACTIONS[fk].elem].c, delay); break; }
      case 'pulse': { const [, x, z, r, fk] = e, c = new THREE.Color(GLH.ELEM[GLH.FACTIONS[fk].elem].c), y = this.world.groundY(x, z); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283 + Math.random() * 0.2, rr = r * (0.3 + Math.random() * 0.7); this.fx.emit(x + Math.cos(a) * rr, y + 0.3, z + Math.sin(a) * rr, 0, 2 + Math.random() * 2, 0, 0.7, [c.r, c.g, c.b]); } Audio2.play('SFX-' + ECODE[fk] + '-2-HIT', x, z); break; }
      case 'slam': { const [, id, x, z, r, delay] = e; this.addZoneFx(x, z, r, delay, '#ff3a2a', delay); setTimeout(() => { Audio2.play('SFX-BOSS-SLAM', x, z); this.fx.burst(x, this.world.groundY(x, z) + 0.5, z, 100); if (Math.hypot(me.x - x, me.z - z) < 25) this.shake = 0.5; }, delay * 1000); break; }
      case 'die': {
        const [, tt, id, killer, place, how] = e;
        if (tt === 'p') { const P = this.P(id), K = this.P(killer); if (!P) return; P.alive = false; this.fx.burst(P.x, P.rig.g.position.y + 1, P.z, 90); Audio2.play('SFX-DIE', P.x, P.z); this.onKill(P, K);
          this.hud.feed(K ? `${this.dongIc(K.fk)} <b>${esc(K.name)}</b> ⚔️ hạ ${this.dongIc(P.fk)} ${esc(P.name)}` : `${this.dongIc(P.fk)} ${esc(P.name)} ${how === 'suong' ? 'dính Vòng Sương 🌫️' : how === 'roi' ? 'rời trận' : 'gục ngã'}`);
          if (killer === my) { Audio2.play('SFX-KILL'); this.hud.center(`Bạn đã hạ <b>${esc(P.name)}</b>!`, '#ffd24a'); } }
        else { const mo = this.mons.get(id); if (mo) { mo.alive = false; mo.deadT = 0; if (mo.mesh) this.fx.burst(mo.mesh.position.x, mo.mesh.position.y + (mo.baseH || 1) * 0.5, mo.mesh.position.z, mo.boss ? 200 : 30); if (mo.mesh && Math.random() < 0.35) Audio2.play('SFX-MON-GROWL', mo.mesh.position.x, mo.mesh.position.z, { vol: 0.5, rate: mo.boss ? 0.7 : 1.1 + Math.random() * 0.3 }); if (killer === my && this.S.dmgNum && mo.mesh) this.floatText(mo.mesh.position.x, mo.mesh.position.y + (mo.baseH || 1) + 0.6, mo.mesh.position.z, '+ điểm lớn', 'exp'); } }
        break;
      }
      case 'mrespawn': { const mo = this.mons.get(e[1]); if (mo) { mo.alive = true; mo.x = mo.tx = e[2]; mo.z = mo.tz = e[3]; mo.hp = mo.maxHp; } break; }
      case 'madd': { this.addMon(e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9]); break; }
      case 'prop': { const o = this.propsV && this.propsV.hit(e[1]); if (o) { this.fx.sparks(o.x, this.world.groundY(o.x, o.z) + 2, o.z, 8, [0.45, 0.6, 0.3], 2); Audio2.play('SFX-TREE-HIT', o.x, o.z, { vol: 0.7 }); } break; }
      case 'propx': { const o = this.propsV && this.propsV.fall(e[1], e[2]); if (o) { this.fx.burst(o.x, this.world.groundY(o.x, o.z) + 1.5, o.z, 40); this.shake = Math.max(this.shake, Math.hypot(o.x - me.x, o.z - me.z) < 15 ? 0.15 : 0); } break; }
      case 'drop': { const [, id, x, z, kind, rar, label] = e; this.addDrop(id, x, z, kind, rar, label); break; }
      case 'undrop': { const d = this.drops.get(e[1]); if (d) { this.scene.remove(d.g); this.drops.delete(e[1]); if (e[2] === my) this.hud.feed('Nhặt ' + esc(d.label)); } break; }
      case 'chest': { this.addChest(e[1], e[2], e[3], e[4]); break; }
      case 'chestOpen': { if (e[2] === my) this.say(this.me, 'MO-HOM', { pri: true }); const c = this.chests.get(e[1]); if (c) { this.fx.burst(c.x, c.y + 1, c.z, 120); this.scene.remove(c.g); this.chests.delete(e[1]); Audio2.play('SFX-SUPPLY-OPEN', c.x, c.z); const P = this.P(e[2]); if (P) this.hud.feed(`📦 <b>${esc(P.name)}</b> mở Hòm Diều`); } break; }
      case 'opening': { const P = this.P(e[1]); if (P) P.rig.play('open'); break; }
      case 'lvl': { const P = this.P(e[1]); if (!P) return; if (e[1] === my) this.say(P, 'LEN-CAP'); this.fx.burst(P.x, P.rig.g.position.y + 1, P.z, 60); if (e[1] === my) { Audio2.play('SFX-LEVELUP'); this.floatText(P.x, P.rig.g.position.y + 2.6, P.z, 'Lên cấp ' + e[2] + '!', 'lvl'); } break; }
      case 'fly': { const P = this.P(e[1]); if (P) { if (e[2] && !P.fly) this.say(P, 'CUOI-DIEU'); P.fly = !!e[2]; Audio2.play('SFX-FLY', P.x, P.z); } break; }
      case 'msg': this.hud.center(esc(e[1]), e[2]); Audio2.play('UI-NOTIFY'); break;
      case 'sfx': Audio2.play(e[1]); if (e[1] === 'SFX-BOSS-SPAWN') this.announce('TRUM-XUAT-HIEN'); if (e[1] === 'SFX-BOSS-DIE') this.announce('TRUM-BI-HA'); if (e[1] === 'SFX-SUPPLY-DROP') this.announce('HOM-DIEU'); break;
      case 'sfxAt': Audio2.play(e[1], e[2], e[3]); break;
      case 'zonephase': if (e[2] === 1) { this.announce('SUONG-THU'); Audio2.bgm('BGM-ZONE-SHRINK'); Audio2.play('SFX-ZONE-MOVE'); } break;
    }
  }
  dongIc(fk) { return Assets.icon('EMB-DONG-' + DCODE[fk], DICON[fk]); }
  glowTex(fx) { this._gt = this._gt || {}; const c = FXCOL[fx] || [1, 1, 1]; return this._gt[fx] || (this._gt[fx] = glowMap(`rgba(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0},1)`)); }
  addZoneFx(x, z, r, life, col, fill) {
    const y = this.world.groundY(x, z) + 0.15, g = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    const f = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })); g.add(f); g.rotation.x = -Math.PI / 2; g.position.set(x, y, z); g.scale.setScalar(r); this.scene.add(g);
    this.zfx.push({ g, f, t: 0, life, fill: fill || 0.01 });
  }
  addDrop(id, x, z, kind, rar, label) {
    const hex = kind === 'eq' ? GLH.RAR[rar].c : label.includes('Máu') ? '#ff6a7a' : label.includes('Hơi') ? '#6aa0ff' : '#c8ffd8', g = new THREE.Group(), col = new THREE.Color(hex);
    const s = new THREE.Sprite(sprMat(this.glowTexHex(hex))); s.scale.setScalar(kind === 'eq' ? 1.2 + rar * 0.2 : 0.9); g.add(s); const core = new THREE.Mesh(this._oct || (this._oct = new THREE.OctahedronGeometry(0.18)), new THREE.MeshBasicMaterial({ color: col })); g.add(core);
    if (kind === 'eq' && rar >= 2) { const b = new THREE.Mesh(this._beam || (this._beam = new THREE.CylinderGeometry(0.04, 0.04, 4, 6)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })); b.position.y = 2; g.add(b); }
    g.position.set(x, this.world.groundY(x, z) + 0.6, z); this.scene.add(g); this.drops.set(id, { g, core, x, z, label, ph: Math.random() * 6 });
  }
  glowTexHex(hex) { this._gh = this._gh || {}; return this._gh[hex] || (this._gh[hex] = glowMap(hex)); }
  addChest(id, x, z, warn) {
    const g = new THREE.Group(), wood = rigMat(0x7a4a24), gold = rigMat(0xe0b24a, { metalness: 0.7, roughness: 0.3, emissive: 0x402a00 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), wood); box.position.y = 0.4; g.add(box); const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.85), gold); lid.position.y = 0.88; g.add(lid);
    const kite = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.2, 4), rigMat(0xd94a3a, { side: THREE.DoubleSide })); kite.position.y = 3.2; kite.rotation.y = Math.PI / 4; g.add(kite); for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.4), rigMat(0xeeeeee)); l.position.set(sx * 0.5, 2.0, 0); l.rotation.z = sx * 0.35; g.add(l); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 30; g.add(beam);
    const gy = this.world.groundY(x, z); g.position.set(x, gy + 45, z); this.scene.add(g); this.chests.set(id, { g, kite, x, z, y: gy, gy, land: this.tm + warn, warn });
  }
  /* ---------- Nhãn trên đầu (QĐ-0039): tên + cấp + thanh máu siêu nhỏ, luôn quay về phía người chơi ----------
     Cài đặt › Hình: Tên người chơi (bật/tắt) · Máu người chơi khác · Nhãn quái (khi giao chiến / luôn / tắt) · Cỡ nhãn */
  updateTags() {
    const S = this.S, box = this.tagBox || (this.tagBox = $('tags')), pool = this.tagPool || (this.tagPool = []), cam = this.camera, v = this._tv || (this._tv = new THREE.Vector3()), W = innerWidth, H = innerHeight;
    let n = 0; const sz = S.tagSize || 1; box.style.setProperty('--ts', sz);
    const put = (x, y, z, name, lv, p, cls) => {
      v.set(x, y, z).project(cam); if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) return;
      let e = pool[n]; if (!e) { e = document.createElement('div'); e.className = 'ot'; e.innerHTML = '<b></b><i><u></u><s></s></i>'; box.appendChild(e); pool[n] = e; e._b = e.firstChild; e._u = e.lastChild.firstChild; e._s = e.lastChild.lastChild; }
      n++; e.style.display = ''; e.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%)`;
      if (e._t !== name + lv) { e._t = name + lv; e._b.innerHTML = (lv ? `<em>${lv}</em>` : '') + name; }
      const pc = Math.max(0, Math.min(100, p * 100)).toFixed(0); if (e._p !== pc) { e._p = pc; e._u.style.width = pc + '%'; } if (e._c !== cls) { e._c = cls; e.className = 'ot ' + cls; }
      e._b.style.display = name ? '' : 'none'; e.lastChild.style.display = p < 0 ? 'none' : '';
    };
    const showName = S.tagName !== false, showHp = S.tagHp !== false, mon = S.tagMon || 'engaged';
    for (const P of this.players.values()) {
      if (P.isMe || !P.alive || !P.rig.g.visible || (P._d || 99) > 50) continue; if (!showName && !showHp) break;
      const y = P.rig.g.position.y + (P.fly ? 3.3 : 2.15); put(P.x, y, P.z, showName ? esc(P.name) : '', showName ? P.lvl : 0, showHp ? P.hp / P.mhp : -1, 'pl' + (P.bot ? ' bot' : '') + (P.speaking ? ' spk' : ''));
    }
    if (mon !== 'off') for (const mo of this.mons.values()) {
      if (!mo.alive || !mo.mesh || !mo.mesh.visible) continue; const eng = mo.engaged > 0 || mo.boss || mo.hp < mo.maxHp; if (mon === 'engaged' && !eng) continue;
      const d = Math.hypot(mo.mesh.position.x - this.camera.position.x, mo.mesh.position.z - this.camera.position.z); if (d > (mo.boss ? 70 : 32)) continue;
      put(mo.mesh.position.x, mo.mesh.position.y + (mo.baseH || 1) + 0.5 + (mo.hover || 0), mo.mesh.position.z, mo.name || '', mo.lvl, mo.hp / mo.maxHp, 'mo' + (mo.boss ? ' boss' : mo.elite ? ' elite' : ''));
    }
    for (let i = n; i < pool.length; i++) if (pool[i].style.display !== 'none') pool[i].style.display = 'none';
  }
  floatText(x, y, z, text, cls) {
    let e = this.flPool.pop(); if (!e) { e = document.createElement('div'); $('floaters').appendChild(e); }
    e.className = 'fl ' + cls; e.textContent = text; e.style.display = 'block'; this.fl.push({ e, x: x + (Math.random() - 0.5) * 0.6, y, z: z + (Math.random() - 0.5) * 0.6, t: 0, life: cls === 'lvl' ? 1.8 : cls === 'vo' ? 2.2 : 1, vy: cls === 'vo' ? 0.25 : cls === 'crit' || cls === 'prec' ? 2.2 : 1.6 });
    if (this.fl.length > 50) { const o = this.fl.shift(); o.e.style.display = 'none'; this.flPool.push(o.e); }
  }
  updateFloaters(dt) {
    for (let i = this.fl.length - 1; i >= 0; i--) {
      const f = this.fl[i]; f.t += dt; f.y += f.vy * dt; f.vy *= 0.97; _v1.set(f.x, f.y, f.z).project(this.camera);
      if (f.t > f.life || _v1.z > 1) { f.e.style.display = 'none'; this.flPool.push(f.e); this.fl.splice(i, 1); continue; }
      const sx = (_v1.x * 0.5 + 0.5) * innerWidth, sy = (-_v1.y * 0.5 + 0.5) * innerHeight, k = f.t < 0.1 ? 0.6 + f.t / 0.1 * 0.6 : 1.2 - Math.min(0.4, (f.t - 0.1) * 0.5);
      f.e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${k})`; f.e.style.opacity = Math.max(0, Math.min(1, (f.life - f.t) * 3));
    }
  }
  /* ---------------- Điều khiển ---------------- */
  lock() { if (this.isTouch || this.mode !== 'play') return; const el = this.renderer.domElement; if (document.pointerLockElement !== el && el.requestPointerLock) { try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener('mousedown', e => { if (e.button === 2) this.keys.MouseRight = true; }); addEventListener('mouseup', e => { if (e.button === 2) this.keys.MouseRight = false; });
    document.addEventListener('pointerlockchange', () => { const L = document.pointerLockElement === el; document.body.classList.toggle('locked', L); if (!L && this.mode === 'play' && !this.hud.anyPanel() && !this.hud.softUnlock) this.hud.show('pause'); this.hud.softUnlock = false; });
    el.addEventListener('mousedown', e => { Audio2.init(); if (this.mode !== 'play' || this.isTouch || this.editing) return; if (document.pointerLockElement !== el) { this.lock(); return; } if (e.button === 0) { this.input.atk = true; this.doAttack(); } if (e.button === 2) this.castSkill(0); });
    addEventListener('mouseup', e => { if (e.button === 0) this.input.atk = false; });
    addEventListener('mousemove', e => { if (document.pointerLockElement !== el) { if (this.mode === 'home' && e.buttons === 1) this.cam.yaw -= e.movementX * 0.005; return; } const s = 0.0022 * this.S.sens; this.cam.yaw -= e.movementX * s; this.cam.pitch = Math.max(-0.55, Math.min(1.15, this.cam.pitch + e.movementY * s * (this.S.invY ? -1 : 1))); });
    el.addEventListener('wheel', e => { this.cam.dist = Math.max(2.6, Math.min(9, this.cam.dist + e.deltaY * 0.004)); }, { passive: true }); el.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return; Audio2.init(); if (e.code === 'Tab' || e.code === 'Space' || /^F\d/.test(e.code) && e.code !== 'F12') e.preventDefault();
      if (e.code === 'F9') { Assets.reload().then(() => this.hud.toast('Đã nạp lại hình ảnh', '#7dffb0')); return; }
      if (e.repeat) return; this.keys[e.code] = true; if (this.mode !== 'play') return;
      if (e.code === 'Tab') { this.hud.toggle('board', true); return; }
      if (e.code === 'KeyK') { this.hud.toggle('points'); return; } if (e.code === 'KeyB' || e.code === 'KeyI') { this.hud.toggle('bag'); return; } if (e.code === 'KeyM') { this.hud.toggle('bigmapP'); return; }
      if (this.hud.anyPanel() && e.code === 'Escape') { this.hud.closePanels(); return; }
      if (!this.me || !this.me.alive) { if (e.code === 'Space') this.send({ t: 'spec' }); return; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!e.repeat) this.dodge(); }
      const d = /^Digit([1-3])$/.exec(e.code); if (d) { const i = +d[1] - 1; if (e.altKey || e.ctrlKey || (e.shiftKey && this.keys.KeyU)) this.upgrade(i); else this.castSkill(i); return; }
      if (e.code === 'KeyU') { const i = [0, 1, 2].find(j => this.my && this.my.sklFree > 0 && this.my.skl[j] < GLH.FACTIONS[this.me.fk].skills[j].max && this.my.lvl >= GLH.FACTIONS[this.me.fk].skills[j].lv[this.my.skl[j]]); if (i !== undefined) this.upgrade(i); }
      if (e.code === 'KeyJ') { this.input.atk = true; this.doAttack(); }
      if (e.code === 'Space') this.jump(); if (e.code === 'KeyF') this.send({ t: 'sk', i: 'fly' }); if (e.code === 'KeyQ') { this.send({ t: 'pot', k: 'bomau' }); if (this.my && this.my.items.bomau > 0 && this.my.hp < this.my.mhp) this.say(this.me, 'UONG'); } if (e.code === 'KeyR') this.send({ t: 'pot', k: 'bohoi' }); if (e.code === 'KeyT') this.send({ t: 'pot', k: 'ruou' });
      if (e.code === 'KeyX' && this.me && this.me.rig.setArmed) { const r = this.me.rig; r.forceArmed = !r.armed; r.setArmed(r.forceArmed); if (!r.forceArmed) r.combatT = -99; else this.say(this.me, 'RUT'); Audio2.play(r.forceArmed ? 'SFX-DRAW' : 'SFX-SHEATHE'); }
      if (e.code === 'KeyV') { this.S.fpv = !this.S.fpv; this.saveSet(); this.hud.toast(this.S.fpv ? 'Góc nhìn thứ nhất' : 'Góc nhìn sau lưng'); }
      if (e.code === 'KeyE') this.interact(); if (e.code === 'KeyG') this.send({ t: 'respec' });
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'Tab') this.hud.toggle('board', false); if (e.code === 'KeyJ') this.input.atk = false; });
    addEventListener('blur', () => { this.keys = {}; this.input.atk = false; });
  }
  /* hướng ngắm = tia từ camera qua tâm màn hình → điểm chạm đất/xa 40m */
  aimPoint(maxD = 40) {
    const c = this.camera.position; this.camera.getWorldDirection(_v2); let hit = null;
    for (let s = 1; s <= maxD + 8; s += 0.5) { const x = c.x + _v2.x * s, y = c.y + _v2.y * s, z = c.z + _v2.z * s; if (y < this.world.groundY(x, z)) { hit = { x, z }; break; } }
    if (!hit) hit = { x: c.x + _v2.x * (maxD + 6), z: c.z + _v2.z * (maxD + 6) };
    return hit;
  }
  aimFace() { const p = this.aimPoint(), m = this.me; const d = Math.hypot(p.x - m.x, p.z - m.z); return d < 1.5 ? this.cam.yaw : Math.atan2(p.x - m.x, p.z - m.z); }
  doAttack() {
    if (!this.me || !this.me.alive || this.me.fly || !this.my) return; const B = GLH.FACTIONS[this.me.fk].basic; if (this.atkT > this.tm) return; this.atkT = this.tm + B.cd * 0.98;
    const face = this.aimFace(); this.me.face = face; this.aimT = this.tm; this.send({ t: 'atk', face }); this.me.rig.play(B.anim); this.lastFight = this.tm; if (Math.random() < 0.12) this.say(this.me, 'DANH');
  }
  castSkill(i) { this.aimT = this.tm;
    if (!this.me || !this.me.alive || !this.my) return; const sk = GLH.FACTIONS[this.me.fk].skills[i]; if (this.my.skl[i] <= 0) { if (this.my.sklFree > 0 && this.upgrade(i)) return; this.hud.toast('Chưa học chiêu này — bấm ⬆, U hoặc Alt + ' + (i + 1), '#ff9a6a'); Audio2.play('UI-DENY'); return; }
    if ((this.my.cd['s' + i] || 0) > 0.05) { Audio2.play('UI-DENY'); return; } if (this.my.mp < sk.mp) { this.hud.toast('Hết hơi', '#7ab4ff'); Audio2.play('UI-DENY'); return; }
    const face = this.aimFace(), p = (sk.t === 'zone' || sk.t === 'leap') ? this.aimPoint(sk.range || sk.dist) : null; this.me.face = face; this.aimT = this.tm;
    this.send({ t: 'sk', i, face, tx: p ? p.x : undefined, tz: p ? p.z : undefined }); this.lastFight = this.tm;
  }
  upgrade(i) { if (!this.my || this.my.sklFree <= 0) return false; const sk = GLH.FACTIONS[this.me.fk].skills[i], c = this.my.skl[i]; if (c >= sk.max || this.my.lvl < sk.lv[c]) { this.hud.toast(c >= sk.max ? 'Chiêu đã tối đa' : 'Cần cấp ' + sk.lv[c], '#ff9a6a'); return false; } this.send({ t: 'up', i }); this.my.sklFree--; this.my.skl[i]++; Audio2.play('UI-SKILL-UP'); return true; }
  dodge() { if (!this.me || !this.my) return; const mv = this.input.mx || this.input.mz ? Math.atan2(this.input.mx, this.input.mz) : this.cam.yaw; this.send({ t: 'sk', i: 'dodge', dir: mv, face: this.cam.yaw }); }
  jump() { const m = this.me; if (!m || !m.alive || m.fly || !this.my || this.my.cc.stun > 0 || this.my.cc.root > 0) return; if (m.jy < 0.05) { m.vy = 6.6; Audio2.play('SFX-JUMP', m.x, m.z); } }
  interact() { if (!this.me) return; const c = this.nearChest(); if (c) this.send({ t: 'open', id: c.id }); }
  nearChest() { let best = null, bd = 3; for (const [id, c] of this.chests) { if (this.tm < c.land) continue; const d = Math.hypot(c.x - this.me.x, c.z - this.me.z); if (d < bd) { bd = d; best = { id, c }; } } return best; }
  /* ---------------- Vòng lặp ---------------- */
  loop() {
    requestAnimationFrame(() => this.loop()); const dt = Math.min(this.clock.getDelta(), 0.05); this.tm += dt; const now = performance.now();
    if (this.mode === 'play' && this.me && this.isTouch && this.me.alive) Gyro.update(this, dt);
    if (this.mode === 'play') Voice.update(); // ngắm bằng nghiêng máy
    if (this.mode === 'play' && this.me) this.updatePlay(dt, now); else this.updateMenu(dt);
    if (this.mode === 'play' && this.me && this.me.alive) { const me = this.me; if (this.my && this.my.hp < this.my.mhp * 0.25 && me.speed > 0.5 && this.tm - (this.hitT || -99) < 3 && this.tm - (this.chayT || -99) > 20) { this.chayT = this.tm; const t = Audio2.meme('CHAY', { gap: 2 }); if (t && this.S.sub !== false) this.floatText(me.x, me.rig.g.position.y + 2.5, me.z, '“' + t + '”', 'vo meme'); } if (me.speed > 0.5 && this.tm - (this.diT || 0) > 25 && Math.random() < 0.004) { this.diT = this.tm; this.say(me, 'DI'); } if ((me.fl & 256) && this.tm - (this.suT || -99) > 15) { this.suT = this.tm; this.say(me, 'SUONG', { pri: true }); } }
    this.fx.update(dt, this.fxProxy(), this.tm); this.updateFloaters(dt); if (this.mode === 'play') this.updateTags();
    if (this.mode === 'play') this.hud.update(dt);
    this.ema = this.ema * 0.95 + dt * 0.05; if (++this.fc % 60 === 0) { if (this.S.fps) $('fps').textContent = Math.round(1 / this.ema) + ' khung/giây'; const mx = Math.min(devicePixelRatio, this.maxPR); let pr = this.pr; if (this.ema > 0.026) pr = Math.max(0.55, pr - 0.1); else if (this.ema < 0.018) pr = Math.min(mx, pr + 0.05); if (Math.abs(pr - this.pr) > 0.01) { this.pr = pr; this.renderer.setPixelRatio(pr); if (this.composer) this.composer.setPixelRatio(pr); } }
    if (window.__NORENDER) return; // móc kiểm thử: bỏ vẽ để chạy logic nhanh trên máy không có GPU
    if (this.useComposer) { this.grade.uniforms.time.value = this.tm; this.composer.render(); } else this.renderer.render(this.scene, this.camera);
  }
  fxProxy() { const P = this.me && this.me.alive ? this.me.rig : this.preview; return this._fxp || (this._fxp = { g: { position: new THREE.Vector3() }, speed: 0, act: null, atk: -1, flying: false, y: 0 }), this._fxp.g.position.copy(P.g.position), this._fxp.speed = 0, this._fxp.y = 1, this._fxp; }
  updateMenu(dt) {
    const P = this.preview, x = 2, z = -4; P.g.position.set(x, this.world.groundY(x, z), z); P.update(dt, { speed: 0 });
    this.cam.yaw += dt * 0.05; const cx = x + Math.sin(this.cam.yaw) * 4.2, cz = z + Math.cos(this.cam.yaw) * 4.2; this.camera.position.set(cx, P.g.position.y + 1.5, cz); this.camera.lookAt(x, P.g.position.y + 1.0, z);
    const wide = innerWidth >= 1000 && this.mode === 'home'; if (wide !== this._vo) { this._vo = wide; if (wide) this.camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.22, 0, innerWidth, innerHeight); else this.camera.clearViewOffset(); }
    P.g.rotation.y = this.cam.yaw + Math.sin(this.tm * 0.4) * 0.35;
    this.world.update(this.tm, dt, this.camera.position, this.camera); if (this.propsV) this.propsV.update(dt, this.me, this.tm); this.camLight.position.copy(this.camera.position); Audio2.listener = { x, z };
  }
  updatePlay(dt, now) {
    if (this._vo) { this._vo = false; this.camera.clearViewOffset(); }
    const me = this.me, my = this.my, W = this.world, k = this.keys, inp = this.input;
    // ---- người chơi của mình: tự di chuyển (server kiểm tra) ----
    if (!this.isTouch) { const fw = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), rt = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), y = this.cam.yaw; inp.mx = Math.sin(y) * fw - Math.cos(y) * rt; inp.mz = Math.cos(y) * fw + Math.sin(y) * rt; }
    let len = Math.hypot(inp.mx, inp.mz); const cc = my ? my.cc : { stun: 0, root: 0, slow: 0 }, busy = my && my.opening >= 0;
    if (me.alive && my && !(cc.stun > 0) && !(cc.root > 0)) {
      if (len > 0.01) {
        if (busy) this.send({ t: 'cancel' });
        const spd = (me.fly ? GLH.FLY.spd : GLH.BASE_SPD * my.st.spd * (1 - (cc.slow || 0))) * Math.min(1, len), dx = inp.mx / len, dz = inp.mz / len, nx = me.x + dx * spd * dt, nz = me.z + dz * spd * dt;
        if (me.fly || W.canStep(me.x, me.z, nx, nz)) { me.x = nx; me.z = nz; } else if (W.canStep(me.x, me.z, nx, me.z)) me.x = nx; else if (W.canStep(me.x, me.z, me.x, nz)) me.z = nz;
        if (!me.fly && me.jy < 0.6) { const p = { x: me.x, z: me.z }; W.collide(p, 0.35); me.x = p.x; me.z = p.z; }
        if (!me.fly && this.pidx) { [me.x, me.z] = GLH_PROPS.blockMove(this.pidx, me.x - dx * spd * dt, me.z - dz * spd * dt, me.x, me.z); }
        me.speed = Math.min(1, len) * (me.fly ? 0.3 : 1);
      } else me.speed *= Math.exp(-dt * 10);
    } else me.speed = 0;
    if (me.smooth > 0) { me.smooth = Math.max(0, me.smooth - dt * 6); me.x += (me.cx - me.x) * Math.min(1, dt * 18); me.z += (me.cz - me.z) * Math.min(1, dt * 18); if (Math.hypot(me.cx - me.x, me.cz - me.z) < 0.05) me.smooth = 0; }
    const aiming = this.S.fpv || inp.atk || this.tm - (this.aimT || -9) < 0.8 || !this.isTouch && this.keys.MouseRight;
    if (aiming || len < 0.05) { if (aiming) me.face = lerpAngle(me.face, this.cam.yaw, Math.min(1, dt * 20)); } else me.face = lerpAngle(me.face, Math.atan2(inp.mx, inp.mz), Math.min(1, dt * 12));
    if (inp.atk) this.doAttack();
    // nhảy (chỉ hình ảnh + vượt vật cản nhỏ; server kiểm tra di chuyển ngang)
    const wasAir = me.jy > 0.02; me.vy -= 18 * dt; me.jy += me.vy * dt; if (me.jy <= 0) { if (wasAir) me.landV = -me.vy; else me.landV = 0; me.jy = 0; me.vy = 0; }
    this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 0.05; this.send({ t: 'in', x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.jy.toFixed(2), face: +me.face.toFixed(3), touch: this.isTouch }); }
    // ---- người khác: nội suy trễ 100ms ----
    const rt = now - 100;
    for (const P of this.players.values()) {
      if (!P.isMe) { const b = P.buf; if (b.length) { let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--; const a = b[Math.max(0, i - 1)], c = b[i], u = c.t === a.t ? 1 : Math.max(0, Math.min(1, (rt - a.t) / (c.t - a.t))); const px = P.x, pz = P.z; P.x = a.x + (c.x - a.x) * u; P.z = a.z + (c.z - a.z) * u; P.tface = c.face; P.speed += ((Math.hypot(P.x - px, P.z - pz) / Math.max(dt, 1e-3) / GLH.BASE_SPD) - P.speed) * Math.min(1, dt * 8); } P.face = lerpAngle(P.face, P.tface, Math.min(1, dt * 14)); }
      const gy = W.groundY(P.x, P.z); P.gy += (gy - P.gy) * Math.min(1, dt * 16); const flyY = P.fly ? 3.2 : 0; P.fy = (P.fy || 0) + (flyY - (P.fy || 0)) * Math.min(1, dt * 4);
      if (!P.isMe) { const pj = P.jy; P.jy += (P.tjy - P.jy) * Math.min(1, dt * 14); P.landV = pj > 0.05 && P.jy <= 0.05 ? 5 : 0; }
      P.rig.g.position.set(P.x, P.gy + P.fy + P.jy, P.z); P.rig.g.rotation.y = P.face; P.rig.update(dt, { speed: P.speed, fly: P.fly, dead: !P.alive, stun: !!(P.fl & 4), air: P.jy > 0.08, landV: P.landV || 0, opening: !!(P.fl & 64), respec: !!(P.fl & 64) });
      const d = Math.hypot(P.x - this.camera.position.x, P.z - this.camera.position.z); P.rig.g.visible = d < 170 && (P.isMe || !this.snapN || P.seen >= this.snapN - 1); // núp bụi/nhà → server không gửi → ẩn P.rig.setLOD(d < 14 ? 0 : d < 50 ? 1 : 2);
      P.tag.visible = false; P.bar.visible = false; P._d = d; // nhãn trên đầu vẽ bằng HTML: updateTags()
      if (P.fly && P.alive && Math.random() < 0.5) this.fx.emit(P.x + (Math.random() - 0.5), P.rig.g.position.y - 0.1, P.z + (Math.random() - 0.5), 0, -0.6, 0, 0.6, [1, 0.8, 0.5]);
    }
    // ---- quái ----
    const cx = me.x, cz = me.z;
    for (const mo of this.mons.values()) {
      const near = Math.abs(mo.tx - cx) < 105 && Math.abs(mo.tz - cz) < 105 && now - mo.seen < 1500; if (!near) { if (mo.mesh) mo.mesh.visible = false; continue; }
      if (!mo.mesh) { this.buildMon(mo); mo.x = mo.tx; mo.z = mo.tz; } mo.mesh.visible = true;
      const ox = mo.x, oz = mo.z; mo.x += (mo.tx - mo.x) * Math.min(1, dt * 10); mo.z += (mo.tz - mo.z) * Math.min(1, dt * 10); mo.face = lerpAngle(mo.face, mo.tface, Math.min(1, dt * 8));
      const mv = Math.min(1, Math.hypot(mo.x - ox, mo.z - oz) / Math.max(dt, 1e-3) / 4); mo.mv += (mv - mo.mv) * Math.min(1, dt * 6); mo.ph += dt * (2 + mo.mv * 8);
      const y = W.groundY(mo.x, mo.z); mo.mesh.position.set(mo.x, y + (mo.hover ? mo.hover + Math.sin(this.tm * 2 + mo.ph) * 0.15 : 0), mo.z); mo.mesh.rotation.y = mo.face;
      if (!mo.alive) { mo.deadT = (mo.deadT || 0) + dt; mo.model.scale.setScalar(mo.size * Math.max(0.01, 1 - mo.deadT * 1.5)); continue; } else mo.model.scale.setScalar(mo.size);
      const amp = 0.7 * mo.mv; mo.legs.forEach((l, i) => { l.rotation.x = Math.sin(mo.ph * 1.6 + (i % 2 ? Math.PI : 0) + (i >> 1) * Math.PI * 0.5) * amp; }); mo.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(this.tm * 6 + mo.ph) * 0.5; }); mo.segs.forEach((s, i) => { s.position.x = Math.sin(mo.ph * 1.5 - i * 0.8) * (0.12 + 0.1 * mo.mv) * (i * 0.1 + 0.3); });
      mo.squash = (mo.squash || 0) * Math.exp(-dt * 8); const wd = mo.st === 2 ? 0.18 : 0, sq = 1 + mo.squash * 0.2 + wd; mo.model.scale.set(mo.size * (2 - sq), mo.size * sq, mo.size * (2 - sq));
      mo.engaged = Math.max(0, (mo.engaged || 0) - dt); mo.bar.visible = false; if (mo.ring) mo.ring.rotation.z = this.tm * 0.5;
    }
    // ---- đạn ----
    for (const [id, p] of this.projs) { const s = p.spd * dt; p.x += p.dx * s; p.z += p.dz * s; p.trav += s; p.mesh.position.set(p.x, p.y, p.z); this.fx.emit(p.x, p.y, p.z, 0, 0.2, 0, 0.3, p.col); if (p.trav > p.range + 2) { this.scene.remove(p.mesh); this.projs.delete(id); } }
    // ---- vùng chiêu, đồ rơi, Hòm Diều ----
    for (let i = this.zfx.length - 1; i >= 0; i--) { const z = this.zfx[i]; z.t += dt; z.f.scale.setScalar(Math.min(1, z.t / z.fill)); z.g.material.opacity = 0.55 + 0.35 * Math.sin(this.tm * 18); if (z.t > z.life) { this.scene.remove(z.g); z.g.geometry.dispose(); z.g.material.dispose(); z.f.geometry.dispose(); z.f.material.dispose(); this.zfx.splice(i, 1); } }
    for (const d of this.drops.values()) { d.core.rotation.y += dt * 2; d.core.position.y = Math.sin(this.tm * 2 + d.ph) * 0.12; }
    for (const c of this.chests.values()) { const u = Math.max(0, Math.min(1, 1 - (c.land - this.tm) / c.warn)); c.g.position.y = c.gy + 45 * (1 - u) * (1 - u); c.kite.visible = u < 1; c.g.rotation.y += dt * (u < 1 ? 0.6 : 0); }
    // ---- Vòng Sương ----
    if (this.zone) { const [x, z, r] = this.zone; this.suong.visible = r > 0.5; this.suong.position.set(x, 10, z); this.suong.scale.set(Math.max(0.5, r), 1, Math.max(0.5, r)); this.suongTex.offset.x = this.tm * 0.02; }
    // ---- camera sau lưng (TPP) ----
    const tgt = me.alive ? me : (this.players.get(my && my.spec) || me), tp = tgt.rig.g.position, yaw = this.cam.yaw, pc = this.cam.pitch;
    const fpv = this.S.fpv && me.alive; me.rig.g.visible = !fpv;
    this.ct.lerp(_v1.set(tp.x, tp.y + (fpv ? 1.62 : 1.55), tp.z), 1 - Math.exp(-dt * (fpv ? 40 : 20))); const cp = Math.cos(pc), sh = me.alive && !fpv ? 0.55 : 0, dist = fpv ? 0.01 : this.cam.dist * (me.fly ? 1.3 : 1);
    let camX = this.ct.x - Math.sin(yaw) * cp * dist - Math.cos(yaw) * sh, camZ = this.ct.z - Math.cos(yaw) * cp * dist + Math.sin(yaw) * sh, camY = this.ct.y + Math.sin(pc) * dist;
    if (!fpv) { // camera không chui sau thân cây/đá: kéo lại gần nếu có vật cản
      const n = 10; for (let i = 3; i <= n; i++) { const u = i / n, x = this.ct.x + (camX - this.ct.x) * u, z = this.ct.z + (camZ - this.ct.z) * u; if (W.nearCollider(x, z, 0.45)) { const k = Math.max(0.25, (i - 1.5) / n); camX = this.ct.x + (camX - this.ct.x) * k; camZ = this.ct.z + (camZ - this.ct.z) * k; camY = this.ct.y + (camY - this.ct.y) * k; break; } }
      camY = Math.max(camY, W.groundY(camX, camZ) + 0.6); } this.shake *= Math.exp(-dt * 7);
    this.camera.position.set(camX + (Math.random() - 0.5) * this.shake, camY + (Math.random() - 0.5) * this.shake, camZ + (Math.random() - 0.5) * this.shake);
    this.camera.lookAt(this.ct.x + Math.sin(yaw) * 12 - Math.cos(yaw) * sh, this.ct.y - Math.sin(pc) * 12 * 0.9 + 0.3, this.ct.z + Math.cos(yaw) * 12 + Math.sin(yaw) * sh);
    this.camera.fov = (fpv ? 75 : 62) + me.speed * 3 + (me.fly ? 6 : 0); this.camera.updateProjectionMatrix();
    W.update(this.tm, dt, tp, this.camera); this.camLight.position.set(tp.x, tp.y + 3, tp.z); Audio2.listener = { x: tp.x, z: tp.z };
    // âm thanh môi trường + bước chân
    this.ambT = (this.ambT || 0) - dt; if (this.ambT <= 0) { this.ambT = 1; const zn = W.zoneAt(tp.x, tp.z).id; let wet = false; for (let a = 0; a < 6.28 && !wet; a += 1.05) if (W.heightAt(tp.x + Math.cos(a) * 14, tp.z + Math.sin(a) * 14) < 0) wet = true;
      const amb = zn === 7 ? 'AMB-LAVA' : wet ? 'AMB-WATER' : 'AMB-FOREST'; for (const k of ['AMB-FOREST', 'AMB-WATER', 'AMB-LAVA']) Audio2.loop(k, k === amb); this.stepKey = zn === 5 || zn === 6 ? 'SFX-STEP-STONE' : 'SFX-STEP-GRASS'; }
    const stepping = me.alive && !me.fly && me.jy < 0.05 && me.speed > 0.15; for (const k of ['SFX-STEP-GRASS', 'SFX-STEP-STONE']) Audio2.loop(k, stepping && k === this.stepKey, 0.5 + me.speed * 0.6);
    if (my && my.cc.stun > 0 && !this._stun) Audio2.play('SFX-STUN'); this._stun = my && my.cc.stun > 0;
    // nhạc nền theo tình thế (giữ nhạc giao tranh 12 giây sau trận đánh)
    if (my && my.alive) { const fight = this.tm - this.lastFight < 12; Audio2.bgm(this.alive <= 3 ? 'BGM-FINAL' : this.zone && this.zone[6] === 1 ? 'BGM-ZONE-SHRINK' : fight ? 'BGM-MATCH-COMBAT' : 'BGM-MATCH-CALM'); }
  }
}
let GAME;
window.addEventListener('load', () => { GAME = window.__GAME = new OnlineGame(); setTimeout(() => GAME.boot(), 50); });
