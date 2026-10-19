---
title: "Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR) | 2027"
description: "Пошаговая настройка динамической маршрутизации OSPF в FRRouting (FRR) на маршрутизаторах HQ-RTR, BR-RTR и межсетевом экране BR-FW с аутентификацией MD5 и пассивными интерфейсами"
---

# Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR)

::: tip 📺 Видео-разбор задания
*В процессе разработки*
:::

В данном задании настраивается автоматический обмен маршрутами между офисами **HQ** и **BR** с использованием протокола **OSPF** (*Open Shortest Path First*) на базе программного комплекса **FRRouting (FRR)**.

---

## 1. Теоретическая справка: архитектура FRR и требования задания

### 1. Что такое FRR и файл daemons?
**FRR** (*Free Range Routing*) — это современный программный комплекс маршрутизации в Linux, использующий синтаксис команд, аналогичный Cisco IOS. FRR модульный: по умолчанию запущен только менеджер ядра `zebra`. Для работы OSPF необходимо явно включить демон `ospfd` в конфигурационном файле `/etc/frr/daemons`.

### 2. Как выполнить требование: «Разрешите протокол только на интерфейсах туннеля»?
В OSPF используется концепция пассивных интерфейсов:
* Директива **`passive-interface default`** в секции `router ospf` переводит абсолютно все интерфейсы в пассивный режим: через них не отправляются и не принимаются служебные пакеты OSPF Hello (злоумышленник в клиентском VLAN 200 не сможет сымитировать соседний роутер).
* Команда **`no ip ospf passive`** на интерфейсе `gre1` (на HQ-RTR и BR-RTR) и на линке `BR-RTR ↔ BR-FW` явно делает исключение: маршрутизаторы будут искать соседей и устанавливать отношения смежности (*Adjacency*) исключительно через выделенные защищённые каналы.

### 3. Зачем прописывать `network ... area 0`?
Чтобы маршрутизатор сообщил удалённому офису о доступности своих локальных сетей (VLAN 100, VLAN 200, VLAN 999 в HQ, и подсеть `172.16.20.0/28` в филиале), эти сети включаются в магистральную зону `area 0`.

### 4. Парольная защита MD5:
Директива `ip ospf authentication message-digest` включает проверку подлинности, а `ip ospf message-digest-key 1 md5 P@ssw0rd` задаёт общий секретный ключ на туннеле `gre1`.

---

## Шаг 1. Настройка маршрутизатора главного офиса (HQ-RTR)

Выполните команды под пользователем `root` на машине **HQ-RTR**:

### 1. Устанавливаем FRR и активируем демон ospfd:
```bash
# Устанавливаем пакет FRR:
apt-get update && apt-get install frr -y

# Включаем демон ospfd в файле daemons:
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons ; grep ospf /etc/frr/daemons
```

### 2. Записываем конфигурацию FRR в файл:
Открываем файл конфигурации frr:
```bash
nano /etc/frr/frr.conf
```
Удаляем старую конфигурацию и вставляем новую:

```bash
frr version 10.2.2
frr defaults traditional
hostname hq-rtr.au-team.irpo
log file /var/log/frr/frr.log
no ipv6 forwarding
!
interface gre1
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 P@ssw0rd
 no ip ospf passive
exit
!
router ospf
 passive-interface default
 network 10.10.10.0/30 area 0
 network 192.168.99.0/29 area 0
 network 192.168.100.0/27 area 0
 network 192.168.200.0/28 area 0
exit
!
```

::: tip 💡 Памятка по работе в Nano
* **Сохранить файл:** нажмите комбинацию <kbd>Ctrl</kbd> + <kbd>O</kbd>, затем подтвердите имя файла клавишей <kbd>Enter</kbd>.
* **Выйти из редактора:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> (при наличии несохранённых изменений нажмите <kbd>Y</kbd> для сохранения или <kbd>N</kbd> для отмены).
* **Быстро сохранить и выйти:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> → затем <kbd>Y</kbd> → затем <kbd>Enter</kbd>.
* **Поиск по файлу:** нажмите <kbd>Ctrl</kbd> + <kbd>W</kbd>, введите искомое слово и нажмите <kbd>Enter</kbd>.
* **Вырезать строку:** <kbd>Ctrl</kbd> + <kbd>K</kbd>, **вставить строку:** <kbd>Ctrl</kbd> + <kbd>U</kbd>.
:::

### 3. Запускаем службу FRR и перезапускаем сеть:
```bash
# Включаем автозапуск и стартуем FRR:
systemctl enable --now frr

# Перезапускаем сеть:
systemctl restart network
```

---

## Шаг 2. Настройка маршрутизатора филиала (BR-RTR)

Выполните команды под пользователем `root` на машине **BR-RTR**:

### 1. Устанавливаем FRR и активируем ospfd:
```bash
apt-get update && apt-get install frr -y
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons ; grep ospf /etc/frr/daemons
```

### 2. Записываем конфигурацию FRR:
Здесь анонсируется туннель `gre1` (с аутентификацией MD5) и внутренний линк `ens19` к `BR-FW`:
Открываем файл конфигурации frr:
```bash
nano /etc/frr/frr.conf
```
Удаляем старую конфигурацию и вставляем новую:

