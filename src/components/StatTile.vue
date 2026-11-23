<script setup lang="ts">
defineProps<{ value: string; label: string }>();
</script>

<template>
  <div class="tile card">
    <span class="value mono">{{ value }}</span>
    <span class="hint">{{ label }}</span>
  </div>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-3);
}

.value {
  font-size: 22px;
  line-height: 28px;
  letter-spacing: -0.02em;
}
</style>
