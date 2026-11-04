/* =====================================================================
   KHO TÀI NGUYÊN (QĐ-0018, QĐ-0020): mọi hình/icon/model đi qua mã cố định.
   assets/manifest.json: { "MÃ": "đường/dẫn/file" } — thiếu → dùng dự phòng (emoji / vẽ code).
   Danh mục mã: Bộ Não › 13-Tai-san-Do-hoa-Am-thanh/Danh-muc-Hinh-anh-Icon.md
   ===================================================================== */
const Assets = {
  map: {}, ready: false,
  async load() { try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); const j = await r.json(); for (const k in j) if (k[0] !== '_' && typeof j[k] === 'string' && j[k]) this.map[k] = 'assets/' + j[k]; } catch (e) { } this.ready = true; },
  url(id) { return this.map[id] || null; },
  /* icon(id, emoji) → chuỗi HTML: <img> nếu có file, không thì emoji dự phòng */
  icon(id, fb, cls = 'ic') { const u = this.url(id); return u ? `<img class="${cls}" src="${u}" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${fb || ''}'))">` : `<span class="${cls} fb">${fb || ''}</span>`; },
  /* nạp lại khi bấm F9 (công cụ dev) */
  async reload() { this.map = {}; await this.load(); },
};
