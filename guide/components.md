# Интерактивные компоненты

В VitePress можно напрямую использовать синтаксис Vue внутри `.md` файлов.

## Пример реактивного счетчика

Вы можете объявить блок `<script setup>` прямо в документе Markdown:

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<div style="padding: 16px; border-radius: 12px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); margin: 16px 0; display: inline-flex; align-items: center; gap: 16px;">
  <span>Текущее значение: <strong>{{ count }}</strong></span>
  <button 
    style="padding: 6px 14px; border-radius: 8px; background: var(--vp-c-brand-1); color: white; border: none; cursor: pointer; font-weight: 600;"
    @click="count++">
    + Увеличить
  </button>
  <button 
    style="padding: 6px 14px; border-radius: 8px; background: var(--vp-c-bg-alt); border: 1px solid var(--vp-c-divider); cursor: pointer; font-weight: 500;"
    @click="count = 0">
    Сбросить
  </button>
</div>

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<button @click="count++">Кликнули: {{ count }}</button>
```

Это делает документацию живой и интерактивной без необходимости подключать тяжелые сторонние библиотеки.
