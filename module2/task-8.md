---
title: "Задание №8: Статический проброс портов (DNAT) на роутерах"
description: "Пошаговая настройка статической трансляции портов (Port Forwarding / DNAT) с помощью nftables на маршрутизаторах HQ-RTR и BR-RTR в ALT Linux для публикации веб-сервисов и SSH"
---

# Задание №8: Статический проброс портов (DNAT) на роутерах

В данном задании на пограничных маршрутизаторах главного офиса (**HQ-RTR**) и филиала (**BR-RTR**) настраивается статическая трансляция сетевых адресов назначения (**Destination NAT / Port Forwarding**) с помощью подсистемы **`nftables`**.

Проброс портов позволяет внешним узлам (включая маршрутизатор `ISP` и будущий обратный прокси Nginx) обращаться к внутренним серверам филиалов, находящимся за NAT в приватных изолированных сетях:
* Веб-приложение Apache на `HQ-SRV` публикуется снаружи через порт `8080`.
* Веб-приложение Docker `tespapp` на `BR-SRV` публикуется снаружи через порт `8080`.
* Доступ к серверам по защищенному протоколу SSH транслируется через порт `2026`.

> [!IMPORTANT] Место выполнения
> Все действия выполняются под пользователем `root` на пограничных маршрутизаторах:
> 1. **HQ-RTR** — публикация веб-сервера `HQ-SRV` (`8080 → 80`) и SSH (`2026 → 2026`).
> 2. **BR-RTR** — публикация Docker-приложения `BR-SRV` (`8080 → 8080`) и SSH (`2026 → 2026`).

---

## 1. Теоретическая справка: Destination NAT (DNAT) в nftables

### Чем DNAT отличается от SNAT?
* **Source NAT (SNAT / Masquerade)**, который мы настраивали в Модуле №1, срабатывает в цепочке **`postrouting`** и подменяет IP-адрес *источника*, когда клиент из локальной сети выходит в Интернет.
* **Destination NAT (DNAT / Port Forwarding)** срабатывает в цепочке **`prerouting`** (до принятия решения о маршрутизации) и подменяет IP-адрес и порт *назначения*, перенаправляя входящие извне пакеты на конкретный внутренний хост.

### Разбор синтаксиса команд nftables:
* `nft add chain nat prerouting { type nat hook prerouting priority dstnat \; }`:
  * Добавляет в существующую таблицу `nat` цепочку с именем `prerouting`.
  * `type nat hook prerouting` — привязывает цепочку к стандартному хуку ядра перед маршрутизацией.
  * `priority dstnat` — выставляет приоритет `-100`, необходимый для обработки трансляции назначения.
* `iif "enp7s1"` (**I**nbound **I**nter**f**ace) — правило применяется только к пакетам, приходящим на внешний интерфейс со стороны провайдера ISP.
* `tcp dport 8080 dnat to 192.168.1.10:80` — перенаправляет TCP-трафик с внешнего порта `8080` на порт `80` внутреннего сервера `HQ-SRV`.
* `tcp dport { 8080, 2026 } dnat to 192.168.3.10` — группировка наборов портов (`set`) в `nftables`. Если внутренние и внешние порты совпадают (порт в порт), их можно перечислить через запятую в фигурных скобках в одном правиле.

---

## 2. Настройка на маршрутизаторе HQ-RTR

Выполняем команды под пользователем `root` на машине **HQ-RTR**:

```bash
# 1. Создаём цепочку prerouting для трансляции адресов назначения
nft add chain nat prerouting { type nat hook prerouting priority dstnat \; }

# 2. Пробрасываем SSH: внешний порт 2026 -> 192.168.1.10:2026
nft add rule nat prerouting iif "enp7s1" tcp dport 2026 dnat to 192.168.1.10

# 3. Пробрасываем веб-сайт: внешний порт 8080 -> 192.168.1.10:80 (порт Apache)
nft add rule nat prerouting iif "enp7s1" tcp dport 8080 dnat to 192.168.1.10:80

# 4. Проверяем сформированные правила в оперативной памяти
nft list ruleset

# 5. Сохраняем итоговые правила в файл постоянной конфигурации
nft list ruleset > /etc/nftables/nftables.nft

# 6. Перезапускаем службу nftables для проверки корректности файла
systemctl restart nftables

# 7. Финально убеждаемся, что правила загрузились после перезапуска
nft list ruleset
```

### Ожидаемый вид таблицы nat в выводе nft list ruleset:
```text
table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat; policy accept;
        oifname "enp7s1" masquerade
    }

    chain prerouting {
        type nat hook prerouting priority dstnat; policy accept;
        iif "enp7s1" tcp dport 2026 dnat to 192.168.1.10
        iif "enp7s1" tcp dport 8080 dnat to 192.168.1.10:80
    }
}
```

---

## 3. Настройка на маршрутизаторе BR-RTR

Выполняем команды под пользователем `root` на машине **BR-RTR**:

```bash
# 1. Создаём цепочку prerouting для трансляции адресов назначения
nft add chain nat prerouting { type nat hook prerouting priority dstnat \; }

# 2. Пробрасываем сразу оба порта (8080 и 2026) на сервер BR-SRV (192.168.3.10)
nft add rule nat prerouting iif "enp7s1" tcp dport { 8080, 2026 } dnat to 192.168.3.10

# 3. Проверяем правила в оперативной памяти
nft list ruleset

# 4. Сохраняем правила в файл постоянной конфигурации
nft list ruleset > /etc/nftables/nftables.nft

# 5. Перезапускаем службу nftables
systemctl restart nftables

# 6. Проверяем статус правил после перезапуска
nft list ruleset
```

### Ожидаемый вид таблицы nat в выводе nft list ruleset:
```text
table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat; policy accept;
        oifname "enp7s1" masquerade
    }

    chain prerouting {
        type nat hook prerouting priority dstnat; policy accept;
        iif "enp7s1" tcp dport { 8080, 2026 } dnat to 192.168.3.10
    }
}
```

---

## 4. Верификация проброса портов с маршрутизатора ISP

Для проверки корректности трансляции переходим на маршрутизатор **ISP** (внешняя точка) и выполняем запросы к внешним IP-адресам роутеров филиалов:

```bash
# 1. Проверяем веб-приложение HQ (порт 8080 роутера HQ-RTR)
curl -I http://172.16.1.2:8080
# Ожидаемый ответ: HTTP/1.1 200 OK (отвечает веб-сервер Apache с HQ-SRV)

# 2. Проверяем Docker-приложение филиала (порт 8080 роутера BR-RTR)
curl -I http://172.16.2.2:8080
# Ожидаемый ответ: HTTP/1.1 200 OK (отвечает приложение tespapp с BR-SRV)

# 3. Проверяем доступность порта SSH HQ-SRV через внешний адрес HQ-RTR
nc -zv 172.16.1.2 2026
# Вывод: Connection to 172.16.1.2 2026 port [tcp/*] succeeded!

# 4. Проверяем доступность порта SSH BR-SRV через внешний адрес BR-RTR
nc -zv 172.16.2.2 2026
# Вывод: Connection to 172.16.2.2 2026 port [tcp/*] succeeded!
```

> [!NOTE] Итог выполнения Задания №8
> Статическая трансляция портов DNAT полностью настроена на обоих маршрутизаторах, правила зафиксированы в `/etc/nftables/nftables.nft`, а внутренние веб- и SSH-сервисы доступны для внешних подключений.
