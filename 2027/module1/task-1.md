---
title: "Задание №1: Базовая настройка сети и хостов | 2027"
description: "Пошаговое руководство с подробным разбором команд: FQDN, архитектура etcnet, расчет подсетей RFC 1918 и конфигурирование интерфейсов узлов стенда 2027 года в ALT Linux"
---

# Задание №1: Базовая настройка сети и хостов (2027)

::: tip 📺 Видео-разбор задания
Видео-разбор выполнения задания доступен по ссылке: [https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d](https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d)
:::

Практическое руководство по выполнению базовой настройки сетевой инфраструктуры в **ALT Linux**.

В данном задании подробно разбирается не только последовательность действий, но и **логика работы подсистемы `etcnet`**, а также используемые конструкции командной строки **Bash**.

---

## 1. Как устроена сеть в ALT Linux (подсистема etcnet)

В отличие от Debian/Ubuntu (`netplan`, `/etc/network/interfaces`) или RHEL (`NetworkManager`), в ALT Linux традиционно используется подсистема **etcnet**.

Все настройки интерфейсов хранятся в каталоге `/etc/net/ifaces/`. **Один интерфейс = одна папка**.

Внутри папки интерфейса создаются простые текстовые файлы:
* **`options`** — тип интерфейса и его свойства (`TYPE=eth` для физической карты, `TYPE=vlan` для виртуального саб-интерфейса, `HOST=...` — физический порт-носитель VLAN, `VID=...` — номер тега VLAN).
* **`ipv4address`** — IP-адрес с префиксом маски (например, `192.168.100.1/27`).
* **`ipv4route`** — статические маршруты или шлюз по умолчанию (`default via 172.16.1.1`).
* **`resolv.conf`** — настройки DNS для данного интерфейса (`nameserver 77.88.8.8`, `search au-team.irpo`).

---

## 2. Сводная таблица адресации (Таблица 2)

Используйте данную таблицу как эталон при настройке каждого узла:

| Устройство | Интерфейс | IP-адрес / Префикс | Шлюз по умолчанию | DNS-сервер | Описание / Назначение |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISP** | `ens19` | `172.16.1.1/28` | — | — | Линк в сторону HQ-RTR |
| **ISP** | `ens20` | `172.16.2.1/28` | — | — | Линк в сторону BR-RTR |
| **HQ-RTR** | `ens18` | `172.16.1.2/28` | `172.16.1.1` | `77.88.8.8` | Внешний линк к ISP |
| **HQ-RTR** | `vlan100` | `192.168.100.1/27` | — | — | Сеть серверов HQ (до 32 IP) |
| **HQ-RTR** | `vlan200` | `192.168.200.1/24` | — | — | Сеть клиентов HQ (от 16 IP) |
| **HQ-RTR** | `vlan999` | `192.168.99.1/29` | — | — | Сеть управления (до 8 IP) |
| **HQ-SRV** | `ens18` | `192.168.100.2/27` | `192.168.100.1` | `77.88.8.8` | Сервер главного офиса HQ |
| **BR-RTR** | `ens18` | `172.16.2.2/28` | `172.16.2.1` | `77.88.8.8` | Внешний линк к ISP |
| **BR-RTR** | `ens19` | `172.16.10.1/30` | — | — | Локальная сеть филиала BR |
| **BR-FW** | `ens18` | `172.16.10.2/30` | `172.16.10.1` | `77.88.8.8` | В сторону BR-RTR |
| **BR-FW** | `ens19` | `172.16.20.1/28` | — | — | В сторону BR-SRV |
| **BR-SRV** | `ens18` | `172.16.20.2/28` | `172.16.20.1` | `77.88.8.8` | Сервер филиала BR |

---

## Шаг 1. Настройка FQDN имён хостов

Команда `hostnamectl set-hostname` навсегда прописывает имя хоста в системе (в файл `/etc/hostname`).

Команда `exec bash` через точку с запятой заменяет текущий процесс оболочки на новый, благодаря чему **приглашение командной строки (`prompt`) обновляется мгновенно** без необходимости перезагружать систему или заново подключаться по SSH.

```bash
# На узле ISP:
hostnamectl set-hostname isp.au-team.irpo; exec bash

# На узле HQ-RTR:
hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash

# На узле HQ-SRV:
hostnamectl set-hostname hq-srv.au-team.irpo; exec bash

# На узле HQ-CLI:
hostnamectl set-hostname hq-cli.au-team.irpo; exec bash

# На узле BR-RTR:
hostnamectl set-hostname br-rtr.au-team.irpo; exec bash

# На узле BR-FW:
hostnamectl set-hostname br-fw.au-team.irpo; exec bash

# На узле BR-SRV:
hostnamectl set-hostname br-srv.au-team.irpo; exec bash
```

