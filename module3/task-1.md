---
title: "Задание №1: Импорт пользователей в домен au-team.irpo из users.csv"
description: "Пошаговая инструкция по автоматизированному импорту пользователей с паролями и атрибутами из файла users.csv образа Additional.iso в контроллер домена Samba DC на сервере BR-SRV и проверка входа на HQ-CLI"
---

# Задание №1: Импорт пользователей в домен au-team.irpo из users.csv

В данном задании на контроллере домена Active Directory (**BR-SRV**) выполняется пакетный импорт пользователей из подготовленного файла `users.csv`, находящегося на подключаемом компакт-диске `Additional.iso`. 

Пользователи должны быть созданы в домене `au-team.irpo` с сохранением назначенных паролей и атрибутов (имя, фамилия, подразделение и т.д.), после чего проверяется их способность успешно входить в систему на клиентской машине **HQ-CLI**.

> [!IMPORTANT] Где выполнять
> 1. **BR-SRV** — монтирование диска `Additional.iso`, запуск скрипта импорта пользователей через утилиту `samba-tool`.
> 2. **HQ-CLI** — проверка аутентификации и входа импортированных учетных записей.

---

## 1. Теоретическая справка: структура users.csv и утилита samba-tool

В рамках чемпионатов и демонстрационных экзаменов файл `users.csv` содержит список сотрудников организации в табличном формате с разделителями (обычно запятая `,` или точка с запятой `;`).

### Типовые поля в файле `users.csv`:
* `username` / `login` — имя учетной записи (логин);
* `password` — пароль пользователя;
* `givenname` / `firstname` — имя;
* `surname` / `lastname` — фамилия;
* `department` / `company` — подразделение или отдел;
* `mail` — корпоративный адрес электронной почты.

### Команда добавления пользователя в Samba DC:
Утилита `samba-tool user create` позволяет создавать учетную запись без интерактивных запросов:

```bash
samba-tool user create <username> '<password>' \
  --given-name='<Имя>' \
  --surname='<Фамилия>' \
  --mail-address='<Почта>' \
  --department='<Отдел>'
```

После создания пользователь добавляется в доменную группу `hq` (или группу пользователей), чтобы на рабочей станции **HQ-CLI** сработали правила доступа и привилегии `libnss-role`, настроенные в Модуле №2:

```bash
samba-tool group addmembers hq <username>
```

---

## 2. Памятка по работе в Vim

::: tip Памятка по работе в Vim
* **Вход в режим редактирования**: нажмите клавишу `i`.
* **Выход в командный режим**: нажмите `Esc`.
* **Сохранить и выйти**: введите `:wq` и нажмите `Enter` (или `:q!` для отмены и выхода без сохранения).
:::

---

## 3. Пошаговая инструкция на сервере BR-SRV

Выполните все действия под пользователем `root` на сервере **BR-SRV**.

### Шаг 1. Монтирование диска Additional.iso и поиск users.csv

Если виртуальный диск `Additional.iso` подключен к виртуальной машине как CD/DVD-привод (`/dev/sr0` или `/dev/cdrom`):

```bash
# Создаём точку монтирования и монтируем диск:
mkdir -p /mnt/iso
mount /dev/sr0 /mnt/iso 2>/dev/null || mount /dev/cdrom /mnt/iso 2>/dev/null

# Проверяем наличие файла users.csv:
find /mnt/iso/ -name "users.csv"
```

> [!NOTE] Если образ подключен в виде файла .iso в файловой системе
> Если образ скопирован локально, его можно смонтировать через петлевое устройство:
> ```bash
> mount -o loop /root/Additional.iso /mnt/iso
> ```

---

### Шаг 2. Просмотр структуры и кодировки файла users.csv

Перед запуском импорта обязательно посмотрите первые строки файла, чтобы определить разделитель колонок (запятая `,` или точка с запятой `;`):

```bash
head -n 5 /mnt/iso/users.csv
```

Пример содержимого файла (разделитель — запятая):
```text
username,password,givenname,surname,mail
ivanov,P@ssw0rd,Иван,Иванов,ivanov@au-team.irpo
petrov,P@ssw0rd,Петр,Петров,petrov@au-team.irpo
sidorov,P@ssw0rd,Сергей,Сидоров,sidorov@au-team.irpo
```

