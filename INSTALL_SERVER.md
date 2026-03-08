# Как запустить на сервере (ZimaOS / CasaOS)

Ниже три варианта: добавить этот магазин приложений на сервер, затем установить и запустить Miningcore + Web UI.

---

## Вариант 1: Добавить магазин по URL (если архив выложен в интернет)

1. **Соберите архив магазина** (на своём ПК или в CI):
   - Нужна папка с содержимым: `Apps`, `category-list.json`, `recommend-list.json`, `README.md`.
   - Упакуйте в ZIP, например:
     ```bash
     cd retro-mike-zima-app-store-main
     zip -r ../retro-mike-appstore.zip Apps category-list.json recommend-list.json README.md
     ```
   - Залейте `retro-mike-appstore.zip` на любой хостинг (GitHub Releases, свой сервер, облако), чтобы был **прямой URL** на файл.

2. **На сервере с CasaOS/ZimaOS:**
   - Зайдите в веб-интерфейс CasaOS.
   - Откройте **App Store** (магазин приложений).
   - Вверху справа нажмите на вкладку с числом приложений → **Add a Repository** (Добавить репозиторий).
   - Вставьте **URL вашего ZIP** (например `https://ваш-сайт.ru/retro-mike-appstore.zip`).
   - Нажмите **+** (добавить).

3. В списке магазинов появится новый. Выберите его и найдите приложение **Miningcore + Web UI** → **Install**.

---

## Вариант 2: Копирование файлов на сервер по SSH (без URL)

Подходит, если у вас уже есть доступ по SSH к серверу с CasaOS/ZimaOS.

1. **Подключитесь к серверу по SSH:**
   ```bash
   ssh user@IP_ВАШЕГО_СЕРВЕРА
   ```

2. **Узнайте путь к магазину по умолчанию** (часто так):
   ```bash
   ls /var/lib/casaos/appstore/
   ```
   Обычно используется `default` или имя вашего магазина.

3. **Скопируйте содержимое магазина на сервер.**

   **С вашего ПК (в PowerShell или CMD):**
   ```bash
   scp -r "retro-mike-zima-app-store-main\Apps" user@IP_СЕРВЕРА:/tmp/
   scp "retro-mike-zima-app-store-main\category-list.json" user@IP_СЕРВЕРА:/tmp/
   scp "retro-mike-zima-app-store-main\recommend-list.json" user@IP_СЕРВЕРА:/tmp/
   ```

   **На сервере (SSH):**
   ```bash
   sudo cp -r /tmp/Apps /var/lib/casaos/appstore/default/
   sudo cp /tmp/category-list.json /var/lib/casaos/appstore/default/
   sudo cp /tmp/recommend-list.json /var/lib/casaos/appstore/default/
   ```
   Либо скопируйте весь каталог `default` из репозитория поверх `default` (предварительно сделайте бэкап).

4. **Обновите список приложений:** в веб-интерфейсе CasaOS откройте App Store и обновите страницу (или перезайдите). Должно появиться приложение **Miningcore + Web UI**. Нажмите **Install**.

---

## Вариант 3: Только Miningcore без магазина (docker compose на сервере)

Если нужно запустить только Miningcore + Web UI без добавления всего магазина:

1. **На сервере** создайте каталог и скопируйте туда только `Apps/miningcore/docker-compose.yml` (из этого репозитория).

2. **Создайте каталоги и конфиги пула:**
   ```bash
   sudo mkdir -p /media/ZimaOS-HD/miningcore
   sudo mkdir -p /media/ZimaOS-HD/nodes/vtc
   ```
   Положите в `/media/ZimaOS-HD/miningcore/` файлы:
   - `config.json` — конфиг Miningcore (пулы, API, база и т.д.).
   - `coins.json` — описание монет (из репозитория Miningcore или из вашей сборки).

   Если у вас другой диск/путь (не ZimaOS-HD), в `docker-compose.yml` замените `/media/ZimaOS-HD` на ваш путь (например `/data`).

3. **Создайте сеть и запустите:**
   ```bash
   cd /path/to/folder/with/docker-compose.yml
   docker network create miningcore_default 2>/dev/null || true
   docker compose up -d
   ```

4. **Проверка:**
   - Web UI: **http://IP_СЕРВЕРА:81**
   - API: **http://IP_СЕРВЕРА:4000/api**

---

## После установки Miningcore (из магазина или docker compose)

1. **Первый запуск:** в CasaOS нажмите **Open** у приложения Miningcore — откроется панель на порту **81**.

2. **Если пул не стартует** — проверьте, что есть:
   - `/media/ZimaOS-HD/miningcore/config.json`
   - `/media/ZimaOS-HD/miningcore/coins.json`  
   Их можно сгенерировать приложением **Mining Pool Configuration** (если оно есть в магазине) или взять из репозитория Miningcore.

3. **Ноды монет:** для каждой монеты (BTC, RVN, DOGE и т.д.) нужно установить соответствующий Node из этого же магазина и при необходимости прописать в `config.json` хост/порты ноды.

4. **Порты в файрволе:** откройте на сервере порты **81** (Web UI), **4000** (API), а также stratum-порты нужных монет (например 6004 для BTC, 6010 для RVN и т.д.).

---

## Кратко

| Действие              | Где / как |
|-----------------------|-----------|
| Добавить магазин      | App Store → Add a Repository → URL на ZIP с Apps + category-list.json + recommend-list.json |
| Установить Miningcore | В этом магазине: Miningcore + Web UI → Install |
| Открыть панель        | Open в CasaOS или **http://IP:81** |
| Конфиг пула           | `/media/ZimaOS-HD/miningcore/config.json` и `coins.json` |

Если напишете, какой у вас сервер (ZimaOS, обычный Linux с CasaOS, только Docker), можно сузить шаги под ваш случай.
