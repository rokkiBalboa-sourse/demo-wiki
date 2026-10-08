---
title: "Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR)"
description: "Пошаговая настройка динамической маршрутизации OSPF на базе пакета FRR: активация демона ospfd, изоляция протокола в туннеле GRE, парольная защита и взаимный анонс офисных сетей"
---

# Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR)

::: tip 📺 Видео-разбор задания
Видео-разбор выполнения задания доступен по ссылке: [https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d](https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d)
:::

В данном задании настраивается автоматический обмен маршрутами между офисами **HQ** и **BR** с использованием протокола **OSPF (Open Shortest Path First)** на базе пакета **FRRouting (FRR)**.

---

## 1. Теоретическая справка: архитектура FRR и требования задания

### 1. Что такое FRR и файл `daemons`?
**FRR (Free Range Routing)** — это современный программный комплекс маршрутизации в Linux, использующий синтаксис команд, аналогичный Cisco IOS.
FRR модульный: по умолчанию запущен только менеджер ядра `zebra`. Для работы OSPF необходимо включить отдельный демон **`ospfd`** в конфигурационном файле `/etc/frr/daemons`.

### 2. Как выполнить требование: «Разрешите протокол только на интерфейсах туннеля»?
В OSPF есть концепция пассивных интерфейсов:
* Директива **`passive-interface default`** в секции `router ospf` переводит абсолютно все интерфейсы в пассивный режим: через них не отправляются и не принимаются служебные пакеты OSPF Hello (злоумышленник в клиентском VLAN 200 не сможет прикинуться роутером).
* Команда **`no ip ospf passive`** на интерфейсе `gre1` явно делает исключение **только для туннеля**: маршрутизаторы будут искать соседа и строить отношения смежности (Adjacency) исключительно через зашифрованный канал.

### 3. Зачем прописывать `ip ospf area 0` на локальных интерфейсах?
Чтобы маршрутизатор рассказал удалённому офису о существовании своих локальных сетей (VLAN 100, VLAN 200, VLAN 999 в HQ и `enp7s2` в филиале), эти интерфейсы должны быть включены в зону `area 0`.

### 4. Парольная защита:
Директива `ip ospf authentication` включает проверку подлинности, а `ip ospf authentication-key P@ssw0rd` задаёт общий секретный ключ, без которого маршрутизаторы откажутся обмениваться маршрутной информацией.

---

## Шаг 1. Настройка маршрутизатора главного офиса (HQ-RTR)

Выполните команды под пользователем `root` на машине **HQ-RTR**:

```bash
# 1. Устанавливаем пакет FRR:
apt-get update && apt-get install frr -y

# 2. Включаем демон ospfd в файле daemons.
# Команда sed заменяет параметр ospfd=no на ospfd=yes, а grep проверяет результат:
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons ; grep ospf /etc/frr/daemons
```

Далее открываем основной конфигурационный файл FRR:

```bash
vim /etc/frr/frr.conf
```

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

Вносим конфигурацию интерфейсов и процесса OSPF:

```text
interface gre
 no ip ospf passive
exit
!
interface gre1
 ip ospf area 0
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
 no ip ospf passive
exit
!
interface vlan100
 ip ospf area 0
exit
!
interface vlan200
 ip ospf area 0
exit
!
interface vlan999
 ip ospf area 0
exit
!
router ospf
 passive-interface default
exit
```

::: tip Как записать конфигурацию в файл без vim
```bash
cat << 'EOF' > /etc/frr/frr.conf
interface gre
 no ip ospf passive
exit
!
interface gre1
 ip ospf area 0
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
 no ip ospf passive
exit
!
interface vlan100
 ip ospf area 0
exit
!
interface vlan200
 ip ospf area 0
exit
!
interface vlan999
 ip ospf area 0
exit
!
router ospf
 passive-interface default
exit
EOF
```
:::

Запускаем службу FRR и перезапускаем сетевую службу:

```bash
# 3. Включаем автозапуск и стартуем FRR:
systemctl enable --now frr

# 4. Перезапускаем сеть:
systemctl restart network
```

---

## Шаг 2. Настройка маршрутизатора филиала (BR-RTR)

Выполните команды под пользователем `root` на машине **BR-RTR**:

```bash
# 1. Устанавливаем пакет FRR:
apt-get update && apt-get install frr -y

# 2. Активируем демон ospfd:
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons ; grep ospf /etc/frr/daemons
```

Открываем файл конфигурации:

```bash
vim /etc/frr/frr.conf
```

Вносим настройки: здесь вместо VLAN анонсируется внутренний интерфейс филиала `enp7s2`:

```text
interface gre
 no ip ospf passive
exit
!
interface gre1
 ip ospf area 0
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
 no ip ospf passive
exit
!
interface enp7s2
 ip ospf area 0
exit
!
router ospf
 passive-interface default
exit
```

::: tip Запись в одну команду
```bash
cat << 'EOF' > /etc/frr/frr.conf
interface gre
 no ip ospf passive
exit
!
interface gre1
 ip ospf area 0
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
 no ip ospf passive
exit
!
interface enp7s2
 ip ospf area 0
exit
!
router ospf
 passive-interface default
exit
EOF
```
:::

Запускаем службу и перезапускаем сеть:

```bash
# 3. Запуск и автозагрузка FRR:
systemctl enable --now frr

# 4. Перезапуск сетевой службы:
systemctl restart network
```

---

## Шаг 3. Проверка работоспособности (Верификация)

Утилите FRR требуется около 10–20 секунд после запуска на обмен пакетами Hello и построение топологии.

### 1. Проверка OSPF-соседства (Neighbor):
На **любом** из маршрутизаторов выполните встроенную команду мониторинга:

```bash
vtysh -c "show ip ospf neighbor"
```

**Что должны увидеть:**
В выводе должна отображаться запись с интерфейсом `gre1` и статусом **`Full/...`**. Это означает, что маршрутизаторы успешно договорились, проверили пароль и синхронизировали базы данных маршрутов.

---

### 2. Проверка появления динамических маршрутов в ядре:
Выполните стандартную команду просмотра таблицы маршрутизации Linux:

```bash
ip r
```

**Что должны увидеть:**
* На **HQ-RTR** должен появиться маршрут к сети филиала:
  ```text
  192.168.0.0/28 via 10.10.10.2 dev gre1 proto ospf ...
  ```
* На **BR-RTR** должны появиться маршруты ко всем сетям главного офиса (`192.168.100.0/27`, `192.168.200.0/24`, `192.168.99.0/29`) через `10.10.10.1 dev gre1 proto ospf`.

---

### 3. Сквозной пинг между серверами (HQ-SRV ↔ BR-SRV):
Перейдите в консоль сервера главного офиса **HQ-SRV** и отправьте пинг на сервер филиала:

```bash
ping -c3 192.168.0.2
```

Если пакеты успешно проходят:
1. Сети соединены динамической маршрутизацией через OSPF.
2. Трафик автоматически направляется в туннель GRE через маршрутизаторы.
