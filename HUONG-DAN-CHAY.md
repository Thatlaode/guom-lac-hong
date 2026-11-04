# GƯƠM LẠC HỒNG · Năm Dòng Đọ Sức — Hướng dẫn chạy (bản 0.3.0, offline/LAN)

## 1. Cài một lần
- Cài **Node.js bản LTS** cho Windows: https://nodejs.org (bấm Next đến hết).

## 2. Chạy máy chủ trận đấu
- Bấm đúp **`CHAY_SERVER.bat`**. Lần đầu nó tự cài thư viện (cần mạng 1 lần; đã kèm sẵn `node_modules/ws` nên thường không cần).
- Cửa sổ đen hiện:
  - `Chơi trên máy này : http://localhost:8080` (trình duyệt tự mở)
  - `Điện thoại/PC khác cùng wifi : http://192.168.x.x:8080`
  - `Bảng Admin : http://localhost:8080/admin.html` + **Mã Admin**
- Tắt: đóng cửa sổ hoặc bấm `Ctrl + C`.
- Windows hỏi tường lửa → chọn **Cho phép** (mạng Riêng) để điện thoại vào được.

## 3. Chơi
- **Tập với người máy**: vào ngay 1 trận với 17 🤖 Người máy (không tính bậc).
- **Vào trận · Đánh Lẻ**: vào Sân chờ; sau thời gian chờ (Admin chỉnh) thiếu người sẽ có Người máy lấp chỗ. Có tính **bậc**.
- **PC + điện thoại chung trận**: cùng bấm "Đánh Lẻ" trong thời gian chờ.

| Máy tính | Điện thoại |
|---|---|
| Bấm vào màn hình để **khóa chuột**, rê chuột để ngắm | Đẩy vòng trái để đi, vuốt nửa phải để ngắm |
| WASD đi · Chuột trái/J đánh · Chuột phải/1 chiêu 1 · 2 · 3 | Nút **Đánh** to, 3 nút chiêu |
| Alt + 1/2/3, phím U, hoặc bấm ⬆ để nâng chiêu | Chấm ⬆ trên nút chiêu để nâng |
| **Space Nhảy · Shift Lộn Nhào** · F Cưỡi Diều · **X rút/cất vũ khí** | Nhảy · Lộn · Diều (vũ khí tự rút khi đánh, tự cất sau 6 giây yên) |
| Q Bổ Máu · R Bổ Hơi · T Rượu Nếp Cẩm | Bổ Máu · Bổ Hơi |
| E mở Hòm Diều · K điểm sức · G gột điểm | 📦 · ⬆ Điểm |
| Tab bảng trận · M bản đồ · V đổi góc nhìn (sau lưng / thứ nhất) · Esc menu | ☰ Menu |

## 4. Admin chỉnh độ khó
Mở `http://localhost:8080/admin.html`, nhập Mã Admin → chọn **Dễ / Thường / Khó / Cao thủ** hoặc tự kéo từng thanh (độ giỏi người máy, máu & sức đánh quái, tốc độ Vòng Sương, sát thương sương, điểm lớn, rơi đồ, hỗ trợ ngắm điện thoại/PC, số người/trận, thời gian chờ, bật/tắt Hòm Diều, Chúa Thuồng Luồng, quái). Bấm **Lưu** → áp dụng cho trận mở sau. Có nút **Mở trận ngay** và **Kết thúc mọi trận**.


### Cân bằng từng phần (bản 0.4.0)
Cũng trong Bảng Admin, mục **⚖️ Cân bằng từng phần**: hệ số chung, hệ số theo đợt Vòng Sương, hệ số từng Dòng (có nút tạm khóa Dòng) và **từng chiêu** (sát thương, hồi, tốn hơi, tầm, khống chế). Đặt tên bản → Lưu → áp dụng từ trận sau. Có **lịch sử** để khôi phục và **thống kê thắng/thua theo Dòng**.

## 5. Thay hình, âm thanh, nhân vật (không cần sửa code)
- Hình/icon: thả file vào `client/assets/ui/<nhóm>/MÃ.svg|png|webp` → khai báo `client/assets/manifest.json`. Danh mục mã: Bộ Não › `13-Tai-san…/Danh-muc-Hinh-anh-Icon.md`. Trong game bấm **F9** để nạp lại hình.
- Âm thanh: `client/assets/audio/<nhóm>/MÃ.ogg` → khai báo `client/assets/audio/audio.json`. Danh mục: `Danh-muc-Am-thanh.md`. Mã chiêu: `SFX-<KIEM|DUOC|BANG|HOA|THACH>-<BASIC|1|2|ULT>-<CAST|HIT>`.
- Nhân vật: `client/assets/models/<kiem|duoc|bang|hoa|thach>/model.glb + profile.json` (xem `client/assets/models/README.md`) → khai báo `"CHAR-KIEM-BASE": "models/kiem/profile.json"`.

