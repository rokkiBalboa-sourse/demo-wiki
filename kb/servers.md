# Серверы и хостинг

Инструкции по развертыванию сервисов и базовому администрированию Linux серверов (Ubuntu / Debian).

## Первичная настройка нового сервера

После получения доступа к серверу выполните обновление пакетов:

```bash
sudo apt update && sudo apt upgrade -y
```

### Создание отдельного пользователя

Для безопасности не рекомендуется работать под учетной записью `root`:

```bash
adduser deployer
usermod -aG sudo deployer
```

### Настройка UFW (Firewall)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
