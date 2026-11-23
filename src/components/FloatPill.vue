<script setup lang="ts">
import { Pause, Play } from "@lucide/vue";
import { computed } from "vue";
import type { FloatView } from "../core/float";
import { m } from "../i18n";
import PomodoroDots from "./PomodoroDots.vue";

const props = defineProps<{
  view: FloatView;
  /** Pegada a un borde: compacta aunque el ajuste diga lo contrario. */
  docked?: boolean;
}>();

defineEmits<{ toggle: []; open: [] }>();

const RADIUS = 22;
const LENGTH = 2 * Math.PI * RADIUS;

const offset = computed(() =>
  props.view.kind === "timer" ? LENGTH * (1 - props.view.progress) : LENGTH,
);
</script>

<template>
  <button
    v-if="view.kind === 'finished'"
    type="button"
    :class="['pill', 'finished', view.tone]"
    @click="$emit('toggle')"
  >
    <span class="texts">
      <span class="title">{{ view.title }}</span>
      <span class="hint">{{ view.body }}</span>
    </span>
    <span class="action">{{ view.action }}</span>
  </button>

  <button
    v-else-if="view.compact || docked"
    type="button"
    :class="['pill', 'compact', view.tone]"
    :aria-label="m.float.open(view.label, view.time)"
    @click="$emit('open')"
  >
    <span class="dot" aria-hidden="true" />
    <span class="time mono">{{ view.time }}</span>
  </button>

  <div v-else :class="['pill', 'normal', view.tone]">
    <button type="button" class="ring" :aria-label="view.toggleLabel" @click="$emit('toggle')">
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle class="track" cx="26" cy="26" :r="RADIUS" />
        <circle
          class="progress"
          cx="26"
          cy="26"
          :r="RADIUS"
          :stroke-dasharray="LENGTH"
          :style="{ strokeDashoffset: offset, opacity: view.progress > 0 ? 1 : 0 }"
          transform="rotate(-90 26 26)"
        />
      </svg>
      <component :is="view.running ? Pause : Play" :size="18" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="face"
      :aria-label="m.float.open(view.label, view.time)"
      @click="$emit('open')"
    >
      <span class="label">{{ view.label }}</span>
      <span class="time mono">{{ view.time }}</span>
      <PomodoroDots :done="view.done" :total="view.rounds" :size="6" />
    </button>
  </div>
</template>

<style scoped>
.pill {
  --tone: var(--brand);
  --tone-text: var(--brand-strong);
  --tone-track: var(--brand-tint);
  display: flex;
  align-items: center;
  width: max-content;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  box-shadow: var(--shadow-float);
  color: var(--ink);
  text-align: left;
  user-select: none;
}

.paused {
  --tone: var(--brand-deep);
  --tone-text: var(--brand-deep);
}

.break {
  --tone: var(--leaf);
  --tone-text: var(--leaf);
  --tone-track: var(--leaf-tint);
}

/* De noche `brand-deep` no contrasta lo bastante para texto e iconos. */
@media (prefers-color-scheme: dark) {
  .paused {
    --tone-text: var(--brand-strong);
  }
}

.normal {
  gap: var(--space-3);
  width: 212px;
  padding: 10px 14px 10px 10px;
}

.ring {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  color: var(--tone-text);
  transition: background-color 200ms;
}

.ring:hover {
  background: var(--tone-track);
}

.ring svg:first-child {
  position: absolute;
  inset: 0;
}

circle {
  fill: none;
  stroke-width: 4;
}

.track {
  stroke: var(--tone-track);
}

/* Llega un progreso por segundo: la transición lo hace continuo. */
.progress {
  stroke: var(--tone);
  stroke-linecap: round;
  transition:
    stroke 200ms,
    stroke-dashoffset 1s linear;
}

.paused .progress {
  transition-duration: 200ms;
}

.face {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.label {
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--tone-text);
}

.normal .time {
  font-size: 28px;
  line-height: 32px;
  letter-spacing: -0.02em;
}

.paused .time {
  color: var(--ink-muted);
}

.compact {
  gap: var(--space-2);
  height: 44px;
  padding: 0 14px 0 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--tone);
}

.compact .time {
  font-size: 18px;
  line-height: 24px;
}

.finished {
  gap: var(--space-3);
  width: 340px;
  padding: 12px 12px 12px 18px;
}

.texts {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
}

.action {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-full);
  background: var(--tone);
  color: var(--on-brand);
  font-size: 14px;
  font-weight: 500;
  transition: background-color 200ms;
}

.finished.focus:hover .action {
  background: var(--brand-strong);
}

.finished.break:hover .action {
  background: var(--leaf-strong);
}
</style>
