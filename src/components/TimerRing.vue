<script setup lang="ts">
import { computed } from "vue";
import { clock } from "../core/format";
import type { TimerState } from "../core/types";
import { m } from "../i18n";
import PomodoroDots from "./PomodoroDots.vue";

const props = defineProps<{
  timer: TimerState;
  remainingMs: number;
  done: number;
  rounds: number;
}>();

const RADIUS = 132;
const LENGTH = 2 * Math.PI * RADIUS;

const offset = computed(() => LENGTH * (props.remainingMs / props.timer.totalMs));
const tone = computed(() => {
  if (props.timer.phase !== "focus") return "break";
  return props.timer.status === "paused" ? "paused" : "focus";
});
</script>

<template>
  <section :class="['ring', tone]" :aria-label="m.timer.label">
    <svg viewBox="0 0 280 280" aria-hidden="true">
      <circle class="track" cx="140" cy="140" :r="RADIUS" />
      <circle
        class="progress"
        cx="140"
        cy="140"
        :r="RADIUS"
        :stroke-dasharray="LENGTH"
        :style="{ strokeDashoffset: offset, opacity: remainingMs < timer.totalMs ? 1 : 0 }"
        transform="rotate(-90 140 140)"
      />
    </svg>
    <div class="face">
      <span class="caption phase">{{ m.phase[timer.phase].toUpperCase() }}</span>
      <span class="digits mono" role="timer">{{ clock(remainingMs) }}</span>
      <PomodoroDots :done="done" :total="rounds" />
    </div>
  </section>
</template>

<style scoped>
.ring {
  --tone: var(--brand);
  --tone-text: var(--brand-strong);
  --tone-track: var(--brand-tint);
  position: relative;
  flex: none;
  width: var(--ring);
  height: var(--ring);
}

.paused {
  --tone: var(--brand-deep);
}

.break {
  --tone: var(--leaf);
  --tone-text: var(--leaf);
  --tone-track: var(--leaf-tint);
}

svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

circle {
  fill: none;
  stroke-width: 10;
}

.track {
  stroke: var(--tone-track);
  transition: stroke 200ms;
}

/* La transición dura lo mismo que un tick: el anillo avanza continuo, no a saltos. */
.progress {
  stroke: var(--tone);
  stroke-linecap: round;
  transition:
    stroke 200ms,
    stroke-dashoffset 250ms linear;
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.phase {
  color: var(--tone-text);
  transition: color 200ms;
}

.digits {
  font-size: calc(var(--ring) * 0.2667);
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.02em;
}
</style>
