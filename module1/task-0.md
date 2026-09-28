---
title: "Задание №0: Настройка источников пакетов (зеркала Яндекс)"
description: "Инструкция по переключению репозиториев ALT Linux с официальных серверов на быстрое зеркало mirror.yandex.ru при проблемах со скоростью или доступностью пакетов"
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

## 2. Пошаговая инструкция

### Шаг 1. Отключение официальных репозиториев (alt.list)

Открываем файл `alt.list` в текстовом редакторе:

```bash
nano /etc/apt/sources.list.d/alt.list
```

По умолчанию в файле активен **второй блок из трёх строк** (с протоколом `http://`). Ставим знак решётки `#` в начале этих трёх строк, чтобы **все строки в файле стали закомментированными**:

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

Сохраняем изменения (`Ctrl + O`, `Enter`, `Ctrl + X`).

![Файл alt.list](/images/alt-list.png)

> [!TIP] Быстрая команда в одну строчку
> Закомментировать активный второй блок можно одной командой без открытия редактора:
> ```bash
> sed -i 's/^rpm/#rpm/' /etc/apt/sources.list.d/alt.list
> ```

---

### Шаг 2. Включение зеркала Яндекс (yandex.list)

Открываем файл `yandex.list`:

```bash
nano /etc/apt/sources.list.d/yandex.list
```

В файле также находятся 3 блока по 3 строки, и все они изначально закомментированы. 

Находим **второй блок (3 строки с протоколом `http://`)** и убираем знаки `#` в начале этих трёх строк (раскомментируем их):

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

Сохраняем изменения (`Ctrl + O`, `Enter`, `Ctrl + X`).

![Файл yandex.list](/images/yandex-list.png)

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

## 3. Что делать, если apt-get update всё равно выдаёт ошибку?

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
