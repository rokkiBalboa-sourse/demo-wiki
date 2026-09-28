---
title: "Задание №9: Обратный прокси-сервер Nginx на ISP"
description: "Пошаговая настройка Reverse Proxy на базе Nginx на маршрутизаторе ISP в ALT Linux для маршрутизации доменных имён web.au-team.irpo и docker.au-team.irpo к внутренним веб-приложениям филиалов"
---

# Задание №9: Обратный прокси-сервер Nginx на ISP

В данном задании на пограничном маршрутизаторе провайдера (**ISP**) развёртывается высокопроизводительный веб-сервер **Nginx**, настроенный в режиме **обратного прокси-сервера (Reverse Proxy)**.

Маршрутизатор принимает HTTP-запросы из внешней сети на стандартный порт `80` и, анализируя доменное имя в заголовке `Host`, перенаправляет трафик на соответствующие внутренние филиалы через настроенный ранее проброс портов (DNAT):
* При обращении к **`web.au-team.irpo`** — запрос перенаправляется на Apache-сервер центрального офиса (`HQ-SRV` через внешний порт `HQ-RTR:8080`).
* При обращении к **`docker.au-team.irpo`** — запрос перенаправляется на Docker-приложение филиала (`BR-SRV` через внешний порт `BR-RTR:8080`).

> [!IMPORTANT] Место выполнения
> Все действия выполняются под пользователем `root` на маршрутизаторе **ISP** (`isp.au-team.irpo`).

---

## 1. Теоретическая справка: как работает Reverse Proxy

**Обратный прокси-сервер (Reverse Proxy)** принимает входящие запросы от клиентов, передаёт их внутренним целевым серверам (бэкендам) и возвращает сформированный ответ обратно клиенту.

### Ключевые преимущества решения:
* **Единая точка входа**: клиенты обращаются на один стандартный порт `80`, не зная о реальной топологии, нестандартных портах (`8080`, `8000`) и приватных IP-адресах серверов.
* **Маршрутизация по виртуальным хостам (`server_name`)**: Nginx на одном IP-адресе разделяет сайты по доменным именам с помощью поля заголовка `Host`.
* **Безопасность**: внутренние веб-серверы защищены от прямого доступа извне.

### Разбор директив проксирования Nginx:
* `proxy_pass http://...` — адрес и порт целевого бэкенда, куда пересылается запрос.
* `proxy_set_header Host $host` — передаёт исходное доменное имя сайта бэкенду (критично для правильной генерации ссылок внутри PHP/Docker приложений).
* `proxy_set_header X-Real-IP $remote_addr` — передаёт реальный IP-адрес клиента бэкенду.
* `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` — формирует цепочку IP-адресов проксирования.
* `proxy_set_header X-Forwarded-Proto $scheme` — передаёт протокол (`http` или `https`).
* `auth_basic` / `auth_basic_user_file` — директивы базовой парольной аутентификации HTTP. Файл паролей `/etc/nginx/.htpasswd` наполняется в **Задании №10**.

---

## 2. Установка Nginx и создание конфигурации на ISP

Выполняем команды под пользователем `root` на маршрутизаторе **ISP**:

### Шаг 1. Установка пакета Nginx

```bash
apt-get update && apt-get install nginx -y
```

---

### Шаг 2. Создание файла конфигурации виртуальных хостов

В ALT Linux файлы конфигурации сайтов размещаются в `/etc/nginx/sites-available.d/` и активируются символическими ссылками в `/etc/nginx/sites-enabled.d/`:

```bash
nano /etc/nginx/sites-available.d/r-proxy.conf
```

Вставляем следующую конфигурацию с двумя виртуальными серверами:

```nginx
server {
    listen 80;
    server_name web.au-team.irpo;

    location / {
        proxy_pass http://172.16.1.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        auth_basic "Restricted Access";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 80;
    server_name docker.au-team.irpo;

    location / {
        proxy_pass http://172.16.2.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

::: tip Назначение директив auth_basic
В блок сайта `web.au-team.irpo` сразу включены директивы защиты доступа паролем. Сам файл с хешем пароля `/etc/nginx/.htpasswd` генерируется на следующем шаге в **Задании №10**.
:::

---

### Шаг 3. Активация сайта, проверка синтаксиса и запуск службы

```bash
# 1. Создаём символическую ссылку в каталог активированных сайтов
ln -s /etc/nginx/sites-available.d/r-proxy.conf /etc/nginx/sites-enabled.d/

# 2. Проверяем конфигурацию Nginx на отсутствие синтаксических ошибок
nginx -t

# 3. Включаем автозапуск и активируем службу Nginx
systemctl enable --now nginx

# 4. Проверяем статус демона
systemctl status nginx
```

При успешной проверке `nginx -t` выведет:
```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 3. Проверка работы Reverse Proxy с клиента HQ-CLI

Переходим на рабочую станцию **HQ-CLI**:

### Шаг 1. Проверка разрешения DNS
Убеждаемся, что доменные имена сайтов разрешаются в IP-адрес интерфейса маршрутизатора ISP:

```bash
ping -c 2 docker.au-team.irpo
ping -c 2 web.au-team.irpo
```

---

### Шаг 2. Проверка работы сайта docker.au-team.irpo
Открываем браузер и вводим адрес:
```text
http://docker.au-team.irpo
```
**Результат:** сайт открывается мгновенно через порт `80` без указания нестандартных портов `:8080`! Запрос поступил на `ISP`, прошёл через Reverse Proxy, затем через DNAT роутера `BR-RTR` попал в контейнер `tespapp` на сервере `BR-SRV`.

---

### Шаг 3. Проверка сайта web.au-team.irpo
При переходе на адрес:
```text
http://web.au-team.irpo
```
Браузер выдаст диалоговое окно базовой аутентификации (либо ошибку 500, если файл `.htpasswd` ещё не создан). 

Для завершения настройки аутентификации и входа под пользователем `WEB` переходим к **Заданию №10**.

> [!NOTE] Итог выполнения Задания №9
> Обратный прокси-сервер Nginx на `ISP` успешно запущен и распределяет веб-трафик между удаленными площадками на основе запрашиваемых доменных имён.
