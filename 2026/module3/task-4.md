---
title: "Задание №4: Межсетевой экран nftables на маршрутизаторах HQ-RTR и BR-RTR"
description: "Пошаговая настройка пакетной фильтрации на базе nftables на маршрутизаторах HQ-RTR и BR-RTR: разрешение DNS, HTTP, HTTPS, NTP, ICMP, OSPF, GRE, внутренних подсетей и блокировка несанкционированного входящего трафика"
---

# Задание №4: Межсетевой экран nftables на маршрутизаторах HQ-RTR и BR-RTR

::: tip 📺 Видео-разбор задания
Видео-разбор выполнения задания доступен по ссылке: [https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d](https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d)
:::

В данном задании на пограничных маршрутизаторах **HQ-RTR** и **BR-RTR** настраивается межсетевой экран на базе **nftables**. 

В конфигурационный файл добавляется таблица `inet filter` с цепочкой `input`, разрешающей прохождение сетевых протоколов (DNS, HTTP, HTTPS, NTP, ICMP, GRE, OSPF, UDP 500), доступ из внутренних доверенных офисных подсетей и установленные соединения, а весь остальной входящий IPv4-трафик со стороны внешней сети сбрасывается (`drop`).

> [!IMPORTANT] Где выполнять
> 1. **HQ-RTR** — внесение таблицы `inet filter` в `/etc/nftables/hq-rtr.nft` и перезапуск `nftables`.
> 2. **BR-RTR** — внесение таблицы `inet filter` в `/etc/nftables/br-rtr.nft` и перезапуск `nftables`.

---

## 1. Разбор правил цепочки filter input

Каждое правило в таблице `inet filter` выполняет строго определённую роль:
* **`udp dport 53 accept;`** — разрешение работы DNS-запросов по UDP.
* **`tcp dport 80 accept;`** — разрешение входящего трафика протокола HTTP.
* **`tcp dport 443 accept;`** — разрешение защищённого веб-трафика HTTPS.
* **`tcp dport 123 accept;`** — разрешение синхронизации времени по протоколу NTP.
* **`ct state {established, related} accept;`** — отслеживание состояния соединений (разрешает прохождение ответов на уже инициированные легитимные запросы).
* **`ip protocol gre accept;`** — разрешение инкапсулированного трафика туннелей GRE (протокол IP 47).
* **`ip protocol icmp accept;`** — разрешение служебных сообщений ICMP (ping, path MTU discovery).
* **`ip protocol ospf accept;`** — разрешение служебного трафика динамической маршрутизации OSPF (протокол IP 89).
* **`udp dport 500 accept;`** — разрешение протокола ISAKMP/IKE для защищённых IPsec-соединений.
* **`ip saddr 192.168.100.0/27 accept;`** — полный доступ из серверного сегмента HQ-SRV (VLAN 100).
* **`ip saddr 192.168.200.0/28 accept;`** — полный доступ из клиентского сегмента HQ-CLI (VLAN 200).
* **`ip saddr 192.168.30.0/28 accept;`** — полный доступ из сегмента филиала BR-SRV.
* **`ip version 4 drop;`** — сброс (блокировка) всех остальных входящих пакетов протокола IPv4 из внешней сети Интернет.

---

## 2. Настройка на маршрутизаторе HQ-RTR

Выполните действия под пользователем `root` на маршрутизаторе **HQ-RTR**:

### Шаг 1. Редактирование файла конфигурации /etc/nftables/hq-rtr.nft

Открываем конфигурационный файл nftables:

```bash
nano /etc/nftables/hq-rtr.nft
```

В начало файла (перед существующей таблицей `inet nat`) добавляем блок таблицы `inet filter`:

```text
table inet filter {
        chain input {
                type filter hook input priority filter;
                udp dport 53 accept;
                tcp dport 80 accept;
                tcp dport 443 accept;
                tcp dport 123 accept;
                ct state {established, related} accept;
                ip protocol gre accept;
                ip protocol icmp accept;
                ip protocol ospf accept;
                udp dport 500 accept;
                ip saddr 192.168.100.0/27 accept;
                ip saddr 192.168.200.0/28 accept;
                ip saddr 192.168.30.0/28 accept;
                ip version 4 drop;
        }
}
```

Сохраняем изменения (`Ctrl + O` → `Enter` → `Ctrl + X`).

![Таблица inet filter на HQ-RTR](/images/m3-task4-hq-rtr.png)

---

### Шаг 2. Перезапуск службы nftables на HQ-RTR

Применяем созданные правила перезапуском демона:

```bash
systemctl restart nftables
```

Проверяем статус службы:
```bash
systemctl status nftables
```

---

## 3. Настройка на маршрутизаторе BR-RTR

Выполните действия под пользователем `root` на маршрутизаторе **BR-RTR**:

### Шаг 1. Редактирование файла конфигурации /etc/nftables/br-rtr.nft

Открываем конфигурационный файл nftables:

```bash
nano /etc/nftables/br-rtr.nft
```

Вносим аналогичную таблицу `inet filter` перед таблицей `inet nat`:

```text
table inet filter {
        chain input {
                type filter hook input priority filter;
                udp dport 53 accept;
                tcp dport 80 accept;
                tcp dport 443 accept;
                tcp dport 123 accept;
                ct state {established, related} accept;
                ip protocol gre accept;
                ip protocol icmp accept;
                ip protocol ospf accept;
                udp dport 500 accept;
                ip saddr 192.168.100.0/27 accept;
                ip saddr 192.168.200.0/28 accept;
                ip saddr 192.168.30.0/28 accept;
                ip version 4 drop;
        }
}
```

Сохраняем изменения (`Ctrl + O` → `Enter` → `Ctrl + X`).

![Таблица inet filter на BR-RTR](/images/m3-task4-br-rtr.png)

---

### Шаг 2. Перезапуск службы nftables на BR-RTR

Перезапускаем службу для применения правил фильтрации:

```bash
systemctl restart nftables
```

Проверяем статус службы:
```bash
systemctl status nftables
```

---

## 4. Проверка работы брандмауэра

1. **Просмотр загруженного набора правил**:
   ```bash
   nft list ruleset
   ```
   В выводе должны одновременно присутствовать обе таблицы: `table inet filter` (с цепочкой `input`) и `table inet nat` (с цепочками `PREROUTING` и `POSTROUTING`).

2. **Проверка связанности и сервисов**:
   * Пинг между офисами и к провайдеру: `ping 172.16.1.1 -c 3` (разрешён правилом `ip protocol icmp accept`).
   * Соседство OSPF сохраняется активным (разрешено правилом `ip protocol ospf accept`).
   * DNS, HTTP, HTTPS и NTP свободно проходят через межсетевой экран.
   * Все паразитные и несанкционированные входящие запросы блокируются финальным правилом `ip version 4 drop`.
