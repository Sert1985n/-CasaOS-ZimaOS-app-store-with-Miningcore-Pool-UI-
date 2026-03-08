# Запуск на сервере (ZimaOS / CasaOS / Linux)

## Вариант 1: Установка с GitHub

После `git push` в репозиторий:

```bash
curl -sL https://raw.githubusercontent.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/main/install-server.sh | sudo bash
```

(Замените `Sert1985n` и имя репо на свои, если используете свой GitHub.)

## Вариант 2: Локальная папка на сервере

1. Скопируйте папку `-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main` на сервер (scp, rsync, WinSCP и т.п.):

   ```bash
   # С Windows (PowerShell):
   scp -r "C:\Users\WIN-10\Downloads\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main" user@SERVER_IP:/tmp/pool-apps/
   ```

   Или через WinSCP / FileZilla — загрузите папку `-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main` в `/tmp/pool-apps/` на сервере.

2. На сервере выполните:

   ```bash
   cd /tmp/pool-apps/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main
   sudo bash install-server.sh
   ```

   Скрипт обнаружит локальную папку `Apps` и использует её вместо клонирования.

## Что делает скрипт

- Создаёт сеть `pool_network`
- Копирует Miningcore + Pool UI в `/var/lib/casaos/apps/public-pool-miningcore/`
- Копирует Web UI (Molepool, Solo-Pool-Dashboard, SoloPool) в отдельные приложения
- Копирует ноды ZEPH, ZEC, ETC, XEL, SPACE
- Создаёт каталоги `/media/ZimaOS-HD/miningcore/` и `/media/ZimaOS-HD/nodes/`
- Запускает контейнеры через `docker compose up -d`

## Порты

| Сервис              | Порт | URL                     |
|---------------------|------|-------------------------|
| **Pool UI (основная)** | 81   | http://SERVER_IP:81     |
| Miningcore API      | 4000 | (внутренний)            |
| Molepool Web UI     | 82   | http://SERVER_IP:82     |
| Solo-Pool-Dashboard | 83   | http://SERVER_IP:83     |
| SoloPool Web UI     | 84   | http://SERVER_IP:84     |

## После установки

1. **Pool UI** — открыть `http://IP_СЕРВЕРА:81`
   - Если 404/пусто — проверьте: `docker ps | grep miningcore-webui`
   - Перезапуск UI: `cd /var/lib/casaos/apps/public-pool-miningcore && docker compose restart webui`

2. **Miningcore** — нужны `config.json` и `coins.json` в `/media/ZimaOS-HD/miningcore/`
   - После установки PostgreSQL они создаются автоматически
   - Логи: `docker logs miningcore -f --tail 50`

3. **Проверка контейнеров:**

   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "miningcore|Molepool|SoloPool"
   ```

## Обновление только Pool UI (без полной переустановки)

Если обновили `Apps/miningcore/poolui/` локально:

```bash
# Скопировать poolui на сервер в /var/lib/casaos/apps/public-pool-miningcore/poolui/
# затем:
cd /var/lib/casaos/apps/public-pool-miningcore
docker compose restart webui
```

Или заменить файлы вручную и перезапустить `miningcore-webui`.
