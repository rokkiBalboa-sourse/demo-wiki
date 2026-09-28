---
title: "Задание №3: Защищённый шифрованный IP-туннель между HQ-RTR и BR-RTR и OSPF"
description: "Перенастройка базового межофисного туннеля GRE на защищённый шифрованный IP-туннель (WireGuard / GRE over IPsec), восстановление динамической маршрутизации OSPF в FRR и составление отчёта"
---

# Задание №3: Защищённый шифрованный IP-туннель между HQ-RTR и BR-RTR и OSPF

В данном задании базовый незашифрованный туннель GRE, настроенный в Модуле №1, модернизируется до уровня защищённого туннеля с обязательным криптографическим шифрованием трафика между маршрутизаторами **HQ-RTR** и **BR-RTR**.

После запуска защищённого туннеля корректируется конфигурация службы динамической маршрутизации **FRR (OSPF)**, восстанавливается обмен маршрутами между офисами и составляется раздел экзаменационного отчёта с обоснованием выбора программного обеспечения.

> [!IMPORTANT] Где выполнять
> 1. **HQ-RTR** — настройка защищённого интерфейса туннеля, правка OSPF в `frr.conf`.
> 2. **BR-RTR** — настройка защищённого интерфейса туннеля, правка OSPF в `frr.conf`.

---

## 1. Теоретическая справка и обоснование выбора ПО

| Решение | Преимущества | Особенности работы с OSPF |
| :--- | :--- | :--- |
| **WireGuard** *(рекомендуется)* | Работает прямо в ядре Linux, высочайшая производительность, современное шифрование (ChaCha20-Poly1305), простая конфигурация | Создаёт виртуальный интерфейс `wg0`, поддерживающий multicast и прямую передачу пакетов OSPF (point-to-point). |
| **GRE over IPsec (StrongSwan)** | Классический стандарт корпоративных сетей | Требует настройки двух сущностей: политик IPsec и туннеля GRE. |

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Настройка защищённого туннеля WireGuard

### Шаг 1. Установка пакетов на обоих маршрутизаторах (HQ-RTR и BR-RTR)

```bash
apt-get update && apt-get install wireguard-tools -y
```

---

### Шаг 2. Генерация ключей

**На HQ-RTR:**
```bash
mkdir -p /etc/wireguard && cd /etc/wireguard
wg genkey | tee hq_private.key | wg pubkey > hq_public.key
cat hq_private.key
cat hq_public.key
```

**На BR-RTR:**
```bash
mkdir -p /etc/wireguard && cd /etc/wireguard
wg genkey | tee br_private.key | wg pubkey > br_public.key
cat br_private.key
cat br_public.key
```

---

### Шаг 3. Конфигурация интерфейса wg0 на HQ-RTR

Открываем файл `/etc/wireguard/wg0.conf`:

```bash
vim /etc/wireguard/wg0.conf
```

Вставляем конфигурацию (замените `<BR_PUBLIC_KEY>` на публичный ключ `br_public.key`):

```ini
[Interface]
Address = 10.0.0.1/30
ListenPort = 51820
PrivateKey = <HQ_PRIVATE_KEY_ИЗ_hq_private.key>

[Peer]
PublicKey = <BR_PUBLIC_KEY_ИЗ_br_public.key>
Endpoint = 172.16.2.2:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

Запускаем и включаем автозагрузку туннеля:
```bash
systemctl enable --now wg-quick@wg0
```

---

### Шаг 4. Конфигурация интерфейса wg0 на BR-RTR

Открываем файл `/etc/wireguard/wg0.conf`:

```bash
vim /etc/wireguard/wg0.conf
```

Вставляем конфигурацию (замените `<HQ_PUBLIC_KEY>` на публичный ключ `hq_public.key`):

```ini
[Interface]
Address = 10.0.0.2/30
ListenPort = 51820
PrivateKey = <BR_PRIVATE_KEY_ИЗ_br_private.key>

[Peer]
PublicKey = <HQ_PUBLIC_KEY_ИЗ_hq_public.key>
Endpoint = 172.16.1.2:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

Запускаем и включаем автозагрузку туннеля:
```bash
systemctl enable --now wg-quick@wg0
```

Проверяем статус соединения:
```bash
wg show
ping 10.0.0.1 -c 3
```

---

## 4. Перенастройка динамической маршрутизации OSPF в FRR

Поскольку туннель переведён с `gre1` на защищённый интерфейс `wg0`, вносим изменения в `/etc/frr/frr.conf`.

### На HQ-RTR:

```bash
vim /etc/frr/frr.conf
```

Заменяем блок `interface gre1` на `interface wg0`:

```text
interface wg0
 ip ospf area 0
 ip ospf network point-to-point
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
exit
```

Перезапускаем службу FRR:
```bash
systemctl restart frr
```

---

### На BR-RTR:

```bash
vim /etc/frr/frr.conf
```

Аналогично заменяем `interface gre1` на `interface wg0`:

```text
interface wg0
 ip ospf area 0
 ip ospf network point-to-point
 ip ospf authentication
 ip ospf authentication-key P@ssw0rd
exit
```

Перезапускаем службу FRR:
```bash
systemctl restart frr
```

---

## 5. Проверка восстановления работы OSPF

На любом из маршрутизаторов входим в консоль `vtysh`:

```bash
vtysh -c "show ip ospf neighbor"
vtysh -c "show ip route ospf"
```

В выводе OSPF сосед должен иметь статус **`Full/ -`**, а таблицы маршрутизации обоих роутеров должны содержать маршруты к офисным подсетям через `wg0`.

---

## 6. Шаблон для экзаменационного отчёта

```markdown
### Отчёт по заданию: Перенастройка IP-туннеля с шифрованием трафика

1. **Выбранное программное обеспечение**: WireGuard (модуль ядра Linux + пакет wireguard-tools).
2. **Обоснование выбора**:
   * Высокая криптостойкость и современные алгоритмы шифрования (ChaCha20-Poly1305, Curve25519, BLAKE2s).
   * Минимальный оверхед и высокая пропускная способность за счёт работы в пространстве ядра (in-kernel).
   * Простота конфигурирования и надёжность при смене сетевых параметров.
3. **Параметры туннеля**:
   * Внутренняя адресация туннеля: 10.0.0.0/30 (HQ-RTR: 10.0.0.1, BR-RTR: 10.0.0.2).
   * Порт прослушивания UDP: 51820.
4. **Изменения в конфигурации OSPF**:
   * Протокол OSPF переведён с интерфейса gre1 на виртуальный интерфейс wg0.
   * Тип сети OSPF задан как point-to-point, сохранена аутентификация по ключу.
```
