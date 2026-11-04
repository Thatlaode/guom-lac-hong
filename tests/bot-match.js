/* TEST: một trận toàn người máy chạy không giao diện, tăng tốc. Dùng: node tests/bot-match.js [preset] [số trận] */
const GLH = require('../shared/rules.js'), { loadTerrain } = require('../server/terrain.js'), { Match } = require('../server/match.js');
const preset = process.argv[2] || 'thuong', N = +process.argv[3] || 1;
const T0 = Date.now(), terrain = loadTerrain(); console.log('địa hình', Date.now() - T0, 'ms');
const cfg = Object.assign({}, GLH.DEFAULT_CFG, GLH.PRESETS[preset], { preset, matchSize: +process.env.SIZE || 20 }); if (process.env.TUNE) cfg.tune = JSON.parse(require('fs').readFileSync(process.env.TUNE, 'utf8'));
const srv = { terrain, config: () => cfg, send() {}, store: { applyResult() { return null; } } };
const wins = {}, places = {}, kills = {}, cnt = {}, dmg = {}; let totT = 0, totLvl = 0, errs = 0;
for (let k = 0; k < N; k++) {
  const M = new Match(srv, { mode: 'solo', headless: true }); const dt = 1 / GLH.MATCH.tick; let it = 0; const w0 = Date.now();
  try { while (!M.ended && it < 20 * 60 * 20) { M.tick(dt); M.events.length = 0; it++; } } catch (e) { errs++; console.error(e); break; }
  totT += M.t; const list = [...M.players.values()]; list.forEach(p => { cnt[p.fk] = (cnt[p.fk] || 0) + 1; dmg[p.fk] = (dmg[p.fk] || 0) + p.dmg; places[p.fk] = (places[p.fk] || 0) + p.place; kills[p.fk] = (kills[p.fk] || 0) + p.kills; totLvl += p.lvl; });
  const w = list.find(p => p.place === 1); if (w) wins[w.fk] = (wins[w.fk] || 0) + 1;
  if (N <= 3) console.log(`trận ${k + 1}: ${(M.t / 60).toFixed(1)} phút mô phỏng, ${(Date.now() - w0)} ms thật; thắng: ${w && w.name} (${w && GLH.FACTIONS[w.fk].short}, Lv${w && w.lvl}, ${w && w.kills} mạng hạ); quái còn ${[...M.mons.values()].filter(m => m.alive).length}/${M.mons.size}; Hòm Diều mở: ${list.length}`);
}
console.log(`\n== ${N} trận · độ khó ${preset} · TB ${(totT / N / 60).toFixed(1)} phút · cấp TB lúc kết ${(totLvl / N / cfg.matchSize).toFixed(1)} · lỗi ${errs}`);
for (const fk of GLH.FACTION_KEYS) { const n = cnt[fk] || 1; console.log(`${GLH.FACTIONS[fk].short.padEnd(11)} ${GLH.FACTIONS[fk].sex.padEnd(3)} thắng ${String(wins[fk] || 0).padStart(3)} (${(100 * (wins[fk] || 0) / N).toFixed(0).padStart(2)}%, kỳ vọng ${(100 * n / N / cfg.matchSize).toFixed(0)}%) · hạng TB ${(places[fk] / n).toFixed(1).padStart(4)} · hạ TB ${(kills[fk] / n).toFixed(2)} · sát thương TB ${Math.round(dmg[fk] / n)}`); }
