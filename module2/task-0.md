---
title: "Задание №0: Настройка источников пакетов (зеркала Яндекс)"
description: "Инструкция по переключению репозиториев ALT Linux с официальных серверов на быстрое зеркало mirror.yandex.ru в текстовом редакторе Vim"
---

# Задание №0: Настройка источников пакетов (зеркала Яндекс)

В ходе выполнения заданий демонстрационного экзамена и чемпионата часто возникают ситуации, когда пакеты через `apt-get` скачиваются крайне медленно либо серверы `packages.altlinux.org` становятся временно недоступны из-за высокой сетевой нагрузки.

В таких случаях необходимо переключить менеджер пакетов **APT** на быстрое российское зеркало **Яндекса** (`mirror.yandex.ru`).

> [!IMPORTANT] Где выполнять
> Данная операция выполняется под пользователем `root` на **любой** виртуальной машине, на которой наблюдаются проблемы со скачиванием пакетов (`ISP`, `HQ-SRV`, `BR-SRV`, `HQ-RTR`, `BR-RTR`, `HQ-CLI`).

---

## 1. Теоретическая справка: структура репозиториев в ALT Linux

В ALT Linux списки источников пакетов для пакетного менеджера APT хранятся в каталоге `/etc/apt/sources.list.d/`:
* **`alt.list`** — официальные серверы `ftp.altlinux.org` / `packages.altlinux.org` (активны по умолчанию).
* **`yandex.list`** — официальное зеркало компании Яндекс `mirror.yandex.ru` (по умолчанию закомментировано знаками `#`).

### Структура обоих файлов:
В каждом из этих файлов содержится **ровно 3 блока строк** по 3 строки (для архитектур `x86_64`, `x86_64-i586` и `noarch`):
1. **1-й блок (`ftp://`)** — доступ по протоколу FTP (закомментирован `#`).
2. **2-й блок (`http://`)** — стандартный быстрый веб-протокол HTTP (**именно он используется для работы**).
3. **3-й блок (`rsync://`)** — протокол синхронизации Rsync (закомментирован `#`).

---

## 2. Краткая справка: как работать в редакторе Vim

В ALT Linux стандартным текстовым редактором является **Vim**. Он работает в двух основных режимах:

### 1. Переключение между режимами
* **Командный режим (Normal mode)** — активен сразу при открытии файла (`vim <имя_файла>`). В этом режиме нажатия клавиш выполняют команды навигации и управления, а не вводят символы.
* **Режим вставки (Insert mode)** — режим непосредственного редактирования и ввода текста:
  * Чтобы **войти в режим вставки**, нажмите клавишу **`i`** (в левом нижнем углу появится надпись `-- ВСТАВКА --` или `-- INSERT --`).
  * Чтобы **выйти из режима редактирования** обратно в командный режим, нажмите клавишу **`Esc`**.

### 2. Сохранение изменений и выход
Все команды ввода выполняются строго в **командном режиме** (всегда предварительно нажимайте клавишу **`Esc`**):
* **`:wq`** + **`Enter`** — **сохранить изменения и выйти** (*Write and Quit*).
* **`:x`** + **`Enter`** — быстрая альтернатива `:wq` (сохранить и закрыть).
* **`:q!`** + **`Enter`** — **выйти БЕЗ сохранения** изменений (выручает, если случайно испортили файл).
* **`:w`** + **`Enter`** — просто сохранить файл, не выходя из редактора.

### 3. Полезные горячие клавиши в командном режиме (после нажатия `Esc`):
* **`x`** — удалить один символ прямо под курсором (идеально для мгновенного удаления символа `#` при раскомментировании строки).
* **`dd`** — удалить (вырезать) всю текущую строку.
* **`u`** — отменить последнее действие (*Undo*).
* **`Ctrl + r`** — вернуть отменённое действие (*Redo*).
* **`/текст`** + **`Enter`** — поиск строки в файле (нажатие клавиши `n` переходит к следующему совпадению).

---

## 3. Пошаговая инструкция

### Шаг 1. Отключение официальных репозиториев (alt.list)

Открываем файл `alt.list` в редакторе `vim`:

```bash
vim /etc/apt/sources.list.d/alt.list
```

