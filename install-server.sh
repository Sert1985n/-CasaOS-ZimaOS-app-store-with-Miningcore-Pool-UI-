#!/bin/bash
# Полная установка на сервер — клонирование, копирование, запуск
# Запуск: curl -sL https://raw.githubusercontent.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/main/install-server.sh | sudo bash
# или: sudo bash install-server.sh  (из папки репо)

set -e
WORK="/tmp/pool-apps"
APPS="/var/lib/casaos/apps"

echo "=== 1. Сеть pool_network ==="
docker network create pool_network 2>/dev/null || true

echo "=== 2. Клонирование репозитория ==="
if [ -d "Apps" ]; then
  SRC="$PWD"
  echo "Используем локальную папку: $SRC"
else
  sudo rm -rf "$WORK"
  sudo git clone https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git "$WORK"
  SRC="$WORK"
  [ -d "$WORK/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/Apps" ] && SRC="$WORK/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-"
  [ -d "$WORK/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main/Apps" ] && SRC="$WORK/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main"
  [ ! -d "$SRC/Apps" ] && SRC="$WORK"
  echo "SRC=$SRC"
fi

echo "=== 3. Miningcore (пул + UI порт 81) ==="
sudo mkdir -p "$APPS/public-pool-miningcore"
sudo cp -r "$SRC/Apps/miningcore"/* "$APPS/public-pool-miningcore/"
sudo chown -R 1000:1000 "$APPS/public-pool-miningcore"

echo "=== 4. Web UI (82, 83, 84) ==="
for ui in Web-UI-Molepool:molepool-web-ui Web-UI-SoloPool-Dashboard:solo-pool-dashboard-ui Web-UI-SoloPool-Org:solopool-web-ui; do
  src_name="${ui%%:*}"
  app_name="${ui##*:}"
  sudo mkdir -p "$APPS/$app_name"
  sudo cp -r "$SRC/Apps/$src_name"/* "$APPS/$app_name/"
  sudo chown -R 1000:1000 "$APPS/$app_name"
done

echo "=== 5. Ноды ZEPH ZEC ETC XEL SPACE ==="
for node in ZEPH ZEC ETC XEL SPACE; do
  app="public-pool-node-$(echo $node | tr '[:upper:]' '[:lower:]')"
  sudo mkdir -p "$APPS/$app"
  sudo cp -r "$SRC/Apps/${node}-Node"/* "$APPS/$app/"
  sudo chown -R 1000:1000 "$APPS/$app"
done

echo "=== 6. Каталоги данных и права ==="
sudo mkdir -p /media/ZimaOS-HD/miningcore /media/ZimaOS-HD/nodes/{zeph,zec,etc,xel,space}
sudo chown -R 1000:1000 /media/ZimaOS-HD/nodes/
sudo chown -R 61444:61444 /media/ZimaOS-HD/nodes/zeph 2>/dev/null || sudo chown -R 1000:1000 /media/ZimaOS-HD/nodes/zeph

echo "=== 7. Пересоздание Web UI и нод (останавливаем старые) ==="
docker stop Molepool-Web-UI Solo-Pool-Dashboard-UI SoloPool-Web-UI 2>/dev/null || true
docker rm Molepool-Web-UI Solo-Pool-Dashboard-UI SoloPool-Web-UI 2>/dev/null || true
docker stop Node-ZEPH Node-ZEC Node-ETC Node-XEL Node-SPACE 2>/dev/null || true
docker rm Node-ZEPH Node-ZEC Node-ETC Node-XEL Node-SPACE 2>/dev/null || true

echo "=== 8. Запуск Miningcore ==="
(cd "$APPS/public-pool-miningcore" && docker compose up -d) || echo "Miningcore: проверьте config.json и coins.json в /media/ZimaOS-HD/miningcore/"
sleep 3

echo "=== 9. Запуск Web UI (82, 83, 84) ==="
for app in molepool-web-ui solo-pool-dashboard-ui solopool-web-ui; do
  [ -f "$APPS/$app/docker-compose.yml" ] && (cd "$APPS/$app" && docker compose up -d) || true
done

echo "=== 10. Запуск нод ==="
for app in public-pool-node-zeph public-pool-node-zec public-pool-node-etc public-pool-node-xel public-pool-node-space; do
  [ -f "$APPS/$app/docker-compose.yml" ] && (cd "$APPS/$app" && docker compose up -d) || true
done

echo ""
echo "=== Готово. Контейнеры: ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "miningcore|Molepool|SoloPool|Solo-Pool|Node-ZEPH|Node-ZEC|Node-ETC|Node-XEL|Node-SPACE" || docker ps -a --format "table {{.Names}}\t{{.Status}}" | head -25
