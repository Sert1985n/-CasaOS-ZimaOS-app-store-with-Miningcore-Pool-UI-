# Порты, контейнеры, ноды, панели

## Miningcore

| Компонент | Контейнер | Порт |
|-----------|-----------|------|
| Ядро пула | miningcore | 4000 (API), 6001-6029 (stratum) |
| Pool UI | miningcore-webui | 81 |

## Панели (Web UI)

| Порт | Контейнер | Приложение |
|------|-----------|------------|
| 81 | miningcore-webui | Pool UI (основная) |
| 82 | Molepool-Web-UI | Molepool |
| 83 | Solo-Pool-Dashboard-UI | SoloPool Dashboard |
| 84 | SoloPool-Web-UI | SoloPool Org |
| 85 | Miningcore-Web-UI | Miningcore Web UI (Pool Configuration) |

## Ноды монет (из install-server.sh)

| Монета | Контейнер | Папка |
|--------|-----------|-------|
| ZEPH | Node-ZEPH | /media/ZimaOS-HD/nodes/zeph |
| ZEC | Node-ZEC | /media/ZimaOS-HD/nodes/zec |
| ETC | Node-ETC | /media/ZimaOS-HD/nodes/etc |
| XEL | Node-XEL | /media/ZimaOS-HD/nodes/xel |
| SPACE | Node-SPACE | /media/ZimaOS-HD/nodes/space |

## Полный список нод (29 монет)

BTC, BCH, BC2, BSV, DGB, DOGE, XEC, XNA, PPC, RVN, VTC, LTC, GRS, FB, XMR, ERG, ETC, ETHW, ZEPH, SPACE, XEL, OCTA, ZEC, ZEN, FLUX, FIRO, KAS, NEXA, BTCS

## Build

```bash
# Установка
curl -sL https://raw.githubusercontent.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/main/install-server.sh | sudo bash
```
