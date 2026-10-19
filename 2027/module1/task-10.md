---
title: "Задание №10: Инфраструктура службы доменных имён (BIND) | 2027"
description: "Пошаговая настройка DNS-сервера BIND 9 на сервере HQ-SRV: прямая зона au-team.irpo, обратные зоны PTR для сетей офисов и серверы пересылки"
---

# Задание №10: Инфраструктура службы доменных имён (BIND) (2027)

::: tip 📺 Видео-разбор задания
*В процессе разработки*
:::

В данном задании на сервере главного офиса (**HQ-SRV**) развёртывается корпоративный DNS-сервер **BIND 9** (`bind`).

Сервер обеспечивает сопоставление доменных имён в IP-адреса (прямая зона) и IP-адресов в доменные имена (обратная зона PTR) для домена `.au-team.irpo`, а также перенаправляет внешние запросы в Интернет через серверы пересылки (*Forwarders*).

::: info 📍 Место выполнения
Все действия выполняются под пользователем `root` на сервере **HQ-SRV** (`hq-srv.au-team.irpo`).
:::

---

## Шаг 1. Установка пакетов и генерация ключа RNDC

Скачиваем и устанавливаем службу и утилиты сетевой диагностики:
```bash
# 1. Устанавливаем BIND и утилиты запросов (dig, host, nslookup):
apt-get update && apt-get install bind bind-utils -y

# 2. Генерируем ключ управления сервером RNDC:
rndc-confgen -a -c /etc/bind/rndc.key
```

---

## Шаг 2. Настройка конфигурации BIND (options.conf)

Открываем конфигурационный файл службы:
```bash
nano /etc/bind/options.conf
```

Полностью очищаем файл и записываем следующую конфигурацию:
```bash
cat << 'EOF' > /etc/bind/options.conf
options {
    listen-on port 53 { 127.0.0.1; 192.168.100.2; };
    listen-on-v6 port 53 { none; };
    forwarders { 77.88.8.8; };
    recursion yes;
    allow-recursion { any; };
    allow-query { 192.168.100.0/27; 192.168.200.0/28; 172.16.20.0/28; };
    dnssec-validation no;
    directory "/etc/bind/zone";
    dump-file "/var/run/named/named_dump.db";
    statistics-file "/var/run/named/named.stats";
    pid-file "/var/run/named/named.pid";
};

logging {
    category default { default_syslog; };
};

zone "au-team.irpo" {
    type master;
    file "au-team.irpo";
};

zone "100.168.192.in-addr.arpa" {
    type master;
    file "au-team_rev1.db";
};

zone "20.16.172.in-addr.arpa" {
    type master;
    file "au-team_rev2.db";
};
EOF
```

#### 🔍 Разбор ключевых параметров:
* **`listen-on port 53 { 127.0.0.1; 192.168.100.2; };`** — интерфейсы, на которых демон принимает DNS-запросы.
* **`forwarders { 77.88.8.8; };`** — общедоступный DNS-сервер, на который перенаправляются внешние запросы (Яндекс DNS).
* **`allow-query`** — список подсетей компании, которым разрешено делать запросы к серверу.
* **`dnssec-validation no;`** — отключение валидации DNSSEC для упрощения локального резолвинга.
* **`zone "au-team.irpo"`** — описание прямой зоны.
* **`zone "...in-addr.arpa"`** — описание обратных зон для подсетей `192.168.100.0/27` и `172.16.20.0/28`.

---

## Шаг 3. Настройка файла прямой зоны (au-team.irpo)

Создаём файл описания зоны `/etc/bind/zone/au-team.irpo`:
```bash
cat << 'EOF' > /etc/bind/zone/au-team.irpo
$TTL 1D
@       IN      SOA     au-team.irpo.  root.au-team.irpo. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum

        IN      NS      au-team.irpo.
        IN      A       192.168.100.2
hq-rtr  IN      A       192.168.100.1
hq-rtr  IN      A       192.168.200.1
hq-rtr  IN      A       192.168.99.1
br-rtr  IN      A       172.16.10.1
hq-srv  IN      A       192.168.100.2
hq-cli  IN      A       192.168.200.2
br-fw   IN      A       172.16.10.2
br-srv  IN      A       172.16.20.2
docker  IN      A       172.16.1.1
web     IN      A       172.16.2.1
EOF
```

::: warning ⚠️ Обратите внимание на точки в конце имён!
В файлах зон BIND точка в конце имени (например, `au-team.irpo.`) означает абсолютное доменное имя (FQDN). Если не поставить точку, BIND автоматически добавит к записи имя текущей зоны, что приведёт к ошибке конфигурации.
:::

---

## Шаг 4. Настройка файла обратной зоны VLAN 100 (100.168.192.in-addr.arpa)

Создаём файл обратной зоны для узлов главного офиса:
```bash
cat << 'EOF' > /etc/bind/zone/au-team_rev1.db
$TTL 1D
@       IN      SOA     au-team.irpo. root.au-team.irpo. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
        IN      NS      au-team.irpo.
2       IN      PTR     hq-srv.au-team.irpo.
EOF
```

---

## Шаг 5. Настройка файла обратной зоны филиала (20.16.172.in-addr.arpa)

Создаём файл обратной зоны для узлов филиала:
```bash
cat << 'EOF' > /etc/bind/zone/au-team_rev2.db
$TTL 1D
@       IN      SOA     au-team.irpo. root.au-team.irpo. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
        IN      NS      au-team.irpo.
2       IN      PTR     br-srv.au-team.irpo.
EOF
```

---

## Шаг 6. Назначение прав и запуск службы BIND

```bash
# 1. Передаем права владения файлами зон системной группе named:
chown :named /etc/bind/zone/au-team.irpo /etc/bind/zone/au-team_rev1.db /etc/bind/zone/au-team_rev2.db

# 2. Включаем автозапуск и стартуем службу BIND:
systemctl enable --now bind

# 3. Меняем системный DNS сервер на HQ-SRV на адрес самого себя:
echo 'nameserver 192.168.100.2' > /etc/net/ifaces/ens18/resolv.conf

# 4. Перезапускаем сеть:
systemctl restart network

# 5. Перезапускаем сервис BIND для применения свежих зон:
systemctl restart bind
```

---

## Шаг 7. Переключение DNS сервера на BR-SRV

Перейдите на сервер филиала **BR-SRV** и направьте DNS на центральный сервер компании:

```bash
# 1. Задаем корпоративный DNS-сервер:
cat << 'EOF' > /etc/net/ifaces/ens18/resolv.conf
search au-team.irpo
nameserver 192.168.100.2
EOF

# 2. Перезапускаем сеть для обновления /etc/resolv.conf:
systemctl restart network
```

---

## Шаг 8. Проверка работоспособности (Верификация)

Выполните тестовые запросы утилитой `host` с машины **HQ-CLI**:

### 1. Проверка разрешения внутреннего имени (прямая зона):
```bash
host br-rtr
```
![Проверка прямой зоны BIND](/images/2027/m1-t10-host-br-rtr.png)

---

### 2. Проверка обратного разрешения IP в имя (обратная зона PTR):
```bash
host 192.168.100.2
```
![Проверка обратной зоны PTR](/images/2027/m1-t10-host-ptr.png)

---

### 3. Проверка работы DNS со стороны сервера филиала BR-SRV:
На сервере **BR-SRV** отправьте пинг по доменному имени зоны:
```bash
ping -c 4 au-team.irpo
```
![Проверка DNS с BR-SRV](/images/2027/m1-t10-br-srv-ping.png)
