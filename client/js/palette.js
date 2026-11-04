/* =====================================================================
   BẢNG MÀU & BỘ LỌC MÀU (QĐ-0034) — nguồn: tài liệu màu chủ dự án gửi 04/11/2026
   Tỉ lệ khóa vào dự án: 55% thiên nhiên · 20% địa hình · 15% kiến trúc/trang phục · 10% huyền ảo
   Phong cách chủ đạo: Ancient Natural + Mystic. Màu lục ngọc cũ (bản ý tưởng) đã thay toàn bộ.
   Đổi màu: sửa PAL; đổi bộ lọc: sửa GRADES. Bộ Não: 13-Tai-san-Do-hoa-Am-thanh/Bang-mau-va-Bo-loc.md
   ===================================================================== */
const PAL = {
  /* 2.1 cỏ & thảm thực vật */
  coNon: 0x789653, coTuNhien: 0x627D43, coRung: 0x405B36, coGia: 0x827B45, coToi: 0x293D2D, reuCo: 0x53664A,
  /* 2.2 cây & tán lá */
  laNon: 0x91AD63, laXanh: 0x668A48, laRung: 0x42633A, laGia: 0x7D8248, laToi: 0x293F30, treXanh: 0x76945B, thanCay: 0x69503A, voCayGia: 0x49392F,
  /* 2.3 hoa */
  hoaDao: 0xE9A6A9, hoaSen: 0xE7B5C3, hoaMai: 0xF2D47C, hoaCuc: 0xD8B95A, hoaTim: 0x9275AE, hoaLam: 0x6B9DC4, laSen: 0x6E9560, hoaTrang: 0xE7E3D4,
  /* 3 địa hình */
  datThuong: 0x806348, datAm: 0x514033, daNui: 0x77766E, daCo: 0x656B5A, cat: 0xB49A6A, bun: 0x493A30, tuyet: 0xD8E1E2, nuocHo: 0x477E7A, nuocSau: 0x244B55, goCo: 0x63452F,
  /* 4 vật liệu nhân vật, vũ khí, giáp */
  dongCo: 0xA77B42, vangKim: 0xD5AD59, satDen: 0x353B40, thepXam: 0x92999A, ngocBich: 0x4E9C82, doSon: 0x9C3035, doRuou: 0x572B35, timHoang: 0x62477F, trangNga: 0xDED6C2, nauDa: 0x876044,
  /* 5 hiệu ứng (VFX) */
  linhKhi: 0x55E6C1, kiemKhi: 0x58B9F4, loiDien: 0xA8D9FF, hoaDiem: 0xFF713C, phuong: 0xFFB43D, maKhi: 0xA66BFF, huyetKhi: 0xD62D46, tienQuang: 0xFFF1BC,
  /* bầu trời & sương (suy ra từ bảng màu) */
  troiDinh: 0x7E9DB0, troiChan: 0xD9CDB0, suong: 0xAFB8A6,
};
const hexCss = h => '#' + h.toString(16).padStart(6, '0');
/* màu Gốc theo bảng vật liệu/VFX */
const ELEM_PAL = { kim: PAL.thepXam, moc: PAL.laNon, thuy: PAL.kiemKhi, hoa: PAL.hoaDiem, tho: PAL.dongCo };

/* ---------- 6. Bộ lọc màu (color grading) — người chơi chọn trong Cài đặt › Đồ họa ----------
   sat: độ bão hòa · con: tương phản · temp: nhiệt độ màu (+ ấm / − lạnh) · sh/hi: màu đổ vào vùng tối / vùng sáng · bloom: hào quang */
