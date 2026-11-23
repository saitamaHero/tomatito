<script setup lang="ts">
import { useId } from "vue";

defineProps<{ label: string; hint?: string }>();
const on = defineModel<boolean>({ required: true });
const id = useId();
</script>

<template>
  <div class="row">
    <span class="texts">
      <span :id="id" class="label">{{ label }}</span>
      <span v-if="hint" class="hint">{{ hint }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="on"
      :aria-labelledby="id"
      :class="['track', { on }]"
      @click="on = !on"
    >
      <span class="knob" />
    </button>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
}

.texts {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 15px;
  line-height: 22px;
}

.track {
  flex: none;
  width: 52px;
  height: 32px;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--ink-muted);
  transition: background-color 200ms;
}

.track.on {
  background: var(--brand);
}

.knob {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--on-brand);
  transition: translate 200ms;
}

.on .knob {
  translate: 20px 0;
}
</style>
