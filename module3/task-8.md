---
title: "Задание №8: Инвентаризация рабочих мест через Ansible на BR-SRV (PC-INFO)"
description: "Размещение и запуск Ansible-плейбука инвентаризации из Additional.iso на сервере BR-SRV для сбора имени компьютера и IP-адреса с узлов HQ-SRV и HQ-CLI с сохранением отчётов в /etc/ansible/PC-INFO/*.yml"
---

# Задание №8: Инвентаризация рабочих мест через Ansible на BR-SRV (PC-INFO)

В данном задании на сервере автоматизации (**BR-SRV**) организуется регулярная инвентаризация аппаратных узлов сети (**HQ-SRV** и **HQ-CLI**) с помощью инструмента автоматизации **Ansible**.

Файл плейбука копируется из директории `playbook` подключаемого диска `Additional.iso` в рабочий каталог `/etc/ansible/`. Плейбук автоматически собирает факты об исследуемых машинах (имя хоста и его IP-адрес) и генерирует структурированные YAML-отчёты в подкаталоге `/etc/ansible/PC-INFO/`, где каждый файл назван строгим именем соответствующего компьютера (например, `HQ-SRV.yml` и `HQ-CLI.yml`).

> [!IMPORTANT] Где выполнять
> Все действия выполняются под пользователем `root` на сервере **BR-SRV** (управляющий узел Ansible, настроенный в Модуле №2).

---

## 1. Теоретическая справка: сбор фактов в Ansible и делегирование задач

При выполнении плейбука директива `gather_facts: yes` опрашивает удалённые хосты через подсистему `setup` и извлекает системные переменные:
* `ansible_hostname` — короткое имя хоста компьютера;
* `ansible_default_ipv4.address` — IP-адрес основного сетевого интерфейса.

### Делегирование создания файлов на управляющий узел:
С помощью конструкции `delegate_to: localhost` задача генерации итогового файла отчёта выполняется непосредственно на сервере `BR-SRV`, сохраняя собранную информацию в локальный каталог `/etc/ansible/PC-INFO/{{ ansible_hostname }}.yml`.

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Подготовка и размещение плейбука на сервере BR-SRV

### Шаг 1. Проверка файла инвентаря /etc/ansible/hosts

Убедитесь, что в файле инвентаря присутствуют хосты `HQ-SRV` и `HQ-CLI`:

```bash
cat /etc/ansible/hosts
```

Если группа не создана, отредактируйте `/etc/ansible/hosts`:

```ini
[targets]
HQ-SRV ansible_host=192.168.1.10
HQ-CLI ansible_host=192.168.2.10

[targets:vars]
ansible_port=2026
ansible_user=sshuser
```

Проверьте доступность узлов:
```bash
ansible targets -m ping
```

---

### Шаг 2. Копирование плейбука с диска Additional.iso

Монтируем диск `Additional.iso` и копируем файл:

```bash
mkdir -p /mnt/iso
mount /dev/sr0 /mnt/iso 2>/dev/null || mount /dev/cdrom /mnt/iso 2>/dev/null

# Копируем плейбук в каталог /etc/ansible/
cp -r /mnt/iso/playbook/* /etc/ansible/
```

Создаём каталог для отчётов:
```bash
mkdir -p /etc/ansible/PC-INFO
```

---

### Шаг 3. Анализ и структура эталонного плейбука инвентаризации

Если файл требует создания или корректировки, откройте его в редакторе:

```bash
vim /etc/ansible/inventory_playbook.yml
```

Эталонный код плейбука согласно спецификации задания:

```yaml
---
- name: Инвентаризация компьютеров сети (сбор имени и IP-адреса)
  hosts: targets
  gather_facts: yes
  tasks:
    - name: Создание локальной директории для отчётов
      file:
        path: /etc/ansible/PC-INFO
        state: directory
        mode: '0755'
      delegate_to: localhost
      run_once: true

    - name: Сохранение файла отчёта в формате .yml с именем компьютера
      copy:
        dest: "/etc/ansible/PC-INFO/{{ ansible_hostname }}.yml"
        content: |
          hostname: "{{ ansible_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
      delegate_to: localhost
```

---

## 4. Запуск инвентаризации

Запустите выполнение плейбука:

```bash
ansible-playbook /etc/ansible/inventory_playbook.yml
```

Пример успешного выполнения:
```text
PLAY [Инвентаризация компьютеров сети (сбор имени и IP-адреса)] ***********************

TASK [Gathering Facts] ***************************************************************
ok: [HQ-SRV]
ok: [HQ-CLI]

TASK [Создание локальной директории для отчётов] **************************************
ok: [HQ-SRV -> localhost]

TASK [Сохранение файла отчёта в формате .yml с именем компьютера] ********************
changed: [HQ-SRV -> localhost]
changed: [HQ-CLI -> localhost]

PLAY RECAP ***************************************************************************
HQ-CLI                     : ok=2    changed=1    unreachable=0    failed=0
HQ-SRV                     : ok=3    changed=1    unreachable=0    failed=0
```

---

## 5. Проверка сгенерированных отчётов

1. **Проверяем файлы в директории `/etc/ansible/PC-INFO/`**:
   ```bash
   ls -la /etc/ansible/PC-INFO/
   ```
   В выводе должны присутствовать два файла:
   * `HQ-SRV.yml`
   * `HQ-CLI.yml`

2. **Просматриваем содержимое отчёта HQ-SRV**:
   ```bash
   cat /etc/ansible/PC-INFO/HQ-SRV.yml
   ```
   Вывод:
   ```yaml
   hostname: "HQ-SRV"
   ip_address: "192.168.1.10"
   ```

3. **Просматриваем содержимое отчёта HQ-CLI**:
   ```bash
   cat /etc/ansible/PC-INFO/HQ-CLI.yml
   ```
   Вывод:
   ```yaml
   hostname: "HQ-CLI"
   ip_address: "192.168.2.10"
   ```
