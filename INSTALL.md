# Полная инструкция по установке (CasaOS / ZimaOS)

Магазин приложений с Miningcore Pool, Web UI и нодами монет. Чтобы всё заработало, приложения нужно ставить **в определённом порядке**.

**Полное руководство:** см. **PROJECT-GUIDE.md** — всё, что реализовано в проекте, настройка нод и установка **без перезагрузки**.

**Панели Web UI:** **Apps/WEB-UI-GUIDE.md** — список всех панелей (Molepool, Solo-Pool, SoloPool.org, Pool Configuration) с портами.

---

## 1. Подключение магазина к CasaOS / ZimaOS

### Вариант A: по URL (рекомендуется)

1. Откройте **App Store** в веб-интерфейсе CasaOS/ZimaOS.
2. Нажмите **Add a Repository** (Добавить репозиторий).
3. Вставьте URL магазина. Например, для установки из GitHub:
   - Соберите ZIP с папками `Apps`, файлами `category-list.json`, `recommend-list.json` и выложите на хостинг, затем вставьте **прямую ссылку на ZIP**.
   - Либо используйте URL вашего зеркала/релиза с готовым ZIP.
4. Подтвердите добавление. В списке появится новый магазин — выберите его.

### Вариант B: копирование по SSH

1. Подключитесь к серверу по SSH.
2. Узнайте путь к магазину (часто `/var/lib/casaos/appstore/default/`).
3. Скопируйте на сервер папку `Apps` и файлы `category-list.json`, `recommend-list.json` из этого репозитория в каталог магазина.
4. Обновите страницу App Store в браузере.

---

## 2. Порядок установки приложений

Установите приложения **строго в таком порядке**.

### Шаг 1. PostgreSQL

**Установите первым.**

- Создаётся база данных `miningcore` и пользователь для пула (скрипт `init-miningcore.sh`).
- При первом запуске создаётся папка `/media/ZimaOS-HD/miningcore/` и в ней:
  - **config.json** — конфиг с `clusterName: public-pool-btc.ru`, блоком **persistence.postgres** (хост postgresql, БД miningcore) и пустым списком пулов. При первом старте Miningcore сам выполнит **Setup Database Schema** (создание таблиц в БД).
  - **coins.json** — пустой массив (список монет Miningcore подтянет при необходимости).
- Без PostgreSQL и этих файлов Miningcore не запустится.

**Параметры по умолчанию:** пользователь `admin`, пароль `P@ssw0rd`, БД `zimaos`. Для Miningcore: пользователь `miningcore`, пароль `miningcore`, БД `miningcore`.

---

### Шаг 2. Miningcore Config (Mining Pool Configuration), порт 4050

**Рекомендуется вторым.** Откройте **http://IP_СЕРВЕРА:4050**.

- Если папки `/media/ZimaOS-HD/miningcore/` или файлов ещё нет — приложение при старте создаст их (в т.ч. config с **persistence.postgres** для Miningcore).
- **Все монеты** — список монет (BTC, LTC, XMR, RVN и др.): для каждой можно нажать **ВКЛ** и задать кошелёк.
- **Включить / выключить монеты** — кнопка ВКЛ добавляет пул в config.json и при необходимости перезапускает Miningcore; отключение — через API disable или правку config.
- **Кошельки:** укажите **кошелёк майнера** (куда платить) и **кошелёк комиссии пула** (1.5%). В config.json адреса **"xxx"** заменяются на введённые вами адреса при включении монеты.
- **Комиссия пула (pool %)** — по умолчанию **1.5%** (переменная `POOL_FEE_PERCENT`); записывается в `rewardRecipients` в config.
- **Минимальная выплата** — для каждой монеты можно задать минимальную сумму выплаты (сколько нужно накопить, чтобы нода могла выплатить за блок/транзакцию). Поле «Мин. выплата» в интерфейсе (по умолчанию 0.001).
- После изменений при необходимости делается **docker restart miningcore** (опция в интерфейсе).

