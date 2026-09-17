# Оптимизация производительности

Методы ускорения работы веб-приложений и уменьшения задержек.

## 1. Сжатие трафика (Gzip / Brotli)

Включение Brotli в Nginx значительно уменьшает объем передаваемых JS/CSS файлов.

```nginx
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

## 2. Использование CDN

Подключение Cloudflare позволяет:
- Кэшировать статические ресурсы по всему миру
- Снизить прямую нагрузку на сервер
- Защитить реальный IP-адрес сервера
