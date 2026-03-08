# Как подключить проект к своему GitHub

Я (AI в Cursor) **не подключаюсь к GitHub напрямую**. Я меняю файлы только у вас на диске. Чтобы изменения попали на GitHub, делаете вы: один раз настраиваете Git и репозиторий, потом при каждом изменении — коммит и push.

---

## Шаг 1: Установите Git (если ещё нет)

Скачайте с https://git-scm.com/download/win и установите. В терминале проверьте:

```powershell
git --version
```

---

## Шаг 2: Настройте имя и email для Git

В **PowerShell** или **CMD** выполните (подставьте свои данные):

```powershell
git config --global user.email "ваш-email@example.com"
git config --global user.name "Ваше Имя или логин GitHub"
```

Email лучше тот, что привязан к аккаунту GitHub.

---

## Шаг 3: Создайте репозиторий на GitHub

1. Зайдите на https://github.com и войдите в аккаунт.
2. Нажмите **+** → **New repository**.
3. Укажите имя, например: `retro-mike-zima-app-store`.
4. **Не** ставьте галочку "Add a README" (у вас уже есть файлы).
5. Нажмите **Create repository**.

На странице репозитория GitHub покажет команды — вам понадобится **URL репозитория**, например:
`https://github.com/ВАШ_ЛОГИН/retro-mike-zima-app-store.git`

---

## Шаг 4: Откройте папку проекта в терминале и привяжите GitHub

Откройте **PowerShell** и перейдите в папку проекта:

```powershell
cd "c:\Users\WIN-10\Downloads\загрузки\www\Новая папка\retro-mike-zima-app-store-main\retro-mike-zima-app-store-main"
```

Проверьте, что Git уже инициализирован (есть папка `.git`):

```powershell
git status
```

Добавьте **удалённый репозиторий** (подставьте свой URL из шага 3):

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/retro-mike-zima-app-store.git
```

Сделайте первый коммит и отправку:

```powershell
git add -A
git commit -m "Initial commit: Miningcore + Web UI, all coins"
git branch -M main
git push -u origin main
```

При первом `git push` браузер или окно Git могут запросить вход в GitHub (логин/пароль или токен). Используйте свой аккаунт GitHub.

---

## Дальше: как попадают изменения на GitHub

1. **Я в Cursor** правлю файлы в этой же папке (например, по вашим просьбам).
2. **Вы** в терминале из папки проекта выполняете:

   ```powershell
   git add -A
   git commit -m "Описание изменений"
   git push
   ```

После этого всё будет на GitHub. Подключать меня к GitHub не нужно — достаточно, чтобы проект лежал в этой папке и вы делали push после правок.

---

## Если репозиторий уже есть на GitHub (клонировали)

Тогда в папке проекта уже есть `.git` и `origin`. Просто:

```powershell
cd "путь\к\папке\проекта"
git add -A
git commit -m "Описание"
git push
```

---

## Кратко

| Кто          | Действие                          |
|-------------|------------------------------------|
| Вы          | Настраиваете Git (email, name)     |
| Вы          | Создаёте репозиторий на GitHub    |
| Вы          | `git remote add origin URL`       |
| Вы          | `git add -A` → `git commit` → `git push` |
| Я (Cursor)  | Редактирую файлы в вашей папке     |

Я не имею доступа к вашему GitHub; все отправки делаете вы через `git push`.
