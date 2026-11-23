<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue";
import { m } from "../i18n";

defineProps<{
  label: string;
  display: string;
  canDec: boolean;
  canInc: boolean;
}>();

defineEmits<{ step: [direction: 1 | -1] }>();
</script>

<template>
  <div class="stepper" role="group" :aria-label="label">
    <button
      type="button"
      :aria-label="m.settings.decrease(label)"
      :disabled="!canDec"
      @click="$emit('step', -1)"
    >
      <Minus :size="16" aria-hidden="true" />
    </button>
    <output class="mono" aria-live="polite">{{ display }}</output>
    <button
      type="button"
      :aria-label="m.settings.increase(label)"
      :disabled="!canInc"
      @click="$emit('step', 1)"
    >
      <Plus :size="16" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 2px;
}

button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--ink-muted);
  border-radius: var(--radius-full);
  transition: background-color 150ms;
}

button:not(:disabled):hover {
  background: var(--brand-tint);
}

output {
  min-width: 72px;
  text-align: center;
  font-size: 18px;
}
</style>
