import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ru-RU',
  title: 'Wiki Site',
  description: 'Современная база знаний и документация на VitePress',
  cleanUrls: true,
  ignoreDeadLinks: 'localhostLinks',

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=JetBrains+Mono:wght@400;500;700&display=swap' }]
  ],

  themeConfig: {
    siteTitle: 'Wiki Site',
    logo: '/logo.svg',

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
      { text: 'Модуль 1', link: '/module1/' },
      { text: 'Модуль 2', link: '/module2/' },
      { text: 'Админка', link: '/admin/index.html', target: '_blank' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Введение',
          collapsed: false,
          items: [
            { text: 'Быстрый старт', link: '/guide/getting-started' },
            { text: 'Архитектура', link: '/guide/architecture' },
            { text: 'Конфигурация', link: '/guide/configuration' }
          ]
        },
        {
          text: 'Руководства',
          collapsed: false,
          items: [
            { text: 'Создание страниц', link: '/guide/markdown' },
            { text: 'Компоненты и виджеты', link: '/guide/components' },
            { text: 'Деплой сайта', link: '/guide/deployment' }
          ]
        }
      ],
      '/kb/': [
        {
          text: 'База знаний',
          collapsed: false,
          items: [
            { text: 'Обзор статей', link: '/kb/overview' },
            { text: 'Серверы и хостинг', link: '/kb/servers' },
            { text: 'Безопасность', link: '/kb/security' },
            { text: 'Оптимизация', link: '/kb/optimization' }
          ]
        }
      ],
      '/faq': [
        {
          text: 'Частые вопросы',
          items: [
            { text: 'Общие вопросы (FAQ)', link: '/faq' }
          ]
        }
      ],
      '/module1/': [
        {
          text: 'Модуль №1',
          collapsed: false,
          items: [
            { text: 'Модуль №1 | Задание', link: '/module1/' },
            { text: 'Задание №1: Базовая настройка сети и хостов', link: '/module1/task-1' },
            { text: 'Задание №2: Доступ к сети Интернет на ISP', link: '/module1/task-2' },
            { text: 'Задание №3: Локальные учётные записи и sudo', link: '/module1/task-3' },
            { text: 'Задание №4: Коммутация и сегментация VLAN в сегменте HQ', link: '/module1/task-4' },
            { text: 'Задание №5: Безопасный удаленный доступ (SSH)', link: '/module1/task-5' },
            { text: 'Задание №6: Межофисный защищенный IP-туннель (GRE)', link: '/module1/task-6' },
            { text: 'Задание №7: Динамическая маршрутизация Link-State (OSPF в FRR)', link: '/module1/task-7' },
            { text: 'Задание №8: Динамическая трансляция адресов (NAT) на филиалах', link: '/module1/task-8' },
            { text: 'Задание №9: Настройка DHCP-сервера для клиентов (HQ-CLI)', link: '/module1/task-9' },
            { text: 'Задание №10: Инфраструктура службы доменных имён (DNS BIND)', link: '/module1/task-10' },
            { text: 'Задание №11: Настройка системного времени и часового пояса', link: '/module1/task-11' }
          ]
        }
      ],
      '/module2/': [
        {
          text: 'Модуль №2',
          collapsed: false,
          items: [
            { text: 'Модуль №2 | Задание', link: '/module2/' },
            { text: 'Задание №1: Контроллер домена Samba DC и ввод клиента HQ-CLI', link: '/module2/task-1' },
            { text: 'Задание №2: Файловое хранилище RAID 0 на сервере HQ-SRV', link: '/module2/task-2' },
            { text: 'Задание №3: Сетевая файловая система NFS на HQ-SRV и HQ-CLI', link: '/module2/task-3' },
            { text: 'Задание №4: Служба сетевого времени Chrony на ISP', link: '/module2/task-4' },
            { text: 'Задание №5: Автоматизация с Ansible на сервере BR-SRV', link: '/module2/task-5' },
            { text: 'Задание №6: Веб-приложение в Docker на сервере BR-SRV', link: '/module2/task-6' },
            { text: 'Задание №7: Веб-приложение Apache + MariaDB на сервере HQ-SRV', link: '/module2/task-7' },
            { text: 'Задание №8: Статический проброс портов (DNAT) на роутерах', link: '/module2/task-8' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: 'Работает на VitePress • Быстрый и удобный движок для документации',
      copyright: `© ${new Date().getFullYear()} Wiki Site`
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
