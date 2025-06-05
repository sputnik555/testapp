#!/bin/bash

# Остановка текущего процесса, если он запущен
pm2 stop file-exchange-app || true

# Получение последних изменений из репозитория
git pull origin main

# Установка зависимостей
npm install

# Сборка клиентской части
npm run build

# Запуск приложения через PM2
pm2 start server.js --name "file-exchange-app" --env production

# Сохранение конфигурации PM2
pm2 save

echo "Деплой завершен успешно!" 