Если разделитель — точка с запятой `;`:
```text
username;password;givenname;surname;mail
ivanov;P@ssw0rd;Иван;Иванов;ivanov@au-team.irpo
```

---

### Шаг 3. Создание и запуск универсального скрипта импорта

Создаём скрипт импорта в редакторе `vim`:

```bash
vim /root/import_users.sh
```

Вставьте следующее содержимое скрипта (скрипт автоматически пропускает строку заголовка и поддерживает разделители `,` и `;`):

```bash
#!/bin/bash
# Путь к файлу users.csv
CSV_FILE="/mnt/iso/users.csv"

if [ ! -f "$CSV_FILE" ]; then
    echo "Ошибка: файл $CSV_FILE не найден!"
    exit 1
fi

echo "=== Старт импорта пользователей в Samba DC ==="

# Определяем разделитель (запятая или точка с запятой)
DELIM=","
head -n 1 "$CSV_FILE" | grep -q ";" && DELIM=";"

# Читаем файл построчно, пропуская первую строку заголовков
tail -n +2 "$CSV_FILE" | while IFS="$DELIM" read -r username password givenname surname mail rest; do
    # Удаляем лишние пробелы и символы возврата каретки Windows (\r)
    username=$(echo "$username" | tr -d '\r' | xargs)
    password=$(echo "$password" | tr -d '\r' | xargs)
    givenname=$(echo "$givenname" | tr -d '\r' | xargs)
    surname=$(echo "$surname" | tr -d '\r' | xargs)
    mail=$(echo "$mail" | tr -d '\r' | xargs)

    # Пропускаем пустые строки
    [ -z "$username" ] && continue

    echo "--- Импорт пользователя: $username ($givenname $surname) ---"

    # Создаём пользователя в Samba DC
    samba-tool user create "$username" "$password" \
        --given-name="$givenname" \
        --surname="$surname" \
        --mail-address="$mail" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "Пользователь $username успешно создан."
    else
        echo "Пользователь $username уже существует или произошла ошибка, устанавливаем пароль..."
        samba-tool user setpassword "$username" --newpassword="$password" 2>/dev/null
    fi

    # Добавляем пользователя в доменную группу hq для доступа на HQ-CLI
    samba-tool group addmembers hq "$username" 2>/dev/null
done

echo "=== Импорт успешно завершён ==="
```

Сохраните файл (`Esc` → `:wq` → `Enter`).

Делаем скрипт исполняемым и запускаем:

```bash
chmod +x /root/import_users.sh
/root/import_users.sh
```

---

### Шаг 4. Проверка импортированных пользователей

1. **Список пользователей в базе данных Samba**:
   ```bash
   samba-tool user list
   ```

2. **Проверка членства в группе `hq`**:
   ```bash
   samba-tool group listmembers hq
   ```

3. **Проверка через демон Winbind (NSS)**:
   ```bash
   wbinfo -u | grep -E "ivanov|petrov"
   ```

---

## 4. Проверка входа пользователей на рабочей станции HQ-CLI

Перейдите на клиентскую машину **HQ-CLI** и проверьте доступность импортированных доменных учетных записей.

### Шаг 1. Проверка видимости доменных пользователей
```bash
id ivanov@au-team.irpo
```
Команда должна вернуть UID пользователя и его группы (включая доменную группу `hq` и локальную роль `wheel`).

### Шаг 2. Проверка входа в терминале (su)
```bash
su - ivanov@au-team.irpo
# Вводим пароль пользователя из users.csv
whoami
pwd
exit
```

### Шаг 3. Проверка входа по SSH
```bash
ssh ivanov@au-team.irpo@localhost -p 2026
# Вводим пароль
exit
```

### Шаг 4. Графический вход (Display Manager)
В окне входа системы (LightDM/GDM/SDDM) переключитесь на ввод имени вручную, введите логин `ivanov@au-team.irpo` (или `ivanov`) и соответствующий пароль. Пользователь должен успешно попасть на рабочий стол.