---

## Шаг 2. Настройка сетевых интерфейсов

### 2.1. Настройка ISP
Маршрутизатор ISP соединяет два офиса через интерфейсы `ens19` и `ens20`.

```bash
# 1. Создаем каталоги настроек сразу для двух интерфейсов ens19 и ens20.
# Конструкция ens{19,20} раскрывается оболочкой в два аргумента: ens19 и ens20:
mkdir -p /etc/net/ifaces/ens{19,20}

# 2. Указываем тип интерфейсов.
# Утилита tee принимает поток от echo и записывает строку 'TYPE=eth' 
# одновременно в два файла: ens19/options и ens20/options:
echo 'TYPE=eth' | tee /etc/net/ifaces/ens{19,20}/options

# 3. Назначаем статические IP-адреса на каждый интерфейс:
echo '172.16.1.1/28' > /etc/net/ifaces/ens19/ipv4address
echo '172.16.2.1/28' > /etc/net/ifaces/ens20/ipv4address

# 4. Включаем пересылку пакетов (маршрутизацию):
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p

# 5. Применяем настройки и проверяем состояние:
systemctl restart network
clear
ip -c --br a
```

::: tip 💡 Что означает `ip -c --br a`?
* `-c` (*color*) — подсвечивает состояния интерфейсов цветом (зеленый = UP, красный = DOWN).
* `--br` (*brief*) — выводит таблицу компактно: `Имя интерфейса | Статус | IP-адрес`.
:::

---

### 2.2. Настройка HQ-RTR (Центральный маршрутизатор)

У маршрутизатора HQ есть внешний линк к ISP (`ens18`) и внутренний транк-порт (`ens19`), по которому передаются тегированные пакеты VLAN 100, 200 и 999.

```bash
# 1. Создаем каталоги для физических портов, VLAN-интерфейсов и туннеля gre1:
mkdir -p /etc/net/ifaces/{ens{18,19},vlan{100,200,999},gre1}

# 2. Физическим интерфейсам ens18 и ens19 задаем тип Ethernet:
echo 'TYPE=eth' | tee /etc/net/ifaces/ens{18,19}/options

# 3. Настраиваем внешний интерфейс ens18 (в сторону ISP):
echo '172.16.1.2/28' > /etc/net/ifaces/ens18/ipv4address
echo 'default via 172.16.1.1' > /etc/net/ifaces/ens18/ipv4route
echo 'nameserver 77.88.8.8' > /etc/net/ifaces/ens18/resolv.conf

# 4. Настраиваем виртуальные интерфейсы VLAN (100, 200, 999).
# Команда xargs берет каждый номер VLAN по очереди и создает файл options:
echo $'100\n200\n999' | xargs -i bash -c 'echo -e "TYPE=vlan\nHOST=ens19\nVID={}" > /etc/net/ifaces/vlan{}/options'

# 5. Назначаем IP-адреса на созданные VLAN-интерфейсы:
echo '192.168.100.1/27' > /etc/net/ifaces/vlan100/ipv4address
echo '192.168.200.1/24' > /etc/net/ifaces/vlan200/ipv4address
echo '192.168.99.1/29'  > /etc/net/ifaces/vlan999/ipv4address

# 6. Включаем пересылку пакетов (маршрутизацию):
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p

# 7. Применяем настройки и проверяем состояние:
systemctl restart network
clear
ip -c --br a
```

::: tip 💡 Как настроить VLAN вручную (если забыли команду с xargs)?
Вы можете настроить каждый VLAN отдельно тремя простыми командами:
```bash
# Для vlan100:
echo -e "TYPE=vlan\nHOST=ens19\nVID=100" > /etc/net/ifaces/vlan100/options

# Для vlan200:
echo -e "TYPE=vlan\nHOST=ens19\nVID=200" > /etc/net/ifaces/vlan200/options

# Для vlan999:
echo -e "TYPE=vlan\nHOST=ens19\nVID=999" > /etc/net/ifaces/vlan999/options
```
Параметр `HOST=ens19` указывает, через какую физическую сетевую карту ходить тегированному трафику, а `VID` задает номер тега 802.1Q.
:::

---

### 2.3. Настройка HQ-SRV (Сервер главного офиса)

Сервер находится в подсети VLAN 100 и использует адрес `192.168.100.2/27`. Шлюзом для него выступает маршрутизатор HQ-RTR (`192.168.100.1`).

