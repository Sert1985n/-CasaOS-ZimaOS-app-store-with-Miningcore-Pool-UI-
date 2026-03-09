# CasaOS / ZimaOS App Store — Miningcore Pool UI

Форк магазина приложений CasaOS с **Miningcore** (пул для майнинга), **несколькими Web UI** на выбор, нодами монет и панелью настройки (порт 4050). Всё работает **из коробки** при добавлении репозитория из GitHub. Автор: **public-pool-btc.ru**.

---

## Web UI — выбирайте любой (устанавливаются отдельными контейнерами)

| Приложение | Порт | Описание |
|------------|------|----------|
| **Miningcore + Pool UI** | 81 | Встроен в Miningcore. Боковая панель: Mining Pools, Pool Configuration (→ порт 85) |
| **Web UI — Pool Configuration** | 85 | MiningCore Web UI с PoolConfiguration: Setup Database Schema, Refresh Master Coin List, Generate Pool Config File |
| **Molepool Web UI** | 82 | Стиль [molepool.com](https://molepool.com/) — боковая панель, таблица Pool \| Algorithm \| Miners \| Hashrate \| Network \| Price \| Reward |
| **Solo-Pool Dashboard UI** | 83 | Стиль [bch.solo-pool.org](https://bch.solo-pool.org/) — Network Info, Block Info, Pool Info, Effort, Charts |
| **SoloPool Web UI** | 84 | Стиль [solopool.org](https://solopool.org/) — новости, таблица Pool Hashrate \| Blocks Found \| Pool Luck \| Network |
| **Mining Pool Configuration** | 4050 | Настройка кошельков, включение/выключение монет, config.json |

Все Web UI подключаются к Miningcore через сеть `pool_network` и проксируют `/api/` на miningcore:4000.

---

## Установка (из коробки)

Добавьте этот репозиторий из GitHub в CasaOS → устанавливайте приложения **строго в порядке**:

1. **PostgreSQL** — создаёт БД, сеть `pool_network`, `/media/ZimaOS-HD/miningcore/` с `config.json` и `coins.json`
2. **Miningcore + Pool UI** — пул + веб-панель на порту **81**
3. **Web UI — Pool Configuration** (порт **85**) — Setup Database Schema, Refresh Master Coin List, Generate Pool Config File
4. **Mining Pool Configuration** — настройка кошельков (порт **4050**)
5. **Любой дополнительный Web UI** — Molepool (82), Solo-Pool Dashboard (83), SoloPool (84) — по желанию
6. **Ноды** (BTC, BCH, LTC, RVN и др.) — подключаются к `pool_network`

Подробности и решение проблем — в [INSTALL.md](INSTALL.md).  
**Полное руководство:** [PROJECT-GUIDE.md](PROJECT-GUIDE.md) — всё, что реализовано, настройка нод, установка без перезагрузки.

**Полная настройка (команды, порты, wallet):** [SETUP-COMPLETE.md](SETUP-COMPLETE.md) — все команды по порядку, создание wallet скриптом, панель enable/disable.
