/* ===================== Dữ liệu game: vùng, quái, vật phẩm, kỹ năng ===================== */
const WORLD = { R: 340, VILLAGE: 22, SIZE: 700, WATER: 0.0 };
const MAX_LV = 99;
const monsterLevelAt = d => clamp(Math.round(1 + (d - WORLD.VILLAGE) / (WORLD.R - WORLD.VILLAGE - 8) * 98), 1, MAX_LV);

const ZONES = [
  { id: 0, name: 'Linh Đài (Khu An Toàn)', from: 0, to: 22, ground: [0x35553f, 0x2c4a3a], fog: 0x06201f, fogD: 0.009, safe: true },
  { id: 1, name: 'Trúc Lâm', from: 22, to: 70, ground: [0x2f6b40, 0x3a7a46], fog: 0x07261f, fogD: 0.0085 },
  { id: 2, name: 'Thảo Nguyên Sương', from: 70, to: 125, ground: [0x4a7a42, 0x5a8a4a], fog: 0x0a2a26, fogD: 0.0075 },
  { id: 3, name: 'U Minh Lâm', from: 125, to: 180, ground: [0x1d3d36, 0x244a40], fog: 0x061a22, fogD: 0.011 },
  { id: 4, name: 'Độc Đầm Lầy', from: 180, to: 230, ground: [0x3a5a4a, 0x4a5a3a], fog: 0x0e2a1a, fogD: 0.013 },
  { id: 5, name: 'Hoang Sơn', from: 230, to: 275, ground: [0x6a5a4a, 0x5a4c40], fog: 0x1a1a22, fogD: 0.009 },
  { id: 6, name: 'Tuyết Sơn', from: 275, to: 310, ground: [0xc8d8e4, 0xdbe8f0], fog: 0x1a2a3e, fogD: 0.011 },
  { id: 7, name: 'Hỏa Ngục Ma Vực', from: 310, to: 345, ground: [0x4a2220, 0x351515], fog: 0x2a0e0e, fogD: 0.012 },
];