```bash
# 1. Указываем тип интерфейса (Ethernet):
echo 'TYPE=eth' > /etc/net/ifaces/ens18/options

# 2. Назначаем IP-адрес сервера:
echo '192.168.100.2/27' > /etc/net/ifaces/ens18/ipv4address

# 3. Указываем шлюз по умолчанию (наш маршрутизатор HQ-RTR):
echo 'default via 192.168.100.1' > /etc/net/ifaces/ens18/ipv4route

# 4. Указываем DNS-сервер Яндекса:
echo 'nameserver 77.88.8.8' > /etc/net/ifaces/ens18/resolv.conf

# 5. Применяем параметры и проверяем:
systemctl restart network
ip -c --br a
```

---

### 2.4. Настройка BR-RTR (Маршрутизатор филиала)

Маршрутизатор филиала соединяет локальную сеть филиала (`ens19`, транзитный линк к `BR-FW`) с каналом провайдера (`ens18`, линк `172.16.2.0/28`).

```bash
# 1. Создаем каталоги для сетевых портов и туннеля gre1:
mkdir -p /etc/net/ifaces/{ens{18,19},gre1}
echo 'TYPE=eth' | tee /etc/net/ifaces/ens{18,19}/options

# 2. Настраиваем линк к провайдеру ISP:
echo '172.16.2.2/28' > /etc/net/ifaces/ens18/ipv4address
echo 'default via 172.16.2.1' > /etc/net/ifaces/ens18/ipv4route
echo 'nameserver 77.88.8.8' > /etc/net/ifaces/ens18/resolv.conf

# 3. Настраиваем интерфейс к BR-FW:
echo '172.16.10.1/30' > /etc/net/ifaces/ens19/ipv4address

# 4. Включаем пересылку пакетов (маршрутизацию):
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p

# 5. Применяем настройки:
systemctl restart network
clear
ip -c --br a
```

---

### 2.5. Настройка BR-FW (Межсетевой экран филиала)

```bash
# 1. Задаем тип сетевого адаптера:
mkdir -p /etc/net/ifaces/ens{18,19}
echo 'TYPE=eth' | tee /etc/net/ifaces/ens{18,19}/options

# 2. Назначаем статический IP-адрес:
echo '172.16.10.2/30' > /etc/net/ifaces/ens18/ipv4address
echo 'default via 172.16.10.1' > /etc/net/ifaces/ens18/ipv4route
echo 'nameserver 77.88.8.8' > /etc/net/ifaces/ens18/resolv.conf

# 3. Настраиваем интерфейс к BR-SRV:
echo '172.16.20.1/28' > /etc/net/ifaces/ens19/ipv4address

# 4. Включаем пересылку пакетов (маршрутизацию):
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p

# 5. Применяем настройки и проверяем состояние:
systemctl restart network
clear
ip -c --br a
```

---

### 2.6. Настройка BR-SRV (Сервер филиала)

Сервер филиала имеет IP-адрес `172.16.20.2/28`. В качестве DNS-сервера по заданию указывается центральный сервер компании HQ-SRV (`192.168.100.2`), а также доменный суффикс `au-team.irpo`.

```bash
# 1. Задаем тип сетевого адаптера:
mkdir -p /etc/net/ifaces/ens18
echo 'TYPE=eth' > /etc/net/ifaces/ens18/options

# 2. Назначаем статический IP-адрес:
echo '172.16.20.2/28' > /etc/net/ifaces/ens18/ipv4address

# 3. Прописываем маршрутизатор филиала как шлюз по умолчанию:
echo 'default via 172.16.20.1' > /etc/net/ifaces/ens18/ipv4route

# 4. Задаем домен поиска и корпоративный DNS-сервер:
# Конструкция $'...' позволяет вставить символ перевода строки \n:
echo $'search au-team.irpo\nnameserver 77.88.8.8' > /etc/net/ifaces/ens18/resolv.conf

# 5. Применяем настройки и проверяем состояние:
systemctl restart network
clear
ip -c --br a
```

---

## Шаг 3. Проверка работоспособности (Верификация)

После выполнения всех настроек обязательно проверьте связность:

1. **Проверка статуса портов**:
   ```bash
   ip -c --br a
   ```
   *Все настроенные интерфейсы должны иметь статус **UP** и корректные маски подсетей.*

2. **Проверка наличия маршрута по умолчанию**:
   ```bash
   ip r
   ```
   *В выводе обязана присутствовать строка вида `default via <IP_шлюза>`.*
