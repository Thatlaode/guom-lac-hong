/* =====================================================================
   GƯƠM LẠC HỒNG — máy chủ trận đấu (chạy offline / LAN, chưa cần VPS)
   node server/server.js  [PORT=8080] [ADMIN_KEY=...]
   - http://localhost:8080          → game (PC + điện thoại)
   - http://localhost:8080/admin.html → bảng Admin chỉnh độ khó
   ===================================================================== */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), zlib = require('zlib');
const { WebSocketServer } = require('ws');
const GLH = require('../shared/rules.js');
const { loadTerrain } = require('./terrain.js');
const { Match } = require('./match.js');
const { Store } = require('./store.js');

const ROOT = path.join(__dirname, '..'), CLIENT = path.join(ROOT, 'client'), SHARED = path.join(ROOT, 'shared'), DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data'), PORT = +process.env.PORT || 8080, HOST = process.env.HOST || '0.0.0.0';
const BETA = /beta/.test(require('../package.json').version), START_T = Date.now();
/* bản beta: lỗi bất ngờ chỉ ghi log, máy chủ không sập */
process.on('uncaughtException', e => console.error('[LỖI]', new Date().toISOString(), e && e.stack || e)); process.on('unhandledRejection', e => console.error('[LỖI hứa]', e));
fs.mkdirSync(DATA, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };

/* ---------- Cấu hình Admin ---------- */
const CFG_FILE = path.join(DATA, 'admin-config.json'), KEY_FILE = path.join(DATA, 'admin-key.txt');
let CFG = Object.assign({}, GLH.DEFAULT_CFG); try { Object.assign(CFG, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch (e) { }
let ADMIN_KEY = process.env.ADMIN_KEY; if (!ADMIN_KEY) { try { ADMIN_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim(); } catch (e) { ADMIN_KEY = crypto.randomBytes(4).toString('hex'); fs.writeFileSync(KEY_FILE, ADMIN_KEY); } }
const NUM_KEYS = ['matchSize', 'lobbyWait', 'practiceBots', 'dmgMul', 'monHpMul', 'monAtkMul', 'zoneSpeedMul', 'zoneDpsMul', 'expMul', 'lootMul', 'aimAssistTouch', 'aimAssistPc'];
const LIMITS = { matchSize: [2, 24], lobbyWait: [3, 300], practiceBots: [0, 23], dmgMul: [0.3, 3], monHpMul: [0.2, 5], monAtkMul: [0.2, 5], zoneSpeedMul: [0.3, 3], zoneDpsMul: [0.2, 5], expMul: [0.2, 5], lootMul: [0, 5], aimAssistTouch: [0, 0.3], aimAssistPc: [0, 0.3] };
function setConfig(o) {
  if (o.preset && GLH.PRESETS[o.preset]) Object.assign(CFG, GLH.PRESETS[o.preset], { preset: o.preset });
  for (const k of NUM_KEYS) if (o[k] !== undefined && isFinite(+o[k])) CFG[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], +o[k]));
  for (const k of ['fillBots', 'chests', 'boss', 'monsters']) if (o[k] !== undefined) CFG[k] = !!o[k];
  if (o.botSkill && GLH.BOT_SKILL[o.botSkill]) CFG.botSkill = o.botSkill;
  if (!o.preset && Object.keys(o).some(k => k !== 'preset')) CFG.preset = o.presetKeep ? CFG.preset : 'tuychinh';
  fs.writeFileSync(CFG_FILE, JSON.stringify(CFG, null, 1)); return CFG;
}

/* ---------- Cân bằng từng phần (QĐ-0031): tune + lịch sử bản cân bằng + thống kê theo Dòng ---------- */
const HIST_FILE = path.join(DATA, 'tune-history.json'), FST_FILE = path.join(DATA, 'faction-stats.json');
CFG.tune = GLH.cleanTune(CFG.tune); GLH.setTune(CFG.tune);
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }, writeJ = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
function setTune(t, note) {
  const old = CFG.tune, hist = readJ(HIST_FILE, []); hist.unshift({ at: new Date().toISOString(), note: note || '', tune: old }); writeJ(HIST_FILE, hist.slice(0, 30));
  CFG.tune = GLH.cleanTune(t); GLH.setTune(CFG.tune); fs.writeFileSync(CFG_FILE, JSON.stringify(CFG, null, 1)); return CFG.tune;
}
function recordFactions(r) {
  const S = readJ(FST_FILE, {}), v = r.tuneV || '?', B = S[v] || (S[v] = { games: 0, f: {} }); B.games++;
  for (const p of r.list) { const f = B.f[p.fk] || (B.f[p.fk] = { n: 0, wins: 0, top3: 0, place: 0, kills: 0, dmg: 0, humans: 0 }); f.n++; if (p.place === 1) f.wins++; if (p.place <= 3) f.top3++; f.place += p.place / r.list.length; f.kills += p.kills; f.dmg += p.dmg; if (!p.bot) f.humans++; }
  writeJ(FST_FILE, S);
}

