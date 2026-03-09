# Создание wallet при установке ноды

## Скрипт setup-wallet-for-node.sh

Создаёт wallet через RPC ноды, сохраняет wallet.dat в папку ноды, обновляет config.json.

### Использование

```bash
# После установки и запуска ноды (например Node-BTC)
./scripts/setup-wallet-for-node.sh btc

# С указанием пути к config.json
./scripts/setup-wallet-for-node.sh btc /media/ZimaOS-HD/miningcore/config.json
```

### Поддерживаемые монеты

btc, bch, bsv, bc2, xec, fb, dgb, ltc, doge, rvn, vtc, ppc, xna, grs

### Где хранится wallet.dat

- **BTC**: `/media/ZimaOS-HD/nodes/btc/wallets/default/`
- **BCH**: `/media/ZimaOS-HD/nodes/bch/wallets/default/`
- и т.д. — в папке ноды, создаётся автоматически при createwallet

### После выполнения

1. config.json обновлён — address пула заменён на реальный
2. Перезапустите Miningcore: `docker restart miningcore`

### Панель :4050

Панель теперь только для:
- **ВКЛ/ВЫКЛ** — включение/выключение ноды в config.json (enabled: true/false)
- **Pool Wallet** — адрес для выплат майнерам
- **Fee Wallet** — адрес комиссии пула
- **Fee %** — процент комиссии (по умолчанию 1.5%)
- **Сохранить** — запись в config.json
- **Удалить** — удаление пула из config

Создание wallet — только через скрипт при установке ноды.
