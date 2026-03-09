# Полная настройка Mining Pool — команды, порты, инструкция

**Путь к проекту:** `C:\Users\WIN-10\Downloads\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main`

**GitHub:** https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-

**ZIP для CasaOS App Store:** https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/archive/refs/heads/main.zip

---

## 1. Схема работы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         УСТАНОВКА НОДЫ                                   │
│  1. Установить ноду (BTC, BCH, LTC и т.д.) через CasaOS App Store       │
│  2. Запустить скрипт: ./scripts/setup-wallet-for-node.sh btc            │
│     → Создаёт wallet через RPC, wallet.dat в папке ноды                  │
│     → Обновляет config.json с реальным адресом                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ПАНЕЛЬ :4050 (Pool Configuration)                    │
│  • ВКЛ/ВЫКЛ — включить/выключить ноду в config.json (enabled: true/false)│
│  • Pool Wallet — адрес для выплат майнерам                               │
│  • Fee Wallet — адрес комиссии пула                                      │
│  • Fee % — процент комиссии (по умолчанию 1.5%)                          │
│  • Сохранить — запись в config.json                                      │
│  • Удалить — удалить пул из config.json                                  │
│  ⚠ Wallet создаётся ТОЛЬКО скриптом setup-wallet-for-node.sh             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Порты и сервисы

| Порт | Сервис | URL | Контейнер |
|------|--------|-----|-----------|
| **81** | Miningcore Pool UI (основная) | http://IP:81 | miningcore-webui |
| **82** | Molepool | http://IP:82 | Molepool-Web-UI |
| **83** | Solo-Pool Dashboard | http://IP:83 | Solo-Pool-Dashboard-UI |
| **84** | SoloPool.org | http://IP:84 | SoloPool-Web-UI |
| **85** | Pool Panel | http://IP:85 | pool-panel-85 |
| **4000** | Miningcore API | http://IP:4000/api | miningcore |
| **4050** | Pool Configuration (админка) | http://IP:4050 | Mining-Pool-Configuration |
| **5432** | PostgreSQL | (внутренний) | postgresql |

### Stratum порты (для майнеров)

| Монета | Порты (пример для BTC) |
|--------|------------------------|
| BTC | 6004, 6204, 6304, 6404 |
| BCH | 6002, 6202, 6302, 6402 |
| LTC | 6020, 6220, 6320, 6420 |
| и т.д. | см. config.json |

### RPC порты нод

| Монета | RPC | ZMQ | Контейнер |
|--------|-----|-----|-----------|
| BTC | 9004 | 7004 | Node-BTC |
| BCH | 9002 | 7002 | Node-BCH |
| LTC | 9020 | 7020 | Node-LTC |
| DOGE | 9003 | 7003 | Node-DOGE |
| DGB | 9001 | 7001 | Node-DGB |
| RVN | 9010 | 7010 | Node-RVN |
| XNA | 9011 | 7011 | Node-XNA |
| XEC | 9007 | 7007 | Node-XEC |
| BC2 | 9006 | 7006 | Node-BC2 |
| BSV | 9005 | 7005 | Node-BSV |
| VTC | 9008 | 7008 | Node-VTC |
| PPC | 9012 | 7012 | Node-PPC |
| GRS | 9013 | 7013 | Node-GRS |
| FB | 9021 | 7021 | Node-FB |

---

## 3. Полная установка на сервере (команды по порядку)

### Шаг 1. Сеть и директории

```bash
docker network create pool_network 2>/dev/null || true
sudo mkdir -p /media/ZimaOS-HD/miningcore /media/ZimaOS-HD/nodes/{btc,bch,bc2,bsv,dgb,doge,ltc,vtc,rvn,xna,space,xec,ppc,grs}
sudo chown -R $(id -u):$(id -g) /media/ZimaOS-HD/
```

### Шаг 2. Клонирование проекта

```bash
cd /tmp && sudo rm -rf pool-update
git clone https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git pool-update
```

### Шаг 3. PostgreSQL

```bash
cd /tmp/pool-update/Apps/postgres
docker compose down 2>/dev/null
docker compose up -d
sleep 15
```

### Шаг 4. Создание БД и роли (если первый раз)