/* ---------- Máy chủ ---------- */
const srv = {
  terrain: null, store: new Store(DATA), matches: new Map(), lobby: { solo: [], t0: 0 }, conns: new Set(),
  config: () => CFG, recordFactions,
  send(c, o) { if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); },
};
console.log('Đang dựng địa hình…'); srv.terrain = loadTerrain();

function lanIPs() { const r = []; for (const l of Object.values(os.networkInterfaces())) for (const a of l || []) if (a.family === 'IPv4' && !a.internal) r.push(a.address); return r; }

/* ---------- Phục vụ file tĩnh: chỉ trong client/ và shared/; nén gzip; cache tài nguyên nặng ---------- */
const GZ = new Set(['.html', '.js', '.css', '.json', '.svg', '.md', '.glb', '.gltf', '.txt']), gzCache = new Map();
function sendFile(req, res, file, st) {
  const ext = path.extname(file).toLowerCase(), heavy = /[\\/]assets[\\/]/.test(file) && !/\.json$/.test(file);
  const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': heavy ? 'public, max-age=86400' : 'no-cache', 'Last-Modified': st.mtime.toUTCString(), 'X-Content-Type-Options': 'nosniff' };
  if (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']) >= new Date(st.mtime.toUTCString())) { res.writeHead(304, h); return res.end(); }
  if (GZ.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '') && st.size > 1024) {
    const k = file + st.mtimeMs; let z = gzCache.get(k);
    if (!z) { z = zlib.gzipSync(fs.readFileSync(file), { level: 9 }); if (gzCache.size > 400) gzCache.clear(); gzCache.set(k, z); }
    h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; h['Content-Length'] = z.length; res.writeHead(200, h); return res.end(req.method === 'HEAD' ? undefined : z);
  }
  h['Content-Length'] = st.size; res.writeHead(200, h); if (req.method === 'HEAD') return res.end(); fs.createReadStream(file).pipe(res);
}
const httpSrv = http.createServer((req, res) => {
  let u, p; try { u = new URL(req.url, 'http://x'); p = decodeURIComponent(u.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.startsWith('/api/')) return api(req, res, u, p).catch(e => { console.error('[API]', e); json(res, 500, { error: 'lỗi máy chủ' }); });
  if (p === '/') p = '/online.html';
  const file = p.startsWith('/shared/') ? path.join(ROOT, p) : path.join(CLIENT, p);
  if (!(file.startsWith(CLIENT + path.sep) || file.startsWith(SHARED + path.sep)) || p.includes('\0')) { res.writeHead(403); return res.end(); } // chặn ../ ra ngoài
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không thấy: ' + p); }
    sendFile(req, res, file, st);
  });
});
function json(res, code, o) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); }
function body(req) { return new Promise(r => { let b = ''; req.on('data', d => { b += d; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch (e) { r({}); } }); }); }
async function api(req, res, u, p) {
  if (p === '/api/health') return json(res, 200, { ok: true, version: GLH.VERSION, beta: BETA, uptime: Math.round((Date.now() - START_T) / 1000), online: srv.conns.size, matches: srv.matches.size, mem: Math.round(process.memoryUsage().rss / 1048576) + ' MB' });
  if (p === '/api/info') return json(res, 200, { beta: BETA, name: GLH.NAME, version: GLH.VERSION, preset: CFG.preset, presetName: (GLH.PRESETS[CFG.preset] || { n: 'Tự chỉnh' }).n, online: srv.conns.size, matches: srv.matches.size, lobby: srv.lobby.solo.length });
  if (p === '/api/top') return json(res, 200, srv.store.top(50));
  if (p === '/api/tune') return json(res, 200, CFG.tune);
  if (p === '/api/me') return json(res, 200, Object.assign({ rank: GLH.rankOf(srv.store.get(u.searchParams.get('name') || '').pts) }, srv.store.get(u.searchParams.get('name') || '')));
  if (p.startsWith('/api/admin/')) {
    const key = req.headers['x-admin-key'] || u.searchParams.get('key'); if (key !== ADMIN_KEY) return json(res, 403, { error: 'Sai mã Admin' });
    if (p === '/api/admin/config') { if (req.method === 'POST') return json(res, 200, setConfig(await body(req))); return json(res, 200, CFG); }
    if (p === '/api/admin/meta') return json(res, 200, { presets: GLH.PRESETS, botSkill: GLH.BOT_SKILL, limits: LIMITS });
    if (p === '/api/admin/status') return json(res, 200, { matches: [...srv.matches.values()].map(M => ({ id: M.id, mode: M.mode, t: Math.round(M.t), alive: [...M.players.values()].filter(q => q.alive).length, humans: M.humans, size: M.players.size, preset: M.cfg.preset })), lobby: srv.lobby.solo.map(c => c.name), online: srv.conns.size, ips: lanIPs(), port: PORT });
    if (p === '/api/admin/tune') { if (req.method === 'POST') { const b = await body(req); return json(res, 200, setTune(b.tune, b.note)); } return json(res, 200, { tune: CFG.tune, base: GLH.BASE_FACTIONS, labels: { g: GLH.TUNE_G, f: GLH.TUNE_F, s: GLH.TUNE_S } }); }
    if (p === '/api/admin/tune-history') return json(res, 200, readJ(HIST_FILE, []).map((h, i) => ({ i, at: h.at, note: h.note, v: h.tune && h.tune.v })));
    if (p === '/api/admin/tune-restore') { const b = await body(req), h = readJ(HIST_FILE, [])[b.i | 0]; if (!h) return json(res, 404, { error: 'không có bản này' }); return json(res, 200, setTune(h.tune, 'Khôi phục ' + (h.tune.v || ''))); }
    if (p === '/api/admin/tune-reset') return json(res, 200, setTune(null, 'Về bản gốc'));
    if (p === '/api/admin/fstats') { if (req.method === 'POST') { writeJ(FST_FILE, {}); return json(res, 200, {}); } return json(res, 200, readJ(FST_FILE, {})); }
    if (p === '/api/admin/start') { startLobby(true); return json(res, 200, { ok: true }); }
    if (p === '/api/admin/end') { for (const M of srv.matches.values()) if (!M.ended) { M.over = true; M.endAt = M.t; } return json(res, 200, { ok: true }); }
  }
  json(res, 404, { error: 'không có' });
}

