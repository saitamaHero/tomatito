<script setup lang="ts">
import { m } from "../i18n";

withDefaults(defineProps<{ done: number; total: number; size?: number }>(), { size: 10 });
</script>

<template>
  <div
    class="dots"
    role="img"
    :aria-label="m.dots(done, total)"
    :style="{ '--dot': `${size}px` }"
  >
    <span v-for="i in total" :key="i" :class="['dot', { on: i <= done }]" />
  </div>
</template>

<style scoped>
.dots {
  display: flex;
  gap: calc(var(--dot) * 0.6);
}

.dot {
  width: var(--dot);
  height: var(--dot);
  border: clamp(1.5px, calc(var(--dot) * 0.25), 2px) solid var(--ink-muted);
  border-radius: var(--radius-full);
  transition: background-color 200ms;
}

.dot.on {
  border-color: var(--brand);
  background: var(--brand);
}
</style>
