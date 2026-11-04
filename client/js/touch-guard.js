/* =====================================================================
   BẢO VỆ THAO TÁC CẢM ỨNG (QĐ-0047) — không để trình duyệt chen ngang trận đấu
   · chặn phóng to (chụm 2 ngón, chạm đúp), kéo trang / kéo để tải lại, menu giữ lâu, chọn chữ, kính lúp iOS
   · nút Quay lại (Android) trong trận → mở Menu tạm nghỉ thay vì rời trận
   · giữ màn hình sáng (Wake Lock) khi đang đánh; khóa xoay ngang khi toàn màn hình; nhắc xoay ngang khi cầm dọc
   · rời ứng dụng (chuyển tab/khóa máy) → nhả cần đi & nút đang giữ, tránh nhân vật tự chạy
   · Gyro: tự xin quyền ở lần chạm đầu tiên trong trận (iOS bắt buộc), báo rõ khi bị chặn (cần https)
   ===================================================================== */
const TouchGuard = {
  init(G) {
    if (this.G) return; this.G = G; const touch = G.isTouch;
    const scrollable = el => el && el.closest && el.closest('.hbox,.pbody,.rtab,.gbox,#layBar,input,select,textarea');
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || !scrollable(e.target)) e.preventDefault(); }, { passive: false });
    let lastEnd = 0; document.addEventListener('touchend', e => { const n = performance.now(); if (n - lastEnd < 320 && !scrollable(e.target)) e.preventDefault(); lastEnd = n; }, { passive: false });
    document.addEventListener('contextmenu', e => { if (!(e.target && e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
    document.addEventListener('selectstart', e => { if (!(e.target && e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
    document.addEventListener('dragstart', e => e.preventDefault());
    /* nút Quay lại */
    try { history.pushState({ glh: 1 }, ''); } catch (e) { }
    addEventListener('popstate', () => { try { history.pushState({ glh: 1 }, ''); } catch (e) { } if (G.mode === 'play' && G.me && G.me.alive) { G.hud.show('pause'); G.hud.toast('Đã mở Menu — bấm "Tiếp tục" để quay lại trận'); } });
    addEventListener('beforeunload', e => { if (G.mode === 'play') { e.preventDefault(); e.returnValue = ''; } });
    /* rời ứng dụng → nhả mọi phím/nút */
    const release = () => { try { G.keys = {}; if (G.input) { G.input.atk = false; G.input.mx = 0; G.input.mz = 0; } G.joy && (G.joy.active = false); document.querySelectorAll('.tbn.on').forEach(b => b.classList.remove('on')); } catch (e) { } };
    addEventListener('blur', release); document.addEventListener('visibilitychange', () => { if (document.hidden) release(); else this.wake(); });
    if (!touch) return;
    document.body.classList.add('touch-guard');
    /* nhắc xoay ngang */
    const rot = document.createElement('div'); rot.id = 'rotateHint'; rot.innerHTML = '<div><b>⟳</b><span>Xoay ngang điện thoại để chơi</span><small>Bật "Tự động xoay" nếu màn hình không xoay</small></div>'; document.body.appendChild(rot);
    const chk = () => rot.classList.toggle('on', G.mode === 'play' && innerHeight > innerWidth * 1.05); addEventListener('resize', chk); setInterval(chk, 1000);
    /* Gyro: xin quyền ở lần chạm đầu */
    const ask = async () => {
      if (G.mode !== 'play' || this.gyroAsked || (G.S.gyro || 'off') === 'off') return; this.gyroAsked = true;
      if (!window.isSecureContext) { G.hud.toast('Gyro bị trình duyệt chặn vì trang chưa có https — nhờ chủ máy chủ bật https', '#ff9a6a'); return; }
      const ok = await Gyro.request(); if (!ok) G.hud.toast('Bạn đã từ chối cảm biến chuyển động — vào Cài đặt trình duyệt để cho phép Gyro', '#ff9a6a');
      else setTimeout(() => { if (!Gyro.has) G.hud.toast('Máy này không gửi dữ liệu Gyro — dùng vuốt để xoay', '#ff9a6a'); }, 2500);
    };
    document.addEventListener('touchend', ask, { passive: true });
  },
  /* gọi khi bắt đầu trận */
  async start() { this.wake(); if (this.G && this.G.isTouch) { try { if (document.fullscreenElement && screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { } } },
  async wake() { try { if (this.G && this.G.mode === 'play' && navigator.wakeLock && !document.hidden && !(this.lock && !this.lock.released)) this.lock = await navigator.wakeLock.request('screen'); } catch (e) { } },
  stop() { try { this.lock && this.lock.release(); } catch (e) { } this.lock = null; },
};
