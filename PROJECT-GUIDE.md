# Полное руководство по проекту — всё, что реализовано, настройка нод и установка без перезагрузки

Документ описывает **все функции**, реализованные в проекте, порядок установки, настройку нод и запуск **без перезагрузки сервера**.

---

## 1. Что реализовано в проекте (по вашим запросам)

### 1.1. Config, coins и coins-map

| Компонент | Описание |
|-----------|----------|
| **config.json** | Полный конфиг Miningcore: все 28 монет, порты stratum, daemons (ноды), difficulty/varDiff по алгоритмам, persistence.postgres. При первом запуске PostgreSQL копируется из `Apps/postgres/templates/config.json` в `/media/ZimaOS-HD/miningcore/`. |
| **coins.json** | Полный список монет (метаданные из Miningcore/coins). Копируется из `Apps/postgres/templates/coins.json`. |
| **coins-map.json** | Маппинг монет: id, coin, stratum, rpcPort, zmqPort, addressType. 28 монет. Копируется из `Apps/postgres/templates/coins-map.json` (источник — `Downloads/загрузки/`). |

### 1.2. Основная Web UI (порт 81)

- **Боковая панель:** Mining Pools, Referral Links, Support Me, Pool Configuration (ссылка на порт 4050)
- **Таблица пулов:** Coin Name, Algorithm, Miner Count, Pool Hashrate, Blocks, Total Paid, Pool Fee, Min Payout, Network Hashrate, Network Difficulty
- **Pool Fee 1.5%** по умолчанию
- **Pool-Monero-XMR в общей панели:** пулы из основного miningcore (4000) и вторичного (4001) объединены в одной таблице

### 1.3. Дополнительные Web UI панели

| Панель | Порт | Стиль |
|--------|------|-------|
| **Web-UI-Molepool** | 82 | molepool.com |
| **Web-UI-SoloPool-Dashboard** | 83 | bch.solo-pool.org |
| **Web-UI-SoloPool-Org** | 84 | solopool.org |
| **Web-UI-Pool-Secondary** | 85 | Панель для Pool-Monero-XMR (переименовано, не «только XMR») |

### 1.4. Pool-Monero-XMR и Web-UI-Pool-Secondary

- **Pool-Monero-XMR** — отдельный пул Miningcore на порту 4001 (вторичный инстанс)
- **Web-UI-Pool-Secondary** — панель для этого пула (порт 85). Универсальная, не только для XMR
- Оба подключены к `pool_network` для связи с основной панелью

### 1.5. Mining Pool Configuration (порт 4050)

Панель управления пулами:

- **ВКЛ / ВЫКЛ** — включить или выключить монету
- **Создать** — автоматическое создание адреса кошелька (`getnewaddress`) для: BTC, BCH, BSV, BC2, XEC, DGB, LTC, DOGE, RVN, VTC, PPC, XNA, GRS
- **Сохранить** — сохранить адрес кошелька в config.json
- **Удалить** — удалить пул из config
- **Порт Stratum** — указать/изменить stratum-порт для каждой монеты
- **Wallet** — поле для адреса кошелька по каждой монете
- **Монеты из coins-map.json** — полный список 28 монет
- Кошелёк комиссии пула 1.5%, мин. выплата по монетам

### 1.6. Difficulty / varDiff по алгоритмам

| Алгоритм | Монеты | Difficulty | minDiff | maxDiff |
|----------|--------|------------|---------|---------|
| SHA256d, Scrypt (ASIC) | BTC, BCH, LTC, DOGE, DGB, PPC, VTC, GRS, FB, BSV, BC2, XEC | 1024 | 1 | 1048576 |
| RandomX (CPU) | XMR, ZEPH | 7500 | 1000 | 50000 |
| GPU (KawPow, Etchash, Autolykos) | RVN, ETC, ETHW, ERG, XNA | 1 | 0.001 | 4096 |

### 1.7. Сеть pool_network

Все контейнеры пула, нод и панелей используют общую сеть `pool_network`, чтобы miningcore общался с нодами по hostname (Node-BTC, Node-XMR и т.д.).

---

## 2. Установка без перезагрузки

Установка целиком через CasaOS/ZimaOS **не требует перезагрузки** сервера. Все изменения применяются после установки контейнеров.

### 2.1. Шаг 0: Создать сеть pool_network

Перед установкой приложений создайте сеть (один раз):

```bash
docker network create pool_network 2>/dev/null || true
```

Если первый контейнер с `pool_network: external: true` стартует, CasaOS/Docker создаст сеть при необходимости. Но при установке по docker compose вручную — выполните команду выше.

### 2.2. Порядок установки (критично)

Устанавливайте **строго в таком порядке**:

