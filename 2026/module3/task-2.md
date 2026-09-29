---
title: "Задание №2: Настройка центра сертификации ГОСТ и HTTPS в Nginx"
description: "Пошаговая инструкция по настройке центра сертификации на базе ГОСТ Р 34.10-2012 / 34.11-2012, выпуску сертификатов на 30 дней, настройке HTTPS в Nginx на ISP и установке КриптоПро CSP на HQ-CLI"
---

# Задание №2: Настройка центра сертификации ГОСТ и HTTPS в Nginx

В данном задании на узле **ISP** настраивается Центр сертификации с использованием отечественных криптографических алгоритмов ГОСТ (`openssl-gost-engine`). 

Выпускаются сертификаты со сроком действия **30 дней** для доменных имён `web.au-team.irpo` и `docker.au-team.irpo`. Реверсивный прокси-сервер **Nginx** переводится на протокол **HTTPS** (порт 443) с ГОСТ-шифрованием. На рабочей станции **HQ-CLI** устанавливается СКЗИ **КриптоПро CSP**, импортируется корневой сертификат и проверяется защищённый доступ без предупреждений безопасности.

> [!IMPORTANT] Узлы выполнения
> 1. **ISP** — установка ГОСТ-движка OpenSSL, выпуск корневого и серверных сертификатов на 30 дней, перевод Nginx на HTTPS (порт 443).
> 2. **HQ-CLI** — копирование сертификата CA, обновление хранилища `ca-trust`, установка КриптоПро CSP через GUI и проверка сайтов в Яндекс Браузере.

---

## 1. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 2. Настройка Центра сертификации и Nginx на ISP

Все команды выполняются под пользователем `root` на машине **ISP**:

### Шаг 1. Разрешение входа root по SSH (для передачи файлов)

```bash
echo "PermitRootLogin yes" >> /etc/openssh/sshd_config
systemctl restart sshd
```

---

### Шаг 2. Установка ПО и активация ГОСТ-движка

```bash
apt-get install openssl openssl-engines -y
apt-get install openssl-gost-engine -y
control openssl-gost enabled
```

Проверяем доступность модуля ГОСТ и поддерживаемых шифров:

```bash
openssl engine
openssl ciphers | tr ':' '\n' | grep GOST
```

---

### Шаг 3. Создание корневого сертификата CA (ROOT-CA)

1. **Генерируем закрытый ключ корневого УЦ**:
   ```bash
   openssl genpkey -algorithm gost2012_256 \
     -pkeyopt paramset:TCB -out ca.key
   ```

2. **Выпускаем самоподписанный корневой сертификат**:
   ```bash
   openssl req -new -x509 -md_gost12_256 \
     -days 90 -key ca.key -out ca.crt
   ```
   > В поле **Common Name** обязательно укажите: `ROOT-CA.AU-TEAM.IRPO` (остальные поля можно пропустить нажатием `Enter`).

---

### Шаг 4. Создание ключей и запросов (CSR) для веб-серверов

1. **Генерируем закрытые ключи**:
   ```bash
   openssl genpkey -algorithm gost2012_256 \
     -pkeyopt paramset:A -out web.au-team.irpo.key

   openssl genpkey -algorithm gost2012_256 \
     -pkeyopt paramset:A -out docker.au-team.irpo.key
   ```

2. **Создаём запрос на сертификат для web.au-team.irpo**:
   ```bash
   openssl req -new -md_gost12_256 \
     -key web.au-team.irpo.key \
     -out web.au-team.irpo.csr
   ```
   > В поле **Common Name** обязательно укажите: `WEB.AU-TEAM.IRPO`

3. **Создаём запрос на сертификат для docker.au-team.irpo**:
   ```bash
   openssl req -new -md_gost12_256 \
     -key docker.au-team.irpo.key \
     -out docker.au-team.irpo.csr
   ```
   > В поле **Common Name** обязательно укажите: `DOCKER.AU-TEAM.IRPO`

---

### Шаг 5. Выпуск сертификатов веб-серверов ровно на 30 дней

Подписываем оба запроса корневым ключом УЦ со сроком действия **30 дней**:

```bash
openssl x509 -req -in web.au-team.irpo.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out web.au-team.irpo.crt -days 30

openssl x509 -req -in docker.au-team.irpo.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out docker.au-team.irpo.crt -days 30
```

