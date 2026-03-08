#!/usr/bin/env bash
# Деплой Pool UI на Linux-сервер. Запуск: sudo bash deploy.sh
set -euo pipefail
SRC="${POOL_UI_IMG:-/media/ZimaOS-HD/pool-ui/img}"
ROOT="${POOLUI_ROOT:-/var/www/poolui}"
TS="$(date +%F_%H%M%S)"
BK="${ROOT}_bak_${TS}"
[ -d "$SRC" ] || { echo "ОШИБКА: нет папки $SRC"; exit 1; }
[ -f "$SRC/favicon.png" ] || { echo "ОШИБКА: нет $SRC/favicon.png"; exit 1; }
mkdir -p "$BK" && cp -a "$ROOT" "$BK" 2>/dev/null || true
mkdir -p "$ROOT/assets/brand" "$ROOT/assets/icons"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -f "$SRC/favicon.png" "$ROOT/favicon.png"
cp -f "$SRC/favicon.png" "$ROOT/assets/brand/favicon.png"
[ -f "$SRC/FB.png" ] && cp -f "$SRC/FB.png" "$ROOT/assets/brand/brand.png" || true
[ -f "$SRC/fb.png" ] && cp -f "$SRC/fb.png" "$ROOT/assets/brand/brand.png" || true
[ -f "$ROOT/assets/brand/brand.png" ] || cp -f "$ROOT/assets/brand/favicon.png" "$ROOT/assets/brand/brand.png"
for f in "$SRC"/*.png "$SRC"/*.PNG; do [ -e "$f" ] || continue; base="$(basename "$f")"; low="$(echo "$base" | tr 'A-Z' 'a-z')"; cp -f "$f" "$ROOT/assets/icons/$low"; done
for name in index.html site.css dashboard.css app.js; do [ -f "$SCRIPT_DIR/$name" ] && cp -f "$SCRIPT_DIR/$name" "$ROOT/$name"; done
chown -R www-data:www-data "$ROOT" 2>/dev/null || true
nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true
echo "DONE. Backup: $BK"
