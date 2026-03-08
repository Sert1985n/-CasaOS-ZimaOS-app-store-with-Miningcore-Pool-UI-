#!/bin/bash
# Один скрипт — все шаги подряд
# Запуск: bash install-all.sh   или  curl -sL URL/install-all.sh | bash

echo "=== 1. PostgreSQL ==="
docker start postgresql 2>/dev/null || true
sleep 2

echo ""
echo "=== 2. Поиск папок Web UI ==="
FOUND=""
# Если запущено из корня репозитория
[ -d "Apps/Web-UI-Molepool" ] && FOUND="Apps/Web-UI-Molepool Apps/Web-UI-SoloPool-Dashboard Apps/Web-UI-SoloPool-Org"
# Иначе — типичные пути CasaOS
if [ -z "$FOUND" ]; then
  for base in /var/lib/casaos/services /var/lib/casaos/apps /opt/casaos /data/AppData; do
    [ -d "$base" ] || continue
    for name in Web-UI-Molepool Web-UI-SoloPool-Dashboard Web-UI-SoloPool-Org; do
      [ -f "$base/$name/docker-compose.yml" ] && FOUND="$FOUND $base/$name"
    done
    [ -n "$FOUND" ] && break
  done
fi
# Fallback — из меток контейнеров
if [ -z "$FOUND" ]; then
  for c in Molepool-Web-UI Solo-Pool-Dashboard-UI SoloPool-Web-UI; do
    p=$(docker inspect "$c" 2>/dev/null | grep -o '"WorkingDir":"[^"]*"' | cut -d'"' -f4)
    [ -n "$p" ] && [ -f "$p/docker-compose.yml" ] && FOUND="$FOUND $p"
  done
fi

echo ""
echo "=== 3. Сборка и запуск ==="
for dir in $FOUND; do
  [ -z "$dir" ] || [ ! -f "$dir/docker-compose.yml" ] && continue
  echo "→ $dir"
  (cd "$dir" && docker compose build -q && docker compose up -d) || true
done

echo ""
echo "=== 4. Контейнеры ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -35
echo ""
echo "Готово."