/* ---------- WebSocket ---------- */
const MAX_PER_IP = +process.env.MAX_PER_IP || 20, MAX_CONN = +process.env.MAX_CONN || 300, perIp = new Map();
const wss = new WebSocketServer({ server: httpSrv, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', (ws, req) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), nIp = (perIp.get(ip) || 0) + 1;
  if (nIp > MAX_PER_IP || srv.conns.size >= MAX_CONN) { ws.close(1013, 'Máy chủ đầy'); return; } perIp.set(ip, nIp);
  ws.on('close', () => { const n = (perIp.get(ip) || 1) - 1; if (n <= 0) perIp.delete(ip); else perIp.set(ip, n); });
  let budget = 120, lastT = Date.now(); // tối đa ~120 tin/giây/người — chống spam
  const c = { ws, name: 'Người chơi', fk: 'kiem', match: null, P: null, touch: false }; srv.conns.add(c);
  srv.send(c, { t: 'welcome', v: GLH.VERSION, preset: CFG.preset });
  ws.on('message', raw => { const now = Date.now(); budget = Math.min(120, budget + (now - lastT) * 0.12); lastT = now; if (--budget < 0) return; let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || typeof m !== 'object') return; try { onMsg(c, m); } catch (e) { console.error('[onMsg]', e); } });
  ws.on('close', () => { srv.conns.delete(c); leaveLobby(c); if (c.match && c.P) { c.P.conn = null; if (c.P.alive && !c.match.ended) c.match.killPlayer(c.P, null, 'roi'); } });
});
function onMsg(c, m) {
  if (m.t === 'hello') { c.name = String(m.name || '').replace(/[<>]/g, '').trim().slice(0, 18) || 'Người chơi'; if (c.name.includes('🤖')) c.name = c.name.replace(/🤖/g, ''); c.fk = GLH.FACTIONS[m.fk] && GLH.FACTIONS[m.fk].on ? m.fk : (GLH.FACTION_ON[0] || 'kiem'); c.touch = !!m.touch; return; }
  if (m.t === 'queue') {
    if (c.match && !c.match.ended) return; c.match = null; c.P = null;
    if (m.mode === 'practice') return startMatch('practice', [c]);
    if (!srv.lobby.solo.includes(c)) srv.lobby.solo.push(c); if (srv.lobby.solo.length === 1) srv.lobby.t0 = Date.now(); lobbyBroadcast();
    if (srv.lobby.solo.length >= CFG.matchSize) startLobby(true); return;
  }
  if (m.t === 'leave') { leaveLobby(c); if (c.match && c.P && c.P.alive && !c.match.ended) c.match.killPlayer(c.P, null, 'roi'); c.match = null; c.P = null; return; }
  if (m.t === 'spec' && c.match && c.P && !c.P.alive) { const list = [...c.match.players.values()].filter(q => q.alive); if (list.length) { const i = (list.findIndex(q => q.id === c.P.specId) + 1) % list.length; c.P.specId = list[i].id; } return; }
  if (c.match && c.P) c.match.onMsg(c.P, m);
}
function leaveLobby(c) { const i = srv.lobby.solo.indexOf(c); if (i >= 0) { srv.lobby.solo.splice(i, 1); lobbyBroadcast(); } }
function lobbyBroadcast() { const L = srv.lobby.solo, left = Math.max(0, CFG.lobbyWait - (Date.now() - srv.lobby.t0) / 1000); for (const c of L) srv.send(c, { t: 'lobby', n: L.length, size: CFG.matchSize, wait: Math.ceil(left), names: L.map(x => x.name) }); }
function startLobby(force) { const L = srv.lobby.solo; if (!L.length) return; if (!force && (Date.now() - srv.lobby.t0) / 1000 < CFG.lobbyWait) return; const group = L.splice(0, CFG.matchSize); startMatch('solo', group); if (L.length) srv.lobby.t0 = Date.now(); }
function startMatch(mode, humans) {
  const M = new Match(srv, { mode, humans }); srv.matches.set(M.id, M);
  for (const c of humans) { c.match = M; c.P = [...M.players.values()].find(p => p.conn === c); srv.send(c, M.startInfo(c.P)); }
  console.log(`▶ ${M.id} (${mode === 'practice' ? 'tập' : 'Đánh Lẻ'}) · ${M.humans} người thật + ${M.players.size - M.humans} người máy · độ khó ${M.cfg.preset}`);
}

