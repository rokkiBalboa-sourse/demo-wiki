---
title: "Задание №7: Мониторинг устройств на HQ-SRV (Prometheus + Grafana)"
description: "Пошаговая настройка открытой системы мониторинга на базе Prometheus, Node Exporter и Grafana, добавление CNAME-записи mon в DNS Samba DC, настройка дашборда 1860 и учётной записи admin / P@ssw0rd"
---

# Задание №7: Мониторинг устройств с помощью открытого ПО

В данном задании на сервере главного офиса (**HQ-SRV**) развёртывается стек мониторинга на базе **Prometheus**, агентов **Node Exporter** и системы визуализации **Grafana**. 

На контроллере домена (**BR-SRV**) создаётся DNS-запись CNAME `mon` для перенаправления на `hq-srv.au-team.irpo`. На сервере HQ-SRV настраивается сбор метрик с серверов `HQ-SRV` (`192.168.1.10:9100`) и `BR-SRV` (`192.168.3.10:9100`), в Grafana подключается источник данных Prometheus, импортируется популярный дашборд системных метрик **1860**, а пароль администратора меняется на **`P@ssw0rd`**.

> [!IMPORTANT] Где выполнять
> 1. **BR-SRV** — установка Node Exporter (порт 9100), добавление CNAME-записи `mon` в DNS Samba DC.
> 2. **HQ-SRV** — установка Prometheus, Grafana и Node Exporter, настройка `prometheus.yml`, запуск сервисов.
> 3. **HQ-CLI** — проверка веб-интерфейсов через браузер, импорт дашборда 1860 в Grafana.

---

## 1. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 2. Настройка на сервере BR-SRV

Выполните команды под пользователем `root` на контроллере домена **BR-SRV**:

### Шаг 1. Установка и запуск агента сбора метрик Node Exporter

```bash
apt-get update && apt-get install prometheus-node_exporter -y

systemctl enable --now prometheus-node_exporter
```

Проверяем, что порт `9100` открыт и слушается:

```bash
ss -ltnp | grep 9100
```

---

### Шаг 2. Добавление записи CNAME mon в DNS-сервер Samba DC

Создаём каноническое имя (CNAME) `mon` указывающее на `hq-srv.au-team.irpo`:

```bash
samba-tool dns add br-srv.au-team.irpo au-team.irpo mon CNAME hq-srv.au-team.irpo -U Administrator
```
> При запросе введите пароль администратора домена (`P@ssw0rd`).

Проверяем корректность добавления DNS-записи:

```bash
samba-tool dns query br-srv.au-team.irpo au-team.irpo mon CNAME -U administrator
```

---

## 3. Настройка сервера мониторинга на HQ-SRV

Выполните действия под пользователем `root` на сервере **HQ-SRV**:

### Шаг 1. Установка компонентов стека мониторинга

```bash
apt-get update && apt-get install prometheus grafana prometheus-node_exporter -y
```

---

### Шаг 2. Настройка конфигурации /etc/prometheus/prometheus.yml

Открываем файл конфигурации Prometheus в редакторе `vim`:

```bash
vim /etc/prometheus/prometheus.yml
```

::: tip Памятка по работе в Vim
* Нажмите `i` для перехода в режим вставки.
* После внесения изменений нажмите `Esc`, введите `:wq` и нажмите `Enter`.
:::

В секцию `scrape_configs:` внесите или приведите блоки задач сбора метрик к следующему виду:

```yaml
scrape_configs:
  - job_name: 'prometheus'
    scrape_interval: 5s
    scrape_timeout: 5s
    static_configs:
      - targets: ['localhost:9090']

  - job_name: hq-srv
    static_configs:
       - targets: ['192.168.1.10:9100']

  - job_name: br-srv
    static_configs:
      - targets: ['192.168.3.10:9100']
```

Сохраняем файл (`Esc` → `:wq` → `Enter`).

---

### Шаг 3. Запуск и активация служб мониторинга

Включаем в автозагрузку и запускаем все компоненты:

