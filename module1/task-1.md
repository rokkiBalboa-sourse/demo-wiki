---
title: 'Модуль 1. Задание 1: Базовая настройка хостов и адресации'
description: 'Пошаговая инструкция по настройке FQDN имён хостов, расчету подсетей RFC 1918 и конфигурированию сетевых интерфейсов etcnet в ALT Linux'
---

# Модуль №1. Задание №1: Базовая настройка сети и хостов

Инструкция по выполнению базовой настройки сетевой инфраструктуры на базе **ALT Linux** (подсистема сетевых настроек `etcnet`) в соответствии с требованиями конкурсного задания.

---

## 1. Требования и постановка задачи

1. **Имена устройств**: Настроить FQDN (полное доменное имя) для всех узлов сети в зоне `.au-team.irpo`.
2. **Адресация IPv4**: Использовать только приватные диапазоны [RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918).
3. **Требования к емкости подсетей**:
   - **VLAN 100 (HQ-SRV)**: не более 32 адресов $\rightarrow$ маска `/27` (32 адреса, 30 доступных хостов).
   - **VLAN 200 (HQ-CLI)**: не менее 16 адресов $\rightarrow$ маска `/24` (256 адресов) или `/28` (16 адресов).
   - **VLAN 999 (Управление)**: не более 8 адресов $\rightarrow$ маска `/29` (8 адресов, 6 доступных хостов).
   - **Сеть BR-SRV**: не более 16 адресов $\rightarrow$ маска `/28` (16 адресов, 14 хостов).
   - **Линки ISP**: маска `/28` (16 адресов).
4. **Маршрутизация**: Включить пересылку пакетов IPv4 на маршрутизаторах `HQ-RTR` и `BR-RTR`.

---

## 2. Сводная таблица адресации (Таблица 2)

| Устройство | Интерфейс | IP-адрес / Префикс | Шлюз по умолчанию | DNS-сервер | Описание / Назначение |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISP** | `enp7s2` | `172.16.1.1/28` | — | — | Линк в сторону HQ-RTR |
| **ISP** | `enp7s3` | `172.16.2.1/28` | — | — | Линк в сторону BR-RTR |
| **HQ-RTR** | `enp7s1` | `172.16.1.2/28` | `172.16.1.1` | `8.8.8.8` | Внешний линк к ISP |
| **HQ-RTR** | `vlan100` | `192.168.100.1/27` | — | — | Сеть серверов HQ (до 32 IP) |
| **HQ-RTR** | `vlan200` | `192.168.200.1/24` | — | — | Сеть клиентов HQ (от 16 IP) |
| **HQ-RTR** | `vlan999` | `192.168.99.1/29` | — | — | Сеть управления (до 8 IP) |
| **HQ-SRV** | `enp7s1` | `192.168.100.2/27` | `192.168.100.1` | `8.8.8.8` | Сервер главного офиса HQ |
| **BR-RTR** | `enp7s1` | `172.16.2.2/28` | `172.16.2.1` | `8.8.8.8` | Внешний линк к ISP |
| **BR-RTR** | `enp7s2` | `192.168.0.1/28` | — | — | Локальная сеть филиала BR |
| **BR-SRV** | `enp7s1` | `192.168.0.2/28` | `192.168.0.1` | `192.168.100.2` | Сервер филиала BR |

---

## 3. Шаг 1: Настройка FQDN имён хостов

Выполните соответствующую команду на каждом из устройств. Команда `exec bash` мгновенно перезагружает командный интерпретатор, чтобы отобразить обновлённый prompt с новым именем.

::: details Развернуть команды для всех узлов

#### На ISP:
```bash
hostnamectl set-hostname isp.au-team.irpo; exec bash
```

#### На HQ-RTR:
```bash
hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash
```

#### На HQ-SRV:
```bash
hostnamectl set-hostname hq-srv.au-team.irpo; exec bash
```

#### На HQ-CLI:
```bash
hostnamectl set-hostname hq-cli.au-team.irpo; exec bash
```

#### На BR-RTR:
```bash
hostnamectl set-hostname br-rtr.au-team.irpo; exec bash
```

#### На BR-SRV:
```bash
hostnamectl set-hostname br-srv.au-team.irpo; exec bash
```
:::

::: tip Проверка
Проверить установленное имя можно командой `hostname` или `hostnamectl status`.
:::

---

## 4. Шаг 2: Настройка сетевых интерфейсов (etcnet)

Сетевая подсистема ALT Linux использует конфигурационные файлы в директории `/etc/net/ifaces/<interface_name>/`:
* `options` — тип интерфейса и привязка (`TYPE=eth`, `TYPE=vlan`, `HOST=...`, `VID=...`)
* `ipv4address` — IP-адрес и префикс маски подсети
* `ipv4route` — статические маршруты и шлюз по умолчанию
* `resolv.conf` — параметры DNS

---

### 4.1. Настройка ISP

Провайдер выступает шлюзом для обоих офисов:

```bash
# Создание каталогов интерфейсов
mkdir -p /etc/net/ifaces/enp7s{2,3}

# Назначение типа Ethernet для обоих интерфейсов
echo 'TYPE=eth' | tee /etc/net/ifaces/enp7s{2,3}/options

# Назначение IP-адресов
echo '172.16.1.1/28' > /etc/net/ifaces/enp7s2/ipv4address
echo '172.16.2.1/28' > /etc/net/ifaces/enp7s3/ipv4address

# Перезапуск сети и проверка
systemctl restart network
ip -c --br a
```