**Panel пулов :85** — приложение на порту 85 для **просмотра** пулов и статистики в реальном времени (без редактирования config).

---

### Шаг 3. Miningcore + Pool UI (основной пул)

**Устанавливайте после PostgreSQL и (желательно) после настройки конфига в Miningcore Config (4050).**

- Требуется: запущенный **PostgreSQL**, файлы `config.json` и `coins.json` в `/media/ZimaOS-HD/miningcore/`.
- При **первом запуске** Miningcore по config с **persistence.postgres** сам выполнит **Setup Database Schema** (создаст таблицы в БД `miningcore`). Дополнительные шаги «Refresh Master Coin List» / «Generate Pool Config File» при необходимости делаются через панель или уже учтены в config/coins.
- В `config.json` в блоке `persistence.postgres` хост БД: `postgresql` (если контейнер в одной сети с Postgres) или IP сервера / `host.docker.internal`.
- Приложение включает встроенную веб-панель (порт **81**).

После установки откройте приложение — откроется Web UI пула.

---

### Шаг 4. Остальные приложения (по желанию)

| Приложение | Назначение |
|------------|------------|
| **Web-UI-Molepool** | Панель molepool.com, порт 82. Diff, Price, Block Reward, Min Payout, Pool Fee 1.5%. Требует `docker compose build`. |
| **Web-UI-SoloPool-Dashboard** | Панель Solo-Pool, порт 83. Network Info, Block Info, Pool Info, Effort. Требует `docker compose build`. |
| **Web-UI-SoloPool-Org** | Панель solopool.org, порт 84. Таблица пулов. Требует `docker compose build`. |
| **Pool-Monero-XMR** | Вторичный пул (Monero и др.), порт 4001. |
| **Web-UI-Pool-Secondary** | Панель для вторичного пула, порт 85. |

---

## 3. Переменные окружения (для продвинутых)

При установке из магазина CasaOS может позволить задать переменные. Основные:

| Переменная | Значение по умолчанию | Описание |
|------------|------------------------|----------|
| **POOL_NAME** | `public-pool-btc.ru` | Название пула. |
| **STRATUM_HOST** | `public-pool-btc.ru` | Хост для stratum (подключайтесь к пулу по этому имени/IP). |
| **SERVER_IP** | `host.docker.internal` | IP сервера для доступа к Miningcore API, PostgreSQL и т.п. Задайте IP вашего сервера, если контейнеры должны ходить на хост по IP. |
| **MININGCORE_HOST** | из `SERVER_IP` | Хост, где слушает Miningcore (для API и проб). |
| **POSTGRES_HOST** | из `SERVER_IP` | Хост PostgreSQL. |
| **API_BASE_URL** | `http://<SERVER_IP>:4000/api` | URL API Miningcore для Web UI. |

Для приложений **Miningcore Web UI**, **Web-UI-Pool-Secondary** при необходимости укажите **SERVER_IP** (IP сервера). Панели **Web-UI-Molepool**, **Web-UI-SoloPool-Dashboard**, **Web-UI-SoloPool-Org** используют **pool_network** и подключаются к miningcore автоматически.

---

## 4. Порты (полная таблица)

Откройте в файрволе порты, которые нужны для доступа снаружи (майнеры, браузер).

### Пул и панели

| Порт | Служба |
|------|--------|
| **81** | Miningcore + Pool UI (основная панель) |
| **82** | Web-UI-Molepool |
| **83** | Web-UI-SoloPool-Dashboard |
| **84** | Web-UI-SoloPool-Org |
| **85** | Web-UI-Pool-Secondary (панель вторичного пула) |
| **4000** | API Miningcore |
| **4050** | Pool Configuration (wallet, монеты, config) |
| **5432** | PostgreSQL (только при доступе с другого хоста) |

### Ноды монет (RPC / ZMQ — для пула)

