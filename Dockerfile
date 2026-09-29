# Этап 1: Сборка статики VitePress
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем все исходники проекта
COPY . .

# Собираем production-бандл документации
RUN npm run build

# Этап 2: Раздача через Nginx
FROM nginx:alpine

# Копируем конфигурацию веб-сервера
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

# Копируем скомпилированные страницы из билдера
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
