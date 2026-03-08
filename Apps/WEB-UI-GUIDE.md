# 📋 Web UI панели — что ставить

Все панели работают с **Miningcore** и сетью **pool_network**. Сначала установите **PostgreSQL** и **miningcore** (или **Miningcore + Pool UI**).

---

## 🎛 Основные приложения (обязательные)

| Папка | Название в CasaOS | Порт | Назначение |
|-------|-------------------|------|------------|
| **postgres** | PostgreSQL | 5432 | БД, создаёт pool_network, config.json, coins.json |
| **miningcore** | Miningcore + Pool UI | **81** | Пул + встроенная панель (боковая панель, таблица) |
| **Mining Pool Configuration** | Настройка пула | **4050** | Wallet, кошелёк, вкл/выкл монет, config.json |

---

## 🖥 Web UI панели (выберите любую)

| Папка | Название | Порт | Стиль |
|-------|----------|------|-------|
| **Web-UI-Molepool** | Molepool Web UI | **82** | molepool.com — боковая панель, таблица Pool \| Algorithm \| Miners \| Hashrate \| Price \| Reward |
| **Web-UI-SoloPool-Dashboard** | Solo-Pool Dashboard | **83** | bch.solo-pool.org — Network Info, Block Info, Pool Info, Effort, Charts |
| **Web-UI-SoloPool-Org** | SoloPool.org UI | **84** | solopool.org — новости, таблица Pool Hashrate \| Blocks \| Luck \| Network \| Price |
| **Web-UI-Pool-Secondary** | Web UI — Вторичный пул | **85** | Панель для Pool-Monero-XMR. Универсальная — не только XMR. |
| **Pool-Monero-XMR** | Pool Monero (XMR) | 4001 | Отдельный пул Miningcore только для Monero. Не основной miningcore. |

---

## 🔗 Порты и ноды

- **81** — основная панель (Miningcore)
- **82** — Molepool или Monero UI
- **83** — Solo-Pool Dashboard
- **84** — SoloPool.org
- **4050** — Pool Configuration (wallet, монеты)
- **Ноды** — BTC:9004, BCH:9002, LTC:9332 и т.д. (см. config.json)

---

## 📊 Что отображается во всех панелях

- **Network Difficulty** (сложность)
- **Network Hashrate**
- **Pool Hashrate**
- **Coin Price** (цена монеты, USD)
- **Block Reward** (награда за блок)
- **Minimum Payout** (минимальная выплата)
- **Pool Fee 1.5%** (комиссия пула)
- **Miners, Blocks, Statistics**