```bash
docker exec -i postgresql psql -U admin -d zimaos << 'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'miningcore') THEN
    CREATE ROLE miningcore WITH LOGIN PASSWORD 'miningcore';
  END IF;
END $$;
SQL

docker exec -i postgresql psql -U admin -d zimaos -c "CREATE DATABASE miningcore OWNER miningcore;" 2>/dev/null || true
docker exec -i postgresql psql -U admin -d miningcore -c "GRANT ALL ON SCHEMA public TO miningcore;" 2>/dev/null || true

docker exec -i postgresql psql -U miningcore -d miningcore << 'SQL'
CREATE TABLE IF NOT EXISTS poolstats (id BIGSERIAL PRIMARY KEY, poolid TEXT NOT NULL, connectedminers INT DEFAULT 0, poolhashrate DOUBLE PRECISION DEFAULT 0, sharespersecond DOUBLE PRECISION DEFAULT 0, networkhashrate DOUBLE PRECISION DEFAULT 0, networkdifficulty DOUBLE PRECISION DEFAULT 0, lastnetworkblocktime TIMESTAMPTZ NULL, blockheight BIGINT DEFAULT 0, connectedpeers INT DEFAULT 0, created TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS shares (poolid TEXT NOT NULL, blockheight BIGINT NOT NULL, difficulty DOUBLE PRECISION NOT NULL, networkdifficulty DOUBLE PRECISION NOT NULL, miner TEXT NOT NULL, worker TEXT NULL, useragent TEXT NULL, ipaddress TEXT NOT NULL, source TEXT NULL, created TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS blocks (id BIGSERIAL PRIMARY KEY, poolid TEXT NOT NULL, blockheight BIGINT NOT NULL, networkdifficulty DOUBLE PRECISION NOT NULL, status TEXT NOT NULL, type TEXT NULL, confirmationprogress FLOAT DEFAULT 0, effort FLOAT NULL, minereffort FLOAT NULL, transactionconfirmationdata TEXT NOT NULL, miner TEXT NULL, reward decimal(28,12) NULL, source TEXT NULL, hash TEXT NULL, created TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS balances (poolid TEXT NOT NULL, address TEXT NOT NULL, amount decimal(28,12) DEFAULT 0, created TIMESTAMPTZ NOT NULL, updated TIMESTAMPTZ NOT NULL, primary key(poolid, address));
CREATE TABLE IF NOT EXISTS balance_changes (id BIGSERIAL PRIMARY KEY, poolid TEXT NOT NULL, address TEXT NOT NULL, amount decimal(28,12) DEFAULT 0, usage TEXT NULL, tags text[] NULL, created TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS miner_settings (poolid TEXT NOT NULL, address TEXT NOT NULL, paymentthreshold decimal(28,12) NOT NULL, created TIMESTAMPTZ NOT NULL, updated TIMESTAMPTZ NOT NULL, primary key(poolid, address));
CREATE TABLE IF NOT EXISTS payments (id BIGSERIAL PRIMARY KEY, poolid TEXT NOT NULL, coin TEXT NOT NULL, address TEXT NOT NULL, amount decimal(28,12) NOT NULL, transactionconfirmationdata TEXT NOT NULL, created TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS minerstats (id BIGSERIAL PRIMARY KEY, poolid TEXT NOT NULL, miner TEXT NOT NULL, worker TEXT NOT NULL, hashrate DOUBLE PRECISION DEFAULT 0, sharespersecond DOUBLE PRECISION DEFAULT 0, created TIMESTAMPTZ NOT NULL);
SQL
```

### Шаг 5. Копирование config и coins

```bash
sudo cp /tmp/pool-update/Apps/postgres/templates/config.json /media/ZimaOS-HD/miningcore/config.json
sudo cp /tmp/pool-update/Apps/postgres/templates/coins.json /media/ZimaOS-HD/miningcore/coins.json
sudo cp /tmp/pool-update/Apps/postgres/templates/coins-map.json /media/ZimaOS-HD/miningcore/coins-map.json
sudo chown -R $(id -u):$(id -g) /media/ZimaOS-HD/
```

### Шаг 6. Исправление host PostgreSQL в config.json

```bash
# Замените 192.168.0.238 на IP вашего сервера
sudo sed -i 's/"host": "postgresql"/"host": "192.168.0.238"/' /media/ZimaOS-HD/miningcore/config.json
```

### Шаг 7. Запуск нод (по одной)

