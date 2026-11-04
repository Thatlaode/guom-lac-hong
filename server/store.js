/* Lưu bậc hạng cục bộ (tài khoản giả lập theo tên) — M5 sẽ đồng bộ vieesport.vn */
const fs = require('fs'), path = require('path'), GLH = require('../shared/rules.js');
class Store {
  constructor(dir) { this.file = path.join(dir, 'players.json'); try { this.db = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (e) { this.db = {}; } }
  save() { try { fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.db, null, 1)); fs.renameSync(this.file + '.tmp', this.file); } catch (e) { try { fs.writeFileSync(this.file, JSON.stringify(this.db, null, 1)); } catch (e2) { } } }
  get(name) { const k = String(name).toLowerCase(); return this.db[k] || (this.db[k] = { name, pts: 0, matches: 0, wins: 0, kills: 0, best: 99 }); }
  applyResult(name, place, n, kills, humans, size) {
    const r = this.get(name), before = r.pts, d = GLH.rankDelta(r.pts, place, n, kills, humans, size);
    r.pts = Math.max(0, r.pts + d); r.matches++; r.kills += kills; if (place === 1) r.wins++; r.best = Math.min(r.best, place); this.save();
    return { before, after: r.pts, delta: r.pts - before, rank: GLH.rankOf(r.pts), prev: GLH.rankOf(before) };
  }
  top(n = 50) { return Object.values(this.db).sort((a, b) => b.pts - a.pts).slice(0, n).map(r => Object.assign({ rank: GLH.rankOf(r.pts) }, r)); }
}
module.exports = { Store };
