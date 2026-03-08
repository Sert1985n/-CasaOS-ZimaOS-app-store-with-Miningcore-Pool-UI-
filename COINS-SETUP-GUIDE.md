# Добавление монет в проект (Miningcore / Umbrel / CasaOS)

Краткая памятка: **что нужно настраивать**, когда добавляете новую монету (по опыту добавления XEC в Umbrel и конфигурации пула).

---

## Список монет в проекте (28 монет)

| btc | bch | bc2 | bsv | dgb | doge | xec | xna |
|-----|-----|-----|-----|-----|------|-----|-----|
| ppc | rvn | vtc | ltc | grs | fb   | xmr | erg |
| etc | ethw| zeph| space| xel | octa | zec | zen |
| flux| firo| kas | nexa |

Все они описаны в **coins-map.json** (`Apps/postgres/templates/coins-map.json`).

---

## 1. config.json / coins.json (Miningcore)

### Pools
- **daemons.host** — `127.0.0.1` или hostname ноды в Docker-сети (Node-XEC и т.д.). Иначе: "Name or service not known".
- **daemons.port** — RPC-порт ноды (см. coins-map или PROJECT-GUIDE §3.1).

### coinTemplates (coins.json)
Для монет, у которых нода не отдаёт staking/community/foundation в getblocktemplate — выключить флаги: **hasCoinbaseStakingReward**, **hasCommunity**, **hasFoundation**, **hasCoinbaseDevReward** и т.п. (иначе NullReferenceException у XEC и подобных).

---

## 2. Нода
- Запустить ноду монеты; RPC на порту из coins-map.
- Host в config должен резолвиться (pool_network / Umbrel network или /etc/hosts).

---

## 3. coins-map.json
Для панели 4050: id, coin, stratum, rpcPort, zmqPort, addressType. Все 28 монет уже в шаблоне.

---

## 4. Кошелёк
В config заменить `"xxx"` на реальный address; в панели 4050 задать Wallet и комиссию пула.

---

## 5. Сеть и файрвол
- CasaOS: все в **pool_network**, hostname ноды — Node-&lt;SYMBOL&gt;.
- Открыть stratum 6001–6028, порты 81, 4050, 4000.

Подробно: см. **PROJECT-GUIDE.md** и документ «как мы добавили монету XEC в приложение umbrel что нужно настраивать».
