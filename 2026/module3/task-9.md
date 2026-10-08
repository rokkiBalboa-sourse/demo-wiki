---
title: "Задание №9: Защита службы SSH с помощью Fail2ban на HQ-SRV"
description: "Пошаговая настройка службы Fail2ban на сервере HQ-SRV для защиты нестандартного порта SSH 2026 с бэкендом systemd: блокировка атакующего на 1 минуту при 3 последовательных неудачных попытках входа и проверка с HQ-CLI"
---

# Задание №9: Защита службы SSH с помощью Fail2ban на HQ-SRV

::: tip 📺 Видео-разбор задания
Видео-разбор выполнения задания доступен по ссылке: [https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d](https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d)
:::

В данном задании на сервере главного офиса (**HQ-SRV**) настраивается система предотвращения вторжений **Fail2ban** для защиты службы OpenSSH, работающей на нестандартном порту **`2026`**.

Для считывания событий журнала используется модуль интеграции с systemd (`python3-module-systemd`). При обнаружении **3** неудачных попыток аутентификации подряд IP-адрес клиента автоматически блокируется на **1 минуту** (`1m`).

> [!IMPORTANT] Где выполнять
> 1. **HQ-SRV** — установка пакетов, переключение на бэкенд `systemd`, настройка изолятора `sshd.conf` в `/etc/fail2ban/jail.d/` и запуск службы.
> 2. **HQ-CLI** — проверка срабатывания бана при 3 неверных вводах пароля.

---

## 1. Пошаговая инструкция на сервере HQ-SRV

Выполните следующие команды под пользователем `root` на сервере **HQ-SRV**:

### Шаг 1. Установка пакетов Fail2ban и модуля интеграции с systemd

```bash
apt-get update && apt-get install fail2ban python3-module-systemd -y
```

---

### Шаг 2. Переключение путей логов на systemd в ALT Linux

В конфигурационном файле `/etc/fail2ban/jail.conf` переключаем базовые пути на чтение из журнала `systemd`:

```bash
sed -i 's/before = paths-altlinux.conf/before = paths-altlinux-systemd.conf/' /etc/fail2ban/jail.conf
```

---

### Шаг 3. Создание конфигурации изолятора /etc/fail2ban/jail.d/sshd.conf

Создаём отдельный файл параметров для защиты сервиса SSH:

```bash
cat << "EOF" > /etc/fail2ban/jail.d/sshd.conf
[sshd]
enabled = true
port = 2026
filter = sshd
backend = systemd
maxretry = 3
bantime = 1m
EOF
```

::: tip Разбор параметров конфигурации
* **`enabled = true`** — активирует данное правило защиты.
* **`port = 2026`** — нестандартный порт SSH согласно настройкам Модуля №1.
* **`filter = sshd`** — стандартный фильтр распознавания сбоев авторизации OpenSSH.
* **`backend = systemd`** — получение логов напрямую через сокет `systemd-journald`.
* **`maxretry = 3`** — количество разрешённых ошибок авторизации до блокировки.
* **`bantime = 1m`** — длительность бана (1 минута / 60 секунд).
:::

---

### Шаг 4. Включение автозапуска и старт службы Fail2ban

```bash
systemctl enable --now fail2ban
```

Проверяем статус службы:

```bash
systemctl status fail2ban.service
```

---

### Шаг 5. Проверка состояния изолятора sshd

```bash
fail2ban-client status sshd
```

Пример вывода:
```text
Status for the jail: sshd
|- Filter
|  |- Currently failed: 0
|  |- Total failed:     0
|  `- Journal matches:  _SYSTEMD_UNIT=sshd.service + _COMM=sshd
`- Actions
   |- Currently banned: 0
   |- Total banned:     0
   `- Banned IP list:
```

---

## 2. Проверка работы защиты с рабочей станции HQ-CLI

Перейдите на клиентскую машину **HQ-CLI** (в консоль терминала):

### Шаг 1. Имитация атаки подбора пароля
Подключаемся по SSH к серверу HQ-SRV:

```bash
ssh -p 2026 sshuser@hq-srv
```

**3 раза намеренно вводим неверный пароль**.

После 3-й попытки соединение разрывается сервером.

---

### Шаг 2. Проверка блокировки на сервере HQ-SRV

Возвращаемся на сервер **HQ-SRV** и проверяем статус:

```bash
fail2ban-client status sshd
```

В выводе в строке **`Banned IP list:`** должен появиться заблокированный IP-адрес рабочей станции:
```text
   |- Currently banned: 1
   |- Total banned:     1
   `- Banned IP list:   192.168.2.10
```

При попытке повторного подключения с HQ-CLI соединение будет сброшено (`Connection refused`).

Через **1 минуту** блокировка снимется автоматически, и доступ восстановится.
