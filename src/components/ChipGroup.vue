<script setup lang="ts" generic="T extends string">
import { useId } from "vue";

defineProps<{ label: string; options: { value: T; label: string }[] }>();
const selected = defineModel<T>({ required: true });
const name = useId();
</script>

<template>
  <fieldset class="group">
    <legend class="legend">{{ label }}</legend>
    <div class="options">
      <label
        v-for="option in options"
        :key="option.value"
        :class="['option', { selected: option.value === selected }]"
      >
        <input
          v-model="selected"
          type="radio"
          class="visually-hidden"
          :name="name"
          :value="option.value"
        />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.legend {
  padding: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.option {
  position: relative;
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--ink-muted);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 200ms,
    border-color 200ms,
    color 200ms;
}

.option:hover {
  background: var(--brand-tint);
}

.option.selected {
  border-color: var(--brand-strong);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.option:has(:focus-visible) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
</style>
