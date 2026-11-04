# 🚀 Đưa Gươm Lạc Hồng BETA lên VPS

## Cần chuẩn bị
| Thứ | Gợi ý |
|---|---|
| VPS | Ubuntu 22.04 hoặc 24.04 · **2 vCPU · 2 GB RAM** đủ cho vài trận 18 người cùng lúc (người máy cũng tốn CPU). Ổ 10 GB |
| Tên miền (nên có) | vd `game.vieesport.vn` — tạo bản ghi **A** trỏ về IP VPS. Có tên miền thì có **https** → Gyro điện thoại chạy được, trình duyệt không cảnh báo |
| Cổng mở | 22 (SSH), 80, 443 |

## Cài (một lệnh)
```bash
# 1. chép file GLH-0.6.0-beta.1.zip lên VPS (WinSCP / scp), rồi:
sudo apt-get install -y unzip && unzip GLH-0.6.0-beta.1.zip -d glh && cd glh
# 2. cài — có tên miền:
sudo bash deploy/cai-dat.sh game.vieesport.vn email@cua-ban.com
#    chưa có tên miền (chơi qua http://IP_VPS, Gyro không chạy):
sudo bash deploy/cai-dat.sh
```
Cuối lệnh in ra **địa chỉ chơi, địa chỉ Admin và Mã Admin**. Mã Admin lưu ở `/etc/guom-lac-hong.env` — không chia sẻ.

Script tự làm: cài Node.js 20 + nginx + rsync · tạo tài khoản riêng `glh` (không chạy bằng root) · chép mã vào `/opt/guom-lac-hong` · dữ liệu để riêng `/var/lib/guom-lac-hong` · dịch vụ systemd tự chạy lại khi lỗi/khởi động máy · nginx chuyển tiếp cả WebSocket · lấy chứng chỉ https miễn phí (Let's Encrypt) · mở tường lửa.

## Vận hành
| Việc | Lệnh |
|---|---|
| Xem nhật ký trực tiếp | `journalctl -u guom-lac-hong -f` |
| Kiểm tra sống | `curl -s localhost:8080/api/health` (hoặc mở `https://TEN_MIEN/api/health`) |
| Khởi động lại | `sudo systemctl restart guom-lac-hong` |
| Đổi Mã Admin / giới hạn | sửa `/etc/guom-lac-hong.env` rồi khởi động lại |
| Cập nhật bản mới | giải nén bản mới → `sudo bash deploy/cap-nhat.sh` (giữ nguyên dữ liệu, tự sao lưu bản cũ) |
| Sao lưu dữ liệu | `sudo tar czf glh-data-$(date +%F).tgz /var/lib/guom-lac-hong` |

## Cách khác: Docker
```bash
cd glh/deploy && ADMIN_KEY=ma-cua-ban docker compose up -d   # game ở cổng 8080, dữ liệu trong volume glh-data
```
Vẫn nên đặt nginx + https phía trước (dùng `nginx-guom-lac-hong.conf`).

## Bảo vệ đã có trong bản beta
- Chỉ phục vụ file trong `client/` và `shared/` (chặn `../` đọc mã máy chủ); dữ liệu & Mã Admin không bao giờ ra ngoài.
- Mỗi IP tối đa 20 kết nối (chơi chung một mạng vẫn đủ), toàn máy 300 (`MAX_PER_IP`, `MAX_CONN`); tin nhắn ≤ 16 KB, ≤ ~120 tin/giây/người.
- Server quyết định mọi thứ (vị trí, sát thương, ẩn nấp) — client không gian lận được.
- Lỗi bất ngờ chỉ ghi nhật ký, máy chủ không sập; trận lỗi liên tục thì tự kết thúc trận đó.
- Nén gzip + bộ nhớ đệm trình duyệt 1 ngày cho model/âm thanh (lần đầu tải ~38 MB, lần sau nhanh).
- Có thể khóa Bảng Admin theo IP (bỏ dấu # trong file nginx).

## Chưa có (để bản chính thức)
Tài khoản thật / đăng nhập vieesport · nhiều máy chủ · chống DDoS lớn (dùng Cloudflare phía trước nếu cần) · nén model mạnh hơn (BUG-0012).
