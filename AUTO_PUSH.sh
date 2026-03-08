#!/bin/bash
# Auto Push to GitHub — запуск на сервере или Linux/Mac
cd "$(dirname "$0")"

if [ ! -d ".git" ]; then
  echo "Initializing git..."
  git init
  git remote add origin https://github.com/Sert1985n/-CasaOS-ZimaOS-app-store-with-Miningcore-Pool-UI-.git
  git branch -M main
fi

echo "Adding all files..."
git add .

echo "Committing..."
git commit -m "Update: beautiful icons, Pool Config, Web-UI-Pool-Secondary, coins-map, PROJECT-GUIDE" || true

echo "Pushing to GitHub..."
git push -u origin main

echo "Done."