/* ---- Quái: arch = kiểu mô hình ---- */
const MTYPES = {
  rabbit: { name: 'Thỏ Ngọc', arch: 'quad', zones: [1], color: 0xf0ece0, c2: 0xffb0c0, sc: 0.75, hp: 0.6, atk: 0.5, spd: 4.6, aggro: 0, passive: true, exp: 0.8, mat: 'Lông Thỏ', ic: '🪶', body: [0.3, 0.28, 0.45], head: 0.2, ears: 0.3, tail: 0.1, legH: 0.2 },
  boar: { name: 'Heo Rừng', arch: 'quad', zones: [1, 2], color: 0x6b4a36, c2: 0xe8dcc0, sc: 1, hp: 1.2, atk: 0.9, spd: 3.8, aggro: 9, exp: 1, mat: 'Nanh Heo', ic: '🦷', body: [0.42, 0.4, 0.75], head: 0.28, tusk: true, tail: 0.08, legH: 0.28 },
  wolf: { name: 'Sói Xám', arch: 'quad', zones: [2], color: 0x8a9096, c2: 0xd0d6da, sc: 1, hp: 1, atk: 1.1, spd: 5.8, aggro: 13, exp: 1, mat: 'Da Sói', ic: '🐺', body: [0.3, 0.32, 0.7], head: 0.24, snout: true, ears: 0.18, tail: 0.35, legH: 0.42 },
  snake: { name: 'Rắn Lục', arch: 'snake', zones: [2, 3], color: 0x58b050, c2: 0xe0e060, sc: 1, hp: 0.8, atk: 1.2, spd: 4.2, aggro: 9, exp: 1, mat: 'Nọc Rắn', ic: '🧪' },
  spider: { name: 'Nhện Độc', arch: 'spider', zones: [3], color: 0x3a2a4a, c2: 0xb050ff, sc: 1, hp: 1, atk: 1.25, spd: 5.2, aggro: 11, exp: 1.1, mat: 'Tơ Nhện', ic: '🕸️' },
  bear: { name: 'Gấu Đen', arch: 'quad', zones: [3, 5], color: 0x2a2622, c2: 0xc8a070, sc: 1.35, hp: 1.8, atk: 1.3, spd: 3.5, aggro: 10, exp: 1.2, mat: 'Mật Gấu', ic: '🍯', body: [0.5, 0.5, 0.8], head: 0.32, ears: 0.12, snout: true, tail: 0.1, legH: 0.38 },
  toad: { name: 'Cóc Độc', arch: 'toad', zones: [4], color: 0x4a8a5a, c2: 0xd0e060, sc: 1, hp: 1.2, atk: 1, spd: 3.2, aggro: 11, ranged: 11, exp: 1.1, mat: 'Nọc Cóc', ic: '🧪' },
  wisp: { name: 'Quỷ Hỏa Lục', arch: 'wraith', zones: [4], color: 0x40ffa0, c2: 0xffffff, sc: 1, hp: 0.8, atk: 1.3, spd: 3.8, aggro: 14, ranged: 13, exp: 1.3, mat: 'Hồn Hỏa', ic: '💚' },
  golem: { name: 'Thạch Nhân', arch: 'golem', zones: [5], color: 0x7a7068, c2: 0xffa040, sc: 1.3, hp: 2.3, atk: 1.3, spd: 2.7, aggro: 9, exp: 1.3, mat: 'Lõi Đá', ic: '🪨' },
  tiger: { name: 'Hổ Núi', arch: 'quad', zones: [5, 6], color: 0xc88a3a, c2: 0x2a1a10, sc: 1.2, hp: 1.3, atk: 1.5, spd: 6.2, aggro: 14, exp: 1.3, mat: 'Móng Hổ', ic: '🐯', body: [0.36, 0.36, 0.85], head: 0.27, ears: 0.1, snout: true, tail: 0.5, legH: 0.42, stripes: true },
  icewolf: { name: 'Băng Lang', arch: 'quad', zones: [6], color: 0xbfe4ff, c2: 0x6ac0ff, sc: 1.15, hp: 1.2, atk: 1.4, spd: 6.2, aggro: 14, exp: 1.4, mat: 'Tinh Băng', ic: '❄️', body: [0.3, 0.32, 0.7], head: 0.24, snout: true, ears: 0.2, tail: 0.4, legH: 0.44, glow: 0x6ac0ff },
  snowspirit: { name: 'Tuyết Yêu', arch: 'wraith', zones: [6], color: 0xd8f0ff, c2: 0x80d0ff, sc: 1.1, hp: 0.9, atk: 1.5, spd: 3.6, aggro: 14, ranged: 13, exp: 1.5, mat: 'Lệ Tuyết', ic: '💎' },
  firebird: { name: 'Hỏa Điểu', arch: 'bird', zones: [7], color: 0xff6a2a, c2: 0xffe060, sc: 1.2, hp: 1, atk: 1.6, spd: 5.2, aggro: 15, ranged: 13, exp: 1.6, mat: 'Lông Hỏa', ic: '🔥' },
  demon: { name: 'Ma Thú', arch: 'quad', zones: [7], color: 0x5a1a3a, c2: 0xff3030, sc: 1.4, hp: 2.1, atk: 1.7, spd: 4.6, aggro: 14, exp: 1.7, mat: 'Sừng Ma', ic: '👹', body: [0.45, 0.45, 0.85], head: 0.3, horns: true, snout: true, tail: 0.4, legH: 0.46, glow: 0xff3030 },
  shade: { name: 'Quỷ Ảnh', arch: 'wraith', zones: [7], color: 0xb050ff, c2: 0xff60ff, sc: 1.25, hp: 1, atk: 1.7, spd: 4, aggro: 15, ranged: 14, exp: 1.8, mat: 'Hồn Ảnh', ic: '🟣' },
  dragon: { name: 'Ma Long', arch: 'dragon', zones: [], color: 0x3a1020, c2: 0xff5020, sc: 1, hp: 1, atk: 1, spd: 5, aggro: 30, exp: 1, mat: 'Vảy Rồng', ic: '🐉' },
};