| № | Приложение | Зачем |
|---|------------|-------|
| 1 | **PostgreSQL** | Создаёт БД miningcore, папку `/media/ZimaOS-HD/miningcore/`, config.json, coins.json, coins-map.json (через init-miningcore-dir) |
| 2 | **Mining Pool Configuration** (4050) | Настройка монет, кошельков, портов. Рекомендуется перед первым запуском Miningcore |
| 3 | **Miningcore + Pool UI** (81) | Основной пул и встроенная панель |
| 4 | **Node-XXX** (по одной на монету) | Ноды монет — ставить **до** включения монеты в панели 4050 |
| 5 | Web-UI-Molepool, Web-UI-SoloPool-*, Pool-Monero-XMR, Web-UI-Pool-Secondary | По желанию |

### 2.3. Без перезагрузки

- CasaOS устанавливает контейнеры через `docker compose up` — перезагрузка не требуется
- После установки PostgreSQL дождитесь завершения `init-miningcore-dir` (логи контейнера)
- После установки нод дождитесь синхронизации блокчейна (для первых запусков)
- Miningcore подхватывает изменения config.json после `docker restart miningcore` (через панель 4050 или вручную)

---

## 3. Настройка нод для работы пула

### 3.1. Какие ноды для каких монет

Каждая монета из `coins-map.json` требует соответствующую ноду. Hostname ноды в config — `Node-<SYMBOL>` (например `Node-BTC`).

| Монета | Приложение Node | Hostname | RPC порт | ZMQ порт | Папка данных |
|--------|-----------------|----------|----------|----------|--------------|
| BTC | BTC-Node | Node-BTC | 9004 | 7004 | /media/ZimaOS-HD/nodes/btc |
| BCH | BCH-Node | Node-BCH | 9002 | 7002 | /media/ZimaOS-HD/nodes/bch |
| BSV | BSV-Node | Node-BSV | 9005 | 7005 | /media/ZimaOS-HD/nodes/bsv |
| BC2 | BC2-Node | Node-BC2 | 9006 | 7006 | /media/ZimaOS-HD/nodes/bc2 |
| XEC | XEC-Node | Node-XEC | 9007 | 7007 | /media/ZimaOS-HD/nodes/xec |
| DGB | DGB-Node | Node-DGB | 9001 | 7001 | /media/ZimaOS-HD/nodes/dgb |
| DOGE | DOGE-Node | Node-DOGE | 9003 | 7003 | /media/ZimaOS-HD/nodes/doge |
| LTC | LTC-Node | Node-LTC | 9020 | 7020 | /media/ZimaOS-HD/nodes/ltc |
| PPC | PPC-Node | Node-PPC | 9012 | 7012 | /media/ZimaOS-HD/nodes/ppc |
| VTC | VTC-Node | Node-VTC | 9008 | 7008 | /media/ZimaOS-HD/nodes/vtc |
| RVN | RVN-Node | Node-RVN | 9010 | 7010 | /media/ZimaOS-HD/nodes/rvn |
| XNA | XNA-Node | Node-XNA | 9011 | 7011 | /media/ZimaOS-HD/nodes/xna |
| GRS | groestlcoin | Node-GRS | 9013 | 7013 | /media/ZimaOS-HD/nodes/grs |
| FB | FB-Node | Node-FB | 9021 | 7013 | /media/ZimaOS-HD/nodes/fb |
| XMR | XMR-Node | Node-XMR | 18081 | — | /media/ZimaOS-HD/nodes/xmr |
| ERG | ERG-Node | Node-ERG | 9050 | — | /media/ZimaOS-HD/nodes/erg |
| ETC | ETC-Node | Node-ETC | 8545 | — | etclabscore/core-geth |
| ETHW | ETHW-Node | Node-ETHW | 8546 | — | skeleton |
| ZEPH | ZEPH-Node | Node-ZEPH | 17767 | — | supertypo/zephyrd |
| SPACE | SPACE-Node | Node-SPACE | 9133 | — | spaceworksco/spacecoin |
| XEL | XEL-Node | Node-XEL | 8080 | — | xelis/daemon |
| OCTA | OCTA-Node | Node-OCTA | 8547 | — | skeleton |
| ZEC | ZEC-Node | Node-ZEC | 8232 | — | electriccoinco/zcashd |
| ZEN | ZEN-Node | Node-ZEN | 8231 | — | /media/ZimaOS-HD/nodes/zen |
| FLUX | FLUX-Node | Node-FLUX | 16124 | — | skeleton |
| FIRO | FIRO-Node | Node-FIRO | 8888 | — | /media/ZimaOS-HD/nodes/firo |
| KAS | KAS-Node | Node-KAS | 16110 | — | /media/ZimaOS-HD/nodes/kaspa |
| NEXA | NEXA-Node | Node-NEXA | 7227 | — | /media/ZimaOS-HD/nodes/nexa |

