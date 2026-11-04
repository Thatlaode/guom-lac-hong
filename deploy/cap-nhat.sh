#!/usr/bin/env bash
# Cập nhật bản mới, GIỮ NGUYÊN dữ liệu (bậc hạng, cấu hình Admin, bản cân bằng ở /var/lib/guom-lac-hong)
#   sudo bash deploy/cap-nhat.sh      (chạy trong thư mục bản mới đã giải nén)
set -euo pipefail
APP=/opt/guom-lac-hong; SRC="$(cd "$(dirname "$0")/.." && pwd)"
[ "$(id -u)" = 0 ] || { echo "Cần chạy bằng sudo"; exit 1; }
BK=/opt/guom-lac-hong-ban-cu-$(date +%Y%m%d-%H%M); cp -a "$APP" "$BK" && echo "Đã sao lưu bản cũ: $BK"
rsync -a --delete --exclude server/data --exclude node_modules "$SRC"/ "$APP"/
cd "$APP" && npm ci --omit=dev --no-audit --no-fund && chown -R glh:glh "$APP"
systemctl restart guom-lac-hong && sleep 2 && curl -s localhost:8080/api/health && echo && echo "Đã cập nhật. Quay lại bản cũ: sudo rsync -a --delete $BK/ $APP/ && sudo systemctl restart guom-lac-hong"
