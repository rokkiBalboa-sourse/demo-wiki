---
title: Безопасность
---

# Безопасность

Основные рекомендации по обеспечению безопасности инфраструктуры и приложений.

## Авторизация по SSH-ключам

Отключите вход по паролю в `/etc/ssh/sshd_config`:

```text
PasswordAuthentication no
PubkeyAuthentication yes
```

После редактирования перезапустите SSH:

```bash
sudo systemctl restart sshd
```

## Защита от перебора (Fail2Ban)

Установите Fail2ban для автоматической блокировки подозрительных IP-адресов:

```bash
sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban
```