```bash
frr version 10.2.2
frr defaults traditional
hostname br-rtr.au-team.irpo
log file /var/log/frr/frr.log
no ipv6 forwarding
!
interface ens19
 no ip ospf passive
exit
!
interface gre1
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 P@ssw0rd
 no ip ospf passive
exit
!
router ospf
 passive-interface default
 network 10.10.10.0/30 area 0
 network 172.16.10.0/30 area 0
exit
!
```

::: tip 💡 Памятка по работе в Nano
* **Сохранить файл:** нажмите комбинацию <kbd>Ctrl</kbd> + <kbd>O</kbd>, затем подтвердите имя файла клавишей <kbd>Enter</kbd>.
* **Выйти из редактора:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> (при наличии несохранённых изменений нажмите <kbd>Y</kbd> для сохранения или <kbd>N</kbd> для отмены).
* **Быстро сохранить и выйти:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> → затем <kbd>Y</kbd> → затем <kbd>Enter</kbd>.
* **Поиск по файлу:** нажмите <kbd>Ctrl</kbd> + <kbd>W</kbd>, введите искомое слово и нажмите <kbd>Enter</kbd>.
* **Вырезать строку:** <kbd>Ctrl</kbd> + <kbd>K</kbd>, **вставить строку:** <kbd>Ctrl</kbd> + <kbd>U</kbd>.
:::

### 3. Запускаем службу:
```bash
systemctl enable --now frr
systemctl restart network
```

---

## Шаг 3. Настройка межсетевого экрана филиала (BR-FW)

::: warning ⚠️ Важное замечание перед настройкой BR-FW
Для установки пакетов через `apt-get` на машине **BR-FW** требуется доступ в Интернет. Убедитесь, что на **BR-RTR** уже настроен NAT Masquerade ([Задание №8](/2027/module1/task-8)).
:::

Выполните команды под пользователем `root` на машине **BR-FW**:

### 1. Устанавливаем FRR и активируем демон ospfd:
```bash
apt-get update && apt-get install frr -y
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons ; grep ospf /etc/frr/daemons
```

### 2. Записываем конфигурацию FRR:
На BR-FW активным в OSPF является только входной интерфейс `ens18` в сторону `BR-RTR`. Также анонсируется подсеть сервера `172.16.20.0/28`:

Открываем файл конфигурации frr:
```bash
nano /etc/frr/frr.conf
```
Удаляем старую конфигурацию и вставляем новую:
```bash
frr version 10.2.2
frr defaults traditional
hostname br-fw.au-team.irpo
log file /var/log/frr/frr.log
no ipv6 forwarding
!
interface ens18
 no ip ospf passive
exit
!
router ospf
 passive-interface default
 network 172.16.10.0/30 area 0
 network 172.16.20.0/28 area 0
exit
!
```

::: tip 💡 Памятка по работе в Nano
* **Сохранить файл:** нажмите комбинацию <kbd>Ctrl</kbd> + <kbd>O</kbd>, затем подтвердите имя файла клавишей <kbd>Enter</kbd>.
* **Выйти из редактора:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> (при наличии несохранённых изменений нажмите <kbd>Y</kbd> для сохранения или <kbd>N</kbd> для отмены).
* **Быстро сохранить и выйти:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> → затем <kbd>Y</kbd> → затем <kbd>Enter</kbd>.
* **Поиск по файлу:** нажмите <kbd>Ctrl</kbd> + <kbd>W</kbd>, введите искомое слово и нажмите <kbd>Enter</kbd>.
* **Вырезать строку:** <kbd>Ctrl</kbd> + <kbd>K</kbd>, **вставить строку:** <kbd>Ctrl</kbd> + <kbd>U</kbd>.
:::

### 3. Запускаем службу:
```bash
systemctl enable --now frr
systemctl restart network
```

---

## Шаг 4. Проверка работоспособности (Верификация)

Утилите FRR требуется около 10–20 секунд после запуска на обмен пакетами Hello и построение единой топологии.

### 1. Проверка отношений соседства (Neighbor Adjacency)
Выполните на маршрутизаторах:
```bash
vtysh -c "show ip ospf neighbor"
```
*Статус соседа должен быть **Full/DR** или **Full/Backup**.*

### 2. Проверка маршрутов OSPF
```bash
vtysh -c "show ip route ospf"
```

#### Результаты проверки на маршрутизаторах стенда:
* **На HQ-RTR:**
  ![Маршруты OSPF на HQ-RTR](/images/2027/m1-t7-hq-rtr-ospf.png)

* **На BR-RTR:**
  ![Маршруты OSPF на BR-RTR](/images/2027/m1-t7-br-rtr-ospf.png)

* **На BR-FW:**
  ![Маршруты OSPF на BR-FW](/images/2027/m1-t7-br-fw-ospf.png)

### 3. Проверка трассировки маршрута между серверами
Выполняем сквозную трассировку маршрута между главными серверами компании:

* **С HQ-SRV в сторону BR-SRV (`172.16.20.2`):**
  ```bash
  traceroute 172.16.20.2
  ```
  ![Трассировка с HQ-SRV](/images/2027/m1-t7-traceroute-hq-srv.png)

* **С BR-SRV в сторону HQ-SRV (`192.168.100.2`):**
  ```bash
  traceroute 192.168.100.2
  ```
  ![Трассировка с BR-SRV](/images/2027/m1-t7-traceroute-br-srv.png)
