---
title: Развертывание (Деплой)
---

# Развертывание (Деплой)

VitePress генерирует чистые статические файлы, поэтому сайт можно развернуть на любом хостинге статических сайтов.

## Vercel (как у wiki.senko.digital)

Сайт `wiki.senko.digital` развернут именно на **Vercel** с проксированием через **Cloudflare**.

1. Запушьте ваш репозиторий на GitHub / GitLab.
2. Подключите репозиторий в панели управления [Vercel](https://vercel.com).
3. Настройки сборки:
   - **Framework Preset**: `VitePress` (или `Other`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.vitepress/dist`
4. Нажмите **Deploy**.

## Cloudflare Pages

1. Перейдите в Cloudflare Dashboard -> **Workers & Pages**.
2. Подключите Git-репозиторий.
3. Укажите:
   - Build command: `npm run build`
   - Build output directory: `.vitepress/dist`

## GitHub Pages

Создайте workflow-файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy Docs
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .vitepress/dist
      - uses: actions/deploy-pages@v4
```