/* ---------- Nhịp server ---------- */
let last = Date.now(), lobbyT = 0;
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  for (const M of srv.matches.values()) {
    try { M.tick(dt); } catch (e) { console.error('[TRẬN ' + M.id + '] lỗi, kết thúc trận:', e && e.stack || e); M.errN = (M.errN || 0) + 1; if (M.errN > 3 && !M.ended) { try { M.finish(); } catch (e2) { M.ended = true; } } }
    const ev = M.events.length ? JSON.stringify({ t: 'e', e: M.events }) : null; M.events = [];
    for (const P of M.players.values()) { if (!P.conn || P.conn.match !== M) continue; if (ev && P.conn.ws.readyState === 1) P.conn.ws.send(ev); srv.send(P.conn, M.snapshotFor(P)); if ((M.tickN = (M.tickN || 0) + 1) % 4 === 0 || true) { if (((P._meN = (P._meN || 0) + 1) % 4) === 0) srv.send(P.conn, M.meFor(P)); } }
    if (M.ended && !M.cleanAt) { M.cleanAt = now + 5000; console.log(`■ ${M.id} kết thúc sau ${(M.t / 60).toFixed(1)} phút`); }
    if (M.cleanAt && now > M.cleanAt) srv.matches.delete(M.id);
  }
  if ((lobbyT += dt) >= 1) { lobbyT = 0; if (srv.lobby.solo.length) { lobbyBroadcast(); startLobby(false); } }
}, 1000 / GLH.MATCH.tick);

/* HTTPS tùy chọn (cần cho Gyro trên điện thoại khi chơi qua wifi): đặt cert.pem + key.pem vào server/data/ → mở thêm cổng 8443 */
try {
  const cert = path.join(DATA, 'cert.pem'), key = path.join(DATA, 'key.pem');
  if (fs.existsSync(cert) && fs.existsSync(key)) { const https = require('https'), hs = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, (q, r) => httpSrv.emit('request', q, r)); hs.on('upgrade', (q, so, h) => httpSrv.emit('upgrade', q, so, h)); const HP = +process.env.HTTPS_PORT || 8443; hs.listen(HP, '0.0.0.0', () => { for (const ip of lanIPs()) console.log('  HTTPS (Gyro điện thoại) :  https://' + ip + ':' + HP); }); }
} catch (e) { console.log('Không mở được HTTPS:', e.message); }
httpSrv.listen(PORT, HOST, () => {
  console.log('\n==============================================');
  console.log('  ' + GLH.NAME + ' · ' + GLH.SUB + ' — máy chủ v' + GLH.VERSION + (BETA ? ' (BETA)' : ''));
  console.log('==============================================');
  console.log('  Chơi trên máy này :  http://localhost:' + PORT);
  for (const ip of lanIPs()) console.log('  Điện thoại/PC khác cùng wifi :  http://' + ip + ':' + PORT);
  console.log('  Bảng Admin        :  http://localhost:' + PORT + '/admin.html');
  console.log('  Mã Admin          :  ' + ADMIN_KEY + (process.env.ADMIN_KEY ? '   (đặt trong biến môi trường ADMIN_KEY)' : '   (lưu ở ' + KEY_FILE + ')'));
  console.log('  Độ khó hiện tại   :  ' + CFG.preset);
  console.log('  Tắt máy chủ: bấm Ctrl + C\n');
});
