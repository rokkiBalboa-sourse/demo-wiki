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

## 1. Теоретическая справка: репозитории APT в ALT Linux

В ALT Linux списки источников пакетов для пакетного менеджера APT хранятся в каталоге `/etc/apt/sources.list.d/`:
* **`alt.list`** — официальные серверы `ftp.altlinux.org` / `packages.altlinux.org` (активны по умолчанию).
* **`yandex.list`** — официальное зеркало компании Яндекс `mirror.yandex.ru` (по умолчанию закомментировано знаками `#`).

Для переключения достаточно закомментировать все строки в `alt.list` и раскомментировать рабочие ветки в `yandex.list`.

---

## 2. Пошаговая инструкция

### Шаг 1. Отключение стандартных репозиториев (alt.list)

Открываем файл `alt.list` в текстовом редакторе:

```bash
nano /etc/apt/sources.list.d/alt.list
```

Ставим знак решётки `#` в начале **каждой строки**, чтобы они выглядели следующим образом:

```text
# rpm [alt] http://ftp.altlinux.org/pub/distributions/ALTLinux/p10/branch x86_64 classic
# rpm [alt] http://ftp.altlinux.org/pub/distributions/ALTLinux/p10/branch noarch classic
# rpm [alt] http://ftp.altlinux.org/pub/distributions/ALTLinux/p10/branch x86_64-i586 classic
```

Сохраняем изменения (`Ctrl + O`, `Enter`, `Ctrl + X`).

> [!TIP] Быстрая команда для ленивых (в одну строчку)
> Закомментировать все незакомментированные строки в файле можно одной командой:
> ```bash
> sed -i 's/^rpm/# rpm/' /etc/apt/sources.list.d/alt.list
> ```

---

### Шаг 2. Включение зеркала Яндекс (yandex.list)

Открываем файл `yandex.list`:

```bash
nano /etc/apt/sources.list.d/yandex.list
```

В файле присутствуют два блока строк. Находим **вторые 3 строки** и убираем знаки `#` в начале строк (раскомментируем их):

```text
# rpm [yandex] ftp://mirror.yandex.ru/altlinux/p10/branch x86_64 classic
# rpm [yandex] ftp://mirror.yandex.ru/altlinux/p10/branch noarch classic
# rpm [yandex] ftp://mirror.yandex.ru/altlinux/p10/branch x86_64-i586 classic

rpm [yandex] http://mirror.yandex.ru/altlinux/p10/branch x86_64 classic
rpm [yandex] http://mirror.yandex.ru/altlinux/p10/branch noarch classic
rpm [yandex] http://mirror.yandex.ru/altlinux/p10/branch x86_64-i586 classic
```

Сохраняем изменения (`Ctrl + O`, `Enter`, `Ctrl + X`).

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
Get:1 http://mirror.yandex.ru/altlinux/p10/branch/x86_64 release [1234 B]
Get:2 http://mirror.yandex.ru/altlinux/p10/branch/noarch release [1234 B]
Fetched 2468 B in 1s (2468 B/s)
Reading Package Lists... Done
Building Dependency Tree... Done
```

Если чтение списков пакетов завершилось словом **`Done`** без ошибок подключения к сети — репозитории успешно переключены на зеркало Яндекс!

---

## 3. Что делать, если apt-get update всё равно выдаёт ошибку?

1. **Проверьте сетевой резолв (DNS)**:
   ```bash
   ping ya.ru -c 2
   ping mirror.yandex.ru -c 2
   ```
   Если пинг не идёт, проверьте `/etc/resolv.conf` — в нём должен быть указан рабочий DNS-сервер (например, `nameserver 77.88.8.8`).
2. **Проверьте шлюз по умолчанию (Default Gateway)**:
   ```bash
   ip r
   ```
   В выводе должна присутствовать строка `default via ...`.
