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
git push -u origin main

echo Done.
pause
