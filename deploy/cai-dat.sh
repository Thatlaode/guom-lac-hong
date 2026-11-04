#!/usr/bin/env bash
# =====================================================================
#  CÀI GƯƠM LẠC HỒNG (BETA) LÊN VPS UBUNTU 22.04 / 24.04 — một lệnh
#  Cách dùng (trong thư mục đã giải nén bản beta):
#     sudo bash deploy/cai-dat.sh game.vieesport.vn ban@email.com
#  Không có tên miền:  sudo bash deploy/cai-dat.sh
#     → chơi qua http://IP_VPS (Gyro điện thoại sẽ không chạy vì thiếu https)
# =====================================================================
set -euo pipefail
DOMAIN="${1:-}"; EMAIL="${2:-}"
APP=/opt/guom-lac-hong; DATA=/var/lib/guom-lac-hong; SRC="$(cd "$(dirname "$0")/.." && pwd)"
[ "$(id -u)" = 0 ] || { echo "Cần chạy bằng sudo"; exit 1; }
echo "== 1/6 Cài Node.js 20, nginx"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 18 ]; then curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; apt-get install -y nodejs; fi
apt-get update -y && apt-get install -y nginx rsync curl
echo "== 2/6 Tài khoản chạy game + thư mục"
id glh >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin glh
mkdir -p "$APP" "$DATA"
rsync -a --delete --exclude server/data --exclude node_modules --exclude tests/anh "$SRC"/ "$APP"/
cd "$APP" && npm ci --omit=dev --no-audit --no-fund
chown -R glh:glh "$APP" "$DATA"
echo "== 3/6 Cấu hình"
if [ ! -f /etc/guom-lac-hong.env ]; then cp deploy/.env.example /etc/guom-lac-hong.env; sed -i "s/^ADMIN_KEY=.*/ADMIN_KEY=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)/" /etc/guom-lac-hong.env; fi
chmod 600 /etc/guom-lac-hong.env
echo "== 4/6 Dịch vụ systemd"
cp deploy/guom-lac-hong.service /etc/systemd/system/; systemctl daemon-reload; systemctl enable --now guom-lac-hong; sleep 2; systemctl --no-pager status guom-lac-hong | head -5
echo "== 5/6 nginx"
NAME="${DOMAIN:-_}"; sed "s/TEN_MIEN/$NAME/" deploy/nginx-guom-lac-hong.conf > /etc/nginx/sites-available/guom-lac-hong
ln -sf /etc/nginx/sites-available/guom-lac-hong /etc/nginx/sites-enabled/guom-lac-hong; [ -z "$DOMAIN" ] && rm -f /etc/nginx/sites-enabled/default || true
nginx -t && systemctl reload nginx
if command -v ufw >/dev/null; then ufw allow 'Nginx Full' || true; ufw allow OpenSSH || true; fi
echo "== 6/6 HTTPS"
if [ -n "$DOMAIN" ]; then apt-get install -y certbot python3-certbot-nginx; if [ -n "$EMAIL" ]; then EM=(-m "$EMAIL"); else EM=(--register-unsafely-without-email); fi; certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos "${EM[@]}" --redirect || echo "⚠ Chưa lấy được chứng chỉ — kiểm tra tên miền đã trỏ về IP VPS chưa, rồi chạy lại: certbot --nginx -d $DOMAIN"; fi
KEY=$(grep ^ADMIN_KEY= /etc/guom-lac-hong.env | cut -d= -f2)
echo; echo "=============================================="
echo " XONG! Gươm Lạc Hồng BETA đang chạy."
if [ -n "$DOMAIN" ]; then echo "  Chơi:  https://$DOMAIN"; echo "  Admin: https://$DOMAIN/admin.html"; else echo "  Chơi:  http://$(curl -s ifconfig.me || hostname -I | cut -d' ' -f1)"; fi
echo "  Mã Admin: $KEY   (lưu ở /etc/guom-lac-hong.env — không chia sẻ)"
echo "  Xem nhật ký:  journalctl -u guom-lac-hong -f"
echo "  Kiểm tra:     curl -s localhost:8080/api/health"
echo "=============================================="
