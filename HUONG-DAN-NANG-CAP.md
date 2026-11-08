# Nâng cấp nhân vật Kim — Dòng 1 Thần Kiếm (nam) và Dòng 2 Ngân Châm (nữ)

Mục tiêu: đưa hai nhân vật đầu tiên trong concept (hệ Kim, vàng – nâu) vào game để test. Các Dòng còn lại không bị ảnh hưởng.

## 1. Cài đặt (chọn một cách)

**Cách A — chép đè (nhanh nhất).** Giải nén gói này, chép đè vào thư mục `01-MA-NGUON` đúng chỗ:

| File | Việc |
|---|---|
| `client/js/rig-outfit.js` | **MỚI**: toàn bộ trang phục Kim |
| `client/js/rig.js` | Sửa 4 chỗ nhỏ (xem `rig.js.diff`) |
| `client/online.html` | Thêm 1 dòng nạp script |
| `client/xem-nhan-vat.html` | Thêm 1 dòng nạp script (phòng xem nhân vật) |
| `client/xem-vat-the.html` | Thêm 1 dòng nạp script |

**Cách B — sửa tay (nếu bạn đã sửa rig.js ở chỗ khác).** Chép riêng `rig-outfit.js`, rồi:
1. Trong 3 file `.html` ở trên, ngay sau dòng `<script src="js/rig.js"></script>` thêm:
   `<script src="js/rig-outfit.js"></script>`
2. Trong `rig.js`, làm theo `rig.js.diff` (4 chỗ):
   - Dòng `kiem:` và `tram:` trong `CHAR_LOOK`: thay bằng bản mới (thêm `kim`, `skinMul`, đổi `tint`, `hair`).
   - Trong `CharLib.template`: thêm dòng `if (Lk.skinMul) root.traverse(...)` ngay trước `root.updateMatrixWorld(true); const H = bones.Head...`.
   - Trong `CharLib.template`: `c.color.setHex(0xb07a5a)` đổi thành `c.color.setHex(Lk.skin || 0xb07a5a)`.
   - Trong `Rig.prototype.useChar`: thêm `if (L.kim && typeof applyKimOutfit === 'function') applyKimOutfit(this, m, b, L);` ngay trước dòng `/* vũ khí thật */`.

## 2. Cách test

1. Chạy `CHAY_SERVER.bat`.
2. Mở phòng xem nhân vật: `http://localhost:8080/xem-nhan-vat.html?dong=kiem,tram`
   - Thêm `&dist=4.6` để zoom gần, `&yaw=3.14` để xem từ phía sau.
   - Bấm các nút **Đi / Chạy nhanh / Nhảy / Đánh thường / Chiêu 1-2-lớn / Lộn Nhào / Trúng đòn / Gục**: nhìn vải có xuyên người, bay quá đà hay biến dạng không.
3. Vào game thật (`http://localhost:8080`) → chọn Dòng Thần Kiếm hoặc Ngân Châm → xem ở màn chọn Dòng và trong trận.
4. Nếu trình duyệt giữ bản cũ: bấm `Ctrl + F5`.

## 3. Trang phục gồm những gì (đối chiếu concept)

| Phần | Thần Kiếm (nam) | Ngân Châm (nữ) |
|---|---|---|
| Đầu | Vương miện lá vàng 11 cánh, tóc ngắn đen | Mũ lông vũ vàng 13 cánh, tóc dài đen |
| Vai | Giáp vai 3 lớp + cổ áo dựng hai bên | Giáp vai 2 lớp nhỏ + vòng bắp tay vàng |
| Thân | Mảnh ngực hình thoi, đai ngọc to | Yếm giáp vàng ôm eo, mảnh ngực nhỏ, đai ngọc |
| Dưới | Tà áo trước vàng sọc nâu + tà bên nâu viền vàng | Váy dài xẻ trước 2 lớp (hổ phách + nâu) |
| Phía sau | Áo choàng 7 mảnh xoè hình quạt | 4 dải lụa vàng bay từ vai và eo |
| Tay – chân | Bao tay + ống chân vàng | Bao tay + ống chân vàng |
| Da | Nâu ấm sáng (đã nhuộm lại) | Nâu ấm sáng (đã nhuộm lại) |

Vải tự bay theo tốc độ chạy và luôn rủ xuống theo trọng lực khi thân nghiêng.

## 4. Chỉnh nhanh (không cần hiểu code nhiều)

Tất cả nằm trong `client/js/rig-outfit.js`:

| Muốn đổi | Sửa ở đâu |
|---|---|
| Tông màu cả bộ | Bảng `CL` ở đầu file (`gold`, `goldL`, `amber`, `brown`…) |
| Màu áo nền (phần xám Quaternius) | `tint` của `kiem` / `tram` trong `CHAR_LOOK` (rig.js) |
| Màu da | `skinMul` (ba số nhân R, G, B; tăng = sáng hơn) |
| Vương miện cao/thấp, nhiều/ít cánh | Dòng `crown(ctx, {...})` trong `kimNam` / `kimNu`: `n`, `hMin`, `hMax`, `dy` (nâng lên) |
| Độ dài váy/áo choàng | Tham số thứ 5 của `skirt(...)`, `len` trong vòng lặp áo choàng, `h` trong váy nữ |
| Vải bay nhiều hay ít | `kx` (bay ra sau khi chạy), `amp` (lắc nhẹ), `cx` (mức rủ theo trọng lực, 0 đến 1) |
| Tắt trang phục để so sánh | Xóa `kim: 'nam'` / `kim: 'nu'` trong `CHAR_LOOK` |

Máy yếu: khi game đặt mức chi tiết (LOD) thấp nhất, lớp váy trong và dải lụa tự ẩn.

## 5. Giới hạn đã biết (cần làm thêm nếu muốn giống concept 100%)

- Đây là bản **test dựng bằng code** trên thân Quaternius. Nó đưa đúng màu, hình khối và bố cục trang phục, nhưng **chưa phải model nghệ thuật** như concept.
- Nữ: concept để hở vai, hiện vẫn còn tay áo nâu bên dưới vòng vàng; tóc dài chỉ tới vai (kiểu `hair_long` có sẵn), chưa dài tới eo.
- Mặt vẫn là mặt gốc Quaternius, chỉ nhuộm lại màu da.
- Các mảnh váy treo vào xương hông nên khi chân bước rộng vẫn có thể lún nhẹ vào đùi.
- Mỗi nhân vật Kim thêm khoảng 40–55 mesh (đã gộp màu để tiết kiệm). Nếu trận 18 người trên điện thoại bị tụt FPS, giảm số tấm trong `kimNam` / `kimNu` hoặc hạ LOD.
- Để ra bản đẹp: nhờ họa sĩ 3D dựng áo/váy/áo choàng thành `.glb` gắn khung xương 65 xương theo `client/assets/models/README.md`, rồi tắt cờ `kim` cho Dòng đó.

## 6. Ảnh kiểm tra

`anh-truoc.png` (bản gốc), `anh-sau.png` (đứng), `anh-sau-chay.png` (chạy nhanh), `anh-sau-mat-lung.png` (nhìn từ sau).
