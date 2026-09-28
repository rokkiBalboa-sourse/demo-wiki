---
title: "Задание №6: Централизованное логирование rsyslog и ротация logrotate"
description: "Пошаговая настройка отправки журналов с приоритетом warning через rsyslog и systemd-journald с узлов HQ-RTR, BR-RTR и BR-SRV на сервер HQ-SRV, распределение по каталогам /opt/<HOSTNAME>/ и еженедельная ротация через logrotate и crontab"
---

# Задание №6: Централизованное логирование rsyslog и ротация logrotate

В данном задании на сервере главного офиса (**HQ-SRV**) настраивается централизованный приём системных журналов с помощью **rsyslog**. 

На клиентских узлах (**HQ-RTR**, **BR-RTR**, **BR-SRV**) включается пересылка событий из `systemd-journald` в `rsyslog` с фильтром важности не ниже `warning` (`*.warn`). Приходящие логи на сервере автоматически сохраняются в поддиректории `/opt/%HOSTNAME%/`. Сам сервер `HQ-SRV` изолирован от записи собственных логов в эти каталоги (отключен модуль `imuxsock`). Для архивации журналов настраивается **logrotate** с еженедельным запуском через планировщик **cron**.

> [!IMPORTANT] Узлы выполнения
> 1. **HQ-RTR**, **BR-RTR**, **BR-SRV** — настройка клиентов rsyslog и journald, пересылка на `192.168.1.10`.
> 2. **HQ-SRV** — установка `rsyslog-server-listen`, отключение `imuxsock`, настройка шаблона `/opt/` и ротации `logrotate`.

---

## 1. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 2. Настройка клиентов логирования (HQ-RTR, BR-RTR, BR-SRV)

Выполните следующие шаги под пользователем `root` на каждом из трёх устройств (**BR-SRV**, **HQ-RTR** и **BR-RTR**):

### Шаг 1. Установка rsyslog и проверка параметров journald

```bash
apt-get update && apt-get install rsyslog -y

grep 'Syslog' /etc/systemd/journald.conf
```

---

### Шаг 2. Активация модулей в rsyslog

Открываем файл конфигурации:

```bash
vim /etc/rsyslog.d/00_common.conf
```

Находим и **раскомментируем** (убираем `#` в начале) следующие строки:

```text
module(load="imjournal")
module(load="imuxsock")
```

Сохраняем файл (`Esc` → `:wq` → `Enter`).

---

### Шаг 3. Настройка пересылки journald и создание правила отправки

Включаем форвардинг событий уровня `warning` из journald в syslog:

```bash
echo -e "ForwardToSyslog=yes\nMaxLevelSyslog=warning" >> /etc/systemd/journald.conf
```

Создаём правило отправки сообщений с приоритетом `warning` и выше на IP-адрес сервера HQ-SRV (`192.168.1.10`):

```bash
echo "*.warn @192.168.1.10" > /etc/rsyslog.d/10_to_server.conf
```

---

### Шаг 4. Перезапуск служб

```bash
systemctl restart systemd-journald
systemctl enable --now rsyslog
```

---

## 3. Настройка сервера сбора логов на HQ-SRV

Выполните действия под пользователем `root` на сервере **HQ-SRV**:

### Шаг 1. Установка серверных компонентов rsyslog

```bash
apt-get update && apt-get install rsyslog-classic rsyslog-server-listen -y
```

---

### Шаг 2. Создание шаблона динамического распределения логов по папкам

Создаём файл `/etc/rsyslog.d/91_template.conf`:

```bash
cat << "EOF" > /etc/rsyslog.d/91_template.conf
$template DynFile,"/opt/%HOSTNAME%/%PROGRAMNAME%.log"
*.* ?DynFile
& stop
EOF
```

---

### Шаг 3. Изоляция сервера (отключение локального сокета imuxsock)

Чтобы сервер `HQ-SRV` не записывал собственные локальные логи в директории `/opt/`:

```bash
vim /etc/rsyslog.d/10_classic.conf
```

Находим строку с загрузкой модуля `imuxsock` и **закомментируем** её знаком `#`:

```text
#module(load="imuxsock")
```

Сохраняем файл (`Esc` → `:wq` → `Enter`).

Перезапускаем службу rsyslog:

```bash
systemctl restart rsyslogd
```

---

## 4. Проверка сбора логов на сервере HQ-SRV

1. **Генерация тестового сообщения**:
   На хостах **HQ-RTR**, **BR-RTR** и **BR-SRV** выполните:
   ```bash
   logger -p local2.warning "Syslog test message"
   ```

2. **Проверка получения на HQ-SRV**:
   На сервере **HQ-SRV** проверьте каталог `/opt`:
   ```bash
   ls -l /opt
   ```
   В выводе должны появиться директории с именами устройств:
   ```text
   drwxr-xr-x 2 root root 4096 Sep 29 00:00 BR-RTR
   drwxr-xr-x 2 root root 4096 Sep 29 00:00 BR-SRV
   drwxr-xr-x 2 root root 4096 Sep 29 00:00 HQ-RTR
   ```

---

## 5. Настройка ротации логов (logrotate) на HQ-SRV

Выполните команды под пользователем `root` на **HQ-SRV**:

### Шаг 1. Установка logrotate и создание правила ротации

```bash
apt-get install logrotate -y

cat << "EOF" > /etc/logrotate.d/rsyslog
/opt/**/*.log
{ 
weekly
missingok
notifempty 
compress 
minsize 10M
} 
EOF
```

::: tip Разбор параметров ротации
* **`/opt/**/*.log`** — ротация затрагивает все лог-файлы во всех подкаталогах директории `/opt/`.
* **`weekly`** — ротация производится один раз в неделю.
* **`missingok`** — отсутствие файла не вызывает ошибку.
* **`notifempty`** — пустые файлы не ротируются.
* **`compress`** — сжатие ротированных архивов.
* **`minsize 10M`** — минимальный размер для запуска ротации составляет 10 МБ.
:::

---

### Шаг 2. Тестовый запуск ротации

Проверяем корректность конфигурации в режиме сухой проверки (dry-run):

```bash
logrotate -d /etc/logrotate.d/rsyslog
```

---

### Шаг 3. Добавление задания в планировщик cron

Задаём редактор по умолчанию `vim` и открываем расписание задач:

```bash
export EDITOR=/usr/bin/vim
crontab -e
```

В конец файла добавляем задание запуска ротации каждое воскресенье в 00:00:

```text
0 0 * * 0 /usr/sbin/logrotate /etc/logrotate.d/rsyslog
```

Сохраняем и выходим (`Esc` → `:wq` → `Enter`). Задание настроено!