---

### 4.2. Настройка HQ-RTR (Центральный маршрутизатор)

Маршрутизатор HQ подключается к ISP через `enp7s1`, а в сторону внутренней сети (`enp7s2`) передаёт тегированный трафик (802.1Q) для VLAN 100, 200 и 999.

```bash
# Создание каталогов для физических интерфейсов, VLAN и GRE
mkdir -p /etc/net/ifaces/{enp7s{1,2},vlan{100,200,999},gre1}

# Настройка физических интерфейсов
echo 'TYPE=eth' | tee /etc/net/ifaces/enp7s{1,2}/options

# Настройка аплинка в сторону ISP (enp7s1)
echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address
echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route
echo 'nameserver 8.8.8.8' > /etc/net/ifaces/enp7s1/resolv.conf

# Генерация настроек для VLAN интерфейсов (100, 200, 999) поверх enp7s2
echo $'100\n200\n999' | xargs -i bash -c 'echo -e "TYPE=vlan\nHOST=enp7s2\nVID={}" > /etc/net/ifaces/vlan{}/options'

# Назначение IP-адресов на VLAN интерфейсы
echo '192.168.100.1/27' > /etc/net/ifaces/vlan100/ipv4address
echo '192.168.200.1/24' > /etc/net/ifaces/vlan200/ipv4address
echo '192.168.99.1/29'  > /etc/net/ifaces/vlan999/ipv4address
```

#### Включение маршрутизации (IP Forwarding) на HQ-RTR:
```bash
# Раскомментируйте или добавьте net.ipv4.ip_forward = 1
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p /etc/net/sysctl.conf

# Перезапуск службы сети
systemctl restart network
ip -c --br a
```

---

### 4.3. Настройка HQ-SRV (Сервер главного офиса)

Сервер находится в подсети VLAN 100:

```bash
# Настройка интерфейса
echo 'TYPE=eth' > /etc/net/ifaces/enp7s1/options
echo '192.168.100.2/27' > /etc/net/ifaces/enp7s1/ipv4address
echo 'default via 192.168.100.1' > /etc/net/ifaces/enp7s1/ipv4route
echo 'nameserver 8.8.8.8' > /etc/net/ifaces/enp7s1/resolv.conf

# Применение конфигурации
systemctl restart network
ip -c --br a
```

---

### 4.4. Настройка BR-RTR (Маршрутизатор филиала)

Маршрутизатор филиала обеспечивает связь между локальной сетью филиала (`enp7s2`) и провайдером (`enp7s1`).

```bash
# Создание каталогов интерфейсов
mkdir -p /etc/net/ifaces/{enp7s{1,2},gre1}
echo 'TYPE=eth' | tee /etc/net/ifaces/enp7s{1,2}/options

# Настройка аплинка в сторону ISP (enp7s1)
echo '172.16.2.2/28' > /etc/net/ifaces/enp7s1/ipv4address
echo 'default via 172.16.2.1' > /etc/net/ifaces/enp7s1/ipv4route
echo 'nameserver 8.8.8.8' > /etc/net/ifaces/enp7s1/resolv.conf

# Настройка интерфейса в сторону локальной сети филиала (enp7s2)
echo '192.168.0.1/28' > /etc/net/ifaces/enp7s2/ipv4address
```

#### Включение маршрутизации (IP Forwarding) на BR-RTR:
```bash
echo "net.ipv4.ip_forward = 1" >> /etc/net/sysctl.conf
sysctl -p /etc/net/sysctl.conf

# Перезапуск сети
systemctl restart network
ip -c --br a
```

---

### 4.5. Настройка BR-SRV (Сервер филиала)

Сервер филиала использует корпоративный DNS на HQ-SRV и поиск в домене `au-team.irpo`:

```bash
# Настройка интерфейса
echo 'TYPE=eth' > /etc/net/ifaces/enp7s1/options
echo '192.168.0.2/28' > /etc/net/ifaces/enp7s1/ipv4address
echo 'default via 192.168.0.1' > /etc/net/ifaces/enp7s1/ipv4route

# Настройка резолвера DNS
echo $'search au-team.irpo\nnameserver 192.168.100.2' > /etc/net/ifaces/enp7s1/resolv.conf

# Применение конфигурации
systemctl restart network
ip -c --br a
```

---

## 5. Проверка работоспособности (Верификация)

По окончании настройки выполните диагностику сетевой связности:

1. **Проверка состояния интерфейсов и адресов**:
   ```bash
   ip -c --br a
   ```
   Убедитесь, что все интерфейсы находятся в состоянии `UP` и адреса соответствуют маскам.

2. **Проверка таблицы маршрутизации**:
   ```bash
   ip r
   ```
   Должен присутствовать маршрут по умолчанию (`default via ...`).

3. **Тестирование линков (Ping)**:
   - С `HQ-SRV`: пинг шлюза `192.168.100.1` и внешнего адреса ISP `172.16.1.1`.
   - С `BR-SRV`: пинг шлюза `192.168.0.1` и внешнего адреса ISP `172.16.2.1`.
   - С `HQ-RTR`: пинг `172.16.2.2` (BR-RTR через ISP).
