# Lục Điệp – Đan Nữ Tu Tiên (game 3D offline)

## Cách chơi ngay
1. Giải nén thư mục `LucDiep_TuTien`.
2. Nhấp đúp `CHOI_GAME.bat` (hoặc mở `index.html` bằng Chrome/Edge). Không cần internet, không cần cài đặt.
3. Cần card đồ họa hỗ trợ WebGL. Máy yếu: Menu (Esc) → Đồ họa → Thấp.

## Điều khiển
| Phím | Chức năng |
|---|---|
| W A S D / Shift / Space | Đi / chạy / nhảy |
| J hoặc click chuột | Luyện đan phóng (đánh thường, giữ để đánh liên tục) |
| 1–8 | Kỹ năng (mở khóa theo cấp): nhào lộn, xoay, múa kiếm, ngự kiếm phi hành, vọt cao, thời gian chậm, thuấn bộ, đàn bướm |
| Q / R | Dùng đan hồi máu / hồi linh lực |
| E | Hái Linh Thảo, mở Đan Lò (mua bán, luyện đan, cường hóa) |
| I | Túi đồ & trang bị · M bản đồ · H hồi thành · Esc menu · F1 hướng dẫn |
| Kéo chuột / cuộn | Xoay camera / zoom |

## Nội dung game
- Bản đồ rộng 700×700 đơn vị: núi, sông, hồ, rừng trúc, đầm lầy, tuyết sơn, ma vực; sông làm chậm, hồ sâu cần ngự kiếm để vượt.
- 8 vùng đất, quái cấp 1 → 99 tăng dần theo khoảng cách tới Linh Đài (khu an toàn); quái thường, tinh anh ★, 7 trùm và boss cuối Ma Long.
- Quái rớt Linh Thạch, nguyên liệu, đan dược, trang bị 5 bậc phẩm chất (có thuộc tính phụ).
- Túi đồ 30 ô (mở rộng tới 72), 4 ô trang bị, bán đồ, luyện đan, cường hóa trang bị.
- Cấp tối đa 99, tự lưu mỗi vài chục giây và khi thoát (lưu trong trình duyệt, nút Tiếp Tục ở màn hình chính).

## Cấu trúc dự án
```
index.html        giao diện, HUD, bảng túi đồ/cửa hàng/bản đồ
css/style.css     giao diện
js/lib/           three.js r128 + hậu kỳ (đóng gói sẵn, chạy offline)
js/core.js util.js  tiện ích, noise, âm thanh tổng hợp
js/data.js        vùng, quái, vật phẩm, kỹ năng, công thức, cân bằng cấp
js/player.js      nhân vật Lục Điệp (từ bản gốc, thêm đi trên địa hình)
js/fx.js          hiệu ứng hạt, bướm, bóng ma
js/world.js       địa hình, sông núi, cây cối, bầu trời, ngày đêm
js/monsters.js    mô hình quái, AI, trại quái, vật rơi
js/ui.js          HUD, túi đồ, cửa hàng
js/game.js        vòng lặp, chiến đấu, kỹ năng, lưu game
```

## Trạng thái hiện tại / việc còn lại
- Đã kiểm thử tự động: vào game, chiến đấu, rớt đồ, lên cấp, lưu game (bot tự farm lên cấp 5 sau ~80s).
- Chưa kiểm tra kỹ: cân bằng các cấp cao (30–99), cửa hàng/cường hóa qua giao diện, hiệu năng trên máy yếu.
- Lưu game dùng bộ nhớ trình duyệt; mở bằng trình duyệt khác sẽ không thấy bản lưu.
