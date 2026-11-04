/* ===================== Giao diện: HUD, túi đồ, đan lò, bản đồ ===================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const itemIcon = it => it.kind === 'equip' ? SLOTS[it.slot].ic : ITEMDEF[it.key].ic;
const itemColor = it => it.kind === 'equip' ? RAR[it.rar].c : '#f3ecd8';
const itemName = it => it.kind === 'equip' ? it.name + (it.plus ? ' +' + it.plus : '') : ITEMDEF[it.key].name;
const itemPrice = it => it.kind === 'equip' ? equipPrice(it) : ITEMDEF[it.key].price;
const fmtTime = s => { s = Math.floor(s); return Math.floor(s / 3600) + 'g ' + Math.floor(s % 3600 / 60) + 'p'; };

class UI {
  constructor(G) {
    this.G = G; this.fl = []; this.flPool = []; this.sel = null; this.shopTab = 'buy'; this.hudT = 0; this.zoneId = -1; this.toastT = 0; this.enhSel = null;
    this.slots = [{ k: 'J', ic: '💊', n: 'Luyện Đan', lv: 1, d: 'Ném viên đan tự dẫn hướng vào kẻ địch gần nhất.' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ k: String(i), ic: SKILLS[i].ic, n: SKILLS[i].n, lv: SKILLS[i].lv, mp: SKILLS[i].mp, cd: SKILLS[i].cd, d: SKILLS[i].d, id: i }))];
    const hb = $('hotbar');
    this.slots.forEach((s, i) => { const e = document.createElement('div'); e.className = 'slot'; e.title = s.n + (s.lv > 1 ? ' (Lv.' + s.lv + ')' : '') + '\n' + s.d; e.innerHTML = `<span class="k">${s.k}</span>${s.ic}<div class="cd" style="height:0"></div><div class="cdt"></div><div class="lk hidden">🔒<br>Lv.${s.lv}</div>`; e.onclick = () => this.G.pressKey(s.k); hb.appendChild(e); s.el = e; s.cdEl = e.querySelector('.cd'); s.cdt = e.querySelector('.cdt'); s.lk = e.querySelector('.lk'); });
    hb.appendChild(Object.assign(document.createElement('div'), { className: 'hsep' }));
    this.pots = [{ k: 'Q', key: 'hp', ic: '❤️', n: 'Hồi Huyết Đan' }, { k: 'R', key: 'mp', ic: '💙', n: 'Hồi Linh Đan' }].map(s => { const e = document.createElement('div'); e.className = 'slot'; e.title = s.n; e.innerHTML = `<span class="k">${s.k}</span>${s.ic}<span class="n">0</span><div class="cd" style="height:0"></div>`; e.onclick = () => this.G.usePotion(s.key); hb.appendChild(e); s.el = e; s.nEl = e.querySelector('.n'); s.cdEl = e.querySelector('.cd'); return s; });
    $('helpSkills').innerHTML = `<div class="hs"><div>💊</div><div><b>J – Luyện Đan</b> (Lv.1)<small>${this.slots[0].d}</small></div></div>` + [1, 5, 2, 7, 4, 3, 8, 6].map(i => `<div class="hs"><div>${SKILLS[i].ic}</div><div><b>${i} – ${SKILLS[i].n}</b> (Lv.${SKILLS[i].lv})<small>${SKILLS[i].d}</small></div></div>`).join('');
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closePanels());
    document.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { this.shopTab = b.dataset.tab; this.enhSel = null; this.renderShop(); Sound.play('ui'); });
    $('bSort').onclick = () => { G.sortBag(); this.renderInv(); }; $('bJunk').onclick = () => { G.sellJunk(); this.renderInv(); };
    const tip = $('tip'); document.addEventListener('mousemove', e => { if (!tip.classList.contains('hidden')) { tip.style.left = Math.min(innerWidth - 300, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - tip.offsetHeight - 10, e.clientY + 12) + 'px'; } });
    const over = e => { const s = e.target.closest('.islot'); if (s && s._item) { tip.innerHTML = this.tipHTML(s._item, s._eq); tip.classList.remove('hidden'); } else tip.classList.add('hidden'); };
    $('inv').addEventListener('mouseover', over); $('shop').addEventListener('mouseover', over); $('inv').addEventListener('mouseleave', () => tip.classList.add('hidden'));
    this.mini = $('mini').getContext('2d'); this.big = $('bigmap').getContext('2d');
  }
  /* ----- chữ bay ----- */
  floatText(x, y, z, text, cls) {
    let e = this.flPool.pop(); if (!e) { e = document.createElement('div'); $('floaters').appendChild(e); }
    e.className = 'fl ' + cls; e.textContent = text; e.style.display = 'block'; this.fl.push({ e, x: x + rnd(-0.3, 0.3), y, z: z + rnd(-0.3, 0.3), t: 0, life: cls === 'lvl' ? 2 : 1.1, vy: cls === 'crit' ? 2.2 : 1.6 });
    if (this.fl.length > 60) { const o = this.fl.shift(); o.e.style.display = 'none'; this.flPool.push(o.e); }
  }
  updateFloaters(dt, cam) {
    const v = new T.Vector3();
    for (let i = this.fl.length - 1; i >= 0; i--) {
      const f = this.fl[i]; f.t += dt; f.y += f.vy * dt; f.vy *= 0.97; v.set(f.x, f.y, f.z).project(cam);
      if (f.t > f.life || v.z > 1) { f.e.style.display = 'none'; this.flPool.push(f.e); this.fl.splice(i, 1); continue; }
      const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight, k = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.6 : 1.2 - Math.min(0.4, (f.t - 0.12) * 0.5);
      f.e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${k})`; f.e.style.opacity = clamp((f.life - f.t) * 3, 0, 1);
    }
  }
  log(html) { const l = $('log'); const d = document.createElement('div'); d.innerHTML = html; l.appendChild(d); while (l.children.length > 7) l.removeChild(l.firstChild); setTimeout(() => d.remove(), 9000); }
  toast(text, color = '#e0b24a', ms = 2200) { const t = $('toast'); t.innerHTML = text; t.style.color = color; t.style.opacity = 1; clearTimeout(this.toastT); this.toastT = setTimeout(() => t.style.opacity = 0, ms); }
  flash() { const f = $('flash'); f.style.opacity = 1; setTimeout(() => f.style.opacity = 0, 160); }
  showZone(Z, lvA, lvB) { const b = $('zoneBanner'); b.innerHTML = Z.name + (Z.safe ? '<small>Khu an toàn – Hồi phục & mua bán</small>' : `<small>Cấp quái khoảng Lv.${lvA} – ${lvB}</small>`); b.style.opacity = 1; clearTimeout(this._zt); this._zt = setTimeout(() => b.style.opacity = 0, 3200); }
  /* ----- HUD (10 lần/giây) ----- */
  updateHud(dt) {
    const G = this.G, S = G.state, st = G.stats; this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.08;
    $('hpF').style.width = clamp(S.hp / st.hp, 0, 1) * 100 + '%'; $('hpT').textContent = Math.ceil(S.hp) + ' / ' + Math.round(st.hp);
    $('mpF').style.width = clamp(S.mp / st.mp, 0, 1) * 100 + '%'; $('mpT').textContent = Math.floor(S.mp) + ' / ' + Math.round(st.mp);
    const need = expNeed(S.lvl); $('xpF').style.width = (S.lvl >= MAX_LV ? 100 : clamp(S.exp / need, 0, 1) * 100) + '%'; $('xpT').textContent = S.lvl >= MAX_LV ? 'CẤP TỐI ĐA' : fmt(S.exp) + ' / ' + fmt(need) + ' EXP';
    $('plv').textContent = 'Lv.' + S.lvl; $('mmGold').textContent = '💰 ' + fmt(S.gold) + ' Linh Thạch';
    this.slots.forEach(s => {
      const locked = S.lvl < s.lv; s.lk.classList.toggle('hidden', !locked); const cd = s.id ? (G.cd[s.id] || 0) : 0, tot = s.cd || 1;
      s.cdEl.style.height = (cd > 0 ? cd / tot * 100 : 0) + '%'; s.cdt.textContent = cd > 0.05 ? (cd > 9.9 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      s.el.classList.toggle('on', (s.id === 4 && G.player.flying) || (s.id === 6 && G.slowOn));
      s.el.style.opacity = !locked && s.mp && S.mp < s.mp ? 0.55 : 1;
    });
    this.pots.forEach(p => { const n = G.countPills(p.key); p.nEl.textContent = n; p.el.style.opacity = n ? 1 : 0.4; p.cdEl.style.height = G.potCd > 0 ? G.potCd / 1.5 * 100 + '%' : '0'; });
    // buff
    const bf = []; for (const k in S.buffs) { const b = S.buffs[k]; if (b.t > 0) bf.push(`<span class="buff">${{ atk: '🔴 Công +', def: '🟡 Thủ +', exp: '🟣 EXP +' }[k]}${Math.round(b.val * 100)}% · ${Math.ceil(b.t)}s</span>`); } if (G.slowOn) bf.push('<span class="buff">⏳ Thời gian chậm</span>'); if (G.player.flying) bf.push('<span class="buff">🗡️ Ngự kiếm</span>'); if (G.player.wet) bf.push('<span class="buff">🌊 Lội nước</span>');
    const bh = bf.join(''); if (bh !== this._bh) { $('buffs').innerHTML = bh; this._bh = bh; }
    // mục tiêu
    const m = G.target, tg = $('target');
    if (m && m.alive && (m.engaged > 0 || G.targetT > 0)) {
      tg.classList.remove('hidden'); const diff = m.lvl - S.lvl, col = diff >= 6 ? '#ff5a5a' : diff >= 3 ? '#ff9a4a' : diff >= -3 ? '#ffe58a' : diff >= -8 ? '#8aff9a' : '#aaaaaa';
      $('tName').innerHTML = `<span style="color:${col}">Lv.${m.lvl}</span> ${m.boss ? '👑 ' : m.elite ? '★ ' : ''}${esc(m.name)}`; $('tF').style.width = m.hp / m.maxHp * 100 + '%'; $('tT').textContent = fmt(m.hp) + ' / ' + fmt(m.maxHp);
    } else tg.classList.add('hidden');
    // vùng
    const Z = G.world.zoneNow; if (Z.id !== this.zoneId) { this.zoneId = Z.id; const P = G.player.g.position; this.showZone(Z, monsterLevelAt(clamp(Z.from + 1, 0, 400)), monsterLevelAt(clamp(Z.to, 0, 332))); }
    const P = G.player.g.position, d = Math.hypot(P.x, P.z); $('mmZone').textContent = Z.name + (Z.safe ? '' : ' · Lv.' + monsterLevelAt(d)) + ' · (' + Math.round(P.x) + ', ' + Math.round(P.z) + ')';
    this.drawMini();
    // gợi ý tương tác
    const pr = $('prompt'), it = G.interactTarget; if (it && !this.anyPanel() && !G.player.dead) { pr.textContent = it.text; pr.classList.remove('hidden'); } else pr.classList.add('hidden');
  }
  /* ----- bản đồ ----- */
  drawMini() {
    const G = this.G, c = this.mini, W = 180, P = G.player.g.position, range = 120, k = W / range, mc = G.mapCanvas, px = mc.width / WORLD.SIZE; if (!mc) return;
    c.clearRect(0, 0, W, W); c.save(); c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.clip(); c.fillStyle = '#071012'; c.fillRect(0, 0, W, W);
    const sw = range * px; c.imageSmoothingEnabled = true; c.drawImage(mc, (P.x + WORLD.SIZE / 2) * px - sw / 2, (P.z + WORLD.SIZE / 2) * px - sw / 2, sw, sw, 0, 0, W, W);
    const tx = x => (x - P.x) * k + W / 2, ty = z => (z - P.z) * k + W / 2;
    c.fillStyle = '#7dffb0'; for (const h of G.world.herbs) if (h.alive) { const x = tx(h.x), y = ty(h.z); if (x > 0 && y > 0 && x < W && y < W) c.fillRect(x - 1, y - 1, 2, 2); }
    for (const m of G.mm.list) { if (!m.alive || !m.active) continue; const x = tx(m.x), y = ty(m.z); if (x < 0 || y < 0 || x > W || y > W) continue; c.fillStyle = m.boss ? '#ff2a2a' : m.elite ? '#ffb030' : (m.t.passive ? '#e8e8e8' : '#ff6a6a'); c.beginPath(); c.arc(x, y, m.boss ? 4 : m.elite ? 3 : 2, 0, 7); c.fill(); }
    c.fillStyle = '#ffd24a'; for (const d of G.drops.list) { const x = tx(d.g.position.x), y = ty(d.g.position.z); if (x > 0 && y > 0 && x < W && y < W) c.fillRect(x - 1.5, y - 1.5, 3, 3); }
    for (const b of BOSSES) { if (b.mon && b.mon.alive) { const x = tx(b.x), y = ty(b.z); if (x > 6 && y > 6 && x < W - 6 && y < W - 6) { c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText('💀', x, y + 4); } } }
    c.translate(W / 2, W / 2); c.rotate(Math.PI - G.player.face); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  drawBig() {
    const G = this.G, c = this.big, W = 620, k = W / WORLD.SIZE, tx = x => (x + WORLD.SIZE / 2) * k;
    c.clearRect(0, 0, W, W); c.drawImage(G.mapCanvas, 0, 0, W, W);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([4, 4]); c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.textAlign = 'center';
    ZONES.slice(1).forEach(Z => { c.beginPath(); c.arc(W / 2, W / 2, Z.from * k, 0, 7); c.stroke(); }); c.setLineDash([]);
    ZONES.slice(1).forEach(Z => { const r = (Z.from + Z.to) / 2 * k; c.fillStyle = 'rgba(0,0,0,.55)'; const t = Z.name.split(' (')[0]; c.fillRect(W / 2 - 40, W / 2 - r - 8, 80, 13); c.fillStyle = '#fff'; c.fillText(t, W / 2, W / 2 - r + 2); });
    c.font = '15px sans-serif'; c.fillText('🏯', W / 2, W / 2 + 5);
    BOSSES.forEach(b => { c.fillText(b.mon && b.mon.alive ? (b.final ? '🐉' : '💀') : '✔️', tx(b.x), tx(b.z) + 5); });
    for (const h of G.world.herbs) if (h.alive) { c.fillStyle = '#7dffb0'; c.fillRect(tx(h.x) - 1, tx(h.z) - 1, 2, 2); }
    const P = G.player.g.position; c.save(); c.translate(tx(P.x), tx(P.z)); c.rotate(Math.PI - G.player.face); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 8); c.lineTo(0, 4); c.lineTo(-6, 8); c.closePath(); c.fill(); c.stroke(); c.restore();
    $('mapLegend').innerHTML = '<b style="color:var(--accent)">Các vùng đất</b><br>' + ZONES.map(Z => `<div>${Z.name.split(' (')[0]} ${Z.safe ? '' : '<span class="muted">Lv.' + monsterLevelAt(Z.from + 1) + '–' + monsterLevelAt(Math.min(Z.to, 332)) + '</span>'}</div>`).join('') + '<br><b style="color:var(--accent)">Trùm</b><br>' + BOSSES.map(b => `<div>${b.mon && b.mon.alive ? (b.final ? '🐉' : '💀') : '✔️'} ${b.name} <span class="muted">Lv.${b.mon ? b.mon.lvl : '?'}</span></div>`).join('') + '<br><span class="muted">🌿 Linh Thảo · 🏯 Linh Đài</span>';
  }
  /* ----- panel ----- */
  anyPanel() { return ['inv', 'shop', 'mapPanel'].some(i => !$(i).classList.contains('hidden')); }
  closePanels() { ['inv', 'shop', 'mapPanel'].forEach(i => $(i).classList.add('hidden')); $('tip').classList.add('hidden'); }
  toggle(id) { const el = $(id), was = !el.classList.contains('hidden'); this.closePanels(); if (!was) { el.classList.remove('hidden'); if (id === 'inv') this.renderInv(); if (id === 'shop') this.renderShop(); if (id === 'mapPanel') this.drawBig(); } Sound.play('ui'); }
  tipHTML(it, isEq) {
    const G = this.G; if (it.kind !== 'equip') { const d = ITEMDEF[it.key]; return `<div class="dn" style="color:#fff">${d.ic} ${d.name}</div><div class="muted">${d.kind === 'pill' ? 'Đan dược' : 'Nguyên liệu'}</div><div>${d.desc}</div><div style="color:#ffd24a">Giá bán: ${d.price} 💰</div>`; }
    const R = RAR[it.rar], S = equipStats(it), cmpIt = isEq ? null : G.state.equip[it.slot], C = cmpIt ? equipStats(cmpIt) : null;
    let h = `<div class="dn" style="color:${R.c}">${SLOTS[it.slot].ic} ${esc(it.name)}${it.plus ? ' +' + it.plus : ''}</div><div style="color:${R.c}">${R.n} · ${SLOTS[it.slot].n} · Cấp ${it.lv}</div><div style="color:${G.state.lvl >= it.req ? '#aaa' : '#ff6a6a'}">Yêu cầu: Lv.${it.req}</div><hr style="border:0;border-top:1px solid rgba(255,255,255,.15)">`;
    for (const k in S) { let dl = ''; if (C) { const d = S[k] - (C[k] || 0); if (Math.abs(d) > 0.01) dl = ` <span class="${d > 0 ? 'dg' : 'db'}">${d > 0 ? '▲' : '▼'}${Math.abs(Math.round(d * 10) / 10)}</span>`; } h += `<div>+${S[k]} ${STAT_NAME[k]}${dl}</div>`; }
    if (C) for (const k in C) if (!(k in S)) h += `<div class="db">▼ mất ${C[k]} ${STAT_NAME[k]}</div>`;
    return h + `<div style="color:#ffd24a;margin-top:4px">Giá bán: ${itemPrice(it)} 💰</div>`;
  }
  slotEl(it, extra = '') {
    const e = document.createElement('div'); e.className = 'islot ' + extra; if (!it) return e; e._item = it; e.style.borderColor = itemColor(it); e.style.boxShadow = it.kind === 'equip' && it.rar >= 3 ? `inset 0 0 10px ${itemColor(it)}66` : '';
    e.innerHTML = itemIcon(it) + (it.n > 1 ? `<span class="n">${it.n}</span>` : '') + (it.plus ? `<span class="p">+${it.plus}</span>` : '') + (it.kind === 'equip' ? `<span class="lv">Lv${it.lv}</span>` : ''); return e;
  }
  renderInv() {
    const G = this.G, S = G.state, bag = $('bag'); bag.innerHTML = '';
    S.bag.forEach((it, i) => { const e = this.slotEl(it, this.sel && this.sel.from === 'bag' && this.sel.i === i ? 'sel' : ''); e.onclick = () => { this.sel = { from: 'bag', i }; this.renderInv(); Sound.play('ui'); }; e.ondblclick = () => G.quickUse(i); e.oncontextmenu = ev => { ev.preventDefault(); G.quickUse(i); }; bag.appendChild(e); });
    $('bagCount').textContent = `Túi: ${S.bag.filter(Boolean).length} / ${S.bag.length}`; $('invGold').textContent = '💰 ' + fmt(S.gold);
    const eg = $('eqGrid'); eg.innerHTML = '';
    SLOT_KEYS.forEach(k => { const it = S.equip[k], w = document.createElement('div'); w.className = 'eqslot'; const e = this.slotEl(it, this.sel && this.sel.from === 'eq' && this.sel.k === k ? 'sel' : ''); if (!it) { e.innerHTML = `<span class="ph">${SLOTS[k].ic}</span>`; } e._eq = true; e.onclick = () => { if (it) { this.sel = { from: 'eq', k }; this.renderInv(); } }; e.ondblclick = () => { if (it) G.unequip(k); }; e.oncontextmenu = ev => { ev.preventDefault(); if (it) G.unequip(k); }; w.appendChild(e); w.appendChild(Object.assign(document.createElement('div'), { textContent: SLOTS[k].n })); eg.appendChild(w); });
    const st = G.stats; $('stats').innerHTML = [['Cấp độ', S.lvl + ' / ' + MAX_LV], ['Sinh lực', Math.round(st.hp)], ['Linh lực', Math.round(st.mp)], ['Công kích', Math.round(st.atk)], ['Phòng thủ', Math.round(st.def)], ['Bạo kích', st.crit.toFixed(1) + '%'], ['Hút máu', st.ls.toFixed(1) + '%'], ['Tốc di chuyển', '+' + st.spd.toFixed(0) + '%'], ['Kinh nghiệm', '+' + st.exp.toFixed(0) + '%'], ['May mắn', '+' + st.luck.toFixed(0) + '%'], ['Quái đã diệt', fmt(S.kills)], ['Trùm đã diệt', Object.keys(S.bossKills).length + ' / ' + BOSSES.length], ['Thời gian chơi', fmtTime(S.time)]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    this.renderDetail();
  }
  renderDetail() {
    const G = this.G, S = G.state, d = $('detail'); let it = null; if (this.sel) it = this.sel.from === 'bag' ? S.bag[this.sel.i] : S.equip[this.sel.k];
    if (!it) { d.innerHTML = '<div class="muted">Chọn một vật phẩm để xem chi tiết. Nhấp đúp hoặc chuột phải để dùng/trang bị nhanh.</div>'; return; }
    let btn = '';
    if (this.sel.from === 'eq') btn = '<button data-a="uneq">Tháo ra</button>';
    else if (it.kind === 'equip') btn = `<button data-a="equip">Trang bị</button><button data-a="sell">Bán ${itemPrice(it)}💰</button><button data-a="drop">Vứt</button>`;
    else if (it.kind === 'pill') btn = `<button data-a="use">Dùng</button><button data-a="sell">Bán 1 (${itemPrice(it)}💰)</button>${it.n > 1 ? '<button data-a="sellall">Bán hết</button>' : ''}<button data-a="drop">Vứt</button>`;
    else btn = `<button data-a="sell">Bán 1 (${itemPrice(it)}💰)</button>${it.n > 1 ? '<button data-a="sellall">Bán hết (' + itemPrice(it) * it.n + '💰)</button>' : ''}<button data-a="drop">Vứt</button>`;
    d.innerHTML = this.tipHTML(it, this.sel.from === 'eq') + `<div class="dbtn">${btn}</div>`;
    d.querySelectorAll('button').forEach(b => b.onclick = () => { const a = b.dataset.a, i = this.sel.i; if (a === 'equip') G.equipItem(i); else if (a === 'uneq') G.unequip(this.sel.k); else if (a === 'use') G.useBagItem(i); else if (a === 'sell') G.sellBag(i, false); else if (a === 'sellall') G.sellBag(i, true); else if (a === 'drop') G.dropBag(i); });
  }
  refresh() { if (!$('inv').classList.contains('hidden')) this.renderInv(); if (!$('shop').classList.contains('hidden')) this.renderShop(); }
  /* ----- Đan lò ----- */
  renderShop() {
    const G = this.G, S = G.state, b = $('shopBody'); $('shopGold').textContent = '💰 ' + fmt(S.gold); document.querySelectorAll('.tabs [data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === this.shopTab)); let h = '';
    const have = key => G.countItem(key);
    if (this.shopTab === 'buy') {
      SHOP.forEach(k => { const d = ITEMDEF[k], p = G.shopPrice(k); h += `<div class="srow"><div class="ic">${d.ic}</div><div class="info"><b>${d.name}</b><small>${d.desc} · Đang có: ${have(k)}</small></div><span style="color:#ffd24a">${p}💰</span><button data-buy="${k}" data-n="1" ${S.gold < p ? 'disabled' : ''}>Mua 1</button><button data-buy="${k}" data-n="10" ${S.gold < p * 10 ? 'disabled' : ''}>Mua 10</button></div>`; });
      const cost = G.bagCost(), maxed = S.bag.length >= 72; h += `<div class="srow"><div class="ic">🎒</div><div class="info"><b>Mở rộng túi (+6 ô)</b><small>Hiện tại ${S.bag.length} ô · tối đa 72 ô</small></div>${maxed ? '<span class="muted">Đã tối đa</span>' : `<span style="color:#ffd24a">${fmt(cost)}💰</span><button data-bag="1" ${S.gold < cost ? 'disabled' : ''}>Mở rộng</button>`}</div>`;
      h += '<div class="muted" style="margin-top:10px">Bán đồ: mở Túi (I), chọn vật phẩm rồi bấm Bán. Mẹo: hái Linh Thảo (E) ngoài trời và nhặt Yêu Đan từ quái để luyện đan miễn phí.</div>';
    } else if (this.shopTab === 'craft') {
      RECIPES.forEach((r, i) => { const d = ITEMDEF[r.out], ok = Object.keys(r.need).every(k => have(k) >= r.need[k]) && S.gold >= r.gold; h += `<div class="srow"><div class="ic">${d.ic}</div><div class="info"><b>${d.name} ×${r.n}</b><small>${d.desc}</small><small class="need">${Object.keys(r.need).map(k => `<span class="${have(k) >= r.need[k] ? 'ok' : 'no'}">${ITEMDEF[k].ic} ${ITEMDEF[k].name} ${have(k)}/${r.need[k]}</span>`).join(' · ')} · <span class="${S.gold >= r.gold ? 'ok' : 'no'}">💰 ${r.gold}</span></small></div><button data-craft="${i}" data-n="1" ${ok ? '' : 'disabled'}>Luyện</button><button data-craft="${i}" data-n="5" ${ok ? '' : 'disabled'}>×5</button></div>`; });
    } else {
      const list = []; SLOT_KEYS.forEach(k => { if (S.equip[k]) list.push({ it: S.equip[k], ref: { eq: k }, tag: 'Đang mặc' }); }); S.bag.forEach((it, i) => { if (it && it.kind === 'equip') list.push({ it, ref: { bag: i }, tag: 'Trong túi' }); });
      if (!list.length) h = '<div class="muted">Bạn chưa có trang bị nào để cường hóa.</div>';
      list.forEach(({ it, ref, tag }, idx) => { const c = G.enhanceCost(it); h += `<div class="srow"><div class="ic">${itemIcon(it)}</div><div class="info"><b style="color:${itemColor(it)}">${esc(it.name)} ${it.plus ? '+' + it.plus : ''}</b><small>${tag} · Cấp ${it.lv} · Mỗi cấp +8% chỉ số cơ bản</small><small class="need">${it.plus >= 10 ? 'Đã tối đa +10' : `<span class="${S.gold >= c.gold ? 'ok' : 'no'}">💰 ${fmt(c.gold)}</span> · <span class="${have('yd') >= c.yd ? 'ok' : 'no'}">🔮 Yêu Đan ${have('yd')}/${c.yd}</span> · Tỉ lệ ${c.rate}%`}</small></div>${it.plus >= 10 ? '' : `<button data-enh="${idx}" ${S.gold >= c.gold && have('yd') >= c.yd ? '' : 'disabled'}>Cường hóa</button>`}</div>`; });
      this._enhList = list;
    }
    b.innerHTML = h;
    b.querySelectorAll('[data-buy]').forEach(e => e.onclick = () => G.buy(e.dataset.buy, +e.dataset.n));
    b.querySelectorAll('[data-bag]').forEach(e => e.onclick = () => G.expandBag());
    b.querySelectorAll('[data-craft]').forEach(e => e.onclick = () => G.craft(+e.dataset.craft, +e.dataset.n));
    b.querySelectorAll('[data-enh]').forEach(e => e.onclick = () => G.enhance(this._enhList[+e.dataset.enh].ref));
  }
}
