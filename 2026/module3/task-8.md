---
title: "Задание №8: Инвентаризация рабочих мест через Ansible на BR-SRV"
description: "Пошаговая инструкция по настройке и запуску Ansible-плейбука get_hostname_address.yml на сервере BR-SRV для сбора имени хоста и IP-адреса с машин HQ-SRV и HQ-CLI с сохранением отчётов в /etc/ansible/PC-INFO/"
---

# Задание №8: Инвентаризация рабочих мест через Ansible на BR-SRV

::: tip 📺 Видео-разбор задания
Видео-разбор выполнения задания доступен по ссылке: [https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d](https://docker.sudostudy.dev/s/BTRAdw9Ewsczk7d)
:::

В данном задании на сервере управления **BR-SRV** настраивается автоматизированная инвентаризация сетевых узлов **HQ-SRV** и **HQ-CLI** с помощью инструмента автоматизации **Ansible**.

Плейбук `get_hostname_address.yml` копируется с диска `Additional.iso` (или создаётся в каталоге `/etc/ansible/`). При выполнении плейбук опрашивает целевые машины через сбор фактов `gather_facts: true` и сохраняет отчёты в формате `.yml` в каталог `/etc/ansible/PC-INFO/` с именами компьютеров, фиксируя имя хоста (`Hostname`) и его сетевой IP-адрес (`IP_Address`).

> [!IMPORTANT] Где выполнять
> Все действия выполняются под пользователем `root` на сервере **BR-SRV**.

---

## 1. Пошаговая инструкция на сервере BR-SRV

Выполните следующие шаги на сервере **BR-SRV**:

### Шаг 1. Монтирование диска Additional.iso и проверка

Проверяем точку монтирования `/mnt/`:

```bash
ls -l /mnt/
```

> Если команда возвращает `total 0` (диск ещё не смонтирован), выполняем монтирование привода:
> ```bash
> mount -o loop /dev/sr0 /mnt/ -v
> ```

---

### Шаг 2. Подготовка каталога и копирование плейбука

Копируем файл плейбука в директорию Ansible и создаём подкаталог для отчётов:

```bash
cp /mnt/playbook/get_hostname_address.yml /etc/ansible/
cd /etc/ansible/
mkdir -p PC-INFO
```

---

### Шаг 3. Создание или проверка содержимого get_hostname_address.yml

Если файл необходимо создать или отредактировать вручную:

```bash
cat << "EOF" > get_hostname_address.yml
---
- name: "Get data from hosts"
  gather_facts: true
  hosts:
    - HQ-SRV
    - HQ-CLI
  tasks:
    - name: "Creating a data file" 
      copy:
        dest: /etc/ansible/PC-INFO/{{ ansible_hostname }}.yml
        content: |
          Hostname: {{ ansible_hostname }}
          IP_Address: {{ ansible_default_ipv4.address }}
      delegate_to: localhost
EOF
```

::: tip Как работает плейбук
* **`gather_facts: true`** — запускает опрос системных переменных узлов (имя машины, IP-адрес интерфейса).
* **`hosts: HQ-SRV, HQ-CLI`** — список опрашиваемых целевых хостов (должны быть предварительно прописаны в `/etc/ansible/hosts`).
* **`dest: /etc/ansible/PC-INFO/{{ ansible_hostname }}.yml`** — сохраняет файл с именем инвентаризированного компьютера.
* **`delegate_to: localhost`** — указывает создавать файл локально на самом сервере `BR-SRV`, а не на удалённых узлах.
:::

---

### Шаг 4. Проверка синтаксиса плейбука

Перед запуском обязательно проверяем корректность структуры YAML:

```bash
ansible-playbook --syntax-check get_hostname_address.yml
```

---

### Шаг 5. Запуск инвентаризации

Выполняем плейбук:

```bash
ansible-playbook get_hostname_address.yml
```

Пример успешного выполнения:
```text
PLAY [Get data from hosts] **********************************************************

TASK [Gathering Facts] **************************************************************
ok: [HQ-SRV]
ok: [HQ-CLI]

TASK [Creating a data file] *********************************************************
changed: [HQ-SRV -> localhost]
changed: [HQ-CLI -> localhost]

PLAY RECAP **************************************************************************
HQ-CLI                     : ok=2    changed=1    unreachable=0    failed=0
HQ-SRV                     : ok=2    changed=1    unreachable=0    failed=0
```

---

## 2. Проверка сформированных отчётов

Проверяем наличие и содержимое файлов в каталоге `PC-INFO`:

1. **Просмотр отчёта сервера HQ-SRV**:
   ```bash
   cat PC-INFO/hq-srv.yml
   ```
   Пример вывода:
   ```yaml
   Hostname: hq-srv
   IP_Address: 192.168.1.10
   ```

2. **Просмотр отчёта рабочей станции HQ-CLI**:
   ```bash
   cat PC-INFO/hq-cli.yml
   ```
   Пример вывода:
   ```yaml
   Hostname: hq-cli
   IP_Address: 192.168.2.10
   ```

Оба файла с расширением `.yml` успешно созданы в поддиректории `/etc/ansible/PC-INFO/` и содержат требуемые данные!
