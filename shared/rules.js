/* =====================================================================
   GƯƠM LẠC HỒNG · Năm Dòng Đọ Sức — LUẬT CHƠI DÙNG CHUNG (server + client)
   Nguồn sự thật duy nhất cho mọi con số cân bằng.
   Tên hiển thị theo Bộ Não: 01-Tam-nhin-Bao-cao/Tu-dien-Thuan-Viet.md (QĐ-0019).
   Hướng cân bằng QĐ-0022: thi KỸ NĂNG như game bắn súng — ngắm bằng tâm,
   đạn bay thẳng né được, trúng hồng tâm thưởng thêm, ít ngẫu nhiên.
   Đổi số → cập nhật 12-Can-bang-So-lieu/Bang-Can-bang.md.
   Chạy được cả trình duyệt (<script>, biến toàn cục GLH) và Node (require).
   ===================================================================== */
(function (root) {
  const GLH = {};
  GLH.VERSION = '0.6.0-beta.1';
  GLH.NAME = 'GƯƠM LẠC HỒNG';
  GLH.SUB = 'Năm Dòng Đọ Sức'; // tên chính thức QĐ-0021 — 10 phái vẫn giữ tên này, chờ chủ dự án quyết

  /* ---------- Trận đấu (Admin ghi đè được: server/data/admin-config.json) ---------- */
  GLH.MATCH = {
    size: 18, lobbyWait: 20, countdown: 5, maxLvl: 15,
    tick: 20, snap: 15, viewR: 95, arenaMaxD: 70,
  };

  /* ---------- Vòng Sương: chờ → thu; dps = % máu tối đa mỗi giây ---------- */
  GLH.ZONE_R0 = 175;
  GLH.ZONE_PHASES = [
    { wait: 80, shrink: 40, r: 120, dps: 0.02, chests: 0 },
    { wait: 50, shrink: 35, r: 78, dps: 0.035, chests: 2 },
    { wait: 45, shrink: 30, r: 45, dps: 0.06, chests: 2 },
    { wait: 35, shrink: 25, r: 20, dps: 0.09, chests: 1 },
    { wait: 25, shrink: 25, r: 0, dps: 0.15, chests: 0 },
  ];

  /* ---------- Năm Gốc: A át B ---------- */
  GLH.ELEM = {
    kim: { n: 'Sắt', c: '#d9d4c0', ic: '⚔️' }, moc: { n: 'Cây', c: '#6fd08a', ic: '🌿' }, thuy: { n: 'Nước', c: '#6ab8ff', ic: '💧' },
    hoa: { n: 'Lửa', c: '#ff7a3c', ic: '🔥' }, tho: { n: 'Đất', c: '#d9a64a', ic: '⛰️' },
  };
  GLH.AT = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' };
  GLH.elemMod = (a, b) => (GLH.AT[a] === b ? 1.15 : GLH.AT[b] === a ? 0.9 : 1);

  /* ---------- Điểm sức ---------- */
  GLH.POT = {
    str: { n: 'Mạnh', ic: '💪', d: '+1.6 sức đánh' },
    agi: { n: 'Lanh', ic: '🍃', d: '+0.4% đòn hiểm, +0.4% chân nhanh' },
    vit: { n: 'Bền', ic: '❤️', d: '+18 máu' },
    ene: { n: 'Hơi', ic: '💨', d: '+6 hơi, +1.2% sát thương chiêu' },
  };
  GLH.POT_KEYS = ['str', 'agi', 'vit', 'ene'];
  GLH.POT_PER_LVL = 5;

  /* ---------- Kỹ năng thi đấu (QĐ-0022) ---------- */
  GLH.SKILL = {
    hitR: 0.55,            // bán kính thân người chơi (cố định, KHÔNG theo model — QĐ-0017)
    precisionR: 0.3,       // đạn đi qua gần tâm thân hơn mức này = HỒNG TÂM
    precisionMul: 1.3,
    meleeCenter: 0.3,      // cận chiến: mục tiêu nằm trong ±0.3 rad giữa tâm = HỒNG TÂM
    meleeCenterMul: 1.15,
    critMax: 25, critMul: 1.5,
    pvpMul: 0.85,          // người đánh người: kéo dài thời gian hạ gục → có chỗ cho né & chiến thuật
  };

  /* ---------- MƯỜI DÒNG = Năm Gốc × hai giới (QĐ-0030) ----------
     Mỗi Gốc có một Dòng NAM và một Dòng NỮ, lối đánh khác hẳn nhau.
     Hướng dẫn chi tiết: Bộ Não 02-Thiet-ke-Game/12-Muoi-Dong-va-Chieu.md
     t (kiểu chiêu): dash | nova | proj | zone | buff | blink | leap | cone
       dash  lao thẳng, chém mọi kẻ trên đường     · nova  sóng quanh mình (pulses lần)
       proj  bắn đạn bay thẳng theo tâm (né được)  · zone  rơi xuống điểm ngắm sau delay giây
       buff  tự cường hóa                          · blink lướt (back: lùi lại) + khiên
       leap  nhảy tới điểm ngắm, đáp xuống gây sóng · cone  quét hình quạt trước mặt (arc rad)
     Hiệu ứng khống chế: stun choáng · root trói · slow chậm (slowT giây) · kb đẩy lùi (m) · burn đốt
     m: hệ số sát thương · up: + mỗi bậc · lv: cấp cần để học từng bậc
     passive (Tâm Pháp): luôn có tác dụng, xem GLH.PASSIVE_KINDS
     weapon: mã vũ khí trong rig.js (WEAPON_DEF) · sheath: chỗ cất vũ khí (hip | back) */
  GLH.BASE_FACTIONS = {
    kiem: {
      n: 'Dòng Gươm Hồ', short: 'Gươm Hồ', elem: 'kim', sex: 'nam', role: 'Sát thủ cận chiến', col: '#e9dfb8', hex: 0xd9cfa0, weapon: 'guom', sheath: 'hip',
      desc: 'Kiếm khách áo trắng mặt hồ. Lướt vào, chém dứt điểm kẻ yếu máu rồi rút ra.',
      how: 'Đi vòng ngoài giao tranh, chờ kẻ địch còn dưới 35% máu thì Lướt Gươm vào kết liễu (Tâm Pháp cộng thêm sát thương). Đừng mở đầu giao tranh khi đối thủ đầy máu.',
      combo: 'Lướt Gươm → Đánh thường ×2 → Gươm Xoáy Mặt Hồ. Chiêu lớn đặt sẵn dưới chân nhóm đang đánh nhau.',
      counter: 'Sợ bị trói/choáng: Sông Cọc, Vườn Thuốc, Cồng Chiêng. Khắc được Tre Làng (Sắt át Cây).',
      diff: 3, base: { hp: 0.95, atk: 1.08, def: 0.92, mp: 0.9, spd: 1.05 }, pot0: { str: 6, agi: 4, vit: 3, ene: 2 }, auto: { str: 2, agi: 2, vit: 1, ene: 0 },
      passive: { n: 'Gươm Kết Liễu', ic: '🩸', k: 'execute', below: 0.3, mul: 0.15 },
      basic: { n: 'Chém', t: 'melee', r: 3.2, arc: 0.5, m: 0.95, cd: 0.55, anim: 'slash' },
      skills: [
        { n: 'Lướt Gươm', ic: '🗡️', t: 'dash', dist: 9, r: 1.5, m: 1.3, up: 0.2, mp: 18, cd: 7, anim: 'dash', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Gươm Xoáy Mặt Hồ', ic: '🌀', t: 'nova', r: 4.4, m: 0.55, up: 0.11, pulses: 4, step: 0.25, mp: 25, cd: 10, anim: 'spin', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Rùa Vàng Nổi Sóng', ic: '✴️', t: 'zone', range: 14, r: 5.5, delay: 0.9, m: 0.9, up: 0.3, pulses: 5, step: 0.35, mp: 50, cd: 45, anim: 'cast', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    tram: {
      n: 'Dòng Trâm Bạc', short: 'Trâm Bạc', elem: 'kim', sex: 'nu', role: 'Xạ thủ · bắn tỉa', col: '#f2f2f2', hex: 0xc8ccd6, weapon: 'dao_doi', sheath: 'hip',
      desc: 'Nữ hiệp cài trâm bạc, phóng trâm nhanh như mưa. Ngắm trúng hồng tâm là đáng sợ nhất trận.',
      how: 'Giữ khoảng cách 15–20 m, bắn trúng hồng tâm để giảm hồi chiêu (Tâm Pháp). Bị áp sát thì Én Liệng lùi lại ngay, đừng đứng đấu tay đôi.',
      combo: 'Đánh thường trúng hồng tâm ×2 → Mưa Trâm. Chiêu lớn Trâm Xuyên Mây dùng để kết liễu từ xa hoặc bắn xuyên hàng.',
      counter: 'Sợ Gươm Hồ, Ngựa Lửa lao vào người. Khắc Tre Làng. Ngại Hoa Gạo (Lửa át Sắt).',
      diff: 4, base: { hp: 0.85, atk: 1.1, def: 0.85, mp: 1.0, spd: 1.04 }, pot0: { str: 5, agi: 6, vit: 2, ene: 2 }, auto: { str: 2, agi: 2, vit: 1, ene: 0 },
      passive: { n: 'Mắt Chim Ưng', ic: '🎯', k: 'precCdr', cdr: 0.6, mul: 0.1 },
      basic: { n: 'Phóng Trâm', t: 'proj', spd: 36, range: 22, r: 0.3, m: 0.82, cd: 0.5, anim: 'cast', fx: 'needle' },
      skills: [
        { n: 'Mưa Trâm', ic: '🪡', t: 'proj', spd: 38, range: 21, r: 0.3, m: 0.5, up: 0.09, count: 5, spread: 0.08, mp: 20, cd: 7, anim: 'cast', max: 5, lv: [1, 3, 5, 7, 9], fx: 'needle' },
        { n: 'Én Liệng', ic: '🕊️', t: 'blink', back: true, dist: 7.5, shield: 0.08, up: 0.02, spdB: 0.25, dur: 2.5, mp: 18, cd: 10, anim: 'dodge', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Trâm Xuyên Mây', ic: '☁️', t: 'proj', spd: 60, range: 40, r: 0.35, m: 3.0, up: 0.7, pierce: true, mp: 55, cd: 40, anim: 'cast', max: 3, lv: [6, 10, 14], ult: true, fx: 'needleBig' },
      ],
    },
    tre: {
      n: 'Dòng Tre Làng', short: 'Tre Làng', elem: 'moc', sex: 'nam', role: 'Đấu sĩ · đẩy lùi', col: '#9fe07a', hex: 0x6fae3a, weapon: 'gay_tre', sheath: 'back',
      desc: 'Trai làng cầm gậy tre ngà. Quét gậy hất văng kẻ địch, đứng vững như lũy tre đầu làng.',
      how: 'Đứng trước đồng đội, dùng tầm gậy dài để chặn đường. Gậy Quét Đồng hất kẻ địch vào Vòng Sương hoặc ra xa đồng đội của nó. Tâm Pháp giảm sát thương đạn bay — không sợ đấu với Dòng đánh xa.',
      combo: 'Tre Ngà Quật Trời (nhảy vào, choáng) → Gậy Quét Đồng (hất ra) → Lũy Tre Xanh khi bị dồn.',
      counter: 'Sợ Gươm Hồ, Trâm Bạc (Sắt át Cây). Khắc Núi Dâng, Cồng Chiêng (Cây át Đất).',
      diff: 2, base: { hp: 1.08, atk: 0.95, def: 1.06, mp: 0.95, spd: 1.0 }, pot0: { str: 5, agi: 2, vit: 6, ene: 2 }, auto: { str: 2, agi: 0, vit: 2, ene: 1 },
      passive: { n: 'Lũy Tre Che Tên', ic: '🎍', k: 'projDr', dr: 0.18 },
      basic: { n: 'Phang Gậy', t: 'melee', r: 3.9, arc: 0.45, m: 0.98, cd: 0.7, anim: 'slash' },
      skills: [
        { n: 'Gậy Quét Đồng', ic: '🌾', t: 'cone', r: 4.8, arc: 1.1, m: 1.15, up: 0.2, kb: 4.5, mp: 20, cd: 8, anim: 'spin', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Lũy Tre Xanh', ic: '🎋', t: 'buff', dr: 0.3, up: 0.05, dur: 4, nova: { r: 3.2, m: 0.6 }, mp: 24, cd: 14, anim: 'buff', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Tre Ngà Quật Trời', ic: '🎍', t: 'leap', dist: 10, r: 5, m: 2.0, up: 0.5, stun: 1.0, mp: 50, cd: 45, anim: 'leap', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    duoc: {
      n: 'Dòng Vườn Thuốc', short: 'Vườn Thuốc', elem: 'moc', sex: 'nu', role: 'Đánh xa · hồi máu', col: '#7ee29a', hex: 0x3fae5a, weapon: 'quat_la', sheath: 'hip',
      desc: 'Cô lang vườn thuốc. Ném thuốc theo tâm ngắm, trói chân kẻ địch, càng đánh lâu càng dai.',
      how: 'Đánh tầm trung, mỗi chiêu trúng đích hồi máu cho mình (Tâm Pháp). Dây Tơ Hồng trói kẻ lao vào rồi lùi ra. Chiêu lớn vừa đánh vừa hồi — bật khi bị vây.',
      combo: 'Dây Tơ Hồng Trói → Ném Thuốc ×3 → Bát Lá Xông để chạy hoặc đuổi.',
      counter: 'Sợ Trâm Bạc bắn tỉa, Gươm Hồ (Sắt át Cây). Khắc Dòng Đất.',
      diff: 2, base: { hp: 1.0, atk: 1.0, def: 0.95, mp: 1.15, spd: 1.02 }, pot0: { str: 3, agi: 3, vit: 4, ene: 5 }, auto: { str: 1, agi: 1, vit: 1, ene: 2 },
      passive: { n: 'Thuốc Lành', ic: '🌿', k: 'skillHeal', p: 0.25 },
      basic: { n: 'Ném Thuốc', t: 'proj', spd: 25, range: 20, r: 0.38, m: 1.0, cd: 0.65, anim: 'cast', fx: 'pill' },
      skills: [
        { n: 'Dây Tơ Hồng Trói', ic: '🌱', t: 'proj', spd: 22, range: 18, r: 0.6, m: 1.2, up: 0.2, root: 1.2, mp: 20, cd: 9, anim: 'cast', max: 5, lv: [1, 3, 5, 7, 9], fx: 'vine' },
        { n: 'Bát Lá Xông', ic: '🍵', t: 'buff', heal: 0.2, up: 0.035, spdB: 0.25, dur: 3, mp: 30, cd: 14, anim: 'buff', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Bướm Bay Ngập Vườn', ic: '🦋', t: 'nova', r: 9, m: 0.42, up: 0.14, pulses: 8, step: 0.5, healP: 0.015, mp: 55, cd: 50, anim: 'cast', max: 3, lv: [6, 10, 14], ult: true, fx: 'swarm' },
      ],
    },
    bang: {
      n: 'Dòng Sông Cọc', short: 'Sông Cọc', elem: 'thuy', sex: 'nam', role: 'Giữ chân · thương dài', col: '#8fcbff', hex: 0x4aa0e8, weapon: 'thuong', sheath: 'back',
      desc: 'Lính thủy cầm thương cắm cọc giữa dòng. Đâm xa, làm chậm, kẻ thích lao vào sẽ mắc cạn.',
      how: 'Đâm thương từ tầm xa nhất (4.4 m) để kẻ địch không chạm được mình. Kẻ đang bị chậm nhận thêm sát thương (Tâm Pháp) → luôn mở bằng Sóng Ba Mũi.',
      combo: 'Sóng Ba Mũi (làm chậm) → Đâm Thương ×3 → Lặn Theo Dòng khi bị áp sát. Chiêu lớn chặn lối rút của cả nhóm.',
      counter: 'Sợ Tre Làng hất văng, Núi Dâng (Đất át Nước). Khắc Ngựa Lửa, Hoa Gạo (Nước át Lửa).',
      diff: 3, base: { hp: 1.05, atk: 1.02, def: 1.02, mp: 1.1, spd: 1.0 }, pot0: { str: 4, agi: 3, vit: 4, ene: 4 }, auto: { str: 2, agi: 1, vit: 1, ene: 1 },
      passive: { n: 'Nước Xiết', ic: '🌊', k: 'vsSlow', mul: 0.15 },
      basic: { n: 'Đâm Thương', t: 'melee', r: 4.4, arc: 0.28, m: 1.0, cd: 0.68, slow: 0.15, slowT: 1, anim: 'stab' },
      skills: [
        { n: 'Sóng Ba Mũi', ic: '🌊', t: 'proj', spd: 26, range: 17, r: 0.45, m: 1.0, up: 0.18, count: 3, spread: 0.2, slow: 0.4, slowT: 2, mp: 22, cd: 8, anim: 'cast', max: 5, lv: [1, 3, 5, 7, 9], fx: 'water' },
        { n: 'Lặn Theo Dòng', ic: '🫧', t: 'blink', dist: 9, shield: 0.15, up: 0.03, dur: 3, mp: 20, cd: 11, anim: 'dash', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Bãi Cọc Nước Rút', ic: '🪵', t: 'zone', range: 16, r: 6.5, delay: 0.7, m: 0.5, up: 0.17, pulses: 6, step: 0.4, slow: 0.5, slowT: 1, endStun: 1.0, mp: 55, cd: 50, anim: 'cast', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    lua: {
      n: 'Dòng Lụa Nước', short: 'Lụa Nước', elem: 'thuy', sex: 'nu', role: 'Cơ động · thả diều', col: '#a8e6ff', hex: 0x6ad0e8, weapon: 'lua', sheath: 'hip',
      desc: 'Thiếu nữ múa dải lụa như sóng nước. Lướt liên tục, vừa chạy vừa quất lụa làm chậm kẻ đuổi.',
      how: 'Không bao giờ đứng yên: Lộn Nhào rồi đánh ngay — đòn đầu sau khi lộn mạnh hơn và làm chậm (Tâm Pháp). Đánh, lùi, đánh: kẻ cận chiến sẽ không bao giờ đuổi kịp.',
      combo: 'Lộn Nhào → Quất Lụa (tăng sức) → Lụa Vờn Sóng → Lướt Mặt Hồ ra xa. Chiêu lớn khi bị vây để thoát và hồi máu.',
      counter: 'Sợ Trâm Bạc bắn xa hơn, Núi Dâng (Đất át Nước). Khắc Dòng Lửa.',
      diff: 5, base: { hp: 0.9, atk: 1.04, def: 0.9, mp: 1.1, spd: 1.08 }, pot0: { str: 3, agi: 6, vit: 3, ene: 3 }, auto: { str: 1, agi: 2, vit: 1, ene: 1 },
      passive: { n: 'Sóng Sau Lướt', ic: '💦', k: 'afterDodge', mul: 0.35, slow: 0.35, win: 2.5 },
      basic: { n: 'Quất Lụa', t: 'proj', spd: 32, range: 16, r: 0.5, m: 1.0, cd: 0.55, anim: 'cast', fx: 'silk' },
      skills: [
        { n: 'Lụa Vờn Sóng', ic: '🎐', t: 'cone', r: 7, arc: 0.32, m: 1.1, up: 0.2, slow: 0.45, slowT: 2, mp: 18, cd: 7, anim: 'slash', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Lướt Mặt Hồ', ic: '💧', t: 'blink', dist: 8, shield: 0.06, up: 0.02, spdB: 0.3, dur: 2, mp: 16, cd: 8, anim: 'dodge', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Nước Dâng Ngập Lối', ic: '🌀', t: 'nova', r: 7, m: 0.5, up: 0.15, pulses: 5, step: 0.4, slow: 0.5, healP: 0.012, mp: 55, cd: 45, anim: 'spin', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    hoa: {
      n: 'Dòng Ngựa Lửa', short: 'Ngựa Lửa', elem: 'hoa', sex: 'nam', role: 'Xung phong · đốt cháy', col: '#ff9466', hex: 0xe8562a, weapon: 'dao', sheath: 'hip',
      desc: 'Hiệp sĩ đao lửa phi như ngựa sắt. Xông thẳng vào đội hình, mỗi nhát đao để lại vết bỏng.',
      how: 'Mở giao tranh: Ngựa Lửa Xông Trận đâm thẳng vào nhóm và hất văng. Mỗi đòn đánh đốt cháy kẻ địch (Tâm Pháp) — đánh rải đều nhiều mục tiêu.',
      combo: 'Đao Bừng Lửa → Ngựa Lửa Xông Trận → Chém Đao ×3. Chiêu lớn Vó Lửa Đạp Trời nhảy vào giữa nhóm.',
      counter: 'Sợ Sông Cọc, Lụa Nước (Nước át Lửa). Khắc Gươm Hồ, Trâm Bạc (Lửa át Sắt).',
      diff: 2, base: { hp: 1.05, atk: 1.06, def: 1.0, mp: 0.95, spd: 1.03 }, pot0: { str: 6, agi: 3, vit: 5, ene: 1 }, auto: { str: 2, agi: 1, vit: 2, ene: 0 },
      passive: { n: 'Vết Bỏng', ic: '🔥', k: 'burnOnHit', burn: 0.08 },
      basic: { n: 'Chém Đao', t: 'melee', r: 3.4, arc: 0.55, m: 0.95, cd: 0.62, anim: 'slash' },
      skills: [
        { n: 'Ngựa Lửa Xông Trận', ic: '🐎', t: 'dash', dist: 10, r: 1.8, m: 1.3, up: 0.22, kb: 3, mp: 22, cd: 8, anim: 'dash', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Đao Bừng Lửa', ic: '🎋', t: 'buff', atkB: 0.2, up: 0.04, dur: 6, nova: { r: 3.6, m: 0.8 }, mp: 26, cd: 14, anim: 'buff', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Vó Lửa Đạp Trời', ic: '☄️', t: 'leap', dist: 12, r: 5.5, m: 2.8, up: 0.7, stun: 0.6, mp: 60, cd: 45, anim: 'leap', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    gao: {
      n: 'Dòng Hoa Gạo', short: 'Hoa Gạo', elem: 'hoa', sex: 'nu', role: 'Pháp sư · nổ lan', col: '#ff6a6a', hex: 0xd83a3a, weapon: 'den_long', sheath: 'back',
      desc: 'Thiếu nữ cầm đèn lồng, gọi mưa hoa gạo đỏ trời. Một chiêu lớn đủ quét sạch cả nhóm.',
      how: 'Đứng sau, bắn Hòn Lửa nổ lan vào chỗ đông người. Kẻ đang cháy nhận thêm sát thương (Tâm Pháp) → mở bằng Cánh Gạo Lửa rồi dồn sát thương.',
      combo: 'Cánh Gạo Lửa (đốt, xuyên hàng) → Đèn Lồng Bay → Hòn Lửa. Chiêu lớn bắn vào nhóm đang bị Sông Cọc/Cồng Chiêng giữ chân.',
      counter: 'Sợ bị lao vào (Gươm Hồ, Ngựa Lửa) và Dòng Nước. Khắc Dòng Sắt.',
      diff: 3, base: { hp: 0.9, atk: 1.15, def: 0.88, mp: 1.15, spd: 1.0 }, pot0: { str: 3, agi: 3, vit: 3, ene: 6 }, auto: { str: 1, agi: 1, vit: 1, ene: 2 },
      passive: { n: 'Lửa Gặp Gió', ic: '🌺', k: 'vsBurn', mul: 0.15 },
      basic: { n: 'Hòn Lửa', t: 'proj', spd: 24, range: 18, r: 0.42, m: 1.0, cd: 0.75, splash: 2.0, splashM: 0.4, anim: 'cast', fx: 'fire' },
      skills: [
        { n: 'Cánh Gạo Lửa', ic: '🌺', t: 'proj', spd: 28, range: 22, r: 0.9, m: 1.6, up: 0.26, pierce: true, burn: 0.2, mp: 24, cd: 8, anim: 'cast', max: 5, lv: [1, 3, 5, 7, 9], fx: 'petal' },
        { n: 'Đèn Lồng Bay', ic: '🏮', t: 'zone', range: 18, r: 3.6, delay: 0.6, m: 0.55, up: 0.12, pulses: 3, step: 0.5, mp: 26, cd: 11, anim: 'cast', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Trời Đỏ Hoa Gạo', ic: '☄️', t: 'zone', range: 16, r: 5.5, delay: 1.2, m: 4.0, up: 1.0, pulses: 1, step: 0, mp: 60, cd: 45, anim: 'cast', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    thach: {
      n: 'Dòng Núi Dâng', short: 'Núi Dâng', elem: 'tho', sex: 'nam', role: 'Đỡ đòn · làm choáng', col: '#e8b862', hex: 0xc08a36, weapon: 'bua', sheath: 'back',
      desc: 'Người núi vác búa đá. Máu trâu, da đá, nhảy vào làm choáng cả đám. Gục chậm nhất trận.',
      how: 'Lao vào trước, ăn đòn thay đồng đội. Khi máu dưới 40% da hóa đá (Tâm Pháp) — đừng chạy, đó là lúc bạn lì nhất.',
      combo: 'Dậm Núi (choáng) → Đập Búa ×2 → Da Đá. Chiêu lớn Núi Dâng Nước Lùi bật khi đứng giữa 3 kẻ địch.',
      counter: 'Sợ Tre Làng, Vườn Thuốc (Cây át Đất). Khắc Dòng Nước.',
      diff: 1, base: { hp: 1.3, atk: 0.92, def: 1.3, mp: 0.95, spd: 0.97 }, pot0: { str: 4, agi: 2, vit: 7, ene: 2 }, auto: { str: 1, agi: 1, vit: 3, ene: 0 },
      passive: { n: 'Đá Tảng', ic: '🪨', k: 'lastStand', below: 0.4, dr: 0.25 },
      basic: { n: 'Đập Búa', t: 'melee', r: 3.1, arc: 0.55, m: 0.95, cd: 0.62, anim: 'slash' },
      skills: [
        { n: 'Dậm Núi', ic: '⛰️', t: 'leap', dist: 8, r: 4.2, m: 1.35, up: 0.2, stun: 0.8, mp: 22, cd: 10, anim: 'leap', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Da Đá', ic: '🪨', t: 'buff', dr: 0.4, up: 0.05, dur: 4, mp: 25, cd: 15, anim: 'buff', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Núi Dâng Nước Lùi', ic: '🏔️', t: 'nova', r: 6.5, m: 1.5, up: 0.4, pulses: 1, step: 0, stun: 1.5, mp: 50, cd: 45, anim: 'leap', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
    chieng: {
      n: 'Dòng Cồng Chiêng', short: 'Cồng Chiêng', elem: 'tho', sex: 'nu', role: 'Khống chế · trợ trận', col: '#f0c860', hex: 0xb8862a, weapon: 'dui_chieng', sheath: 'back',
      desc: 'Thiếu nữ đại ngàn đánh chiêng. Tiếng chiêng vang làm choáng cả hàng người, nhịp trống thúc đồng đội.',
      how: 'Đứng tầm trung, sóng âm bay rộng nên dễ trúng. Cứ 4 đòn trúng thì đòn kế làm choáng (Tâm Pháp) — đếm nhịp để choáng đúng lúc đồng đội lao vào.',
      combo: 'Tiếng Chiêng Vang (choáng hình quạt) → Sóng Chiêng ×2 → Nhịp Trống Hội để đuổi hoặc chạy. Chiêu lớn giữa giao tranh.',
      counter: 'Sợ Dòng Cây. Khắc Dòng Nước. Bị Trâm Bạc bắn tỉa vì tầm ngắn hơn.',
      diff: 3, base: { hp: 1.05, atk: 0.98, def: 1.05, mp: 1.1, spd: 1.0 }, pot0: { str: 3, agi: 3, vit: 5, ene: 4 }, auto: { str: 1, agi: 1, vit: 2, ene: 1 },
      passive: { n: 'Nhịp Chiêng Thứ Tư', ic: '🥁', k: 'nthStun', every: 4, stun: 0.5 },
      basic: { n: 'Sóng Chiêng', t: 'proj', spd: 24, range: 13, r: 0.9, m: 1.0, cd: 0.7, anim: 'slash', fx: 'gong' },
      skills: [
        { n: 'Tiếng Chiêng Vang', ic: '🔔', t: 'cone', r: 7, arc: 0.75, m: 0.9, up: 0.15, stun: 0.6, mp: 24, cd: 10, anim: 'slash', max: 5, lv: [1, 3, 5, 7, 9] },
        { n: 'Nhịp Trống Hội', ic: '🥁', t: 'buff', heal: 0.1, up: 0.02, spdB: 0.25, atkB: 0.08, dur: 4, mp: 26, cd: 14, anim: 'buff', max: 5, lv: [2, 4, 6, 8, 10] },
        { n: 'Chiêng Rền Đại Ngàn', ic: '🔔', t: 'nova', r: 8, m: 0.7, up: 0.2, pulses: 3, step: 0.6, stun: 0.45, mp: 55, cd: 48, anim: 'spin', max: 3, lv: [6, 10, 14], ult: true },
      ],
    },
  };
  /* Tâm Pháp (nội tại) — mã k và cách tính, dùng chung server (sát thương) + client (mô tả) */
  GLH.PASSIVE_KINDS = {
    execute: p => `Đánh kẻ còn dưới ${Math.round(p.below * 100)}% máu: +${Math.round(p.mul * 100)}% sát thương.`,
    precCdr: p => `Trúng hồng tâm: +${Math.round(p.mul * 100)}% sát thương và giảm ${p.cdr} giây hồi mọi chiêu.`,
    projDr: p => `Giảm ${Math.round(p.dr * 100)}% sát thương từ đạn bay (đánh xa).`,
    skillHeal: p => `Chiêu trúng đích hồi máu bằng ${Math.round(p.p * 100)}% sát thương gây ra.`,
    vsSlow: p => `Đánh kẻ đang bị chậm/trói: +${Math.round(p.mul * 100)}% sát thương.`,
    afterDodge: p => `Trong ${p.win} giây sau Lộn Nhào hoặc lướt: đòn kế tiếp +${Math.round(p.mul * 100)}% và làm chậm ${Math.round(p.slow * 100)}%.`,
    burnOnHit: p => `Mỗi đòn đánh thường đốt cháy kẻ địch 3 giây (${Math.round(p.burn * 100)}% sức đánh mỗi giây).`,
    vsBurn: p => `Đánh kẻ đang cháy: +${Math.round(p.mul * 100)}% sát thương.`,
    lastStand: p => `Khi máu dưới ${Math.round(p.below * 100)}%: giảm ${Math.round(p.dr * 100)}% sát thương nhận vào.`,
    nthStun: p => `Cứ ${p.every} đòn trúng người thì đòn kế làm choáng ${p.stun} giây.`,
  };
  /* Mô tả chiêu sinh tự động từ số liệu (luôn khớp với số Admin đã chỉnh) */
  GLH.skillText = (sk, lv) => {
    const L = Math.max(1, lv || 1), m = (sk.m || 0) + (sk.up || 0) * (L - 1), pc = v => Math.round(v * 100) + '%', out = [];
    const T = { dash: `Lao ${sk.dist} m theo hướng ngắm, chém mọi kẻ trên đường`, nova: `Sóng quanh mình bán kính ${sk.r} m` + (sk.pulses > 1 ? `, ${sk.pulses} nhịp` : ''), proj: (sk.count > 1 ? `Bắn ${sk.count} ` : 'Bắn ') + `đạn bay thẳng tầm ${sk.range} m` + (sk.pierce ? ', xuyên qua mọi kẻ' : ''), zone: `Gọi chiêu xuống điểm ngắm (tầm ${sk.range} m, rộng ${sk.r} m) sau ${sk.delay} giây` + (sk.pulses > 1 ? `, ${sk.pulses} nhịp` : ''), buff: 'Tự cường hóa', blink: (sk.back ? 'Lướt lùi ' : 'Lướt ') + sk.dist + ' m', leap: `Nhảy tới điểm ngắm (tối đa ${sk.dist} m), đáp xuống gây sóng ${sk.r} m`, cone: `Quét hình quạt trước mặt, xa ${sk.r} m`, melee: `Đánh cận chiến tầm ${sk.r} m` }[sk.t] || '';
    out.push(T);
    if (m > 0) out.push(`sát thương ×${(+m.toFixed(2))}` + (sk.pulses > 1 ? ' mỗi nhịp' : '') + (sk.count > 1 ? ' mỗi mũi' : ''));
    if (sk.stun) out.push(`choáng ${sk.stun}s`); if (sk.endStun) out.push(`nhịp cuối choáng ${sk.endStun}s`); if (sk.root) out.push(`trói ${sk.root}s`); if (sk.slow) out.push(`chậm ${pc(sk.slow)}` + (sk.slowT ? ` trong ${sk.slowT}s` : '')); if (sk.kb) out.push(`hất văng ${sk.kb} m`); if (sk.burn) out.push(`đốt ${pc(sk.burn)} sức đánh/giây`);
    const up = (v) => v + (sk.up || 0) * (L - 1);
    if (sk.t === 'buff') { if (sk.heal) out.push(`hồi ${pc(up(sk.heal))} máu`); if (sk.atkB) out.push(`+${pc(up(sk.atkB))} sức đánh`); if (sk.dr) out.push(`giảm ${pc(up(sk.dr))} sát thương nhận`); if (sk.spdB) out.push(`+${pc(sk.spdB)} tốc chạy`); out.push(`trong ${sk.dur}s`); if (sk.nova) out.push(`nổ sóng ${sk.nova.r} m quanh mình`); }
    if (sk.t === 'blink') { if (sk.shield) out.push(`khiên ${pc(up(sk.shield))} máu trong ${sk.dur}s`); if (sk.spdB) out.push(`+${pc(sk.spdB)} tốc chạy`); }
    if (sk.healP) out.push(`mỗi nhịp hồi ${pc(sk.healP)} máu`);
    if (sk.splash) out.push(`nổ lan ${sk.splash} m`);
    return out.filter(Boolean).join(' · ');
  };

  /* ---------- ADMIN CHỈNH SỨC MẠNH TỪNG PHẦN (QĐ-0031) ----------
     tune = { v: 'tên bản cân bằng', g: {...hệ số chung}, f: { <dòng>: {...hệ số riêng, s: [chiêu1, chiêu2, chiêu lớn]} } }
     Mọi hệ số mặc định 1. Ghi ở server/data/admin-config.json → áp vào trận KẾ TIẾP.
     phase: hệ số sát thương người-đánh-người theo đợt Vòng Sương [đợt 1..5, sau cùng] → cân bằng đầu/giữa/cuối trận */
  GLH.TUNE_G = { dmg: 'Sát thương mọi Dòng', basic: 'Đánh thường', skill: 'Chiêu thường', ult: 'Chiêu lớn', cc: 'Thời gian khống chế', cd: 'Thời gian hồi chiêu', heal: 'Hồi máu & khiên', hp: 'Máu mọi Dòng', passive: 'Sức Tâm Pháp' };
  GLH.TUNE_F = { dmg: 'Sức đánh', hp: 'Máu', def: 'Thủ', spd: 'Tốc chạy', basicM: 'Đánh thường: sát thương', basicCd: 'Đánh thường: hồi', basicR: 'Đánh thường: tầm', passive: 'Tâm Pháp' };
  GLH.TUNE_S = { m: 'Sát thương', cd: 'Hồi chiêu', mp: 'Tốn hơi', r: 'Tầm/vùng', cc: 'Khống chế' };
  GLH.DEFAULT_TUNE = () => {
    const t = { v: 'Gốc 0.4.0', g: { phase: [1, 1, 1, 1, 1, 1] }, f: {} };
    for (const k in GLH.TUNE_G) t.g[k] = 1;
    for (const fk in GLH.BASE_FACTIONS) { const f = { on: true }; for (const k in GLH.TUNE_F) f[k] = 1; f.s = [0, 1, 2].map(() => { const o = {}; for (const k in GLH.TUNE_S) o[k] = 1; return o; }); t.f[fk] = f; }
    return t;
  };
  GLH.cleanTune = (raw) => {
    const D = GLH.DEFAULT_TUNE(), num = (v, d) => { v = +v; return isFinite(v) ? Math.max(0, Math.min(5, v)) : d; }; raw = raw || {};
    if (typeof raw.v === 'string') D.v = raw.v.slice(0, 40);
    const g = raw.g || {}; for (const k in GLH.TUNE_G) D.g[k] = num(g[k], 1); if (Array.isArray(g.phase)) D.g.phase = D.g.phase.map((d, i) => num(g.phase[i], d));
    for (const fk in D.f) { const r = (raw.f || {})[fk] || {}, f = D.f[fk]; f.on = r.on !== false; for (const k in GLH.TUNE_F) f[k] = num(r[k], 1); f.s = f.s.map((o, i) => { const rs = (r.s || [])[i] || {}; for (const k in GLH.TUNE_S) o[k] = num(rs[k], 1); return o; }); }
    return D;
  };
  /* Dựng bộ Dòng hiệu lực từ bộ gốc + tune (server & client gọi chung → số trên giao diện luôn đúng số thật) */
  GLH.buildFactions = (tune) => {
    const T = GLH.cleanTune(tune), G = T.g, out = {};
    const clone = o => JSON.parse(JSON.stringify(o)), mul = (o, keys, k) => { for (const key of keys) if (typeof o[key] === 'number') o[key] = +(o[key] * k).toFixed(4); };
    for (const fk in GLH.BASE_FACTIONS) {
      const F = clone(GLH.BASE_FACTIONS[fk]), f = T.f[fk]; F.key = fk; F.on = f.on;
      F.base.hp *= f.hp * G.hp; F.base.def *= f.def; F.base.spd *= f.spd; F.base.atk *= f.dmg * G.dmg;
      const B = F.basic; B.m *= f.basicM * G.basic; B.cd *= f.basicCd * G.cd; if (B.t === 'melee') B.r *= f.basicR; else B.range *= f.basicR; mul(B, ['slow', 'slowT'], G.cc);
      F.skills.forEach((sk, i) => {
        const s = f.s[i], dm = s.m * (sk.ult ? G.ult : G.skill);
        mul(sk, ['m', 'up'], dm); if (sk.nova) mul(sk.nova, ['m'], dm); mul(sk, ['cd'], s.cd * G.cd); sk.mp = Math.round(sk.mp * s.mp);
        mul(sk, ['r', 'range', 'dist'], s.r); mul(sk, ['stun', 'root', 'slowT', 'endStun'], s.cc * G.cc); mul(sk, ['heal', 'healP', 'shield'], G.heal);
        sk.cd = +sk.cd.toFixed(2);
      });
      const P = F.passive, pk = f.passive * G.passive; mul(P, ['mul', 'dr', 'p', 'burn', 'stun', 'cdr'], pk); if (P.dr) P.dr = Math.min(0.6, P.dr);
      F.passive.d = GLH.PASSIVE_KINDS[P.k] ? GLH.PASSIVE_KINDS[P.k](P) : '';
      out[fk] = F;
    }
    out._tune = T; return out;
  };
  GLH.setTune = (tune) => { const all = GLH.buildFactions(tune); GLH.TUNE = all._tune; delete all._tune; GLH.FACTIONS = all; GLH.FACTION_KEYS = Object.keys(all); GLH.FACTION_ON = GLH.FACTION_KEYS.filter(k => all[k].on); return all; };
  GLH.setTune(null);
  /* Năm Gốc → hai Dòng (nam, nữ) — dùng cho màn chọn Dòng */
  GLH.ELEM_PAIRS = { kim: ['kiem', 'tram'], moc: ['tre', 'duoc'], thuy: ['bang', 'lua'], hoa: ['hoa', 'gao'], tho: ['thach', 'chieng'] };


  /* ---------- Chiêu chung & đồ dùng ---------- */
  GLH.DODGE = { n: 'Lộn Nhào', dist: 6, inv: 0.35, cd: 4.5, mp: 8 };
  GLH.FLY = { n: 'Cưỡi Diều', spd: 13, drain: 6, minMp: 15, cd: 1.5 };
  GLH.ITEMS = {
    bomau: { n: 'Viên Bổ Máu', ic: '🔴', heal: 0.35, cd: 6, max: 5 },
    bohoi: { n: 'Viên Bổ Hơi', ic: '🔵', mana: 0.45, cd: 6, max: 5 },
    chen: { n: 'Chén Nước Gột', ic: '🍵', max: 3 },
    ruou: { n: 'Rượu Nếp Cẩm', ic: '🍶', atkB: 0.25, dur: 60, max: 3 },
  };
  GLH.RESPEC = { freePerMatch: 1, calm: 5, castT: 1.5 }; // gột điểm: 5s không đánh nhau, đứng yên 1.5s
  GLH.REVIVE = { knockT: 20, reviveT: 4, hp: 0.3, range: 2.5 };
  GLH.CHEST = { warn: 10, openT: 3, pChen: 0.3 };
  GLH.BASE_SPD = 6.2;

  /* ---------- Cấp & điểm lớn ---------- */
  GLH.expNeed = L => Math.round(50 + 38 * Math.pow(L, 1.3));
  GLH.killExp = L => Math.round(120 + 55 * L);

  /* ---------- Chỉ số ---------- */
  GLH.calcStats = (fk, L, pot, eq, buffs) => {
    const F = (typeof fk === 'object' ? fk : GLH.FACTIONS[fk]).base, e = Object.assign({ atk: 0, def: 0, hp: 0, mp: 0, crit: 0, atkp: 0, defp: 0, hpp: 0, spd: 0, ls: 0 }, eq || {}), b = buffs || {};
    const s = {};
    s.hp = Math.round((300 + 40 * L + 18 * pot.vit + e.hp) * F.hp * (1 + e.hpp / 100));
    s.mp = Math.round((80 + 8 * L + 6 * pot.ene + e.mp) * F.mp);
    s.atk = (26 + 5 * L + 1.6 * pot.str + e.atk) * F.atk * (1 + e.atkp / 100) * (1 + (b.atk || 0));
    s.def = (5 + 2 * L + e.def) * F.def * (1 + e.defp / 100) * (1 + (b.def || 0));
    s.crit = Math.min(GLH.SKILL.critMax, 3 + 0.4 * pot.agi + e.crit);
    s.spd = F.spd * (1 + Math.min(0.4, 0.004 * pot.agi + e.spd / 100)) * (1 + (b.spd || 0));
    s.amp = 1 + 0.012 * pot.ene;
    s.ls = e.ls; s.dr = Math.min(0.7, b.dr || 0);
    return s;
  };
  GLH.mitigate = def => 100 / (100 + def);

  /* ---------- Quái ---------- */
  GLH.MON = {
    camps: 70, perCamp: [2, 4], eliteP: 0.08, respawn: [35, 55],
    hp: L => 50 + 40 * L, atk: L => 6 + 4 * L, def: L => 2 + 2 * L, exp: L => 22 + 11 * L,
    lvlAt: (d, R0) => Math.max(1, Math.min(12, Math.round(1 + (1 - d / R0) * 11))),
    bossAt: 150, bossLvl: 14,
  };
  GLH.TYPES_BY_RING = [['rabbit', 'boar'], ['boar', 'wolf', 'snake'], ['wolf', 'spider', 'bear'], ['bear', 'golem', 'toad'], ['tiger', 'demon', 'wisp']];
  GLH.MON_NAME = { rabbit: 'Thỏ Trắng', boar: 'Heo Rừng', wolf: 'Sói Xám', snake: 'Rắn Lục', spider: 'Nhện Độc', bear: 'Gấu Ngựa', toad: 'Cóc Tía', wisp: 'Ma Trơi', golem: 'Người Đá', tiger: 'Cọp Núi', icewolf: 'Sói Tuyết', snowspirit: 'Ma Tuyết', firebird: 'Chim Lửa', demon: 'Quái Sừng', shade: 'Bóng Ma', dragon: 'Chúa Thuồng Luồng' };

  /* ---------- Đồ ---------- */
  GLH.SLOT_KEYS = ['weapon', 'armor', 'head', 'boots', 'ring', 'amulet'];
  GLH.SLOT_NAME = { weapon: 'Đồ đánh', armor: 'Áo', head: 'Khăn mũ', boots: 'Giày', ring: 'Nhẫn', amulet: 'Bùa đeo' };
  GLH.RAR = [{ n: 'Thường', c: '#d8d8d8' }, { n: 'Tốt', c: '#5fe08a' }, { n: 'Quý', c: '#5aa8ff' }, { n: 'Hiếm', c: '#c36bff' }, { n: 'Báu', c: '#ffb53a' }];

  /* ---------- Bậc hạng ---------- */
  GLH.RANKS = [{ n: 'Mầm', ic: '🌱', from: 0 }, { n: 'Tre Non', ic: '🎋', from: 1000 }, { n: 'Tre Già', ic: '🎍', from: 2000 }, { n: 'Gươm Bạc', ic: '🥈', from: 3000 }, { n: 'Gươm Vàng', ic: '🥇', from: 4000 }, { n: 'Trống Đồng', ic: '🥁', from: 5000 }];
  GLH.RANK_FEE = [0, 5, 10, 15, 20, 25];
  GLH.placePts = (place, n) => { const k = place / n; return place === 1 ? 100 : place === 2 ? 70 : place === 3 ? 50 : k <= 5 / 18 ? 30 : k <= 8 / 18 ? 15 : k <= 12 / 18 ? 0 : -10; };
  GLH.rankOf = pts => { let r = 0; GLH.RANKS.forEach((R, i) => { if (pts >= R.from) r = i; }); const R = GLH.RANKS[r]; if (r === 5) return { i: r, n: R.n, ic: R.ic, div: '' }; const div = ['V', 'IV', 'III', 'II', 'I'][Math.min(4, Math.floor((pts - R.from) / 200))]; return { i: r, n: R.n, ic: R.ic, div }; };
  GLH.rankDelta = (pts, place, n, kills, humans, size) => {
    const r = GLH.rankOf(pts).i, base = GLH.placePts(place, n) + 12 * Math.min(8, kills) - GLH.RANK_FEE[r];
    const k = Math.max(0.3, humans / size); let d = Math.round(base * (base > 0 ? k : 1));
    if (r === 0 && pts + d < 0) d = -pts; return d;
  };

  /* ---------- Độ khó do ADMIN chọn (QĐ-0023) ---------- */
  GLH.BOT_SKILL = {
    de: { n: 'Dễ', react: 0.75, aimErr: 0.32, lead: 0, skillP: 0.3, dodgeP: 0, fight: 0.6 },
    thuong: { n: 'Thường', react: 0.45, aimErr: 0.16, lead: 0.5, skillP: 0.6, dodgeP: 0.15, fight: 0.45 },
    kho: { n: 'Khó', react: 0.28, aimErr: 0.08, lead: 0.9, skillP: 0.85, dodgeP: 0.4, fight: 0.35 },
    caothu: { n: 'Cao thủ', react: 0.18, aimErr: 0.04, lead: 1, skillP: 1, dodgeP: 0.7, fight: 0.3 },
  };
  GLH.PRESETS = {
    de: { n: 'Dễ', botSkill: 'de', dmgMul: 1, monHpMul: 0.8, monAtkMul: 0.7, zoneSpeedMul: 0.85, zoneDpsMul: 0.8, expMul: 1.3, lootMul: 1.3, aimAssistTouch: 0.12, aimAssistPc: 0.04 },
    thuong: { n: 'Thường', botSkill: 'thuong', dmgMul: 1, monHpMul: 1, monAtkMul: 1, zoneSpeedMul: 1, zoneDpsMul: 1, expMul: 1, lootMul: 1, aimAssistTouch: 0.08, aimAssistPc: 0 },
    kho: { n: 'Khó', botSkill: 'kho', dmgMul: 1, monHpMul: 1.2, monAtkMul: 1.25, zoneSpeedMul: 1.15, zoneDpsMul: 1.2, expMul: 0.9, lootMul: 0.9, aimAssistTouch: 0.06, aimAssistPc: 0 },
    caothu: { n: 'Cao thủ', botSkill: 'caothu', dmgMul: 1.1, monHpMul: 1.4, monAtkMul: 1.5, zoneSpeedMul: 1.3, zoneDpsMul: 1.4, expMul: 0.8, lootMul: 0.8, aimAssistTouch: 0.04, aimAssistPc: 0 },
  };
  GLH.DEFAULT_CFG = Object.assign({ preset: 'thuong', matchSize: 18, lobbyWait: 20, fillBots: true, chests: true, boss: true, monsters: true, practiceBots: 17 }, GLH.PRESETS.thuong);

  GLH.dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  root.GLH = GLH;
  if (typeof module !== 'undefined' && module.exports) module.exports = GLH;
})(typeof window !== 'undefined' ? window : globalThis);
