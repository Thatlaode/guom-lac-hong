/* =====================================================================
   TÙY CHỈNH BỐ CỤC (QĐ-0038) — mỗi người chơi tự dời & đổi cỡ MỌI nút, cần đi (joystick),
   khung máu, bản đồ nhỏ, thông báo… Lưu theo máy trong cài đặt (S.layout).
   Vị trí lưu theo TỈ LỆ màn hình (x, y = tâm phần tử, 0..1) → xoay máy / đổi cỡ màn hình vẫn đúng chỗ.
   s = cỡ (0.5..1.8) · o = độ rõ (0.3..1)
   Mở: Menu trận (Esc / ☰) › "Tùy chỉnh bố cục nút"
   ===================================================================== */
const LAY_NAMES = {
  pstat: 'Khung máu & hơi', tr: 'Bản đồ nhỏ', feed: 'Tin hạ gục', center: 'Thông báo lớn', toast: 'Nhắc nhở', hideChip: 'Báo đang núp', skillbar: 'Thanh chiêu (máy tính)',
  joy: 'Cần đi', tAtk: 'Nút Đánh', tS0: 'Chiêu 1', tS1: 'Chiêu 2', tS2: 'Chiêu lớn', tDodge: 'Lộn Nhào', tJump: 'Nhảy', tFly: 'Cưỡi Diều', tHp: 'Bổ Máu', tMp: 'Bổ Hơi', tOpen: 'Mở hòm', tPt: 'Nút Điểm', tMenu: 'Nút Menu', tBag: 'Nút Túi đồ', tChat: 'Nút Chat', tMic: 'Nút Nói (voice)', chatLog: 'Khung chat',
};
const Layout = {
  els() { return [...document.querySelectorAll('[data-lay]')].filter(e => e.getClientRects().length > 0 || ['toast', 'center', 'feed', 'hideChip'].includes(e.id)); },
  /* áp vị trí đã lưu lên các phần tử đang có */
  apply(G) {
    const L = (G.S.layout || {}), isT = G.isTouch, key = isT ? 'touch' : 'pc', M = L[key] || {};
    for (const el of document.querySelectorAll('[data-lay]')) {
      const id = el.dataset.lay, v = M[id];
      if (!v) { if (el._lay) { el.style.cssText = el._orig || ''; el._lay = false; } continue; }
      if (!el._lay) { el._orig = el.style.cssText; el._lay = true; }
      Object.assign(el.style, { position: 'fixed', left: (v.x * 100) + '%', top: (v.y * 100) + '%', right: 'auto', bottom: 'auto', margin: '0', transform: `translate(-50%,-50%) scale(${v.s || 1})`, transformOrigin: '50% 50%', opacity: v.o ?? '' });
    }
  },
  open(G) {
    if (G.editing) return; G.editing = true; G.unlock && G.unlock(); document.body.classList.add('editing');
    this.G = G; const key = G.isTouch ? 'touch' : 'pc'; G.S.layout = G.S.layout || {}; this.backup = JSON.stringify(G.S.layout[key] || {}); this.M = JSON.parse(this.backup); this.key = key;
    // nội dung mẫu để thấy được khung thông báo
    G.hud.feed('🗡️ <b>Mẫu tin hạ gục</b> ⚔️ hạ người máy'); G.hud.toast('Mẫu nhắc nhở'); G.hud.center('Mẫu thông báo lớn'); $('hideChip').classList.remove('hidden'); this.sample = setInterval(() => { if (!$('feed').children.length) G.hud.feed('🗡️ <b>Mẫu tin hạ gục</b>'); if (!$('toast').children.length) G.hud.toast('Mẫu nhắc nhở'); if (!$('center').children.length) G.hud.center('Mẫu thông báo lớn'); }, 1500);
    const bar = this.bar = document.createElement('div'); bar.id = 'layBar';
    bar.innerHTML = `<b>✥ Tùy chỉnh bố cục</b><span id="laySel">Chạm / kéo một nút để dời. Chọn nút để đổi cỡ.</span>
      <label>Cỡ <input type="range" id="layS" min="0.5" max="1.8" step="0.05" value="1" disabled></label><label>Độ rõ <input type="range" id="layO" min="0.3" max="1" step="0.05" value="1" disabled></label>
      <button id="layOne" disabled>↺ Nút này</button><button id="layAll">↺ Tất cả về mặc định</button><button id="layCancel">Hủy</button><button id="laySave" class="main">Lưu</button>`;
    document.body.appendChild(bar);
    for (const el of this.els()) { el.classList.add('lay-ed'); el.addEventListener('pointerdown', this._down = this._down || (e => this.down(e)), true); }
    $('layS').oninput = e => this.setSel('s', +e.target.value); $('layO').oninput = e => this.setSel('o', +e.target.value);
    $('layOne').onclick = () => { if (!this.sel) return; delete this.M[this.sel.dataset.lay]; this.preview(); this.select(this.sel); };
    $('layAll').onclick = () => { this.M = {}; this.preview(); this.select(null); };
    $('layCancel').onclick = () => this.close(false); $('laySave').onclick = () => this.close(true);
  },
  preview() { const G = this.G, L = G.S.layout; L[this.key] = this.M; this.apply(G); },
  select(el) {
    document.querySelectorAll('.lay-sel').forEach(e => e.classList.remove('lay-sel')); this.sel = el;
    const on = !!el; for (const id of ['layS', 'layO', 'layOne']) $(id).disabled = !on;
    if (!el) { $('laySel').textContent = 'Chạm / kéo một nút để dời. Chọn nút để đổi cỡ.'; return; }
    el.classList.add('lay-sel'); const v = this.M[el.dataset.lay] || {}; $('layS').value = v.s || 1; $('layO').value = v.o ?? 1; $('laySel').textContent = 'Đang chọn: ' + (LAY_NAMES[el.dataset.lay] || el.dataset.lay);
  },
  ensure(el) { const id = el.dataset.lay; if (!this.M[id]) { const r = el.getBoundingClientRect(); this.M[id] = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: 1 }; } return this.M[id]; },
  setSel(k, v) { if (!this.sel) return; const m = this.ensure(this.sel); m[k] = v; this.preview(); },
  down(e) {
    if (!this.G || !this.G.editing) return; const el = e.currentTarget; e.preventDefault(); e.stopPropagation(); this.select(el);
    const m = this.ensure(el), sx = e.clientX, sy = e.clientY, x0 = m.x, y0 = m.y; this.preview();
    const mv = ev => { m.x = Math.max(0.02, Math.min(0.98, x0 + (ev.clientX - sx) / innerWidth)); m.y = Math.max(0.02, Math.min(0.98, y0 + (ev.clientY - sy) / innerHeight)); this.preview(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  close(save) {
    const G = this.G; if (!save) G.S.layout[this.key] = JSON.parse(this.backup); G.saveSet(); this.apply(G);
    for (const el of document.querySelectorAll('.lay-ed')) { el.classList.remove('lay-ed', 'lay-sel'); el.removeEventListener('pointerdown', this._down, true); }
    clearInterval(this.sample); this.bar.remove(); document.body.classList.remove('editing'); G.editing = false; $('hideChip').classList.toggle('hidden', !(G.me && (G.me.fl & 512)));
    G.hud.toast(save ? 'Đã lưu bố cục của bạn' : 'Đã hủy thay đổi');
  },
};
addEventListener('resize', () => { if (window.__GAME) Layout.apply(window.__GAME); });