/* ---- Trùm ---- */
const BOSSES = [
  { id: 'b1', name: 'Heo Vương Hung Hãn', base: 'boar', ang: 0.55, d: 52, sc: 2.8, color: 0x8a3a26 },
  { id: 'b2', name: 'Lang Vương Nguyệt Quang', base: 'wolf', ang: 2.3, d: 108, sc: 2.7, color: 0xdfe6ee },
  { id: 'b3', name: 'Mẫu Nhện U Minh', base: 'spider', ang: 3.7, d: 160, sc: 3.4, color: 0x5a1a6a },
  { id: 'b4', name: 'Cự Thiềm Độc Đầm', base: 'toad', ang: 5.2, d: 208, sc: 3.4, color: 0x2a9a4a },
  { id: 'b5', name: 'Sơn Thần Thạch Cự', base: 'golem', ang: 1.15, d: 252, sc: 2.6, color: 0x9a8a70 },
  { id: 'b6', name: 'Tuyết Hổ Vương', base: 'tiger', ang: 2.85, d: 292, sc: 2.8, color: 0xe8f4ff },
  { id: 'b7', name: 'Ma Long Diệt Thế', base: 'dragon', ang: 4.45, d: 322, sc: 1, color: 0x3a1020, final: true },
];

/* ---- Hệ phẩm & trang bị ---- */
const RAR = [
  { n: 'Phàm Phẩm', c: '#d8d8d8', m: 1, aff: 0, pre: '' },
  { n: 'Linh Phẩm', c: '#5fe08a', m: 1.25, aff: 1, pre: 'Linh ' },
  { n: 'Bảo Phẩm', c: '#5aa8ff', m: 1.55, aff: 2, pre: 'Bảo ' },
  { n: 'Tiên Phẩm', c: '#c36bff', m: 1.95, aff: 3, pre: 'Tiên ' },
  { n: 'Thần Phẩm', c: '#ffb53a', m: 2.5, aff: 4, pre: 'Thần ' },
];
const SLOTS = {
  weapon: { n: 'Vũ khí', ic: '⚔️', names: ['Mộc Kiếm', 'Thiết Kiếm', 'Thanh Phong Kiếm', 'Ngọc Tuyền Kiếm', 'Hàn Băng Kiếm', 'Liệt Hỏa Kiếm', 'Tru Tiên Kiếm'] },
  armor: { n: 'Y phục', ic: '👘', names: ['Vải Thô Y', 'Trúc Y', 'Lục Tơ Y', 'Hồ Cừu Y', 'Sơn Hà Giáp', 'Tuyết Vũ Y', 'Cửu Thiên Tiên Y'] },
  head: { n: 'Trâm / Mũ', ic: '👑', names: ['Khăn Vải', 'Trâm Trúc', 'Trâm Ngọc Bích', 'Phát Quan Bạc', 'Kim Quan', 'Băng Phách Quan', 'Thiên Hoàng Quan'] },
  boots: { n: 'Hài', ic: '👢', names: ['Hài Cỏ', 'Hài Vải', 'Hài Da Sói', 'Hài Thanh Vân', 'Hài Thạch Lực', 'Hài Phong Tuyết', 'Hài Đạp Thiên'] },
  ring: { n: 'Nhẫn', ic: '💍', names: ['Nhẫn Đồng', 'Nhẫn Bạc', 'Nhẫn Lam Ngọc', 'Nhẫn Hổ Phách', 'Nhẫn Thanh Tâm', 'Nhẫn Huyền Băng', 'Nhẫn Hỗn Nguyên'] },
  amulet: { n: 'Ngọc bội', ic: '📿', names: ['Dây Chuyền Gỗ', 'Ngọc Bội Xanh', 'Linh Phù Bình An', 'Ngọc Bội Hộ Mệnh', 'Lục Điệp Bội', 'Phượng Hoàng Bội', 'Thái Cực Bội'] },
};
const SLOT_KEYS = Object.keys(SLOTS);
const STAT_NAME = { atk: 'Công kích', def: 'Phòng thủ', hp: 'Sinh lực', mp: 'Linh lực', crit: 'Bạo kích %', atkp: 'Công kích %', defp: 'Phòng thủ %', hpp: 'Sinh lực %', spd: 'Tốc di chuyển %', ls: 'Hút máu %', exp: 'Kinh nghiệm %', luck: 'May mắn (rớt đồ) %' };
const AFFIXES = ['crit', 'atkp', 'defp', 'hpp', 'mp', 'spd', 'ls', 'exp', 'luck'];