## 6. Kiểm thử (dành cho Claude/dev)
- `node tests/bot-match.js thuong 40` — 40 trận toàn người máy, in tỉ lệ thắng từng Dòng.
- `node tests/ui-test.js` — mở game trên PC + giả lập điện thoại, chụp ảnh vào `tests/anh/`, báo lỗi (cần Playwright).

## 7. Cấu trúc
```
client/   online.html (bản mạng) · index.html (bản offline cũ vẫn chạy) · admin.html
          js/online.js (lõi) · hud.js (giao diện) · rig.js (khung xương 65 xương) · audio.js · assets.js
          assets/ (ổ cắm hình, âm, model)
server/   server.js (http + WebSocket, sân chờ, Admin API) · match.js (trận) · bot.js (người máy) · terrain.js (địa hình dùng chung) · store.js (bậc)
          data/ (tự tạo: admin-config.json, admin-key.txt, players.json — KHÔNG chia sẻ admin-key)
shared/rules.js  — MỌI con số cân bằng (một nguồn duy nhất)
tests/    bot-match.js · ui-test.js
```

## 8. Phòng xem nhân vật (mới ở 0.3.0)
Mở `http://localhost:8080/xem-nhan-vat.html`: 5 Dòng đứng cạnh nhau, bấm nút để xem từng động tác (đứng, đi, chạy, nhảy, đánh, chạy + đánh, 3 chiêu, lộn, cưỡi diều, trúng đòn, gục, mở hòm). Kéo chuột để xoay.
Nhân vật & hoạt ảnh tạm: bộ **Quaternius** (CC0) trong `client/assets/models/quaternius/`. Đổi kiểu tóc/màu áo/động tác: sửa `CHAR_LOOK` và `ANIM_SET` trong `client/js/rig.js`.

## 9. Nhạc nền thử
`client/assets/audio/bgm/BGM-NHAC-THU.mp3` (bài bạn gửi) đang dùng cho mọi màn. Đổi bài: thay file hoặc sửa `client/assets/audio/audio.json`.

## 0.4.0 — có gì mới
- **10 Dòng** = 5 Gốc × nam/nữ, mỗi Dòng có **Tâm Pháp** (nội tại) + 3 chiêu; nút **📖 Bí kíp Dòng** ở màn chính và trong bảng điểm sức.
- Vũ khí thật cầm đúng tay, **cất ở hông/lưng**, tự rút khi đánh; chạy/nhảy giữ thế thủ.
- Áo Nông dân + Lữ khách nhuộm màu theo Dòng; nón lá, khăn, trâm, chiêng, hồ lô, dải lụa bay.
- **Lồng tiếng**: 210 ổ âm (giọng 10 Dòng + người dẫn trận) — chưa có file thì hiện phụ đề. Kịch bản: `client/assets/audio/giong-noi/kich-ban.json`.
- Phòng xem nhân vật: `http://localhost:8080/xem-nhan-vat.html` (nút Rút/Cất, Chạy cầm vũ khí, Nhảy cầm vũ khí; `?dong=kiem,tram` để xem riêng).

## 0.5.0 — có gì mới
- **Bảng màu mới** (bỏ màu lục ngọc ban đêm): chiều cổ phong, cỏ cây, đất đá theo bảng màu dự án. **5 bộ lọc màu** chọn ở Cài đặt › Hình: Cổ phong tự nhiên · Hoàng triều · Rừng huyền bí · Chiến trường · Tiên giới.
- **Bụi cỏ** để núp (kẻ địch ở xa không thấy), **nhà tranh** chui vào qua cửa (vách chặn đạn), **cây đánh gãy** được, **tảng đá** làm chỗ nấp.
- **Giao diện sơn mài vàng kim, hoa văn trống đồng**, 60 hình chiêu / Tâm Pháp / huy hiệu Dòng mới.
- **Gyro** trên điện thoại (Cài đặt › Điều khiển). Cần https: đặt `cert.pem` + `key.pem` vào `server/data/` → mở thêm `https://<IP>:8443`. Cách tạo cert nhanh (máy có mkcert): `mkcert -key-file server/data/key.pem -cert-file server/data/cert.pem 192.168.1.5 localhost` (thay IP máy chủ).

## 0.5.1 — giao diện mọi thiết bị
- Phông **Be Vietnam Pro** đóng gói kèm (không cần mạng).
- Khung máu/hơi mới (vệt máu tụt chậm, cấp trên huy hiệu, nhấp nháy khi máu thấp). **Nút chiêu tròn** trên cả điện thoại lẫn máy tính.
- **Tùy chỉnh bố cục**: Menu trận › ✥ Tùy chỉnh bố cục nút — kéo thả mọi nút, cần đi, khung máu, bản đồ nhỏ, thông báo; đổi cỡ & độ rõ từng cái; Lưu / Hủy / Về mặc định.
- Thông báo nhỏ gọn có khung + hiệu ứng chữ. **Nhãn trên đầu** (tên + cấp + máu siêu nhỏ) cho người chơi khác và quái — bật/tắt ở Cài đặt › Hình › Nhãn trên đầu.
