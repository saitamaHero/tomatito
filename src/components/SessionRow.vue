<script setup lang="ts">
import { computed } from "vue";
import { hour, toMinutes } from "../core/format";
import { focusMs, goalsDone, sessionTitle } from "../core/session";
import type { Session } from "../core/types";
import PomodoroDots from "./PomodoroDots.vue";

const props = defineProps<{ session: Session; selected: boolean }>();

const meta = computed(() => {
  const s = props.session;
  const parts = [
    s.endedAt === null ? `${hour(s.startedAt!)} · En curso` : `${hour(s.startedAt!)} – ${hour(s.endedAt)}`,
  ];
  if (s.goals.length) parts.push(`${goalsDone(s)}/${s.goals.length} objetivos`);
  return parts.join(" · ");
});
</script>

<template>
  <RouterLink
    :to="{ name: 'history', params: { id: session.id } }"
    :class="['row', { selected }]"
    :aria-current="selected ? 'true' : undefined"
  >
    <span class="texts">
      <span class="title">{{ sessionTitle(session) }}</span>
      <span class="hint">{{ meta }}</span>
    </span>
    <span class="side">
      <PomodoroDots :done="session.done" :total="session.rounds" :size="8" />
      <span class="count">{{ toMinutes(focusMs(session)) }} min</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  transition:
    background-color 150ms,
    border-color 150ms;
}

.row:hover {
  border-color: var(--ink-muted);
}

.row.selected {
  background: var(--brand-tint);
  border-color: var(--brand-tint);
}

.texts {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
</style>