function rollRarity(boost = 0) {
  let r = Math.random() / (1 + boost);
  if (r < 0.006) return 4; if (r < 0.035) return 3; if (r < 0.115) return 2; if (r < 0.34) return 1; return 0;
}
function makeEquip(L, rar, slot) {
  L = clamp(Math.round(L), 1, MAX_LV); slot = slot || pick(SLOT_KEYS); const R = RAR[rar], m = R.m, S = {}, tier = Math.min(6, Math.floor((L - 1) / 15));
  switch (slot) {
    case 'weapon': S.atk = Math.round((6 + 3.4 * L) * m); break;
    case 'armor': S.def = Math.round((2 + 1.7 * L) * m); S.hp = Math.round((10 + 14 * L) * m); break;
    case 'head': S.def = Math.round((1 + 1.0 * L) * m); S.hp = Math.round((6 + 8 * L) * m); break;
    case 'boots': S.def = Math.round((1 + 0.7 * L) * m); S.spd = Math.round(3 * m); break;
    case 'ring': S.atk = Math.round((2 + 1.1 * L) * m); S.crit = Math.round(2 * m * 10) / 10; break;
    case 'amulet': S.hp = Math.round((8 + 11 * L) * m); S.mp = Math.round((4 + 2.5 * L) * m); break;
  }
  const pool = AFFIXES.filter(a => !(a in S)).sort(() => Math.random() - 0.5);
  for (let i = 0; i < R.aff && i < pool.length; i++) {
    const a = pool[i], k = 0.8 + Math.random() * 0.5;
    S[a] = { crit: () => 2 + 4 * k, atkp: () => 3 + 6 * k, defp: () => 3 + 6 * k, hpp: () => 3 + 6 * k, mp: () => 10 + L * 1.6 * k, spd: () => 2 + 4 * k, ls: () => 1 + 2 * k, exp: () => 3 + 7 * k, luck: () => 5 + 10 * k }[a]();
    S[a] = Math.round(S[a] * 10) / 10; if (a === 'mp') S[a] = Math.round(S[a]);
  }
  return { kind: 'equip', slot, name: R.pre + SLOTS[slot].names[tier], rar, lv: L, req: Math.max(1, L - 2), stats: S, plus: 0, id: Math.random().toString(36).slice(2, 9) };
}
const equipPrice = it => Math.round((it.lv * 6 + 10) * Math.pow(RAR[it.rar].m, 2.2) * (1 + (it.plus || 0) * 0.3));
function equipStats(it) { // chỉ số sau cường hóa
  const k = 1 + (it.plus || 0) * 0.08, o = {};
  for (const s in it.stats) o[s] = ['atk', 'def', 'hp', 'mp'].includes(s) ? Math.round(it.stats[s] * k) : it.stats[s]; return o;
}

