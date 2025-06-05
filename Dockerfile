# Этап сборки клиентской части
FROM node:18-alpine as client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Основной этап
FROM node:18-alpine
WORKDIR /app

# Копируем файлы сервера
COPY package*.json ./
RUN npm install --production

# Копируем собранный клиент
COPY --from=client-builder /app/client/build ./client/build

# Копируем остальные файлы сервера
COPY server.js ./
COPY uploads ./uploads

# Создаем директорию для загрузок, если её нет
RUN mkdir -p uploads

# Открываем порт
EXPOSE 5000

# Запускаем приложение
CMD ["node", "server.js"] 