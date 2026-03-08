# Синхронизация с GitHub — при каждом изменении

Когда добавляете, удаляете или правите проект — сразу отправляйте изменения в GitHub.

## Быстрая отправка (Windows)

Дважды нажмите на **AUTO_PUSH.bat**

## Вручную (Windows / Linux)

```bash
cd "путь/к/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI--main"

git add .
git commit -m "описание изменений"
git push origin main
```

## Если проект не клонирован (а скачан ZIP)

Папка уже содержит `.git` и `origin`. Просто выполняйте `git add`, `commit`, `push` в ней.

## Иконки панелей (обновлены)

| Панель | Иконка | Файл |
|--------|--------|------|
| Miningcore + Pool UI (81) | Основной пул | icon-pool-main.png |
| Web-UI-Molepool (82) | Mole | icon-molepool.png |
| Web-UI-SoloPool-Dashboard (83) | Dashboard | icon-solopool-dashboard.png |
| Web-UI-SoloPool-Org (84) | Сеть | icon-solopool-org.png |
| Web-UI-Pool-Secondary (85) | Вторичный пул | icon-pool-secondary.png |
| Mining Pool Configuration (4050) | Настройки | icon-pool-config.png |
| Pool-Monero-XMR | XMR/вторичный | icon-pool-secondary.png |

Все иконки лежат в `Apps/img/` и доступны по URL:
`https://raw.githubusercontent.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-/main/Apps/img/icon-*.png`