| Монета | RPC порт | ZMQ/доп. | Папка данных |
|--------|----------|----------|--------------|
| BTC | 9004 | 7004 | /media/ZimaOS-HD/nodes/btc |
| BCH | 9002 | 7002 | /media/ZimaOS-HD/nodes/bch |
| BSV | 9005 | 7005 | /media/ZimaOS-HD/nodes/bsv |
| BC2 | 9006 | 7006 | /media/ZimaOS-HD/nodes/bc2 |
| DOGE | 9003 | 7003 | /media/ZimaOS-HD/nodes/doge |
| LTC | 9020 | 7020 | /media/ZimaOS-HD/nodes/ltc |
| XMR | 18081 | P2P 18080 | /media/ZimaOS-HD/nodes/xmr |
| FB (Fractal Bitcoin) | 9021 | 7021 | /media/ZimaOS-HD/nodes/fb |
| XEC | 9007 | 7007 | /media/ZimaOS-HD/nodes/xec |
| RVN | 9010 | 7010 | /media/ZimaOS-HD/nodes/rvn |
| ZEC | 9032 | 7032 | /media/ZimaOS-HD/nodes/zec |
| ERG | 9050 | — | /media/ZimaOS-HD/nodes/erg |
| KAS | 9061 | — | /media/ZimaOS-HD/nodes/kaspa |
| NEXA | 9077 | — | /media/ZimaOS-HD/nodes/nexa |
| FIRO | 9044 | — | /media/ZimaOS-HD/nodes/firo |
| ZEN | 9033 | — | /media/ZimaOS-HD/nodes/zen |
| FLUX | 9033 | 7033 | (skeleton) |
| ETC | 9022 | 7022 | (skeleton) |
| ETHW | 9023 | 7023 | (skeleton) |
| OCTA | 9043 | 7043 | (skeleton) |
| SPACE | 9041 | 7041 | (skeleton) |
| XEL | 9042 | 7042 | (skeleton) |
| ZEPH | 9040 | 7040 | (skeleton) |
| PPC | 9012 | 7012 | /media/ZimaOS-HD/nodes/ppc |
| DGB | 9001 | 7001 | /media/ZimaOS-HD/nodes/dgb |
| VTC | 9008 | 7008 | /media/ZimaOS-HD/nodes/vtc |
| XNA | 9011 | 7011 | /media/ZimaOS-HD/nodes/xna |

**Важно:** в конфиге пула (Miningcore Config или config.json) укажите для каждой монеты хост ноды (`127.0.0.1` или IP контейнера) и соответствующий RPC-порт. Stratum-порты задаются в config.json пула (например 6004 для BTC, 6010 для RVN).

---

## 4.1. Ограничение памяти и доли ЦП

Чтобы сервер не зависал при работе нод и пула, у всех приложений заданы:

- **Ограничение памяти (memory limit):** у тяжёлых нод (BTC, BCH, DOGE, LTC, XMR, FB, XEC и т.п.) — 64 ГБ, у лёгких и skeleton — 512 МБ или 8 ГБ.
- **Доля ЦП (cpu_shares: 90):** контейнеры не занимают 100% CPU, ресурсы делятся между сервисами.

Менять лимиты можно в `docker-compose.yml` приложения (поля `deploy.resources.limits.memory` и `cpu_shares`).

---

## 4.2. Конфиги нод и папки данных

Для каждой монеты нода хранит данные в своей папке. Конфиги (если нужны) кладутся **в эту же папку** с правильными настройками RPC/ZMQ для пула.

| Что | Где |
|-----|-----|
| **Miningcore (пул)** | `/media/ZimaOS-HD/miningcore/config.json`, `coins.json` |
| **Ноды** | Данные и при необходимости конфиг — в `/media/ZimaOS-HD/nodes/<монета>/` (например `btc`, `doge`, `xmr`, `fb`). |

Пример для ноды с RPC: в папке ноды или в переменных образа должны быть заданы `rpcuser`, `rpcpassword`, `rpcallowip`, `rpcport`, `zmqpubhashblock` и т.п., как ожидает Miningcore для этой монеты. В приложениях из магазина эти настройки уже прописаны в `command`/образах; при замене образа на свой сохраните совместимость портов и имён параметров.