**Примечание:** Реальные образы: ZEPH (supertypo/zephyrd), ZEC (electriccoinco/zcashd), ETC (etclabscore/core-geth), XEL (xelis/daemon), SPACE (spaceworksco/spacecoin). Skeleton остаются: ETHW, OCTA, FLUX — нет готовых Docker-образов.

### 3.2. Обязательно: pool_network

Все ноды должны быть в сети **pool_network**. В docker-compose нод должно быть:

```yaml
networks:
  - pool_network
  - default
networks:
  pool_network:
    external: true
```

Тогда Miningcore (тоже в pool_network) сможет обращаться к нодам по hostname: `Node-BTC`, `Node-XMR` и т.д.

### 3.3. RPC-учётные данные

В config.json пула для нод UTXO (Bitcoin-подобные) используются:
- `rpcuser`: pooluser
- `rpcpassword`: poolpassword

Ноды из theretromike/nodes уже настроены так. Для Monero в daemon:
- `--rpc-login=pooluser:poolpassword`

### 3.4. Monero: wallet RPC (опционально)

Для выплат XMR может понадобиться monero-wallet-rpc. Приложение **XMR-wallet** (monero-wallet-rpc) монтирует `/media/ZimaOS-HD/nodes/xmr-wallet`. В config пула XMR при необходимости добавляется блок `wallet` с host/port wallet RPC.

### 3.5. VTC: verthash.dat

Miningcore монтирует `/.vertcoin` из `/media/ZimaOS-HD/nodes/vtc` (или отдельной папки с verthash.dat) для Vertcoin.

---

## 4. Быстрый чеклист «всё работает»

1. **PostgreSQL** запущен, есть `/media/ZimaOS-HD/miningcore/config.json`, `coins.json`, `coins-map.json`
2. **pool_network** создана: `docker network ls | grep pool_network`
3. **Ноды** нужных монет установлены, в pool_network, контейнеры запущены
4. **Miningcore** в pool_network, подключается к PostgreSQL по hostname `postgresql`
5. **Mining Pool Configuration** (4050): указаны кошельки, включены нужные монеты, порты stratum заданы
6. **Файрвол**: открыты порты 81, 4050, 4000, stratum-порты монет (6001–6028)

---

## 5. Порты (сводная таблица)

### Панели и API

| Порт | Служба |
|------|--------|
| 81 | Miningcore + Pool UI (основная) |
| 82 | Web-UI-Molepool |
| 83 | Web-UI-SoloPool-Dashboard |
| 84 | Web-UI-SoloPool-Org |
| 85 | Web-UI-Pool-Secondary |
| 4000 | API Miningcore (основной) |
| 4001 | API Pool-Monero-XMR (вторичный) |
| 4050 | Mining Pool Configuration |
| 5432 | PostgreSQL |

### Stratum (подключение майнеров)

| Монета | Stratum порт | Монета | Stratum порт |
|--------|--------------|--------|--------------|
| DGB | 6001 | XMR | 6009 |
| BCH | 6002 | RVN | 6010 |
| DOGE | 6003 | XNA | 6011 |
| BTC | 6004 | PPC | 6012 |
| BSV | 6005 | GRS | 6013 |
| BC2 | 6006 | FB | 6014 |
| XEC | 6007 | ERG | 6015 |
| VTC | 6008 | ETC | 6016 |
| — | — | ETHW | 6017 |
| — | — | ZEPH | 6018 |
| — | — | SPACE | 6019 |
| — | — | LTC | 6020 |
| — | — | XEL | 6021 |
| — | — | OCTA | 6022 |
| — | — | ZEC | 6023 |
| — | — | ZEN | 6024 |
| — | — | FLUX | 6025 |
| — | — | FIRO | 6026 |
| — | — | KAS | 6027 |
| — | — | NEXA | 6028 |

---

## 6. Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| SERVER_IP | host.docker.internal | IP сервера для API, PostgreSQL |
| POOL_NAME | public-pool-btc.ru | Название пула |
| STRATUM_HOST | public-pool-btc.ru | Хост для stratum |
| POOL_FEE_PERCENT | 1.5 | Комиссия пула % |

---

## 7. Частые проблемы

- **Miningcore не стартует:** проверьте PostgreSQL, config.json, coins.json. В persistence.postgres host должен быть `postgresql`.
- **Пул не видит ноду:** нода и miningcore должны быть в `pool_network`, hostname ноды — `Node-<SYMBOL>`.
- **Config пуст после установки PostgreSQL:** дождитесь `init-miningcore-dir`, проверьте `/media/ZimaOS-HD/miningcore/`.
- **Другой диск:** замените `/media/ZimaOS-HD/` на свой путь в volumes docker-compose.

---

## 8. Дополнительная документация

- **INSTALL.md** — установка из CasaOS App Store
- **INSTALL_SERVER.md** — добавление магазина по URL / SSH / docker compose
- **Apps/WEB-UI-GUIDE.md** — описание всех Web UI панелей