```bash
systemctl enable --now prometheus-node_exporter
systemctl enable --now prometheus
systemctl enable --now grafana-server
```

Проверяем статус работы сервисов:

```bash
systemctl status prometheus-node_exporter prometheus grafana-server
```
> Все три службы должны иметь статус **`active (running)`**.

---

## 4. Настройка веб-интерфейсов через браузер на HQ-CLI

Перейдите на клиентскую рабочую станцию **HQ-CLI** и откройте браузер:

### Шаг 1. Проверка целей в Prometheus
1. Открываем веб-интерфейс:
   ```text
   http://hq-srv.au-team.irpo:9090
   ```
2. В верхнем меню переходим: **Status** → **Targets**.
3. В списке должны отображаться все три таргета (`prometheus`, `hq-srv`, `br-srv`) в зелёном состоянии **UP**.

---

### Шаг 2. Первоначальный вход в Grafana и смена пароля
1. Открываем веб-интерфейс Grafana:
   ```text
   http://hq-srv.au-team.irpo:3000
   ```
2. Вводим стандартные учетные данные:
   * **Логин**: `admin`
   * **Пароль**: `admin`
3. На появившемся экране смены пароля задаём новый пароль: **`P@ssw0rd`**.

---

### Шаг 3. Подключение источника данных (Data Source)
1. В левом боковом меню переходим: **Connections** → **Data Sources** → **Add data source**.
2. Выбираем тип: **Prometheus**.
3. В поле **Prometheus server URL** указываем:
   ```text
   http://hq-srv.au-team.irpo:9090
   ```
   *(или `http://192.168.1.10:9090`)*
4. Нажимаем кнопку **Save & test** (должно появиться зелёное сообщение «Data source is working»).

---

### Шаг 4. Импорт дашборда визуализации 1860
1. В левом меню переходим: **Dashboards** → **New** → **Import**.
2. В поле **Find and import dashboards for common applications at grafana.com/dashboards** вводим номер ID:
   ```text
   1860
   ```
3. Нажимаем кнопку **Load**.
4. В поле выбора источника данных (Prometheus) выбираем подключенный источник **Prometheus**.
5. Нажимаем **Import**.
6. Открывается дашборд *Node Exporter Full*, на котором визуализируются графики загрузки процессора (CPU), оперативной памяти (RAM) и занятости дисковых накопителей с возможностью переключения между серверами `HQ-SRV` и `BR-SRV`.

---

### Шаг 5. Проверка доступности по CNAME-имени mon
В адресной строке браузера открываем адрес:

```text
http://mon.au-team.irpo:3000
```

Интерфейс Grafana должен успешно открываться по имени `mon.au-team.irpo`!

---

## 5. Шаблон для экзаменационного отчёта

```markdown
### Отчёт по заданию: Система мониторинга устройств

1. **Выбранное программное обеспечение**: Стек открытого ПО Prometheus (сервер сбора метрик) + Node Exporter (агенты мониторинга хостов) + Grafana (веб-визуализация метрик).
2. **Обоснование выбора**:
   * Полностью открытый исходный код и соответствие отраслевым стандартам Linux-инфраструктуры.
   * Минимальная нагрузка на контролируемые серверы (легковесные демоны на Go).
   * Богатая библиотека готовых профессиональных панелей мониторинга (дашборд 1860 для детального анализа CPU, памяти и дисков).
3. **Используемые сетевые порты**:
   * Порт агентов Node Exporter на HQ-SRV и BR-SRV: TCP 9100.
   * Порт сервера Prometheus: TCP 9090.
   * Порт веб-интерфейса Grafana: TCP 3000.
4. **Сетевые параметры и DNS**:
   * На DNS-сервере контроллера домена Samba DC создана CNAME-запись mon.au-team.irpo -> hq-srv.au-team.irpo.
   * Мониторинг доступен клиентам сети по адресу: http://mon.au-team.irpo:3000
   * Авторизация администратора: логин admin, пароль P@ssw0rd.
```
