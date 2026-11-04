/* =====================================================================
   NGẮM BẰNG CON QUAY HỒI CHUYỂN — GYRO (QĐ-0036)
   Điện thoại nghiêng/xoay máy để xoay góc nhìn, kết hợp với vuốt (giống PUBG Mobile).
   Chế độ: off (tắt) · aim (chỉ khi đang giữ nút Đánh / vừa bấm chiêu) · on (luôn bật)
   Tỉ lệ 1 = xoay máy 30° thì góc nhìn xoay 30°. Đảo trục ngang/dọc trong Cài đặt › Điều khiển.
   Không chạy trên máy tính (không có cảm biến) — PC vẫn ngắm bằng chuột.
   ===================================================================== */
const Gyro = {
  rate: null, has: false, asked: false, lastT: 0,
  init() {
    if (this._bound) return; this._bound = true;
    addEventListener('devicemotion', e => { const r = e.rotationRate; if (!r || (r.alpha == null && r.beta == null)) return; this.rate = r; this.has = true; this.lastT = performance.now(); });
  },
  /* iOS 13+ phải xin quyền trong một lần chạm của người chơi */
  async request() {
    this.init(); const D = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === 'function') { try { const s = await D.requestPermission(); this.asked = true; return s === 'granted'; } catch (e) { return false; } }
    return true;
  },
  /* góc màn hình: 0 dọc, 90 ngang (xoay trái), 270/-90 ngang (xoay phải) */
  angle() { const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0; return ((a % 360) + 360) % 360; },
  update(G, dt) {
    const S = G.S, mode = S.gyro || 'off'; if (mode === 'off' || !this.rate || performance.now() - this.lastT > 300) return;
    if (mode === 'aim' && !(G.input.atk || G.tm - (G.aimT || -9) < 0.6)) return;
    const r = this.rate, D2R = Math.PI / 180, k = D2R * (S.gyroSens || 1) * dt, a = this.angle(); let yaw = 0, pit = 0;
    if (a === 90) { yaw = r.beta; pit = r.gamma; } else if (a === 270) { yaw = -r.beta; pit = -r.gamma; } else { yaw = r.gamma; pit = -r.beta; }
    const dz = 1.2; if (Math.abs(yaw) < dz) yaw = 0; if (Math.abs(pit) < dz) pit = 0; // lọc rung tay
    G.cam.yaw += yaw * k * (S.gyroInvX ? -1 : 1);
    G.cam.pitch = Math.max(-0.55, Math.min(1.15, G.cam.pitch + pit * k * (S.gyroInvY ? -1 : 1) * 0.9));
  },
};
