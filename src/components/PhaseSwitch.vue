<script setup lang="ts">
import { PHASES } from "../core/format";
import type { Phase } from "../core/types";
import { m } from "../i18n";

defineProps<{ phase: Phase }>();
defineEmits<{ pick: [phase: Phase] }>();
</script>

<template>
  <nav class="switch" :aria-label="m.timer.phases">
    <button
      v-for="id in PHASES"
      :key="id"
      type="button"
      :class="['chip', { selected: id === phase, break: id !== 'focus' }]"
      :aria-pressed="id === phase"
      @click="id !== phase && $emit('pick', id)"
    >
      {{ m.phase[id] }}
    </button>
  </nav>
</template>

<style scoped>
.switch {
  display: flex;
  gap: var(--space-2);
}
</style>
