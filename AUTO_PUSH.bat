@echo off
chcp 65001 >nul
echo === Auto Push to GitHub ===
cd /d "%~dp0"

if not exist ".git" (
    echo Initializing git...
    git init
    git remote add origin https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git
    git branch -M main
)

echo Adding all files...
git add .

echo Committing...
git commit -m "Update: beautiful icons, Pool Config, Web-UI-Pool-Secondary, coins-map, PROJECT-GUIDE"

echo Pushing to GitHub...
echo.
echo Если remote уже есть контент — выберите:
echo 1) git push -u origin main --force   (ЗАМЕНИТЬ всё на GitHub нашими изменениями)
echo 2) Или склонируйте репо заново, скопируйте файлы поверх, затем push
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo Push отклонён. Запустите: git push -u origin main --force
    echo ВНИМАНИЕ: --force перезапишет историю на GitHub!
)
echo Done.
pause
