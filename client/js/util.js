/* ===================== Tiện ích: random, noise, âm thanh ===================== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a + (b - a) * k;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n); };

class Noise {
  constructor(seed) {
    const r = mulberry32(seed), p = new Uint8Array(512), a = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let i = 0; i < 512; i++) p[i] = a[i & 255]; this.p = p;
  }
  g(h, x, y) { switch (h & 7) { case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } }
  n2(x, y) {
    const p = this.p, X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
    const a = p[X] + Y, b = p[X + 1] + Y;
    return mix(mix(this.g(p[a], x, y), this.g(p[b], x - 1, y), u), mix(this.g(p[a + 1], x, y - 1), this.g(p[b + 1], x - 1, y - 1), u), v) * 1.41;
  }
  fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * this.n2(x * f, y * f); f *= 2; a *= 0.5; } return s; }
  ridge(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(this.n2(x * f, y * f))); f *= 2; a *= 0.5; } return s; }
}

/* ---------- Âm thanh tổng hợp (không cần file) ---------- */
const Sound = {
  ctx: null, on: true, master: null, amb: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
      this.startAmbient();
    } catch (e) { this.ctx = null; }
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.5 : 0; },
  startAmbient() {
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.05; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; g.connect(lp); lp.connect(this.master);
    [110, 164.8, 220.5, 277].forEach((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.05 + i * 0.03; lg.gain.value = 3; l.connect(lg); lg.connect(o.frequency); o.connect(g); o.start(); l.start(); });
    this.amb = g;
    // chuông gió thỉnh thoảng
    const chime = () => { if (this.ctx && this.on) { const sc = [523.25, 587.33, 659.25, 783.99, 880]; this.tone(pick(sc), 0.18, 'sine', 0.05, 2.2); } setTimeout(chime, 6000 + Math.random() * 9000); }; setTimeout(chime, 4000);
  },
  tone(f, dur = 0.12, type = 'sine', vol = 0.15, rel = 0, slide = 0) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + rel + 0.02);
  },
  noise(dur = 0.1, vol = 0.12, fq = 1500) {
    if (!this.ctx || !this.on) return; const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.master); s.start();
  },
  play(n) {
    switch (n) {
      case 'cast': this.tone(520, 0.12, 'sine', 0.1, 0.1, 500); break;
      case 'hit': this.noise(0.08, 0.14, 900); this.tone(180, 0.07, 'square', 0.05); break;
      case 'crit': this.noise(0.12, 0.2, 1800); this.tone(700, 0.1, 'sawtooth', 0.08, 0.05, -300); break;
      case 'hurt': this.tone(140, 0.2, 'sawtooth', 0.12, 0.05, -80); break;
      case 'die': this.tone(300, 0.25, 'triangle', 0.1, 0.1, -200); break;
      case 'pick': this.tone(880, 0.06, 'sine', 0.1); this.tone(1320, 0.08, 'sine', 0.08, 0.05); break;
      case 'gold': this.tone(1568, 0.05, 'square', 0.04); break;
      case 'rare': [659, 784, 988, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.12, 0.3), i * 90)); break;
      case 'level': [523, 659, 784, 1046, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.14, 0.5), i * 110)); break;
      case 'skill': this.noise(0.25, 0.1, 600); this.tone(330, 0.2, 'sine', 0.1, 0.2, 300); break;
      case 'ui': this.tone(660, 0.04, 'sine', 0.08); break;
      case 'drink': this.tone(400, 0.1, 'sine', 0.1, 0.1, 300); break;
      case 'deny': this.tone(160, 0.12, 'square', 0.06); break;
      case 'boss': this.tone(80, 0.6, 'sawtooth', 0.15, 0.6, -20); break;
      case 'slam': this.noise(0.4, 0.25, 200); this.tone(70, 0.3, 'sine', 0.2, 0.2); break;
    }
  }
};
