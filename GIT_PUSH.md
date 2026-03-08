# Как закоммитить и запушить изменения в GitHub

Выполните на вашем ПК (где лежит проект) или на сервере:

## 1. Перейти в папку проекта

```bash
cd /path/to/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main
```

Или на Windows (в PowerShell):
```powershell
cd "c:\Users\WIN-10\Downloads\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main\-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main"
```

## 2. Проверить статус

```bash
git status
```

## 3. Добавить все изменения

```bash
git add .
```

## 4. Закоммитить

```bash
git commit -m "Full project: coins-map, Pool Config panel, Web-UI-Pool-Secondary, unique icons per panel, PROJECT-GUIDE"
```

## 5. Запушить в GitHub

```bash
git push origin main
```

Если push отклонён (remote has work):
```bash
git push origin main --force
```
**Внимание:** `--force` заменит всё на GitHub нашими изменениями.

(или `master` если у вас ветка master: `git push origin master`)

---

## Если репозиторий ещё не подключён

```bash
git remote -v
```

Если пусто:
```bash
git remote add origin https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git
```

---

## Docker permission denied на сервере

Чтобы не вводить `sudo` каждый раз:

```bash
sudo usermod -aG docker pool
```

Затем **выйти и зайти** в сессию (или перезагрузить), чтобы группа применилась.

Проверка:
```bash
docker ps
```

---

## Иконки панелей (обновлено)

| Панель | Иконка |
|--------|--------|
| Miningcore + Pool UI (81) | BTC |
| Web-UI-Molepool (82) | DOGE |
| Web-UI-SoloPool-Dashboard (83) | BCH |
| Web-UI-SoloPool-Org (84) | LTC |
| Web-UI-Pool-Secondary (85) | XMR |
| Mining Pool Configuration (4050) | ETH |
| Pool-Monero-XMR | XMR |

Используется CDN: `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/{coin}.png`
