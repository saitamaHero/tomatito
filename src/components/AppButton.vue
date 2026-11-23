<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

withDefaults(
  defineProps<{
    variant?: "primary" | "leaf" | "outline" | "ghost";
    size?: "md" | "lg";
    /** Botón redondo de solo icono; necesita aria-label. */
    icon?: boolean;
    type?: "button" | "submit";
    to?: RouteLocationRaw;
  }>(),
  { variant: "primary", size: "md", icon: false, type: "button", to: undefined },
);
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="['button', variant, size, { icon }]">
    <slot />
  </RouterLink>
  <button v-else :type="type" :class="['button', variant, size, { icon }]">
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background-color 200ms,
    border-color 200ms,
    color 200ms;
}

.lg {
  height: 56px;
  min-width: 152px;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 600;
}

.icon {
  width: 52px;
  height: 52px;
  min-width: 0;
  padding: 0;
}

.primary {
  background: var(--brand);
  color: var(--on-brand);
}

.primary:not(:disabled):hover {
  background: var(--brand-strong);
}

.leaf {
  background: var(--leaf);
  color: var(--on-brand);
}

.leaf:not(:disabled):hover {
  background: var(--leaf-strong);
}

.outline {
  border-color: var(--ink-muted);
}

.outline:not(:disabled):hover {
  background: var(--brand-tint);
}

.ghost {
  color: var(--brand-strong);
}

.ghost:not(:disabled):hover {
  background: var(--brand-tint);
}
</style>