---

## 4.3. Сеть и API

Чтобы Web UI и панели корректно работали с Miningcore и БД:

1. **SERVER_IP** — при установке Web UI (Miningcore Web UI, Web UI — пул Monero) укажите IP сервера, на котором запущены Miningcore и PostgreSQL (или `host.docker.internal`, если контейнеры на том же хосте).
2. **API_BASE_URL** — должен указывать на `http://<SERVER_IP>:4000/api`. Обычно выставляется автоматически из `SERVER_IP`.
3. Контейнеры пула и нод должны иметь доступ к портам 4000 (API) и 5432 (PostgreSQL) на хосте или в сети, где запущен Miningcore.

---

## 5. Проверка после установки

1. **PostgreSQL** — контейнер `postgresql` запущен; после первого запуска есть каталог `/media/ZimaOS-HD/miningcore/` с `config.json` и `coins.json`.
2. **Miningcore Config** — открывается по `http://IP_СЕРВЕРА:4050`, видны настройки пулов.
3. **Miningcore + Pool UI** — открывается по `http://IP_СЕРВЕРА:81`, отображается панель пула.
4. **API** — `http://IP_СЕРВЕРА:4000/api` (например, для мониторинга).

---

## 6. Частые проблемы

- **При установке PostgreSQL не создались config.json и coins.json / папка miningcore**  
  Убедитесь, что контейнер **init-miningcore-dir** отработал (в логах должно быть сообщение о создании файлов). Если папка на хосте не создаётся, установите **Miningcore Config** (порт 4050) — при первом запуске он создаст `/media/ZimaOS-HD/miningcore/`, config.json с блоком persistence и coins.json.

- **Miningcore не стартует**  
  Проверьте: запущен ли PostgreSQL; есть ли файлы `/media/ZimaOS-HD/miningcore/config.json` и `coins.json`. В config должны быть реальные адреса кошельков (не "xxx") и при необходимости правильный хост в `persistence.postgres`.

- **Web UI не видит пул / нет данных**  
  Укажите при установке **SERVER_IP** (IP сервера) для приложения Web UI, либо убедитесь, что используется `host.docker.internal` и на хосте разрешён доступ к портам 4000 и 5432.

- **Нет ноды для монеты**  
  Для каждой монеты (BTC, RVN, DOGE и т.д.) при необходимости установите соответствующее приложение **Node** из этого же магазина и укажите в конфиге пула хост/порты ноды (или настройте через Miningcore Config, если поддерживается).

- **Другой диск/путь**  
  Если данные хранятся не на `/media/ZimaOS-HD/`, в `docker-compose.yml` соответствующих приложений замените путь на свой (например `/data/miningcore`).

- **Конфликт портов**  
  Не ставьте одновременно две ноды на один и тот же порт (например ZEN-Node и FLUX-Node оба используют 9033). При необходимости измените `published` в `docker-compose.yml` одной из нод.

- **Web UI (Molepool, Solo-Pool, SoloPool) в статусе "Created", не запускаются**  
  Эти приложения собирают образ через `build`. Если CasaOS не выполнил сборку, сделайте вручную по SSH: перейдите в папку приложения (например `Apps/Web-UI-SoloPool-Dashboard`) и выполните `docker compose build && docker compose up -d`.

---

## 7. Краткая схема

```
1. PostgreSQL          → БД miningcore + папка /media/ZimaOS-HD/miningcore/ + config.json (с persistence) + coins.json
2. Miningcore Config    → Настройка: все монеты, вкл/выкл, кошельки (замена "xxx"), комиссия 1.5%, мин. выплата по монетам
3. Miningcore + Pool UI → Первый запуск: Setup Database Schema; далее — пул и веб-панель (порт 81)
4. (по желанию) Panel :85 — просмотр пулов и статистики
```

Дополнительно: [INSTALL_SERVER.md](INSTALL_SERVER.md) — варианты добавления магазина (URL, SSH, только docker compose).
