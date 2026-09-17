# Конфигурация VitePress

Вся конфигурация проекта хранится в файле [`.vitepress/config.mts`](file:///.vitepress/config.mts).

## Основные опции

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ru-RU',           // Язык сайта
  title: 'Wiki Site',      // Заголовок во вкладке браузера
  description: '...',      // Мета-описание для поисковиков
  cleanUrls: true,         // Красивые ссылки без .html на конце

  themeConfig: {
    // Включение локального поиска без сторонних ключей API
    search: {
      provider: 'local'
    },
    // Верхнее меню
    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Документация', link: '/guide/getting-started' }
    ],
    // Сайдбар по секциям
    sidebar: { ... }
  }
})
```

## Добавление новых пунктов меню

Чтобы добавить новый раздел:
1. Создайте Markdown-файл в нужной папке (например, `guide/my-page.md`).
2. Добавьте ссылку в массив `nav` или объект `sidebar` в `.vitepress/config.mts`.
3. Изменения применятся мгновенно!
