/* =====================================================================
   HUD & MENU — chữ thuần Việt (Từ điển thuần Việt), icon qua Assets (thay được)
   ===================================================================== */
const SCREENS = ['home', 'lobby', 'hud', 'pause', 'dead', 'result', 'settings', 'ranks', 'help'];
const ITEM_IC = { bomau: ['ITEM-BOMAU', '🔴'], bohoi: ['ITEM-BOHOI', '🔵'], chen: ['ITEM-CHENNUOCGOT', '🍵'], ruou: ['ITEM-RUOUNEPCAM', '🍶'] };
const BUFF_N = { atk: 'Sức đánh ↑', spd: 'Chân nhanh', dr: 'Da Đá', ruou: 'Rượu Nếp Cẩm', vay: 'Vảy Thuồng Luồng', shield: 'Lá chắn' };

class Hud {
  constructor(G) {
    this.G = G; this.cache = {}; this.overlay = null; this.softUnlock = false; this.centerQ = [];
    this.buildHome(); this.bindButtons(); if (G.isTouch) this.buildTouch(); this.buildSkillbar();
  }
  show(id) {
    for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id && !(id === 'pause' && s === 'hud') && !(id === 'dead' && s === 'hud') && !((id === 'settings' || id === 'help') && this.G.mode === 'play' && s === 'hud'));
    $('touch').classList.toggle('hidden', !(this.G.isTouch && (id === 'hud')));
    this.closePanels(); this.cur = id;
  }
  /* ---------- Màn chính ---------- */
  buildHome() {
    const G = this.G; $('pname').value = G.S.name || ''; const box = $('dongs'); box.innerHTML = '';
    /* 5 cột = Năm Gốc, hàng trên Dòng nam, hàng dưới Dòng nữ */
    for (const row of [0, 1]) for (const el of Object.keys(GLH.ELEM_PAIRS)) {
      const fk = GLH.ELEM_PAIRS[el][row], F = GLH.FACTIONS[fk], E = GLH.ELEM[F.elem], d = document.createElement('div'); d.className = 'dong' + (fk === G.S.fk ? ' on' : '') + (F.on ? '' : ' off'); d.style.setProperty('--c', F.col);
      d.innerHTML = `<div class="em">${Assets.icon('EMB-DONG-' + DCODE[fk], DICON[fk])}</div><b>${F.short}</b><small>${F.sex === 'nu' ? 'Nữ' : 'Nam'} · ${E.n}</small>${F.on ? '' : '<i>Admin tạm khóa</i>'}`;
      d.onclick = () => { if (!F.on) return this.toast('Dòng này đang được Admin tạm khóa để cân bằng'); G.S.fk = fk; G.saveSet(); [...box.children].forEach(c => c.classList.remove('on')); d.classList.add('on'); this.dongInfo(); this.updatePreview(); Audio2.init(); Audio2.play('UI-CLICK'); Audio2.voice && Audio2.voice(fk, 'CHON'); };
      box.appendChild(d);
    }
    this.dongInfo();
    fetch('/api/info').then(r => r.json()).then(j => { if (j.beta && !document.querySelector('.betaTag')) { const b = document.createElement('div'); b.className = 'betaTag'; b.textContent = 'BẢN THỬ NGHIỆM · BETA'; const lg = document.querySelector('#home .logo'); lg && lg.after(b); } $('hfoot').innerHTML = `Độ khó máy chủ: <b>${esc(j.presetName)}</b> (Admin chỉnh) · Bản cân bằng: <b>${esc(GLH.TUNE.v)}</b> · Đang trực tuyến: ${j.online} · Bản ${esc(j.version)}<br>${G.isTouch ? 'Điện thoại: cần đẩy bên trái để đi, vuốt bên phải để xoay, nút bên phải để đánh' : 'Máy tính: WASD đi · chuột ngắm & đánh · 1 2 3 chiêu · Space nhảy · Shift lộn · F cưỡi diều · X rút/cất vũ khí'}`; }).catch(() => { });
  }
  dongInfo() {
    const fk = this.G.S.fk, F = GLH.FACTIONS[fk], E = GLH.ELEM[F.elem], at = GLH.ELEM[GLH.AT[F.elem]], by = Object.keys(GLH.AT).find(k => GLH.AT[k] === F.elem);
    $('dongInfo').innerHTML = `<b style="color:${F.col}">${F.n}</b> · ${F.sex === 'nu' ? 'Nữ' : 'Nam'} · Gốc <b>${E.n}</b> (át ${at.n}, bị ${GLH.ELEM[by].n} át) · ${F.role} · ${'★'.repeat(F.diff)}${'☆'.repeat(5 - F.diff)}<br>${F.desc}<br><span class="skc">${Assets.icon('TP-' + DCODE[fk], F.passive.ic)} Tâm Pháp: <i>${F.passive.n}</i></span> <button class="mini" id="btnGuide">📖 Bí kíp Dòng: chiêu, cách chơi, khắc chế</button>`;
    $('btnGuide').onclick = () => this.showGuide(fk);
  }
  /* Bí kíp: hướng dẫn đầy đủ một Dòng — số liệu sinh từ luật đang chạy (đã gồm chỉnh của Admin) */
  guideHTML(fk, lv) {
    const F = GLH.FACTIONS[fk], E = GLH.ELEM[F.elem], b = F.base, bar = (n, v) => `<div class="gbar"><span>${n}</span><i style="width:${Math.min(100, v * 70)}%"></i><em>×${(+v).toFixed(2)}</em></div>`, lvOf = i => (lv && lv[i]) || 1;
    const B = F.basic, bt = B.t === 'melee' ? `Đánh cận chiến tầm ${(+B.r).toFixed(1)} m, quét ${Math.round(B.arc * 2 * 57)}°` : `Bắn đạn bay thẳng tầm ${Math.round(B.range)} m` + (B.splash ? `, nổ lan ${B.splash} m` : '');
    return `<div class="ghead" style="--c:${F.col}">${Assets.icon('EMB-DONG-' + DCODE[fk], DICON[fk])}<div><h2>${F.n}</h2><div>${F.sex === 'nu' ? 'Nữ' : 'Nam'} · Gốc ${E.n} ${E.ic} · ${F.role} · Độ khó ${'★'.repeat(F.diff)}${'☆'.repeat(5 - F.diff)}</div></div></div>
      <p>${F.desc}</p>
      <div class="gcols"><div>${bar('Máu', b.hp)}${bar('Sức đánh', b.atk)}${bar('Thủ', b.def)}${bar('Hơi', b.mp)}${bar('Tốc chạy', b.spd)}</div>
      <div class="gtxt"><b>Cách chơi.</b> ${F.how}<br><b>Chuỗi đòn.</b> ${F.combo}<br><b>Khắc chế.</b> ${F.counter}</div></div>
      <div class="gsk"><div class="gic">${Assets.icon('TP-' + DCODE[fk], F.passive.ic)}</div><div><b>Tâm Pháp · ${F.passive.n}</b> <small>luôn có tác dụng</small><br>${F.passive.d}</div></div>
      <div class="gsk"><div class="gic">${Assets.icon('SK-' + DCODE[fk] + '-0', '🗡️')}</div><div><b>${F.basic.n}</b> <small>đánh thường · hồi ${(+B.cd).toFixed(2)}s</small><br>${bt} · sát thương ×${(+B.m).toFixed(2)}${B.slow ? ` · chậm ${Math.round(B.slow * 100)}%` : ''}</div></div>
      ${F.skills.map((s, i) => `<div class="gsk"><div class="gic">${Assets.icon('SK-' + DCODE[fk] + '-' + (i + 1), s.ic)}</div><div><b>${i + 1}. ${s.n}</b> <small>${s.ult ? 'CHIÊU LỚN · ' : ''}${s.mp} hơi · hồi ${s.cd}s · học ở cấp ${s.lv.join(', ')} (tối đa ${s.max} bậc)</small><br>${GLH.skillText(s, lvOf(i))}${s.up ? ` <small>· mỗi bậc +${(+s.up).toFixed(2)}</small>` : ''}</div></div>`).join('')}
      <div class="muted">Số liệu theo bản cân bằng <b>${esc(GLH.TUNE.v)}</b> do Admin đặt. Đánh trúng hồng tâm ×${GLH.SKILL.precisionMul} · đòn hiểm ×${GLH.SKILL.critMul} · Gốc át ×1.15.</div>`;
  }
  showGuide(fk, lv) { let el = $('guide'); if (!el) { el = document.createElement('div'); el.id = 'guide'; el.innerHTML = '<div class="gbox"><button class="gx">✕</button><div class="gbody"></div></div>'; document.body.appendChild(el); el.querySelector('.gx').onclick = () => el.classList.add('hidden'); el.onclick = e => { if (e.target === el) el.classList.add('hidden'); }; } el.querySelector('.gbody').innerHTML = this.guideHTML(fk, lv); el.classList.remove('hidden'); Audio2.play('UI-OPEN'); }
  updatePreview() { const G = this.G, P = G.preview; G.scene.remove(P.g); P.disposed = true; G.preview = new Rig({ hex: GLH.FACTIONS[G.S.fk].hex }); G.preview.attach('weapon', rigWeapon(G.S.fk)); G.scene.add(G.preview.g); G.preview.useChar(G.S.fk).then(() => G.preview.play('victory')); }
  bindButtons() {
    const G = this.G, click = () => { Audio2.init(); Audio2.play('UI-CLICK'); };
    $('bPlay').onclick = () => G.queue('solo'); $('bPractice').onclick = () => G.queue('practice');
    $('bLeave').onclick = () => { click(); G.send({ t: 'leave' }); G.showHome(); };
    $('bSet').onclick = () => { click(); this.openSettings('home'); }; $('pSet').onclick = () => { click(); this.openSettings('pause'); };
    $('sClose').onclick = () => { click(); this.show(this.setBack || 'home'); if (this.setBack === 'pause') this.show('pause'); };
    $('bHelp').onclick = () => { click(); this.openHelp('home'); }; $('pHelp').onclick = () => { click(); this.openHelp('pause'); }; $('hClose').onclick = () => { click(); this.show(this.helpBack || 'home'); };
    $('bRank').onclick = () => { click(); this.openRanks(); }; $('rkClose').onclick = () => { click(); this.show('home'); };
    $('bFull').onclick = () => this.goFull();
    $('pResume').onclick = () => { click(); this.show('hud'); G.lock(); }; $('pLayout').onclick = () => { click(); this.show('hud'); Layout.open(G); }; $('pQuit').onclick = () => { click(); G.leave(); };
    $('dSpec').onclick = () => { click(); $('dead').classList.add('hidden'); $('specBar').classList.remove('hidden'); };
    $('dHome').onclick = () => { click(); G.leave(); }; $('bSpecHome').onclick = () => { click(); G.leave(); }; $('bSpecNext').onclick = () => G.send({ t: 'spec' });
    $('rAgain').onclick = () => { click(); G.endMatchView(); G.queue(this.lastPractice ? 'practice' : 'solo'); }; $('rHome').onclick = () => { click(); G.endMatchView(); G.showHome(); };
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closePanels());
    $('pname').addEventListener('change', () => { G.S.name = $('pname').value.trim().slice(0, 18); G.saveSet(); });
  }
  goFull() { try { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => { })).call(d); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }
  lobby(m) { $('lobbyN').textContent = m.n + ' / ' + m.size; $('lobbyT').innerHTML = m.wait > 0 ? `Vào trận sau <b>${m.wait}</b> giây — thiếu người sẽ có 🤖 Người máy lấp chỗ` : 'Đang mở trận…'; $('lobbyNames').textContent = m.names.join(' · '); if (m.wait <= 3 && m.wait > 0) Audio2.play('UI-COUNTDOWN'); }
  /* ---------- Cài đặt ---------- */
  openSettings(back) { this.setBack = back; this.G.hud.softUnlock = true; this.G.unlock(); this.show('settings'); this.setTab('hinh'); document.querySelectorAll('#settings .tabs button').forEach(b => b.onclick = () => this.setTab(b.dataset.st)); }
  setTab(t) {
    const G = this.G, S = G.S; document.querySelectorAll('#settings .tabs button').forEach(b => b.classList.toggle('on', b.dataset.st === t)); const B = $('setBody');
    const row = (lbl, html) => `<div class="srow"><span>${lbl}</span>${html}</div>`, range = (id, v, a, b, st) => `<input type="range" id="${id}" min="${a}" max="${b}" step="${st}" value="${v}">`, tog = (id, v) => `<input type="checkbox" id="${id}" ${v ? 'checked' : ''}>`;
    if (t === 'hinh') { B.innerHTML = row('Mức hình', `<select id="sQ"><option value="low">Nhẹ</option><option value="mid">Vừa</option><option value="high">Đẹp</option><option value="ultra">Rất đẹp</option></select>`) + row('Hiện số khung hình', tog('sFps', S.fps)) + `<div class="lbl">Nhãn trên đầu</div>` + row('Tên & cấp người chơi khác', tog('sTagN', S.tagName !== false)) + row('Thanh máu người chơi khác', tog('sTagH', S.tagHp !== false)) + row('Nhãn quái', `<select id="sTagM"><option value="engaged">Khi đang đánh nhau</option><option value="always">Luôn hiện</option><option value="off">Tắt</option></select>`) + row('Cỡ nhãn', range('sTagS', S.tagSize || 1, 0.7, 1.5, 0.05)) + `<div class="lbl">Bộ lọc màu</div><div class="grades">${GRADE_KEYS.map(k => `<button class="grd${S.grade === k ? ' on' : ''}" data-g="${k}"><b>${GRADES[k].n}</b><small>${GRADES[k].d}</small></button>`).join('')}</div>`; B.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { G.applyGrade(b.dataset.g); G.saveSet(); B.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); Audio2.play('UI-CLICK'); }); $('sQ').value = S.quality; $('sTagN').onchange = e => { S.tagName = e.target.checked; G.saveSet(); }; $('sTagH').onchange = e => { S.tagHp = e.target.checked; G.saveSet(); }; $('sTagM').value = S.tagMon || 'engaged'; $('sTagM').onchange = e => { S.tagMon = e.target.value; G.saveSet(); }; $('sTagS').oninput = e => { S.tagSize = +e.target.value; G.saveSet(); }; $('sQ').onchange = e => G.applyQuality(e.target.value); $('sFps').onchange = e => { S.fps = e.target.checked; $('fps').classList.toggle('hidden', !S.fps); G.saveSet(); }; }
    if (t === 'tieng') { B.innerHTML = [['bgm', 'Nhạc nền'], ['sfx', 'Tiếng chiêu'], ['ui', 'Tiếng nút'], ['voice', 'Tiếng nói']].map(([k, n]) => row(n, range('v_' + k, Audio2.vol[k], 0, 1, 0.05))).join(''); for (const k of ['bgm', 'sfx', 'ui', 'voice']) $('v_' + k).oninput = e => { Audio2.init(); Audio2.setVol(k, +e.target.value); if (k !== 'bgm') Audio2.play(k === 'ui' ? 'UI-CLICK' : 'SFX-KIEM-1-HIT'); }; }
    if (t === 'dk') { B.innerHTML = row('Góc nhìn', `<select id="sCam"><option value="0">Sau lưng (mặc định)</option><option value="1">Thứ nhất (như game bắn súng)</option></select>`) + row('Độ nhạy chuột / vuốt', range('sSens', S.sens, 0.3, 3, 0.1)) + row('Đảo trục dọc', tog('sInv', S.invY)) + row('Cỡ nút cảm ứng', range('sBtn', S.btn, 0.7, 1.4, 0.05)) + row('Vị trí & cỡ từng nút', `<button id="sLay">✥ Tùy chỉnh bố cục</button>`) + (G.isTouch ? row('Ngắm bằng nghiêng máy (Gyro)', `<select id="sGyro"><option value="off">Tắt</option><option value="aim">Khi giữ nút Đánh / tung chiêu</option><option value="on">Luôn bật</option></select>`) + row('Độ nhạy Gyro', range('sGyroS', S.gyroSens || 1, 0.3, 3, 0.1)) + row('Đảo trục Gyro ngang', tog('sGyX', S.gyroInvX)) + row('Đảo trục Gyro dọc', tog('sGyY', S.gyroInvY)) + `<div class="muted" id="gyroNote">${Gyro.has ? '✔ Máy có con quay hồi chuyển' : 'Chọn chế độ để bật cảm biến. Xoay máy thử: nếu góc nhìn quay ngược, bật Đảo trục.'}</div>` : '') + row('Phím (máy tính)', '<span class="muted">WASD đi · Chuột trái/J đánh · Chuột phải/1 chiêu 1 · 2 · 3 · Alt+số (hoặc U) nâng chiêu · V đổi góc nhìn · Space nhảy · Shift lộn · F diều · Q R T đồ dùng · E mở hòm · K điểm sức · G gột điểm · Tab bảng · M bản đồ</span>'); $('sCam').value = S.fpv ? '1' : '0'; $('sLay').onclick = () => { if (G.mode !== 'play') return this.toast('Vào trận (hoặc Tập với người máy) rồi mở Menu › Tùy chỉnh bố cục để thấy nút thật'); this.show('hud'); Layout.open(G); }; if ($('sGyro')) { $('sGyro').value = S.gyro || 'off'; $('sGyro').onchange = async e => { const v = e.target.value; if (v !== 'off' && !(await Gyro.request())) { this.toast('Máy chưa cho phép dùng cảm biến chuyển động', '#ff9a6a'); e.target.value = 'off'; return; } S.gyro = v; G.saveSet(); setTimeout(() => { const n = $('gyroNote'); if (n) n.textContent = Gyro.has ? '✔ Đã nhận cảm biến — nghiêng máy để xoay góc nhìn' : '⚠ Chưa nhận được tín hiệu cảm biến (trình duyệt cần https hoặc máy không có Gyro)'; }, 800); }; $('sGyroS').oninput = ev => { S.gyroSens = +ev.target.value; G.saveSet(); }; $('sGyX').onchange = ev => { S.gyroInvX = ev.target.checked; G.saveSet(); }; $('sGyY').onchange = ev => { S.gyroInvY = ev.target.checked; G.saveSet(); }; } $('sCam').onchange = e => { S.fpv = e.target.value === '1'; G.saveSet(); }; $('sSens').oninput = e => { S.sens = +e.target.value; G.saveSet(); }; $('sInv').onchange = e => { S.invY = e.target.checked; G.saveSet(); }; $('sBtn').oninput = e => { S.btn = +e.target.value; document.documentElement.style.setProperty('--btn', `clamp(52px, ${7.4 * S.btn}vmin, ${78 * S.btn}px)`); G.saveSet(); }; }
    if (t === 'khac') { B.innerHTML = row('Ngôn ngữ', '<span>Tiếng Việt</span>') + row('Hiện số máu khi đánh', tog('sDmg', S.dmgNum)) + row('Phụ đề lời thoại', tog('sSub', S.sub !== false)) + row('Rung máy khi bị đánh', tog('sVib', S.vib)); $('sSub').onchange = e => { S.sub = e.target.checked; G.saveSet(); }; $('sDmg').onchange = e => { S.dmgNum = e.target.checked; G.saveSet(); }; $('sVib').onchange = e => { S.vib = e.target.checked; G.saveSet(); }; }
  }
  openHelp(back) {
    this.helpBack = back; this.softUnlock = true; this.G.unlock(); this.show('help');
    $('helpBody').innerHTML = `<p><b>Mục tiêu:</b> là <b>Người Đứng Cuối</b> trong 18 người. Đánh quái lên cấp (1→15), nhặt đồ, cộng <b>điểm sức</b>, chạy khỏi <b>Vòng Sương</b> đang thu hẹp.</p>
      <p><b>Thi kỹ năng:</b> đạn bay <b>thẳng theo tâm ngắm</b>, né được. Trúng <b>hồng tâm</b> (giữa người) được thêm 30% ◎. Núi chắn đạn. <b>Lộn Nhào</b> có lúc không trúng đòn.</p>
      <p><b>Năm Gốc át nhau:</b> Sắt chặt Cây · Rễ Cây xé Đất · Đất chặn Nước · Nước dập Lửa · Lửa nung Sắt (+15%).</p>
      <p><b>Điểm sức:</b> Mạnh (sức đánh) · Lanh (đòn hiểm, chân nhanh) · Bền (máu) · Hơi (hơi, sức chiêu). Mỗi trận được <b>gột điểm</b> miễn phí 1 lần (đứng yên, ngừng đánh 5 giây). <b>Chén Nước Gột</b> cho thêm lượt.</p>
      <p><b>Hòm Diều</b> rơi ở đợt sương 2–4: đồ Hiếm/Báu. <b>Chúa Thuồng Luồng</b> trồi lên giữa trận — hạ được nhận Vảy Thuồng Luồng (+20%).</p>
      <p><b>Máy tính:</b> WASD · chuột ngắm · Chuột trái đánh · 1 2 3 chiêu (Alt+số hoặc U nâng chiêu) · Space Nhảy · Shift Lộn Nhào · F Cưỡi Diều · Q Bổ Máu · R Bổ Hơi · T Rượu · E mở hòm · K điểm sức · G gột điểm · Tab bảng trận · M bản đồ · Esc menu.</p>
      <p><b>Điện thoại:</b> đẩy vòng trái để đi · vuốt nửa phải để xoay · nút Đánh to · 3 nút chiêu (chấm ⬆ để nâng) · Lộn · Diều · Bổ Máu/Hơi.</p>`;
  }
  openRanks() {
    const G = this.G; this.show('ranks'); const name = ($('pname').value || G.S.name || '').trim();
    fetch('/api/me?name=' + encodeURIComponent(name)).then(r => r.json()).then(m => { const R = m.rank; $('rankMe').innerHTML = `<div class="big-n">${Assets.icon('RANK-' + ['MAM', 'TRENON', 'TREGIA', 'GUOMBAC', 'GUOMVANG', 'TRONGDONG'][R.i], GLH.RANKS[R.i].ic)} ${R.n} ${R.div}</div><div>${esc(m.name || name)} · ${m.pts} điểm bậc · ${m.matches} trận · ${m.wins} lần Đứng Cuối · ${m.kills} lần hạ</div><div class="muted">Bậc: ${GLH.RANKS.map(r => r.ic + ' ' + r.n).join(' → ')}</div>`; }).catch(() => { });
    fetch('/api/top').then(r => r.json()).then(list => { $('rankTop').innerHTML = '<table class="tb"><tr><th>#</th><th>Tên</th><th>Bậc</th><th>Điểm</th><th>Trận</th></tr>' + list.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.rank.ic} ${r.rank.n} ${r.rank.div}</td><td>${r.pts}</td><td>${r.matches}</td></tr>`).join('') + '</table>'; }).catch(() => { });
  }
  /* ---------- Trận ---------- */
  startMatch(m) {
    const G = this.G, F = GLH.FACTIONS[G.me.fk]; this.cache = {}; this.lastPractice = m.mode === 'practice';
    $('pDong').innerHTML = Assets.icon('EMB-DONG-' + DCODE[G.me.fk], DICON[G.me.fk]); $('pName').textContent = G.me.name; $('feed').innerHTML = ''; $('center').innerHTML = ''; $('specBar').classList.add('hidden');
    this.buildSkillbar(); if (G.isTouch) this.buildTouch();
    this.center(m.mode === 'practice' ? 'Tập với người máy — không tính bậc' : `Đánh Lẻ · ${m.size} người · độ khó ${esc((GLH.PRESETS[m.cfg.preset] || { n: 'Tự chỉnh' }).n)}`, '#ffd24a');
    setTimeout(() => this.center(G.isTouch ? 'Đẩy vòng trái để đi · vuốt phải để ngắm' : 'Bấm vào màn hình để khóa chuột và ngắm', '#cfe8ff'), 1800);
  }
  buildSkillbar() {
    const G = this.G; if (!G.me) return; const fk = G.me.fk, F = GLH.FACTIONS[fk], D = DCODE[fk], sb = $('skillbar');
    const slot = (id, key, ic, fb, extra = '') => `<div class="sk ${extra}" id="${id}"><span class="k">${key}</span>${Assets.icon(ic, fb)}<div class="cd"></div><div class="cdt"></div><span class="n"></span><span class="lv"></span></div>`;
    sb.innerHTML = slot('skB', 'Chuột', 'SK-' + D + '-0', '🗡️') + F.skills.map((s, i) => slot('sk' + i, String(i + 1), 'SK-' + D + '-' + (i + 1), s.ic)).join('') + slot('skJ', 'Space', 'SK-NHAY', '⤴️', 'sep') + slot('skD', 'Shift', 'SK-LONHAO', '🤸') + slot('skF', 'F', 'SK-CUOIDIEU', '🪁') + slot('itH', 'Q', ...ITEM_IC.bomau, 'sep') + slot('itM', 'R', ...ITEM_IC.bohoi) + slot('itR', 'T', ...ITEM_IC.ruou);
    for (let i = 0; i < 3; i++) { const el = $('sk' + i); el.title = F.skills[i].n; el.onclick = () => this.G.castSkill(i); }
    $('ptBtn').onclick = () => this.toggle('points'); Layout.apply(this.G);
  }
  buildTouch() {
    const G = this.G; if (!G.me) { return; } const fk = G.me.fk, F = GLH.FACTIONS[fk], D = DCODE[fk], box = $('tBtns'); box.innerHTML = '';
    const B = box.getBoundingClientRect().width ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--btn')) || 60 : 60, Bp = Math.max(52, Math.min(78 * G.S.btn, Math.min(innerWidth, innerHeight) * 0.074 * G.S.btn)), cx = 14 + Bp * 0.725, cy = 14 + Bp * 0.725;
    const btn = (id, ic, fb, lb, th, r, cls = '') => { const b = document.createElement('div'); b.className = 'tbn ' + cls; b.id = id; b.innerHTML = `${Assets.icon(ic, fb)}<div class="cd"></div><span class="lb">${lb}</span><span class="n"></span>`; const sz = cls.includes('big') ? Bp * 1.45 : cls.includes('small') ? Bp * 0.8 : Bp, a = th * Math.PI / 180; b.style.right = (cx + r * Bp * Math.cos(a) - sz / 2) + 'px'; b.style.bottom = (cy + r * Bp * Math.sin(a) - sz / 2) + 'px'; box.appendChild(b); return b; };
    const fixed = (id, ic, fb, lb, left) => { const b = document.createElement('div'); b.className = 'tbn small'; b.id = id; b.innerHTML = `${Assets.icon(ic, fb)}<span class="lb">${lb}</span><span class="n"></span>`; b.style.position = 'fixed'; b.style.left = left; b.style.top = 'calc(env(safe-area-inset-top) + min(150px, 33vh))'; document.getElementById('tBtns').appendChild(b); return b; };
    const hold = (b, down, up) => { b.dataset.lay = b.id; b.addEventListener('touchstart', e => { if (G.editing) return; e.preventDefault(); e.stopPropagation(); Audio2.init(); down(); b.classList.add('on'); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); up && up(); b.classList.remove('on'); }, { passive: false }); b.addEventListener('touchcancel', () => { up && up(); b.classList.remove('on'); }); };
    hold(btn('tAtk', 'TOUCH-DANH', '⚔️', 'Đánh', 0, 0, 'big'), () => { G.input.atk = true; G.doAttack(); }, () => { G.input.atk = false; });
    const pos = [[0, 1.85], [45, 1.95], [90, 1.85]];
    F.skills.forEach((s, i) => { const b = btn('tS' + i, 'SK-' + D + '-' + (i + 1), s.ic, s.n.split(' ').slice(0, 2).join(' '), pos[i][0], pos[i][1]); hold(b, () => { if (G.my && G.my.skl[i] <= 0 && G.my.sklFree > 0) G.upgrade(i); else G.castSkill(i); }); });
    hold(btn('tDodge', 'TOUCH-LON', '🤸', 'Lộn', 4, 3.05, 'small'), () => G.dodge());
    hold(btn('tJump', 'TOUCH-NHAY', '⤴️', 'Nhảy', 20, 4.15, 'small'), () => G.jump());
    hold(btn('tFly', 'TOUCH-DIEU', '🪁', 'Diều', 34, 3.05, 'small'), () => G.send({ t: 'sk', i: 'fly' }));
    hold(btn('tHp', 'TOUCH-BOMAU', '🔴', 'Bổ Máu', 62, 3.05, 'small'), () => G.send({ t: 'pot', k: 'bomau' }));
    hold(btn('tMp', 'TOUCH-BOHOI', '🔵', 'Bổ Hơi', 88, 3.0, 'small'), () => G.send({ t: 'pot', k: 'bohoi' }));
    hold(btn('tOpen', 'TOUCH-CHICHO', '📦', 'Mở hòm', 48, 4.15, 'small'), () => G.interact());
    hold(fixed('tPt', 'TOUCH-DIEM', '⬆', 'Điểm', 'max(16px, env(safe-area-inset-left))'), () => this.toggle('points'));
    hold(fixed('tMenu', 'SET-TAB-KHAC', '☰', 'Menu', 'calc(max(16px, env(safe-area-inset-left)) + 70px)'), () => this.show('pause'));
    this.bindJoy(); Layout.apply(G);
  }
  bindJoy() {
    if (this._joyBound) return; this._joyBound = true; const G = this.G, joy = $('joy'), knob = $('joyKnob'); let jid = null, cx = 0, cy = 0, lid = null, lx = 0, ly = 0;
    joy.addEventListener('touchstart', e => { if (G.editing) return; e.preventDefault(); const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; Audio2.init(); }, { passive: false });
    const mv = e => { for (const t of e.changedTouches) {
      if (t.identifier === jid) { const r = joy.getBoundingClientRect().width / 2, dx = t.clientX - cx, dy = t.clientY - cy, d = Math.min(r, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), k = d / r; knob.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`; const fw = -Math.sin(a) * k, rt = Math.cos(a) * k, y = G.cam.yaw; G.input.mx = Math.sin(y) * fw - Math.cos(y) * rt; G.input.mz = Math.cos(y) * fw + Math.sin(y) * rt; }
      else if (t.identifier === lid) { const s = 0.006 * G.S.sens; G.cam.yaw -= (t.clientX - lx) * s; G.cam.pitch = Math.max(-0.55, Math.min(1.15, G.cam.pitch + (t.clientY - ly) * s * (G.S.invY ? -1 : 1))); lx = t.clientX; ly = t.clientY; } } };
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; knob.style.transform = ''; G.input.mx = G.input.mz = 0; } if (t.identifier === lid) lid = null; } };
    addEventListener('touchmove', mv, { passive: true }); addEventListener('touchend', end); addEventListener('touchcancel', end);
    G.renderer.domElement.addEventListener('touchstart', e => { for (const t of e.changedTouches) if (t.clientX > innerWidth * 0.35 && lid === null) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } }, { passive: true });
  }
  set(id, prop, v) { const k = id + prop; if (this.cache[k] === v) return; this.cache[k] = v; const el = $(id); if (!el) return; if (prop === 'html') el.innerHTML = v; else if (prop === 'text') el.textContent = v; else if (prop === 'w') el.style.width = v; else el.style[prop] = v; }
  update(dt) {
    { const me = this.G.me, hid = !!(me && me.alive && (me.fl & 512)); if (hid !== this._hid) { this._hid = hid; $('hideChip').classList.toggle('hidden', !hid); } }
    const G = this.G, my = G.my, me = G.me; if (!my || !me) return; const F = GLH.FACTIONS[me.fk];
    const hpP = my.hp / my.mhp * 100; this.set('hpF', 'w', hpP + '%'); this.hpTrail = this.hpTrail == null ? hpP : (hpP > this.hpTrail ? hpP : this.hpTrail + (hpP - this.hpTrail) * Math.min(1, dt * 2.2)); this.set('hpD', 'w', this.hpTrail.toFixed(1) + '%'); $('pstat').classList.toggle('low', hpP < 30); this.set('hpT', 'text', `${my.hp} / ${my.mhp}`); this.set('mpF', 'w', (my.mp / my.mmp * 100) + '%'); this.set('mpT', 'text', `${my.mp} / ${my.mmp}`);
    this.set('xpF', 'w', (my.lvl >= GLH.MATCH.maxLvl ? 100 : my.exp / my.need * 100) + '%'); this.set('pLv', 'text', my.lvl);
    this.set('buffs', 'html', my.buffs.map(([k, t]) => `<span>${BUFF_N[k] || k}${t > 0 ? ' ' + Math.ceil(t) + 's' : ''}</span>`).join('') + (my.cc.stun > 0 ? '<span>💫 Choáng</span>' : '') + (my.cc.root > 0 ? '<span>🌱 Bị trói</span>' : '') + (my.cc.slow > 0 ? '<span>🐌 Chậm</span>' : ''));
    this.set('alive', 'html', '👤 ' + (G.alive || 0)); this.set('kills', 'html', '⚔️ ' + my.kills);
    const z = G.zone; if (z) this.set('zoneT', 'html', z[6] === 2 ? '🌫️ Sương phủ kín!' : (z[6] === 0 ? '🌫️ Sương thu sau ' : '🌫️ Sương đang thu · ') + Math.ceil(z[7]) + 's · đợt ' + Math.min(5, z[8] + 1) + '/5');
    const outside = z && Math.hypot(me.x - z[0], me.z - z[1]) > z[2]; this.set('suong', 'opacity', outside ? '1' : '0'); if (outside && !this._ow) this.center('Bạn đang dính sương! Chạy vào vòng!', '#c58aff'); this._ow = outside;
    // thanh chiêu
    const cdEl = (id, cd, max, extra) => { const el = $(id); if (!el) return; const p = max > 0 ? Math.min(1, cd / max) : 0; this.set(id + '.cd', 'h', p); el.querySelector('.cd').style.setProperty('--p', p * 100 + '%'); const t = cd > 0.05 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : ''; el.querySelector('.cdt').textContent = t; if (extra) extra(el); };
    const tcd = (id, cd, max) => { const el = $(id); if (!el) return; el.querySelector('.cd').style.setProperty('--p', (max > 0 ? Math.min(1, cd / max) * 100 : 0) + '%'); };
    cdEl('skB', my.cd.b || 0, F.basic.cd);
    F.skills.forEach((s, i) => { const lv = my.skl[i], cd = my.cd['s' + i] || 0, max = s.cd, can = my.sklFree > 0 && lv < s.max && my.lvl >= s.lv[lv];
      cdEl('sk' + i, cd, max, el => { el.classList.toggle('lock', lv <= 0); el.classList.toggle('nomp', lv > 0 && my.mp < s.mp); el.querySelector('.lv').textContent = lv > 0 ? '●'.repeat(lv) : ''; let up = el.querySelector('.up'); if (can && !up) { up = document.createElement('div'); up.className = 'up'; up.textContent = '⬆'; up.onclick = ev => { ev.stopPropagation(); G.upgrade(i); }; el.appendChild(up); } else if (!can && up) up.remove(); });
      if (G.isTouch) { tcd('tS' + i, cd, max); const b = $('tS' + i); if (b) { b.style.filter = lv <= 0 ? 'grayscale(1) brightness(.6)' : ''; let up = b.querySelector('.up'); if (can && !up) { up = document.createElement('div'); up.className = 'up'; up.textContent = '⬆'; b.appendChild(up); } else if (!can && up) up.remove(); } } });
    cdEl('skD', my.cd.dodge || 0, GLH.DODGE.cd); cdEl('skF', my.cd.fly || 0, GLH.FLY.cd, el => el.classList.toggle('on', my.fly));
    for (const [id, k, tid] of [['itH', 'bomau', 'tHp'], ['itM', 'bohoi', 'tMp'], ['itR', 'ruou', null]]) { cdEl(id, my.cd.pot || 0, 1.5, el => { el.querySelector('.n').textContent = my.items[k] || 0; el.classList.toggle('lock', !(my.items[k] > 0)); }); if (tid && $(tid)) { $(tid).querySelector('.n').textContent = my.items[k] || 0; tcd(tid, my.cd.pot || 0, 1.5); } }
    if (G.isTouch) { tcd('tDodge', my.cd.dodge || 0, GLH.DODGE.cd); const f = $('tFly'); if (f) f.classList.toggle('on', my.fly); const o = $('tOpen'); if (o) o.style.display = G.nearChest() ? '' : 'none'; const pt = $('tPt'); if (pt) pt.querySelector('.n').textContent = my.potFree > 0 ? '+' + my.potFree : ''; }
    // điểm sức chưa cộng
    const ptxt = my.potFree > 0 ? `⬆ ${my.potFree} điểm sức chưa cộng (K)` : ''; this.set('ptBtn', 'text', ptxt); $('ptBtn').classList.toggle('hidden', !ptxt || G.isTouch);
    // nhắc mở hòm / thanh mở
    const nc = G.nearChest(); this.set('prompt', 'html', nc && my.opening < 0 ? (G.isTouch ? 'Bấm 📦 để mở Hòm Diều' : '<kbd>E</kbd> Mở Hòm Diều') : ''); $('prompt').classList.toggle('hidden', !(nc && my.opening < 0));
    $('castbar').classList.toggle('hidden', !(my.opening >= 0)); if (my.opening >= 0) { $('castbar').firstElementChild.style.width = Math.min(100, my.opening * 100) + '%'; $('castbar').lastElementChild.textContent = nc ? 'Đang mở Hòm Diều…' : 'Đang gột điểm…'; }
    // xem trận khi đã gục
    if (!my.alive && my.spec) { const s = G.players.get(my.spec); this.set('specName', 'html', s ? 'Đang xem: ' + Assets.icon('EMB-DONG-' + DCODE[s.fk], DICON[s.fk]) + ' <b>' + esc(s.name) + '</b>' : ''); }
    if (!$('points').classList.contains('hidden')) this.renderPoints();
    if (!$('board').classList.contains('hidden')) this.renderBoard();
    this.miniT = (this.miniT || 0) - dt; if (this.miniT <= 0) { this.miniT = 0.1; this.drawMini($('mini'), 60); if (!$('bigmapP').classList.contains('hidden')) this.drawMini($('bigmap'), 190, true); }
  }
  drawMini(cv, range, big) {
    const G = this.G, x = cv.getContext('2d'), W = cv.width, me = G.me, mc = G.mapCanvas, z = G.zone; if (!me) return;
    const cx = big && z ? z[0] : me.x, cz = big && z ? z[1] : me.z, s = W / (range * 2), m2w = 700 / 512;
    x.save(); x.clearRect(0, 0, W, W); if (!big) { x.beginPath(); x.arc(W / 2, W / 2, W / 2, 0, 7); x.clip(); }
    x.globalAlpha = 0.95; const sx = (cx - range + 350) / m2w, sz = (cz - range + 350) / m2w, sw = range * 2 / m2w; x.drawImage(mc, sx, sz, sw, sw, 0, 0, W, W); x.globalAlpha = 1;
    const P = (wx, wz) => [(wx - cx) * s + W / 2, (wz - cz) * s + W / 2];
    if (z) { x.lineWidth = 2; x.strokeStyle = 'rgba(200,140,255,.95)'; x.beginPath(); x.arc(...P(z[0], z[1]), z[2] * s, 0, 7); x.stroke(); if (z[5] > 0 || z[6] < 2) { x.setLineDash([5, 4]); x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(...P(z[3], z[4]), z[5] * s, 0, 7); x.stroke(); x.setLineDash([]); } }
    x.font = (big ? 18 : 13) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const c of G.chests.values()) x.fillText('📦', ...P(c.x, c.z));
    for (const mo of G.mons.values()) if (mo.boss && mo.alive) x.fillText('🐉', ...P(mo.tx, mo.tz));
    for (const p of G.players.values()) { if (p.isMe || !p.alive || (G.snapN && p.seen < G.snapN - 1)) continue; const d = Math.hypot(p.x - me.x, p.z - me.z); if (d > 38 && !big) continue; if (big && d > 38) continue; x.fillStyle = '#ff5a4a'; x.beginPath(); x.arc(...P(p.x, p.z), big ? 4 : 3, 0, 7); x.fill(); }
    const [mx, mz] = P(me.x, me.z); x.translate(mx, mz); x.rotate(-G.cam.yaw + Math.PI); x.fillStyle = '#ffd24a'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
  }
  renderPoints() {
    const G = this.G, my = G.my, F = GLH.FACTIONS[G.me.fk]; if (!my) return; const key = JSON.stringify([my.pot, my.potFree, my.skl, my.sklFree, my.respecFree, my.items.chen, my.st, my.eq, my.calm, my.lvl]); if (this._pk === key) return; this._pk = key;
    let h = `<div class="muted">Còn <b>${my.potFree}</b> điểm sức · <b>${my.sklFree}</b> điểm chiêu · Cấp ${my.lvl}</div>`;
    for (const k of GLH.POT_KEYS) h += `<div class="prow">${Assets.icon('STAT-' + { str: 'MANH', agi: 'LANH', vit: 'BEN', ene: 'HOI' }[k], GLH.POT[k].ic)} <b>${GLH.POT[k].n}</b><span class="muted">${GLH.POT[k].d}</span><span class="v">${my.pot[k]}</span><button data-pt="${k}" ${my.potFree > 0 ? '' : 'disabled'}>+</button><button data-pt5="${k}" ${my.potFree >= 5 ? '' : 'disabled'}>+5</button></div>`;
    h += `<div class="row"><button id="ptAuto" ${my.potFree > 0 ? '' : 'disabled'}>${Assets.icon('BTN-TUCONG', '⚡')} Tự cộng theo Dòng</button><button id="ptRespec">${Assets.icon('BTN-GOTDIEM', '🔄')} Gột điểm (${my.respecFree > 0 ? 'miễn phí ' + my.respecFree : 'Chén Nước Gột: ' + (my.items.chen || 0)})</button><span class="muted">${my.calm ? 'Có thể gột' : 'Phải ngừng đánh 5 giây'}</span></div>`;
    h += F.skills.map((s, i) => `<div class="skrow">${Assets.icon('SK-' + DCODE[G.me.fk] + '-' + (i + 1), s.ic)} <b>${s.n}</b><span class="muted">${s.ult ? 'chiêu lớn · ' : ''}${s.mp} hơi · hồi ${s.cd}s · ${GLH.skillText(s, Math.max(1, my.skl[i]))}</span><span class="pips">${'●'.repeat(my.skl[i])}${'○'.repeat(s.max - my.skl[i])}</span><button data-up="${i}" ${my.sklFree > 0 && my.skl[i] < s.max && my.lvl >= s.lv[my.skl[i]] ? '' : 'disabled'}>⬆</button></div>`).join('');
    h += `<div class="skrow">${Assets.icon('TP-' + DCODE[G.me.fk], F.passive.ic)} <b>Tâm Pháp · ${F.passive.n}</b><span class="muted">${F.passive.d}</span><button id="ptGuide">📖</button></div>`;
    h += `<div class="muted">Sức đánh ${my.st.atk} · Sức chịu ${my.st.def} · Đòn hiểm ${my.st.crit}% · Chân nhanh ×${my.st.spd} · Sức chiêu ×${my.st.amp}</div>`;
    h += '<div class="muted">Đồ đang mặc: ' + (GLH.SLOT_KEYS.map(k => my.eq[k] ? `<span style="color:${GLH.RAR[my.eq[k][1]].c}">${esc(my.eq[k][0])}</span>` : `<span>${GLH.SLOT_NAME[k]}: —</span>`).join(' · ')) + '</div>';
    const B = $('pointsBody'); B.innerHTML = h; const pg = $('ptGuide'); if (pg) pg.onclick = () => this.showGuide(G.me.fk, my.skl);
    B.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { G.send({ t: 'pt', k: b.dataset.pt, n: 1 }); Audio2.play('UI-POINT-ADD'); });
    B.querySelectorAll('[data-pt5]').forEach(b => b.onclick = () => { G.send({ t: 'pt', k: b.dataset.pt5, n: 5 }); Audio2.play('UI-POINT-ADD'); });
    B.querySelectorAll('[data-up]').forEach(b => b.onclick = () => G.upgrade(+b.dataset.up)); $('ptAuto').onclick = () => { G.send({ t: 'pt', auto: true }); Audio2.play('UI-POINT-ADD'); }; $('ptRespec').onclick = () => G.send({ t: 'respec' });
  }
  renderBoard() {
    const G = this.G, list = [...G.players.values()].sort((a, b) => (b.alive - a.alive) || b.lvl - a.lvl);
    this.set('boardBody', 'html', `<div class="muted">Còn ${G.alive} / ${G.players.size} người</div><table class="tb"><tr><th>Tên</th><th>Dòng</th><th>Cấp</th><th>Máu</th></tr>` + list.map(p => `<tr class="${p.isMe ? 'me' : ''} ${p.alive ? '' : 'dead'}"><td>${esc(p.name)}</td><td>${DICON[p.fk]} ${GLH.FACTIONS[p.fk].short}</td><td>${p.lvl}</td><td>${p.alive ? Math.round(p.hp / p.mhp * 100) + '%' : 'gục'}</td></tr>`).join('') + '</table>');
  }
  anyPanel() { return ['points', 'board', 'bigmapP'].some(id => !$(id).classList.contains('hidden')); }
  closePanels() { for (const id of ['points', 'board', 'bigmapP']) $(id).classList.add('hidden'); }
  toggle(id, force) { const el = $(id), show = force === undefined ? el.classList.contains('hidden') : force; el.classList.toggle('hidden', !show); if (id === 'points' && show) { this._pk = null; if (!this.G.isTouch) { this.softUnlock = true; this.G.unlock(); } } if (id === 'points' && !show && !this.G.isTouch) this.G.lock(); }
  /* ---------- Thông báo ---------- */
  /* thông báo: khung nhỏ gọn, hiện/ẩn có hiệu ứng; vị trí kéo được trong Tùy chỉnh bố cục */
  note(box, html, col, life, max) { const B = $(box), d = document.createElement('div'); d.innerHTML = html; d.style.setProperty('--c', col); B.appendChild(d); setTimeout(() => d.classList.add('out'), life - 320); setTimeout(() => d.remove(), life); while (B.children.length > max) B.firstChild.remove(); return d; }
  toast(text, col = '#D5AD59') { this.note('toast', text, col, 2400, 3); }
  center(html, col = '#FFF1BC') { this.note('center', '<b>' + html + '</b>', col, 3000, 2); }
  feed(html) { this.note('feed', html, '#D5AD59', 6500, 5); }
  hurt() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = '1'; requestAnimationFrame(() => { h.style.transition = 'opacity .5s'; h.style.opacity = '0'; }); }
  hitMark(fl) { const c = $('cross'); c.classList.remove('hit', 'prec'); void c.offsetWidth; c.classList.add(fl & 2 ? 'prec' : 'hit'); clearTimeout(this._hm); this._hm = setTimeout(() => c.classList.remove('hit', 'prec'), 160); }
  dead(m) { this.G.unlock(); $('deadInfo').textContent = `Xếp thứ ${m.place} / ${m.n}`; $('deadBy').textContent = 'Bị hạ bởi: ' + m.by; $('dead').classList.remove('hidden'); }
  result(m) {
    this.show('result'); $('rTitle').innerHTML = m.place === 1 ? '🏆 NGƯỜI ĐỨNG CUỐI!' : `Bạn xếp thứ ${m.place} / ${m.n}`; $('rTitle').style.color = m.place === 1 ? '#ffd24a' : '';
    $('rStats').innerHTML = `<div class="row btns"><span>⚔️ Hạ <b>${m.kills}</b></span><span>💥 Sát thương <b>${m.dmg}</b></span><span>⭐ Cấp <b>${m.lvl}</b></span></div>`;
    if (m.rank) { const r = m.rank, up = r.rank.i > r.prev.i, dn = r.rank.i < r.prev.i; $('rRank').innerHTML = `<div class="big-n" style="text-align:center">${r.rank.ic} ${r.rank.n} ${r.rank.div} <span style="font-size:20px;color:${r.delta >= 0 ? '#7dffb0' : '#ff7a7a'}">${r.delta >= 0 ? '+' : ''}${r.delta}</span></div><div class="muted" style="text-align:center">${r.after} điểm bậc${up ? ' · LÊN BẬC!' : dn ? ' · xuống bậc' : ''}</div>`; Audio2.play(up ? 'UI-RANK-UP' : dn ? 'UI-RANK-DOWN' : 'UI-NOTIFY'); }
    else $('rRank').innerHTML = `<div class="muted" style="text-align:center">${m.practice ? 'Trận tập — không tính bậc' : ''}</div>`;
    $('rBoard').innerHTML = '<table class="tb"><tr><th>#</th><th>Tên</th><th>Dòng</th><th>Hạ</th><th>Sát thương</th><th>Cấp</th></tr>' + m.board.map(b => `<tr class="${b[0] === this.G.me?.name && !b[4] ? 'me' : ''}"><td>${b[2]}</td><td>${esc(b[0])}</td><td>${DICON[b[1]]} ${GLH.FACTIONS[b[1]].short}</td><td>${b[3]}</td><td>${b[5]}</td><td>${b[6]}</td></tr>`).join('') + '</table>';
  }
}
