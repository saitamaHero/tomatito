<script setup lang="ts">
import { History, SlidersHorizontal, Timer } from "@lucide/vue";
import { useFocusStore } from "../stores/focus";
import { clock } from "../core/format";

const focus = useFocusStore();

const links = [
  { name: "timer", label: "Temporizador", icon: Timer },
  { name: "history", label: "Historial", icon: History },
  { name: "settings", label: "Ajustes", icon: SlidersHorizontal },
];
</script>

<template>
  <nav class="rail" aria-label="Principal">
    <span class="mark" aria-hidden="true">T</span>
    <RouterLink
      v-for="link in links"
      :key="link.name"
      :to="{ name: link.name }"
      :class="['link', { active: $route.name === link.name }]"
      :aria-current="$route.name === link.name ? 'page' : undefined"
      :aria-label="link.label"
      :title="link.label"
    >
      <component :is="link.icon" :size="22" aria-hidden="true" />
    </RouterLink>
    <RouterLink
      v-if="$route.name !== 'timer' && focus.timer.status !== 'idle'"
      :to="{ name: 'timer' }"
      :class="['mini', 'mono', { break: focus.isBreak }]"
      title="Volver al temporizador"
    >
      {{ clock(focus.remainingMs) }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) 0;
  border-right: 1px solid var(--line);
}

.mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: var(--space-4);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--brand-strong);
}

.link {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  color: var(--ink-muted);
  transition:
    background-color 150ms,
    color 150ms;
}

.link:hover {
  color: var(--ink);
  background: var(--line);
}

.link.active {
  color: var(--brand-strong);
  background: var(--brand-tint);
}

.mini {
  margin-top: auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 14px;
  line-height: 20px;
  color: var(--brand-strong);
}

.mini.break {
  color: var(--leaf);
}
</style>
