---
title: "Задание №8: Динамическая трансляция адресов (NAT) на филиалах | 2027"
description: "Пошаговая настройка NAT Masquerade через nftables на маршрутизаторах HQ-RTR и BR-RTR для выхода серверов и клиентов в сеть Интернет через провайдера ISP"
---

# Задание №8: Динамическая трансляция адресов (NAT) на филиалах

::: tip 📺 Видео-разбор задания
*В процессе разработки*
:::

В данном задании настраивается механизм динамической трансляции сетевых адресов (**Source NAT / Masquerade**) на пограничных маршрутизаторах **HQ-RTR** и **BR-RTR**.

Благодаря этому все внутренние устройства главного офиса (серверы VLAN 100, клиенты VLAN 200) и филиала (`172.16.20.0/28`) получают полноценный доступ к глобальной сети Интернет через провайдера **ISP**.

::: info 📍 Место выполнения
Команды данного задания выполняются одинаково на обоих маршрутизаторах: **HQ-RTR** и **BR-RTR**.
:::

---

## Шаг 1. Настройка маршрутизатора главного офиса (HQ-RTR)

Выполните команды под пользователем `root` на машине **HQ-RTR**:

### 1. Устанавливаем пакеты nftables:
```bash
apt-get update && apt-get install nftables nano -y
```

### 2. Создаем конфигурационный файл правил:
```bash
nano /etc/nftables/nftables.nft
```
Удаляем старую конфигурацию и прописывем новую:
```bash
#!/usr/sbin/nft -f
flush ruleset

table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat;
        oifname "ens18" masquerade
    }
}
```

::: tip 💡 Памятка по работе в Nano
* **Сохранить файл:** нажмите комбинацию <kbd>Ctrl</kbd> + <kbd>O</kbd>, затем подтвердите имя файла клавишей <kbd>Enter</kbd>.
* **Выйти из редактора:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> (при наличии несохранённых изменений нажмите <kbd>Y</kbd> для сохранения или <kbd>N</kbd> для отмены).
* **Быстро сохранить и выйти:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> → затем <kbd>Y</kbd> → затем <kbd>Enter</kbd>.
* **Поиск по файлу:** нажмите <kbd>Ctrl</kbd> + <kbd>W</kbd>, введите искомое слово и нажмите <kbd>Enter</kbd>.
* **Вырезать строку:** <kbd>Ctrl</kbd> + <kbd>K</kbd>, **вставить строку:** <kbd>Ctrl</kbd> + <kbd>U</kbd>.
:::


::: tip 💡 Что делает это правило?
* **`oifname "ens18"`** — отслеживает пакеты, покидающие маршрутизатор через внешний сетевой адаптер `ens18` в сторону провайдера ISP.
* **`masquerade`** — динамически подменяет приватный IP-адрес клиента/сервера на реальный IP-адрес порта `ens18`.
* **Важно:** трафик в сторону филиала через интерфейс туннеля `gre1` под это правило не подпадает, поэтому межофисная связь остаётся прямой и прозрачной!
:::

### 3. Активируем и запускаем службу:
```bash
systemctl enable --now nftables
nft flush ruleset
nft -f /etc/nftables/nftables.nft
```

---

## Шаг 2. Настройка маршрутизатора филиала (BR-RTR)

На маршрутизаторе **BR-RTR** выполняются абсолютно аналогичные действия под `root`:

### 1. Устанавливаем nftables:
```bash
apt-get update && apt-get install nftables nano -y
```

### 2. Записываем конфигурацию NAT:
```bash
nano /etc/nftables/nftables.nft
```
Удаляем старую конфигурацию и прописывем новую:
```bash
#!/usr/sbin/nft -f
flush ruleset

table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat;
        oifname "ens18" masquerade
    }
}
```

::: tip 💡 Памятка по работе в Nano
* **Сохранить файл:** нажмите комбинацию <kbd>Ctrl</kbd> + <kbd>O</kbd>, затем подтвердите имя файла клавишей <kbd>Enter</kbd>.
* **Выйти из редактора:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> (при наличии несохранённых изменений нажмите <kbd>Y</kbd> для сохранения или <kbd>N</kbd> для отмены).
* **Быстро сохранить и выйти:** нажмите <kbd>Ctrl</kbd> + <kbd>X</kbd> → затем <kbd>Y</kbd> → затем <kbd>Enter</kbd>.
* **Поиск по файлу:** нажмите <kbd>Ctrl</kbd> + <kbd>W</kbd>, введите искомое слово и нажмите <kbd>Enter</kbd>.
* **Вырезать строку:** <kbd>Ctrl</kbd> + <kbd>K</kbd>, **вставить строку:** <kbd>Ctrl</kbd> + <kbd>U</kbd>.
:::


### 3. Запускаем сервис:
```bash
systemctl enable --now nftables
nft flush ruleset
nft -f /etc/nftables/nftables.nft
```

---

## Шаг 3. Проверка работоспособности (Верификация)

Главный критерий выполнения задания — появление доступа в глобальный Интернет на внутренних узлах компании, находящихся за маршрутизаторами.

### 1. Проверка правил nftables на маршрутизаторах:
На **HQ-RTR** и **BR-RTR** выполните:
```bash
nft list ruleset
```
**Ожидаемый вывод:**
```text
table ip nat {
	chain postrouting {
		type nat hook postrouting priority srcnat; policy accept;
		oifname "ens18" masquerade
	}
}
```

---

### 2. Проверка выхода в Интернет с сервера HQ-SRV:
Перейдите в консоль сервера главного офиса **HQ-SRV** и отправьте ICMP-запросы в глобальную сеть:
```bash
ping -c4 ya.ru
# или по IP: ping -c4 77.88.8.8
```
*Ожидаемый результат: 4 packets transmitted, 4 received, 0% packet loss.*

---

### 3. Проверка выхода в Интернет с сервера филиала BR-SRV:
Перейдите в консоль сервера филиала **BR-SRV** и проверьте доступность:
```bash
ping -c4 77.88.8.8
```

Если пинги с внутренних серверов успешно проходят — двухуровневая трансляция адресов (**Офис → ISP → Интернет**) функционирует штатно! 🎉

---

## ⚡ Шпаргалка для быстрого выполнения на экзамене

Одинаково на **HQ-RTR** и **BR-RTR**:
```bash
apt-get update && apt-get install nftables -y
cat << 'EOF' > /etc/nftables/nftables.nft
#!/usr/sbin/nft -f
flush ruleset

table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat;
        oifname "ens18" masquerade
    }
}
EOF
systemctl enable --now nftables
nft flush ruleset
nft -f /etc/nftables/nftables.nft
nft list ruleset
```