Проверяем наличие созданных файлов сертификатов и доступность ГОСТ:

```bash
ls -l
openssl engine
openssl ciphers | tr ':' '\n' | grep GOST
```

---

### Шаг 6. Настройка HTTPS в Nginx

Открываем конфигурационный файл реверсивного прокси в редакторе `vim`:

```bash
vim /etc/nginx/sites-available.d/r-proxy.conf
```

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

Приведите файл конфигурации строго к следующему виду:

```nginx
server {
        listen 443 ssl;
        server_name web.au-team.irpo;

                ssl_certificate /root/web.au-team.irpo.crt; 
                ssl_certificate_key /root/web.au-team.irpo.key; 
                ssl_ciphers GOST2012-GOST8912-GOST8912; 
                ssl_protocols TLSv1.2; 
                ssl_prefer_server_ciphers on;
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
                ssl_certificate /root/docker.au-team.irpo.crt; 
                ssl_certificate_key /root/docker.au-team.irpo.key; 
                ssl_ciphers GOST2012-GOST8912-GOST8912; 
                ssl_protocols TLSv1.2; 
                ssl_prefer_server_ciphers on; 
        location / {
                proxy_pass http://172.16.2.10:8080;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
        }
}
```

Сохраняем изменения (`Esc` → `:wq` → `Enter`).

Проверяем синтаксис конфигурации Nginx и перезапускаем службу:

```bash
nginx -t
systemctl restart nginx
```

---

## 3. Настройка клиентской машины HQ-CLI

Выполните действия на рабочей станции **HQ-CLI**:

### Шаг 1. Импорт корневого сертификата CA с узла ISP

Копируем корневой сертификат `ca.crt` с маршрутизатора ISP в системное хранилище доверенных сертификатов:

```bash
scp root@172.16.1.1:~/ca.crt /etc/pki/ca-trust/source/anchors/
```

Обновляем системные доверенные хранилища:

```bash
update-ca-trust extract
```

---

### Шаг 2. Установка зависимостей и скачивание КриптоПро CSP

```bash
apt-get install cryptopro-preinstall -y

# Сохраняем ссылку на дистрибутив:
echo "https://disk.yandex.ru/d/6yI-K7zWPcPalg" > /home/user/link.txt
```

---

### Шаг 3. Установка КриптоПро через графический установщик

1. Открываем графический интерфейс (GUI) на **HQ-CLI**.
2. Открываем браузер, переходим по ссылке из файла `/home/user/link.txt`, скачиваем архив КриптоПро CSP.
3. Распаковываем скачанный архив в домашнюю директорию `/home/user/`.
4. В терминале переходим в папку с установщиком и запускаем графический мастер:

```bash
cd /home/user/linux-amd64/
./install_gui.sh
```

5. В появившемся окне мастера обязательно отмечаем следующие пакеты:
   * **Криптопровайдер КС1**
   * **Графические диалоги**
   * **cptools, многоцелевое графическое приложение**
   * **Браузерный плагин + CAdES**
   * **Импортировать корневые сертификаты из ОС**
6. Нажимаем кнопку **«Установить»**.
7. Запрос ввода лицензионного ключа **пропускаем**.

---

## 4. Проверка защищённого соединения

1. Перезапускаем **Яндекс Браузер**.
2. Переходим по адресам:
   * `https://web.au-team.irpo`
   * `https://docker.au-team.irpo`
3. Сайты должны открываться защищённым соединением со статусом: **«Сайт использует шифрование по ГОСТу»**.

---

## 5. Решение проблем: ручная привязка сертификата в КриптоПро

> [!WARNING] ВНИМАНИЕ: Если выходит ошибка или предупреждение о ненадёжности!
> Это означает, что корневой сертификат не подтянулся браузером автоматически. Его необходимо импортировать вручную через утилиту КриптоПро:
> 1. Открываем: **Меню** → **Инструменты КриптоПро**.
> 2. Водите курсором мыши (датчик случайных чисел), пока не откроется программа.
> 3. Перейдите во вкладку: **Сертификаты** → **Установить сертификаты**.
> 4. Выберите сертификат по пути: `/etc/pki/ca-trust/source/anchors/ca.crt`.
> 5. Подтвердите установку и заново откройте сайты в Яндекс Браузере.
