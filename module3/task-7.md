---
title: "Задание №7: Мониторинг устройств на HQ-SRV (mon.au-team.irpo)"
description: "Развёртывание открытой системы мониторинга (Prometheus + Grafana или Zabbix) на сервере HQ-SRV, мониторинг метрик CPU, RAM и диска на HQ-SRV и BR-SRV, публикация по адресу http://mon.au-team.irpo с доступом только для HQ-CLI и учётными данными admin / P@ssw0rd"
---

# Задание №7: Мониторинг устройств на HQ-SRV (mon.au-team.irpo)

В данном задании на сервере главного офиса (**HQ-SRV**) развёртывается открытая система мониторинга инфраструктуры на базе стека **Prometheus + Node Exporter + Grafana** (или **Zabbix**).

Система собирает и визуализирует ключевые аппаратные метрики серверов **HQ-SRV** и **BR-SRV** (нагрузка на CPU, использование оперативной памяти, занятость накопителей). Веб-интерфейс публикуется по адресу **`http://mon.au-team.irpo`** с доступом исключительно из внутренней сети офиса HQ (рабочая станция **HQ-CLI**), настроены авторизационные данные `admin` / `P@ssw0rd`, а в DNS-зону `au-team.irpo` внесена соответствующая ресурсная запись.

> [!IMPORTANT] Где выполнять
> 1. **HQ-SRV** — установка и настройка агента Node Exporter, сервера сбора метрик Prometheus, визуализатора Grafana (или Zabbix), прокси Nginx на порту 80 с ограничением доступа, добавление A-записи `mon` в DNS.
> 2. **BR-SRV** — установка и запуск агента Node Exporter (порт 9100).
> 3. **HQ-CLI** — проверка доступа через браузер по адресу `http://mon.au-team.irpo`.

---

## 1. Теоретическая справка и обоснование выбора стека

| Компонент | Назначение | Порт по умолчанию |
| :--- | :--- | :---: |
| **Node Exporter** | Легковесный системный агент сбора аппаратных метрик ядра Linux (ЦП, память, диски, сеть) | `9100` |
| **Prometheus** | Высокопроизводительная база данных временных рядов (TSDB) для опроса агентов и хранения метрик | `9090` |
| **Grafana** | Платформа визуализации с интерактивными дашбордами и графиками | `3000` |
| **Nginx (Reverse Proxy)** | Проксирование веб-интерфейса Grafana на стандартный порт `80` по имени `mon.au-team.irpo` с контролем доступа | `80` |

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Добавление записи mon в DNS-сервер

На сервере управления DNS (**HQ-SRV** в BIND или **BR-SRV** в Samba DC):

### Вариант А. На HQ-SRV (DNS BIND):
Открываем файл прямой зоны `/etc/bind/zone/au-team.irpo`:
```bash
vim /etc/bind/zone/au-team.irpo
```
Добавляем строку:
```text
mon IN A 192.168.1.10
```
Инкрементируем `Serial` зоны и перезапускаем BIND:
```bash
systemctl restart bind
rndc reload
```

### Вариант Б. На BR-SRV (Samba DC DNS):
```bash
samba-tool dns add 192.168.3.10 au-team.irpo mon A 192.168.1.10 -U Administrator%'P@ssw0rd'
```

---

## 4. Развёртывание агентов Node Exporter на HQ-SRV и BR-SRV

### На сервере HQ-SRV:
```bash
apt-get update && apt-get install prometheus-node_exporter -y
systemctl enable --now prometheus-node_exporter
```

### На сервере BR-SRV:
```bash
apt-get update && apt-get install prometheus-node_exporter -y
systemctl enable --now prometheus-node_exporter
```

Проверяем отдачу метрик:
```bash
curl -s http://localhost:9100/metrics | head -n 10
```

---

## 5. Установка и настройка Prometheus на HQ-SRV

Выполните действия на **HQ-SRV**:

```bash
apt-get install prometheus -y
```

Редактируем файл `/etc/prometheus/prometheus.yml`:

```bash
vim /etc/prometheus/prometheus.yml
```

Добавляем в секцию `scrape_configs` цели для мониторинга обоих серверов:

```yaml
scrape_configs:
  - job_name: 'linux-nodes'
    static_configs:
      - targets: ['192.168.1.10:9100']
        labels:
          instance: 'HQ-SRV'
      - targets: ['192.168.3.10:9100']
        labels:
          instance: 'BR-SRV'
```

Запускаем Prometheus:
```bash
systemctl enable --now prometheus
systemctl restart prometheus
```

---

## 6. Установка и настройка Grafana на HQ-SRV

Устанавливаем Grafana:
```bash
apt-get install grafana -y
```

Задаём пароль администратора `P@ssw0rd`:
```bash
grafana-cli admin reset-admin-password P@ssw0rd
systemctl enable --now grafana
```

---

## 7. Настройка Nginx с ограничением доступа для HQ-CLI

Чтобы служба была доступна по стандартному URL `http://mon.au-team.irpo` и доступ был разрешён **только для клиентов офиса HQ**, создаём виртуальный хост в Nginx на **HQ-SRV**:

```bash
apt-get install nginx -y
vim /etc/nginx/sites-available.d/mon.conf
```

Вставляем конфигурацию:

```nginx
server {
    listen 80;
    server_name mon.au-team.irpo;

    # Ограничение доступа: разрешён только сегмент HQ (VLAN 200) и localhost
    allow 192.168.2.0/24;
    allow 192.168.1.0/24;
    allow 127.0.0.1;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Активируем сайт и перезапускаем Nginx:
```bash
ln -s /etc/nginx/sites-available.d/mon.conf /etc/nginx/sites-enabled.d/
nginx -t
systemctl enable --now nginx
systemctl restart nginx
```

---

## 8. Проверка и визуализация графиков

1. С рабочей станции **HQ-CLI** откройте браузер и перейдите по адресу:
   ```text
   http://mon.au-team.irpo
   ```
2. Введите учетные данные:
   * **Логин**: `admin`
   * **Пароль**: `P@ssw0rd`
3. В Grafana добавьте источник данных: **Prometheus** (`http://127.0.0.1:9090`).
4. Импортируйте дашборд системных метрик Node Exporter (ID: `1860` или `11074`) либо создайте панели:
   * **CPU Usage**: `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)`
   * **RAM Usage**: `(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100`
   * **Disk Usage**: `100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})`
5. Убедитесь, что метрики корректно поступают от обоих узлов — `HQ-SRV` и `BR-SRV`.

---

## 9. Шаблон для экзаменационного отчёта

```markdown
### Отчёт по заданию: Система мониторинга инфраструктуры

1. **Выбранное программное обеспечение**: Стек Prometheus (сбор метрик) + Node Exporter (системные сенсоры) + Grafana (веб-визуализация).
2. **Обоснование выбора**:
   * Открытый исходный код, отсутствие лицензионных ограничений.
   * Высокая скорость работы и низкое потребление ресурсов хоста.
   * Наглядные настраиваемые панели визуализации ЦП, ОЗУ и накопителей в реальном времени.
3. **Параметры и сетевые порты**:
   * Порт веб-интерфейса мониторинга: 80 (HTTP / Nginx Reverse Proxy) с перенаправлением на Grafana (TCP 3000).
   * Порт сервера сбора метрик Prometheus: TCP 9090.
   * Порт агентов Node Exporter на HQ-SRV и BR-SRV: TCP 9100.
4. **Контроль доступа**: Доступ к интерфейсу ограничен директивами Nginx allow/deny исключительно для сети клиентской станции HQ-CLI (192.168.2.0/24), внешний доступ заблокирован.
```
