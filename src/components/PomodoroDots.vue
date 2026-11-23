<script setup lang="ts">
withDefaults(defineProps<{ done: number; total: number; size?: number }>(), { size: 10 });
</script>

<template>
  <div
    class="dots"
    role="img"
    :aria-label="`${done} de ${total} pomodoros completados`"
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
  border: 2px solid var(--ink-muted);
  border-radius: var(--radius-full);
  transition: background-color 200ms;
}

.dot.on {
  border-color: var(--brand);
  background: var(--brand);
}
</style>