По умолчанию в файле активен **второй блок из трёх строк** (с протоколом `http://`). Ставим знак решётки `#` в начале этих трёх строк (нажимаем `i`, вводим `#` перед каждой строкой, затем нажимаем `Esc` и пишем `:wq`):

```text
# ftp.altlinux.org (ALT Linux, Moscow)

# ALT Platform 10
#rpm [p10] ftp://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/x86_64 classic
#rpm [p10] ftp://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/x86_64-i586 classic
#rpm [p10] ftp://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/noarch classic

#rpm [p10] http://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/x86_64 classic
#rpm [p10] http://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/x86_64-i586 classic
#rpm [p10] http://ftp.altlinux.org/pub/distributions/ALTLinux p10/branch/noarch classic

#rpm [p10] rsync://ftp.altlinux.org/ALTLinux p10/branch/x86_64 classic
#rpm [p10] rsync://ftp.altlinux.org/ALTLinux p10/branch/x86_64-i586 classic
#rpm [p10] rsync://ftp.altlinux.org/ALTLinux p10/branch/noarch classic
```

Сохраняем файл и выходим (`Esc` → `:wq` → `Enter`).

> [!TIP] Быстрая команда в одну строчку
> Закомментировать активный второй блок можно одной командой без открытия редактора:
> ```bash
> sed -i 's/^rpm/#rpm/' /etc/apt/sources.list.d/alt.list
> ```

---

### Шаг 2. Включение зеркала Яндекс (yandex.list)

Открываем файл `yandex.list` в редакторе `vim`:

```bash
vim /etc/apt/sources.list.d/yandex.list
```

В файле находятся 3 блока по 3 строки, и все они изначально закомментированы. 

Находим **второй блок (3 строки с протоколом `http://`)** и убираем знаки `#` в начале этих трёх строк (наводим курсор на знак `#` и нажимаем клавишу `x` для удаления символа):

```text
# mirror.yandex.ru (Yandex, Moscow)

# ALT Platform 10
#rpm [p10] ftp://mirror.yandex.ru/altlinux p10/branch/x86_64 classic
#rpm [p10] ftp://mirror.yandex.ru/altlinux p10/branch/x86_64-i586 classic
#rpm [p10] ftp://mirror.yandex.ru/altlinux p10/branch/noarch classic

rpm [p10] http://mirror.yandex.ru/altlinux p10/branch/x86_64 classic
rpm [p10] http://mirror.yandex.ru/altlinux p10/branch/x86_64-i586 classic
rpm [p10] http://mirror.yandex.ru/altlinux p10/branch/noarch classic

#rpm [p10] rsync://mirror.yandex.ru/altlinux p10/branch/x86_64 classic
#rpm [p10] rsync://mirror.yandex.ru/altlinux p10/branch/x86_64-i586 classic
#rpm [p10] rsync://mirror.yandex.ru/altlinux p10/branch/noarch classic
```

Сохраняем файл и выходим (`Esc` → `:wq` → `Enter`).

---

### Шаг 3. Обновление списков пакетов и проверка

Обновляем индекс пакетов APT:

```bash
apt-get update
```

Пример успешного вывода:
```text
Reading Package Lists... Done
Building Dependency Tree... Done
Get:1 http://mirror.yandex.ru/altlinux p10/branch/x86_64 release [1234 B]
Get:2 http://mirror.yandex.ru/altlinux p10/branch/noarch release [1234 B]
Fetched 2468 B in 1s (2468 B/s)
Reading Package Lists... Done
Building Dependency Tree... Done
```

Если чтение списков пакетов завершилось словом **`Done`** без сообщений об ошибках (`Err` / `Failed to fetch`) — репозитории успешно переключены на быстрое зеркало Яндекс!

---

## 4. Что делать, если apt-get update всё равно выдаёт ошибку?

1. **Проверьте сетевой резолв (DNS)**:
   ```bash
   ping ya.ru -c 2
   ping mirror.yandex.ru -c 2
   ```
   Если имя `mirror.yandex.ru` не разрешается, проверьте файл `/etc/resolv.conf` — в нём должен быть указан рабочий DNS-сервер (например, `nameserver 77.88.8.8`).
2. **Проверьте шлюз по умолчанию (Default Gateway)**:
   ```bash
   ip r
   ```
   В выводе обязательно должна присутствовать строка основного маршрута: `default via ...`.