const GRADES = {
  coPhong: { n: 'Cổ phong tự nhiên', d: 'Mặc định · bão hòa 88% · tương phản +10% · ấm nhẹ · bóng xanh rêu · sáng vàng ấm', sat: 0.88, con: 1.10, temp: 3, sh: [0.33, 0.40, 0.29], hi: [1.0, 0.92, 0.72], shK: 0.10, hiK: 0.08, bloom: 0.32, exp: 1.0 },
  hoangTrieu: { n: 'Hoàng triều', d: 'Bão hòa 90% · tương phản +15% · ấm +12 · ánh vàng đất', sat: 0.90, con: 1.15, temp: 12, sh: [0.35, 0.27, 0.18], hi: [1.0, 0.85, 0.55], shK: 0.10, hiK: 0.12, bloom: 0.38, exp: 1.02 },
  rungHuyen: { n: 'Rừng huyền bí', d: 'Bão hòa 80% · tương phản +18% · lạnh −8 · bóng xanh lam lục', sat: 0.80, con: 1.18, temp: -8, sh: [0.16, 0.32, 0.36], hi: [0.85, 0.98, 1.0], shK: 0.16, hiK: 0.06, bloom: 0.36, exp: 0.97 },
  chienTruong: { n: 'Chiến trường', d: 'Bão hòa 90% · tương phản +22% · ấm +8 · bóng xám nâu', sat: 0.90, con: 1.22, temp: 8, sh: [0.33, 0.28, 0.24], hi: [1.0, 0.9, 0.78], shK: 0.14, hiK: 0.06, bloom: 0.28, exp: 1.0 },
  tienGioi: { n: 'Tiên giới', d: 'Bão hòa 105% · tương phản +12% · lạnh −5 · hào quang +25%', sat: 1.05, con: 1.12, temp: -5, sh: [0.26, 0.24, 0.40], hi: [1.0, 0.97, 0.86], shK: 0.10, hiK: 0.10, bloom: 0.55, exp: 1.04 },
};
const GRADE_KEYS = Object.keys(GRADES);
const GradeShaderV = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, sat: { value: 0.88 }, con: { value: 1.1 }, temp: { value: 3 }, sh: { value: new THREE.Vector3(0.33, 0.4, 0.29) }, hi: { value: new THREE.Vector3(1, 0.92, 0.72) }, shK: { value: 0.1 }, hiK: { value: 0.08 }, vig: { value: 0.75 }, hurt: { value: 0 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,sat,con,temp,shK,hiK,vig,hurt;uniform vec3 sh,hi;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}
  void main(){vec2 d=vUv-.5;float r=dot(d,d);vec3 c=texture2D(tDiffuse,vUv).rgb;
  c*=vec3(1.+temp*.012,1.+temp*.002,1.-temp*.014);                       // nhiệt độ màu
  float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);              // bão hòa
  c=(c-.5)*con+.5;                                                          // tương phản
  l=clamp(dot(c,vec3(.2126,.7152,.0722)),0.,1.);
  c=mix(c,c*sh*2.2,shK*(1.-smoothstep(0.,.55,l)));                          // đổ màu vùng tối
  c=mix(c,c*hi*1.1,hiK*smoothstep(.45,1.,l));                               // đổ màu vùng sáng
  c=mix(c,vec3(l*1.1,l*.35,l*.3),hurt*.5);                                  // bị đánh nặng: ửng đỏ
  c*=1.-r*vig;c+=(h(vUv*1000.)-.5)*.018;gl_FragColor=vec4(clamp(c,0.,1.),1.);}`,
};
/* máy yếu (không có hậu kỳ): mô phỏng bằng bộ lọc CSS trên khung vẽ */
function gradeCss(g) { const t = g.temp; return `saturate(${g.sat}) contrast(${g.con})` + (t > 0 ? ` sepia(${Math.min(0.3, t * 0.018)})` : t < 0 ? ` hue-rotate(${t * 1.2}deg)` : ''); }

/* áp bảng màu lên dữ liệu vùng đất (ZONES của bản đồ Lục Điệp) — gọi trước khi dựng World */
function applyPaletteToZones() {
  if (typeof ZONES === 'undefined') return;
  const Z = [
    { ground: [PAL.coTuNhien, PAL.coNon], fog: 0xB9C2AE, fogD: 0.0042 },          // Linh Đài — đồng cỏ quanh đình
    { ground: [PAL.treXanh, PAL.coRung], fog: 0xA9B8A0, fogD: 0.0048 },           // Trúc Lâm — rừng tre
    { ground: [PAL.coNon, PAL.coGia], fog: 0xC8C4A8, fogD: 0.0038 },              // Thảo Nguyên — đồng cỏ già
    { ground: [PAL.coToi, PAL.laRung], fog: 0x6F8A86, fogD: 0.0075 },             // U Minh Lâm — rừng huyền bí
    { ground: [PAL.bun, PAL.reuCo], fog: 0x8A9178, fogD: 0.0085 },                // Đầm lầy
    { ground: [PAL.daNui, PAL.datThuong], fog: 0xB5AE9C, fogD: 0.0045 },          // Hoang Sơn — núi đá
    { ground: [PAL.tuyet, 0xC6D0D2], fog: 0xD0D8DC, fogD: 0.0065 },               // Tuyết Sơn
    { ground: [PAL.datAm, PAL.bun], fog: 0x7A5A48, fogD: 0.0080 },                // vùng lửa — đất cháy
  ];
  ZONES.forEach((z, i) => Object.assign(z, Z[i] || {}));
}
