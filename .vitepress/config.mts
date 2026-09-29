import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ru-RU',
  title: 'demo-wiki',
  description: 'Современная база знаний и документация на VitePress',
  cleanUrls: true,
  ignoreDeadLinks: 'localhostLinks',

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=JetBrains+Mono:wght@400;500;700&display=swap' }]
  ],

  themeConfig: {
    siteTitle: 'demo-wiki',
    logo: '/logo.png',

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Поиск...',
                buttonAriaLabel: 'Поиск по вики'
              },
              modal: {
                noResultsText: 'Ничего не найдено по запросу',
                resetButtonTitle: 'Сбросить поиск',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'навигация',
                  closeText: 'закрыть'
                }
              }
            }
          }
        }
      }
    },

    nav: [
      { text: 'Главная', link: '/' },
      {
        text: '2026',
        items: [
          { text: '📋 Обзор 2026 года', link: '/2026/' },
          { text: '🌐 Модуль №1: Сетевая инфраструктура', link: '/2026/module1/' },
          { text: '🏢 Модуль №2: Службы каталога и сервисы', link: '/2026/module2/' },
          { text: '🔒 Модуль №3: Безопасность и администрирование', link: '/2026/module3/' }
        ]
      }
    ],

    sidebar: {
      '/2026/': [
        {
          text: '📋 Демоэкзамен 2026',
          items: [
            { text: 'Обзор заданий и стенда', link: '/2026/' }
          ]
        },
        {
          text: 'Модуль №1: Сетевая инфраструктура',
          collapsed: true,
          items: [
            { text: 'Модуль №1 | Задание', link: '/2026/module1/' },
            { text: 'Задание №0: Настройка источников пакетов', link: '/2026/module1/task-0' },
            { text: 'Задание №1: Базовая настройка сети и хостов', link: '/2026/module1/task-1' },
            { text: 'Задание №2: Доступ к сети Интернет на ISP', link: '/2026/module1/task-2' },
            { text: 'Задание №3: Локальные учётные записи и sudo', link: '/2026/module1/task-3' },
            { text: 'Задание №4: Коммутация и сегментация VLAN в сегменте HQ', link: '/2026/module1/task-4' },
            { text: 'Задание №5: Безопасный удаленный доступ (SSH)', link: '/2026/module1/task-5' },
            { text: 'Задание №6: Межофисный защищенный IP-туннель (GRE)', link: '/2026/module1/task-6' },
            { text: 'Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR)', link: '/2026/module1/task-7' },
            { text: 'Задание №8: Динамическая трансляция адресов (NAT) на филиалах', link: '/2026/module1/task-8' },
            { text: 'Задание №9: Настройка DHCP-сервера для клиентов (HQ-CLI)', link: '/2026/module1/task-9' },
            { text: 'Задание №10: Инфраструктура службы доменных имён (DNS BIND)', link: '/2026/module1/task-10' },
            { text: 'Задание №11: Настройка системного времени и часового пояса', link: '/2026/module1/task-11' }
          ]
        },
        {
          text: 'Модуль №2: Службы каталога и сервисы',
          collapsed: true,
          items: [
            { text: 'Модуль №2 | Задание', link: '/2026/module2/' },
            { text: 'Задание №0: Настройка источников пакетов', link: '/2026/module2/task-0' },
            { text: 'Задание №1: Контроллер домена Samba DC и ввод клиента HQ-CLI', link: '/2026/module2/task-1' },
            { text: 'Задание №2: Файловое хранилище RAID 0 на сервере HQ-SRV', link: '/2026/module2/task-2' },
            { text: 'Задание №3: Сетевая файловая система NFS на HQ-SRV и HQ-CLI', link: '/2026/module2/task-3' },
            { text: 'Задание №4: Служба сетевого времени Chrony на ISP', link: '/2026/module2/task-4' },
            { text: 'Задание №5: Автоматизация с Ansible на сервере BR-SRV', link: '/2026/module2/task-5' },
            { text: 'Задание №6: Веб-приложение в Docker на сервере BR-SRV', link: '/2026/module2/task-6' },
            { text: 'Задание №7: Веб-приложение Apache + MariaDB на сервере HQ-SRV', link: '/2026/module2/task-7' },
            { text: 'Задание №8: Статический проброс портов (DNAT) на роутерах', link: '/2026/module2/task-8' },
            { text: 'Задание №9: Обратный прокси-сервер Nginx на ISP', link: '/2026/module2/task-9' },
            { text: 'Задание №10: Web-аутентификация в Nginx (.htpasswd)', link: '/2026/module2/task-10' },
            { text: 'Задание №11: Установка Яндекс Браузера на HQ-CLI', link: '/2026/module2/task-11' }
          ]
        },
        {
          text: 'Модуль №3: Безопасность и администрирование',
          collapsed: true,
          items: [
            { text: 'Модуль №3 | Задание', link: '/2026/module3/' },
            { text: 'Задание №0: Настройка источников пакетов', link: '/2026/module3/task-0' },
            { text: 'Задание №1: Импорт пользователей в домен Samba DC', link: '/2026/module3/task-1' },
            { text: 'Задание №2: Центр сертификации ГОСТ и HTTPS Nginx', link: '/2026/module3/task-2' },
            { text: 'Задание №3: Защищённый IP-туннель и OSPF', link: '/2026/module3/task-3' },
            { text: 'Задание №4: Межсетевой экран nftables', link: '/2026/module3/task-4' },
            { text: 'Задание №5: Принт-сервер CUPS и PDF-принтер', link: '/2026/module3/task-5' },
            { text: 'Задание №6: Централизованное логирование rsyslog', link: '/2026/module3/task-6' },
            { text: 'Задание №7: Мониторинг устройств на HQ-SRV', link: '/2026/module3/task-7' },
            { text: 'Задание №8: Инвентаризация Ansible (PC-INFO)', link: '/2026/module3/task-8' },
            { text: 'Задание №9: Защита SSH с помощью Fail2ban', link: '/2026/module3/task-9' },
            { text: 'Задание №10: Резервное копирование данных', link: '/2026/module3/task-10' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: 'Работает на VitePress • Быстрый и удобный движок для документации',
      copyright: `© ${new Date().getFullYear()} demo-wiki`
    },

    docFooter: {
      prev: 'Предыдущая страница',
      next: 'Следующая страница'
    },

    outline: {
      label: 'На этой странице',
      level: 'deep'
    },

    darkModeSwitchLabel: 'Тема оформления',
    returnToTopLabel: 'Наверх'
  }
})