```bash
cd /tmp/pool-update/Apps/BTC-Node && docker compose up -d
cd /tmp/pool-update/Apps/BCH-Node && docker compose up -d
cd /tmp/pool-update/Apps/LTC-Node && docker compose up -d
cd /tmp/pool-update/Apps/DOGE-Node && docker compose up -d
cd /tmp/pool-update/Apps/DGB-Node && docker compose up -d
cd /tmp/pool-update/Apps/RVN-Node && docker compose up -d
cd /tmp/pool-update/Apps/XNA-Node && docker compose up -d
# ... и т.д. для других нод
```

### Шаг 8. Создание wallet для ноды (после запуска ноды)

```bash
cd /tmp/pool-update
chmod +x scripts/setup-wallet-for-node.sh
./scripts/setup-wallet-for-node.sh btc /media/ZimaOS-HD/miningcore/config.json
# Повторить для bch, ltc, doge и т.д.
```

### Шаг 9. Запуск Miningcore

```bash
cd /tmp/pool-update/Apps/miningcore && docker compose up -d
sleep 15
```

### Шаг 10. Запуск панелей

```bash
cd "/tmp/pool-update/Apps/Mining Pool Configuration" && docker compose up -d
cd /tmp/pool-update/Apps/pool-panel-85 && docker compose up -d
cd /tmp/pool-update/Apps/Web-UI-Molepool && docker compose up -d
cd /tmp/pool-update/Apps/Web-UI-SoloPool-Dashboard && docker compose up -d
cd /tmp/pool-update/Apps/Web-UI-SoloPool-Org && docker compose up -d
```

### Шаг 11. Перезапуск Miningcore (после создания wallet)

```bash
docker restart miningcore
```

### Шаг 12. Проверка

```bash
echo "=== Контейнеры ===" && docker ps --format "table {{.Names}}\t{{.Status}}" | sort
echo "=== API ===" && curl -s http://localhost:4000/api/pools | head -c 200
echo ""
echo "=== Панели ===" && for p in 81 82 83 84 85 4050; do echo "  :$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/)"; done
```

---

## 4. Скрипт создания wallet (setup-wallet-for-node.sh)

**Путь:** `scripts/setup-wallet-for-node.sh`

**Использование:**
```bash
./scripts/setup-wallet-for-node.sh <pool_id> [config_path]
```

**Примеры:**
```bash
./scripts/setup-wallet-for-node.sh btc
./scripts/setup-wallet-for-node.sh btc /media/ZimaOS-HD/miningcore/config.json
./scripts/setup-wallet-for-node.sh ltc
```

**Поддерживаемые монеты:** btc, bch, bsv, bc2, xec, fb, dgb, ltc, doge, rvn, vtc, ppc, xna, grs

**Где хранится wallet.dat:**
- BTC: `/media/ZimaOS-HD/nodes/btc/wallets/default/`
- BCH: `/media/ZimaOS-HD/nodes/bch/wallets/default/`
- и т.д.

---

## 5. Пути к файлам

| Файл/папка | Путь |
|------------|------|
| config.json | /media/ZimaOS-HD/miningcore/config.json |
| coins.json | /media/ZimaOS-HD/miningcore/coins.json |
| coins-map.json | /media/ZimaOS-HD/miningcore/coins-map.json |
| Данные нод | /media/ZimaOS-HD/nodes/<монета>/ |
| wallet.dat | /media/ZimaOS-HD/nodes/<монета>/wallets/default/ |

---

## 6. CasaOS App Store

**Добавить магазин:**
1. App Store → Add a Repository
2. Вставить: `https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-`
3. Или ZIP: `https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/archive/refs/heads/main.zip`

---

## 7. GitHub — запись изменений

```bash
cd "C:\Users\WIN-10\Downloads\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main"

git add .
git status
git commit -m "Setup complete: wallet script, panel enable/disable, pool/fee config"
git push origin main
```

---

## 8. Обновление на сервере

```bash
cd /tmp && sudo rm -rf pool-update
git clone https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git pool-update

# Обновить Pool Configuration
docker rm -f Mining-Pool-Configuration
cd "/tmp/pool-update/Apps/Mining Pool Configuration" && docker compose up -d
```

---

## 9. Краткая шпаргалка

| Действие | Команда |
|----------|---------|
| Создать wallet для BTC | `./scripts/setup-wallet-for-node.sh btc` |
| Перезапустить Miningcore | `docker restart miningcore` |
| Перезапустить панель 4050 | `docker restart Mining-Pool-Configuration` |
| Проверить API | `curl -s http://localhost:4000/api/pools` |
| Логи Miningcore | `docker logs miningcore -f --tail 50` |
