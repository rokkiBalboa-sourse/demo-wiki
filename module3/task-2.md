---
title: "Задание №2: Центр сертификации ГОСТ на HQ-SRV и HTTPS в Nginx на ISP"
description: "Развёртывание Центра сертификации (CA) с отечественными алгоритмами шифрования (ГОСТ Р 34.12-2015 / 34.10-2012) на сервере HQ-SRV, выпуск сертификатов на 30 дней, доверие на HQ-CLI и перевод Nginx на HTTPS"
---

# Задание №2: Центр сертификации ГОСТ на HQ-SRV и HTTPS в Nginx на ISP

В данном задании на сервере главного офиса (**HQ-SRV**) развёртывается локальный центр сертификации (Certification Authority, CA), использующий российские криптографические алгоритмы (ГОСТ). 

Выпускаются SSL/TLS-сертификаты со сроком действия **30 дней** для доменных имён `web.au-team.irpo` и `docker.au-team.irpo`. На маршрутизаторе **ISP** реверсивный прокси-сервер **Nginx** переводится на защищённый протокол **HTTPS** (порт 443), а на рабочей станции **HQ-CLI** обеспечивается доверие корневому сертификату, благодаря чему браузер открывает оба защищённых ресурса без предупреждений о безопасности.

> [!IMPORTANT] Узлы выполнения
> 1. **HQ-SRV** — генерация корневого ключа и сертификата CA (ГОСТ), подпись серверных сертификатов на 30 дней.
> 2. **ISP** — настройка Nginx на приём HTTPS (порт 443), подключение сертификатов и ключей.
> 3. **HQ-CLI** — установка корневого сертификата в системное хранилище доверенных сертификатов ALT Linux.

---

## 1. Теоретическая справка: криптография ГОСТ в OpenSSL

В ALT Linux поддержка криптографических стандартов ГОСТ (ГОСТ Р 34.10-2012, ГОСТ Р 34.11-2012) реализована через специальный криптографический модуль (движок) **`gost-engine`** (`openssl-engines-gost`).

### Основные компоненты:
* **ГОСТ Р 34.10-2012** — алгоритм формирования и проверки электронной цифровой подписи (256 или 512 бит).
* **ГОСТ Р 34.11-2012 (Стрибог)** — функция хэширования (длина хэш-кода 256 или 512 бит, алгоритмы `streebog256` / `streebog512`).
* **Хранилище сертификатов ALT Linux** — централизованная утилита `update-ca-trust` управляет доверенными сертификатами в `/usr/share/ca-certificates/` и `/etc/pki/ca-trust/source/anchors/`.

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Настройка Центра сертификации (CA) на сервере HQ-SRV

Выполните действия под пользователем `root` на сервере **HQ-SRV**:

### Шаг 1. Установка пакетов с поддержкой ГОСТ

```bash
apt-get update && apt-get install openssl openssl-engines-gost -y
```

Проверяем доступность модуля `gost`:
```bash
openssl engine -v gost
```

---

### Шаг 2. Создание рабочей директории и конфигурации OpenSSL

```bash
mkdir -p /root/ca && cd /root/ca
```

Создаём файл конфигурации `openssl-gost.cnf`:

```bash
vim /root/ca/openssl-gost.cnf
```

Вставьте следующую конфигурацию:

```ini
openssl_conf = openssl_def

[openssl_def]
engines = engine_section

[engine_section]
gost = gost_section

[gost_section]
engine_id = gost
default_algorithms = ALL
CRYPT_PARAMS = id-Gost28147-89-CryptoPro-A-ParamSet

[req]
default_bits = 2048
default_md = md_gost12_256
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = AU-TEAM
OU = IT
CN = au-team-RootCA

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = web.au-team.irpo
DNS.2 = docker.au-team.irpo
```

---

### Шаг 3. Генерация корневого сертификата CA (ГОСТ)

1. **Генерируем закрытый ключ корневого УЦ**:
   ```bash
   openssl genpkey -algorithm gost2012_256 \
     -pkeyopt paramset:A \
     -out rootca.key
   ```

2. **Выпускаем самоподписанный корневой сертификат CA**:
   ```bash
   openssl req -new -x509 -config openssl-gost.cnf \
     -key rootca.key \
     -out rootca.crt \
     -days 365 -extensions v3_ca
   ```

---

### Шаг 4. Выпуск серверного сертификата для веб-серверов на 30 дней

1. **Генерируем закрытый ключ сервера**:
   ```bash
   openssl genpkey -algorithm gost2012_256 \
     -pkeyopt paramset:A \
     -out server.key
   ```

2. **Формируем запрос на подпись сертификата (CSR)**:
   ```bash
   openssl req -new -config openssl-gost.cnf \
     -key server.key \
     -out server.csr
   ```

3. **Подписываем сертификат корневым ключом CA ровно на 30 дней**:
   ```bash
   openssl x509 -req -in server.csr \
     -CA rootca.crt -CAkey rootca.key -CAcreateserial \
     -out server.crt -days 30 \
     -extfile openssl-gost.cnf -extensions v3_req
   ```

4. **Проверяем срок действия сертификата**:
   ```bash
   openssl x509 -in server.crt -noout -dates
   ```

---

## 4. Передача сертификатов на маршрутизатор ISP и рабочую станцию HQ-CLI

С сервера **HQ-SRV** передаём сертификаты:

```bash
# Копируем сертификаты на ISP:
scp server.crt server.key rootca.crt root@172.16.1.1:/etc/nginx/

# Копируем корневой сертификат на HQ-CLI:
scp rootca.crt root@192.168.2.10:/tmp/
```

---

## 5. Настройка Nginx на маршрутизаторе ISP

Переходим на узел **ISP** под пользователем `root`.

Редактируем файл обратного прокси `/etc/nginx/sites-available.d/r-proxy.conf`:

```bash
vim /etc/nginx/sites-available.d/r-proxy.conf
```

Вносим обновлённую конфигурацию виртуальных хостов с поддержкой HTTPS:

```nginx
server {
    listen 80;
    server_name web.au-team.irpo docker.au-team.irpo;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name web.au-team.irpo;

    ssl_certificate /etc/nginx/server.crt;
    ssl_certificate_key /etc/nginx/server.key;

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
    listen 443 ssl;
    server_name docker.au-team.irpo;

    ssl_certificate /etc/nginx/server.crt;
    ssl_certificate_key /etc/nginx/server.key;

    location / {
        proxy_pass http://172.16.2.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Проверяем конфигурацию и перезапускаем Nginx:
```bash
nginx -t
systemctl restart nginx
```

---

## 6. Обеспечение доверия сертификату на рабочей станции HQ-CLI

Переходим на машину **HQ-CLI** под пользователем `root`:

### Шаг 1. Установка корневого сертификата в системное хранилище
```bash
cp /tmp/rootca.crt /etc/pki/ca-trust/source/anchors/
update-ca-trust
```

### Шаг 2. Добавление сертификата в базу браузера (NSS DB)
Для Яндекс Браузера / Chromium сертификат импортируется в базу NSS пользователя:

```bash
apt-get install libnss-sysinit nss-utils -y
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "au-team-RootCA" -i /tmp/rootca.crt
```

---

## 7. Проверка работы

На рабочей станции **HQ-CLI** откройте Яндекс Браузер и перейдите по адресам:
1. `https://web.au-team.irpo` — после ввода логина `WEB` и пароля `P@ssw0rd` открывается веб-приложение Apache, замок в адресной строке зелёный/безопасный без предупреждений.
2. `https://docker.au-team.irpo` — открывается контейнеризированное веб-приложение без предупреждений об ошибке безопасности.
