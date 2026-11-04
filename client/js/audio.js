/* =====================================================================
   ÂM THANH THEO MÃ (QĐ-0016) — ổ cắm: assets/audio/<nhóm>/<MÃ>.ogg (|.mp3)
   Khai báo trong assets/audio/audio.json; thiếu file → âm tổng hợp WebAudio.
   Danh mục mã: Bộ Não › 13-Tai-san-Do-hoa-Am-thanh/Danh-muc-Am-thanh.md
   ===================================================================== */
const Audio2 = {
  ctx: null, bus: {}, buf: {}, cfg: { files: {}, vol: {} }, vol: { bgm: 0.5, sfx: 0.8, ui: 0.7, voice: 0.8 }, on: true, bgmId: null, bgmNode: null, listener: { x: 0, z: 0 }, last: {},
  async load() { this.loadScript(); try { const r = await fetch('assets/audio/audio.json', { cache: 'no-cache' }); this.cfg = Object.assign(this.cfg, await r.json()); } catch (e) { } try { const v = JSON.parse(localStorage.getItem('glh_vol') || 'null'); if (v) Object.assign(this.vol, v); } catch (e) { } },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); const m = this.ctx.createGain(); m.connect(this.ctx.destination); this.master = m; for (const b of ['bgm', 'sfx', 'ui', 'voice']) { const g = this.ctx.createGain(); g.gain.value = this.vol[b]; g.connect(m); this.bus[b] = g; } } catch (e) { this.ctx = null; }
    if (this.ctx) this.preload(); if (this.ctx && this.wantBgm) { const w = this.wantBgm; this.wantBgm = null; this.bgm(w); }
  },
  setVol(b, v) { this.vol[b] = v; if (this.bus[b]) this.bus[b].gain.value = v; try { localStorage.setItem('glh_vol', JSON.stringify(this.vol)); } catch (e) { } },
  group(id) { return id.startsWith('BGM') ? 'bgm' : id.startsWith('UI') ? 'ui' : /^(VO-|ANN-|VOICE|MEME-)/.test(id) ? 'voice' : 'sfx'; },
  fileOf(id) { const f = this.cfg.files[id]; if (!f) return null; const a = Array.isArray(f) ? f : [f]; return a.length ? 'assets/audio/' + a[0] : null; },
  filesOf(id) { const f = this.cfg.files[id]; if (!f) return []; return (Array.isArray(f) ? f : [f]).map(x => 'assets/audio/' + x); },
  fbuf: {}, loading: {},
  loadFile(u) { if (u in this.fbuf || this.loading[u]) return this.loading[u]; return (this.loading[u] = fetch(u).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(a => new Promise((ok, no) => this.ctx.decodeAudioData(a, ok, no))).then(b => { this.fbuf[u] = b; return b; }).catch(() => { this.fbuf[u] = null; return null; })); },
  async getBuf(id) { const fs = this.filesOf(id); if (!fs.length || !this.ctx) return null; return this.loadFile(fs[0]); },
  /* nạp sẵn mọi hiệu ứng ngắn (nhạc nền nạp khi cần) */
  preload() { if (!this.ctx || this._pre) return; this._pre = true; for (const id in this.cfg.files) { if (id[0] === '_' || id.startsWith('BGM')) continue; for (const u of this.filesOf(id)) this.loadFile(u); } },
  pickBuf(id) { const fs = this.filesOf(id); if (!fs.length) return undefined; const ready = fs.filter(u => this.fbuf[u]); if (!ready.length) { if (fs.every(u => u in this.fbuf && this.fbuf[u] === null)) return undefined; fs.forEach(u => this.loadFile(u)); return null; } return this.fbuf[ready[Math.random() * ready.length | 0]]; },
  /* phát theo mã; x,z: vị trí (âm 3D đơn giản theo khoảng cách) */
  play(id, x, z, o = {}) {
    if (!this.ctx || !this.on) return; const now = this.ctx.currentTime; if (this.last[id] && now - this.last[id] < 0.045) return; this.last[id] = now;
    let k = 1; if (x !== undefined) { const d = Math.hypot(x - this.listener.x, z - this.listener.z); if (d > 50) return; k = Math.max(0, 1 - d / 50); k *= k; }
    k *= (this.cfg.vol[id] ?? 1) * (o.vol ?? 1); const b = o.file ? (this.fbuf[o.file] !== undefined ? this.fbuf[o.file] : (this.loadFile(o.file), null)) : this.pickBuf(id);
    if (b) { const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.playbackRate.value = o.rate || (0.94 + Math.random() * 0.12); g.gain.value = k; s.connect(g); g.connect(this.bus[this.group(id)]); s.start(); return; }
    if (b === null) return; // có file nhưng đang nạp → im lặng, không lẫn âm tổng hợp
    this.synth(id, k);
  },
  /* ---------- LỒNG TIẾNG (QĐ-0033) — kiểu MOBA: mỗi Dòng một giọng, người dẫn trận riêng ----------
     voice(fk, 'CHIEU1') → ổ VO-<DÒNG>-CHIEU1; announce('HA-DAU') → ổ ANN-HA-DAU
     Chưa có file → không phát âm tổng hợp, chỉ trả về câu thoại để hiện PHỤ ĐỀ (kich-ban.json). */
  VO_CODE: { kiem: 'THANKIEM', tram: 'NGANCHAM', tre: 'THIETTRUC', duoc: 'BACHTHAO', bang: 'HAITHUONG', lua: 'THUYTIEN', hoa: 'VIEMDAO', gao: 'HOALIEN', thach: 'THIETSON', chieng: 'DONGCO' },
  script: null, voLast: {}, subOn: true,
  async loadScript() { try { this.script = await (await fetch('assets/audio/giong-noi/kich-ban.json', { cache: 'no-cache' })).json(); } catch (e) { this.script = null; } },
  lineOf(fk, act) { const d = this.script && this.script.dong[fk]; const L = d && d.lines[act]; return L && L.length ? L[Math.random() * L.length | 0] : ''; },
  /* who: mã người nói (id người chơi) để một người không nói chồng câu; pri: câu quan trọng (chiêu lớn, bị hạ) được cắt ngang câu thường */
  voice(fk, act, o = {}) {
    const id = 'VO-' + (this.VO_CODE[fk] || 'X') + '-' + act, who = o.who || 'me', now = performance.now() / 1000, L = this.voLast[who] || 0;
    if (!o.pri && now - L < (o.gap || 1.6)) return ''; this.voLast[who] = now;
    const d = this.script && this.script.dong[fk], LS = (d && d.lines[act]) || [], i = LS.length ? Math.random() * LS.length | 0 : 0, text = LS[i] || '', fs = this.filesOf(id);
    if (this.ctx && this.on && fs.length) this.play(id, o.x, o.z, { vol: o.vol ?? 1, rate: 1, file: fs[Math.min(i, fs.length - 1)] });  // phụ đề khớp đúng file
    return text;
  },
  /* ÂM MEME (QĐ-0043): meme('HA') → chọn ngẫu nhiên một ổ MEME-HA-xx có file; trả về phụ đề (rỗng nếu không phát) */
  memeOn: true, memeLast: 0,
  meme(th, o = {}) {
    if (!this.memeOn || !this.ctx || !this.on) return ''; const now = performance.now() / 1000; if (now - this.memeLast < (o.gap ?? 4)) return '';
    const ids = Object.keys(this.cfg.files).filter(k => k.startsWith('MEME-' + th + '-') && this.filesOf(k).length); if (!ids.length) return '';
    const id = ids[Math.random() * ids.length | 0]; this.memeLast = now; this.play(id, o.x, o.z, { rate: 1, vol: o.vol ?? 1 });
    const m = this.script && this.script.meme && this.script.meme[id]; return (m && m.sub) || '';
  },
  announce(ev) { const id = 'ANN-' + ev, s = this.script && this.script.ann[ev], i = s ? Math.random() * s.lines.length | 0 : 0, text = s ? s.lines[i] : '', fs = this.filesOf(id); if (this.ctx && this.on && fs.length) this.play(id, undefined, undefined, { rate: 1, file: fs[Math.min(i, fs.length - 1)] }); return text; },
  /* âm lặp: bước chân, môi trường. on=false để tắt (mờ dần) */
  loops: {},
  loop(id, on, vol = 1) {
    if (!this.ctx) return; const L = this.loops[id];
    if (!on) { if (L && L.on) { L.on = false; L.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25); } return; }
    if (L) { if (!L.on) { L.on = true; } L.g.gain.setTargetAtTime((this.cfg.vol[id] ?? 1) * vol, this.ctx.currentTime, 0.3); return; }
    const b = this.pickBuf(id); if (!b) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(this.bus.sfx); s.start(0, Math.random() * b.duration);
    g.gain.setTargetAtTime((this.cfg.vol[id] ?? 1) * vol, this.ctx.currentTime, 0.4); this.loops[id] = { s, g, on: true };
  },
  /* âm tổng hợp dự phòng — mỗi mã một "màu" âm riêng */
  synth(id, k) {
    const c = this.ctx, t = c.currentTime, out = this.bus[this.group(id)] || this.master;
    const tone = (f0, f1, dur, type = 'sine', v = 0.25, d = 0) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + d); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d + dur); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(v * k, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + dur); o.connect(g); g.connect(out); o.start(t + d); o.stop(t + d + dur + 0.02); };
    const noise = (dur, f, v = 0.2, d = 0, q = 1) => { const n = c.createBufferSource(), L = Math.floor(c.sampleRate * dur), bf = c.createBuffer(1, L, c.sampleRate), a = bf.getChannelData(0); for (let i = 0; i < L; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / L); n.buffer = bf; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = v * k; n.connect(fl); fl.connect(g); g.connect(out); n.start(t + d); };
    const S = id.split('-');
    if (id.startsWith('SFX-') && S.length >= 3 && ['KIEM', 'DUOC', 'BANG', 'HOA', 'THACH'].includes(S[1])) {
      const e = S[1], hit = S[3] === 'HIT', ult = S[2] === 'ULT';
      if (hit) { noise(0.12, e === 'HOA' ? 900 : e === 'BANG' ? 2400 : 1500, 0.3); tone(e === 'THACH' ? 120 : 300, 90, 0.12, 'triangle', 0.2); return; }
      if (e === 'KIEM') { noise(0.18, 3200, 0.25, 0, 3); tone(1400, 2600, 0.12, 'sine', 0.08); }
      else if (e === 'DUOC') { tone(880, 1320, 0.15, 'sine', 0.15); tone(1320, 1760, 0.12, 'sine', 0.1, 0.06); }
      else if (e === 'BANG') { noise(0.3, 700, 0.25, 0, 0.8); tone(500, 260, 0.25, 'sine', 0.1); }
      else if (e === 'HOA') { noise(0.35, 500, 0.3, 0, 0.6); tone(200, 90, 0.3, 'sawtooth', 0.08); }
      else { tone(90, 40, 0.4, 'triangle', 0.35); noise(0.3, 200, 0.3); }
      if (ult) { tone(110, 55, 0.9, 'sawtooth', 0.12, 0.05); noise(0.8, 300, 0.25, 0.05, 0.5); } return;
    }
    switch (id) {
      case 'SFX-HURT': tone(220, 110, 0.15, 'square', 0.12); break;
      case 'SFX-CRIT': tone(1800, 900, 0.1, 'square', 0.12); noise(0.1, 4000, 0.15); break;
      case 'SFX-PRECISION': tone(1600, 2400, 0.08, 'sine', 0.2); tone(2400, 3200, 0.06, 'sine', 0.12, 0.05); break;
      case 'SFX-ELEM-KHAC': tone(660, 990, 0.12, 'triangle', 0.12); break;
      case 'SFX-DIE': tone(300, 60, 0.6, 'sawtooth', 0.15); break;
      case 'SFX-KILL': tone(523, 523, 0.1, 'triangle', 0.2); tone(784, 784, 0.18, 'triangle', 0.2, 0.1); tone(1046, 1046, 0.25, 'triangle', 0.2, 0.22); break;
      case 'SFX-LEVELUP': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.18, i * 0.08)); break;
      case 'SFX-DODGE': noise(0.22, 1200, 0.25, 0, 1.5); break;
      case 'SFX-FLY': noise(0.6, 600, 0.15, 0, 0.5); tone(300, 600, 0.5, 'sine', 0.05); break;
      case 'SFX-PICK': tone(988, 1318, 0.08, 'sine', 0.15); break;
      case 'SFX-PICK-RARE': case 'SFX-EQUIP': [784, 988, 1318].forEach((f, i) => tone(f, f, 0.14, 'sine', 0.14, i * 0.06)); break;
      case 'SFX-POT-HP': case 'SFX-POT-MP': tone(500, 900, 0.2, 'sine', 0.15); break;
      case 'SFX-RESPEC': [1046, 784, 659, 523].forEach((f, i) => tone(f, f, 0.15, 'sine', 0.12, i * 0.08)); break;
      case 'SFX-ZONE-WARN': for (let i = 0; i < 3; i++) tone(180, 180, 0.25, 'square', 0.12, i * 0.35); break;
      case 'SFX-SUPPLY-DROP': noise(1.2, 400, 0.2, 0, 0.4); tone(600, 300, 1.0, 'sine', 0.06); break;
      case 'SFX-SUPPLY-OPEN': [659, 784, 988, 1318].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.16, i * 0.07)); break;
      case 'SFX-BOSS-SPAWN': tone(70, 40, 1.4, 'sawtooth', 0.2); noise(1.2, 150, 0.3); break;
      case 'SFX-BOSS-SLAM': tone(60, 30, 0.6, 'triangle', 0.4); noise(0.5, 120, 0.4); break;
      case 'SFX-BOSS-DIE': tone(200, 40, 1.5, 'sawtooth', 0.2); [523, 659, 784].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.15, 0.6 + i * 0.12)); break;
      case 'SFX-STUN': tone(1200, 800, 0.3, 'sine', 0.1); break;
      case 'UI-CLICK': tone(700, 900, 0.05, 'sine', 0.12); break;
      case 'UI-DENY': tone(200, 150, 0.12, 'square', 0.1); break;
      case 'UI-POINT-ADD': case 'UI-SKILL-UP': tone(880, 1175, 0.1, 'triangle', 0.15); break;
      case 'UI-MATCH-FOUND': case 'UI-GO': [392, 523, 659].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.18, i * 0.1)); break;
      case 'UI-COUNTDOWN': tone(440, 440, 0.12, 'sine', 0.15); break;
      case 'UI-NOTIFY': tone(660, 880, 0.12, 'sine', 0.12); break;
      case 'UI-RANK-UP': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.16, i * 0.09)); break;
      case 'UI-RANK-DOWN': [523, 440, 349].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.14, i * 0.12)); break;
      default: tone(600, 400, 0.08, 'sine', 0.08);
    }
  },
  /* nhạc nền theo trạng thái: BGM-TITLE / LOBBY / MATCH-CALM / MATCH-COMBAT / ZONE-SHRINK / FINAL / VICTORY / DEFEAT */
  async bgm(id) {
    if (!this.ctx) { this.wantBgm = id; return; } if (this.bgmId === id) return; const file = this.fileOf(id); this.bgmId = id;
    if (file && file === this.bgmFile && this.bgmNode) return; // cùng một bài → nhạc chạy tiếp
    this.bgmFile = file; const old = this.bgmNode, oldG = this.bgmGain; this.bgmNode = null;
    if (old) { try { if (oldG) { oldG.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); setTimeout(() => { try { old.stop(); } catch (e) { } }, 2500); } else old.stop(); } catch (e) { } }
    const b = file ? await this.loadFile(file) : null; if (this.bgmId !== id) return;
    if (b) { const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(this.cfg.vol[id] ?? 0.6, this.ctx.currentTime, 0.6); s.buffer = b; s.loop = true; s.connect(g); g.connect(this.bus.bgm); s.start(); this.bgmNode = s; this.bgmGain = g; return; }
    this.bgmGain = null;
    // dự phòng: nền ngũ cung (sáo + trống) đổi nhịp theo trạng thái
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.05; g.connect(this.bus.bgm); const fast = /COMBAT|SHRINK|FINAL|BOSS/.test(id), sc = [261.6, 293.7, 329.6, 392, 440, 523.2];
    let alive = true, i = 0; const step = () => { if (!alive || this.bgmId !== id) { g.disconnect(); return; } const t = c.currentTime, o = c.createOscillator(), e = c.createGain(); o.type = 'triangle'; o.frequency.value = sc[(i * 3 + (i >> 2)) % 6] / (i % 4 ? 2 : 1); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.8, t + 0.03); e.gain.exponentialRampToValueAtTime(0.0001, t + (fast ? 0.35 : 0.9)); o.connect(e); e.connect(g); o.start(t); o.stop(t + 1); if (fast && i % 2 === 0) { const d = c.createOscillator(), dg = c.createGain(); d.frequency.setValueAtTime(110, t); d.frequency.exponentialRampToValueAtTime(40, t + 0.15); dg.gain.setValueAtTime(1.2, t); dg.gain.exponentialRampToValueAtTime(0.001, t + 0.18); d.connect(dg); dg.connect(g); d.start(t); d.stop(t + 0.2); } i++; setTimeout(step, fast ? 230 : 520); };
    this.bgmNode = { stop() { alive = false; } }; step();
  },
};
