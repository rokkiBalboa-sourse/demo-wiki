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
      { text: 'Модуль 1', link: '/module1/task-1' },
      { text: 'Документация', link: '/guide/getting-started' },
      { text: 'База знаний', link: '/kb/overview' },
      { text: 'FAQ', link: '/faq' },
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
            { text: 'Задание 1: Сеть и хосты', link: '/module1/task-1' }
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
