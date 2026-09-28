---
title: "Задание №4: Межсетевой экран nftables на маршрутизаторах HQ-RTR и BR-RTR"
description: "Настройка брандмауэра (Stateful Firewall) на базе nftables на маршрутизаторах HQ-RTR и BR-RTR со стороны провайдера ISP: разрешение HTTP, HTTPS, DNS, NTP, ICMP, туннелей и блокировка несанкционированного входящего трафика"
---

# Задание №4: Межсетевой экран nftables на маршрутизаторах HQ-RTR и BR-RTR

В данном задании на внешних интерфейсах маршрутизаторов **HQ-RTR** и **BR-RTR**, смотрящих в сторону провайдера **ISP** (интерфейс `enp7s1`), настраивается межсетевой экран (брандмауэр) на базе **nftables**.

Брандмауэр обеспечивает состояние соединений (Stateful Inspection), разрешает прохождение служебного трафика (HTTP, HTTPS, DNS, NTP, ICMP, туннели, опубликованные сервисы) и надёжно отбрасывает (`drop`) все остальные несанкционированные входящие подключения из внешней сети.

> [!IMPORTANT] Где выполнять
> 1. **HQ-RTR** — настройка цепочек `filter input` и `filter forward` на внешнем интерфейсе `enp7s1`.
> 2. **BR-RTR** — аналогичная настройка правил фильтрации для интерфейса `enp7s1`.

---

## 1. Теоретическая справка: архитектура фильтрации в nftables

В отличие от устаревшего iptables, **nftables** использует единую быструю виртуальную машину правил в ядре Linux. 

Для реализации требований задания используются две основные цепочки таблицы `inet filter`:
* **`input`** — трафик, адресованный непосредственно самому маршрутизатору (например, входящий SSH, пинг, туннели WireGuard/GRE).
* **`forward`** — транзитный трафик, проходящий через маршрутизатор (например, исходящие сессии клиентов в Интернет и обратные ответы, а также проброшенные через DNAT запросы к веб-серверам).

### Ключевое правило Stateful Firewall:
```text
ct state established,related accept
```
Данное правило разрешает прохождение всех входящих пакетов, принадлежащих уже открытым легитимным сессиям (например, ответы от веб-сайтов на запросы клиентов офиса).

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Настройка межсетевого экрана на HQ-RTR

Выполняем команды под пользователем `root` на маршрутизаторе **HQ-RTR**:

```bash
# 1. Создаём таблицу фильтрации:
nft add table inet filter

# 2. Создаём базовые цепочки с политикой по умолчанию:
nft add chain inet filter input { type filter hook input priority 0 \; policy drop \; }
nft add chain inet filter forward { type filter hook forward priority 0 \; policy drop \; }

# 3. Разрешаем трафик локальной петли (lo) и внутренних офисных интерфейсов:
nft add rule inet filter input iif "lo" accept
nft add rule inet filter input iif != "enp7s1" accept
nft add rule inet filter forward iif != "enp7s1" accept

# 4. Разрешаем ответы на установленные соединения (Stateful Inspection):
nft add rule inet filter input ct state established,related accept
nft add rule inet filter forward ct state established,related accept
nft add rule inet filter input ct state invalid drop
nft add rule inet filter forward ct state invalid drop

# 5. Разрешаем входящий ICMP (ping):
nft add rule inet filter input icmp type { echo-request, echo-reply, destination-unreachable, time-exceeded } accept

# 6. Разрешаем разрешённые протоколы и сервисы со стороны ISP:
nft add rule inet filter input iif "enp7s1" tcp dport { 80, 443, 2026 } accept
nft add rule inet filter input iif "enp7s1" udp dport { 53, 123, 51820 } accept

# 7. Разрешаем транзитный трафик к проброшенным сервисам (DNAT):
nft add rule inet filter forward iif "enp7s1" tcp dport { 80, 8080, 2026 } accept
```

Сохраняем конфигурацию и перезапускаем службу:
```bash
nft list ruleset > /etc/nftables/nftables.nft
systemctl restart nftables
```

---

## 4. Настройка межсетевого экрана на BR-RTR

Выполняем аналогичные команды под пользователем `root` на маршрутизаторе **BR-RTR**:

```bash
# 1. Создаём таблицу фильтрации:
nft add table inet filter

# 2. Создаём цепочки:
nft add chain inet filter input { type filter hook input priority 0 \; policy drop \; }
nft add chain inet filter forward { type filter hook forward priority 0 \; policy drop \; }

# 3. Разрешаем трафик loopback и внутренних сетей:
nft add rule inet filter input iif "lo" accept
nft add rule inet filter input iif != "enp7s1" accept
nft add rule inet filter forward iif != "enp7s1" accept

# 4. Разрешаем установленные сессии:
nft add rule inet filter input ct state established,related accept
nft add rule inet filter forward ct state established,related accept
nft add rule inet filter input ct state invalid drop
nft add rule inet filter forward ct state invalid drop

# 5. Разрешаем ICMP (ping):
nft add rule inet filter input icmp type { echo-request, echo-reply, destination-unreachable, time-exceeded } accept

# 6. Разрешаем входящие протоколы:
nft add rule inet filter input iif "enp7s1" tcp dport { 80, 443, 2026 } accept
nft add rule inet filter input iif "enp7s1" udp dport { 53, 123, 51820 } accept

# 7. Разрешаем транзитный трафик DNAT к BR-SRV:
nft add rule inet filter forward iif "enp7s1" tcp dport { 8080, 2026 } accept
```

Сохраняем правила в постоянную конфигурацию:
```bash
nft list ruleset > /etc/nftables/nftables.nft
systemctl restart nftables
```

---

## 5. Проверка работы межсетевого экрана

1. **Проверка просмотра активных правил**:
   ```bash
   nft list ruleset
   ```

2. **Проверка исходящего доступа с клиентов**:
   С рабочей станции `HQ-CLI` проверяем доступность внешних ресурсов:
   ```bash
   ping 172.16.1.1 -c 3
   curl -I https://yandex.ru
   ```

3. **Проверка блокировки запрещённых подключений**:
   С маршрутизатора `ISP` пробуем подключиться к случайному закрытому порту роутера (например, порт 9999):
   ```bash
   nc -zv -w 2 172.16.1.2 9999
   ```
   Подключение должно завершаться таймаутом (drop), подтверждая активную защиту межсетевого экрана.