/* ---- Vật phẩm xếp chồng ---- */
const ITEMDEF = {
  herb: { name: 'Linh Thảo', ic: '🌿', price: 6, kind: 'mat', desc: 'Dược liệu cơ bản dùng để luyện đan.' },
  yd: { name: 'Yêu Đan', ic: '🔮', price: 30, kind: 'mat', desc: 'Nội đan của yêu thú. Dùng luyện đan và cường hóa trang bị.' },
  hp1: { name: 'Hồi Huyết Đan', ic: '❤️', price: 20, kind: 'pill', heal: 0.35, desc: 'Hồi 35% sinh lực.' },
  hp2: { name: 'Đại Hồi Huyết Đan', ic: '💖', price: 90, kind: 'pill', heal: 0.7, desc: 'Hồi 70% sinh lực.' },
  mp1: { name: 'Hồi Linh Đan', ic: '💙', price: 20, kind: 'pill', mana: 0.4, desc: 'Hồi 40% linh lực.' },
  mp2: { name: 'Đại Hồi Linh Đan', ic: '💠', price: 90, kind: 'pill', mana: 0.8, desc: 'Hồi 80% linh lực.' },
  bAtk: { name: 'Cuồng Lực Đan', ic: '🔴', price: 150, kind: 'pill', buff: 'atk', val: 0.25, dur: 120, desc: '+25% công kích trong 2 phút.' },
  bDef: { name: 'Kim Cương Đan', ic: '🟡', price: 150, kind: 'pill', buff: 'def', val: 0.3, dur: 120, desc: '+30% phòng thủ trong 2 phút.' },
  bExp: { name: 'Ngộ Đạo Đan', ic: '🟣', price: 400, kind: 'pill', buff: 'exp', val: 0.5, dur: 300, desc: '+50% kinh nghiệm trong 5 phút.' },
};
Object.keys(MTYPES).forEach(k => { const t = MTYPES[k]; const z = t.zones[0] || 7; ITEMDEF['m_' + k] = { name: t.mat, ic: t.ic, price: Math.round(5 * Math.pow(1 + z, 1.55)), kind: 'mat', desc: 'Vật liệu thu được từ ' + t.name + '. Có thể bán lấy Linh Thạch.' }; });
const stackItem = (key, n = 1) => ({ kind: ITEMDEF[key].kind, key, n });

/* ---- Công thức luyện đan ---- */
const RECIPES = [
  { out: 'hp1', n: 2, need: { herb: 2 }, gold: 5 },
  { out: 'mp1', n: 2, need: { herb: 2 }, gold: 5 },
  { out: 'hp2', n: 1, need: { herb: 3, yd: 2 }, gold: 20 },
  { out: 'mp2', n: 1, need: { herb: 3, yd: 2 }, gold: 20 },
  { out: 'bAtk', n: 1, need: { herb: 2, yd: 4 }, gold: 60 },
  { out: 'bDef', n: 1, need: { herb: 2, yd: 4 }, gold: 60 },
  { out: 'bExp', n: 1, need: { herb: 4, yd: 8 }, gold: 200 },
];
const SHOP = ['hp1', 'hp2', 'mp1', 'mp2'];

/* ---- Kỹ năng ---- */
const SKILLS = {
  1: { n: 'Nhào Lộn', ic: '🌀', lv: 1, mp: 6, cd: 3, d: 'Lộn một vòng về phía trước, né tránh sát thương.' },
  2: { n: 'Xoay Trên Không', ic: '🌪️', lv: 8, mp: 15, cd: 7, d: 'Xoay tròn gây sát thương diện rộng quanh mình.' },
  3: { n: 'Múa Kiếm', ic: '⚔️', lv: 15, mp: 28, cd: 14, d: 'Vũ điệu kiếm 3 giây, liên tục chém quanh mình.' },
  4: { n: 'Ngự Kiếm Phi Hành', ic: '🗡️', lv: 12, mp: 0, cd: 1, d: 'Bật/tắt bay trên kiếm, vượt núi qua sông (tiêu hao linh lực).' },
  5: { n: 'Vọt Cao Lướt Gió', ic: '🦅', lv: 5, mp: 10, cd: 8, d: 'Vọt lên cao, tiếp đất gây chấn động.' },
  6: { n: 'Thời Gian Chậm', ic: '⏳', lv: 25, mp: 0, cd: 2, d: 'Làm chậm kẻ địch (tiêu hao linh lực).' },
  7: { n: 'Thuấn Bộ', ic: '💨', lv: 10, mp: 12, cd: 4, d: 'Dịch chuyển tức thời 8 bước, thoáng vô địch.' },
  8: { n: 'Đàn Bướm Linh Quang', ic: '🦋', lv: 20, mp: 40, cd: 25, d: 'Triệu hồi bướm tấn công kẻ địch và hồi máu cho bạn.' },
};
const expNeed = L => Math.round(40 * Math.pow(L, 1.8));
