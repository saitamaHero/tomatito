<script setup lang="ts">
import { computed } from "vue";
import type { Bar } from "../core/stats";
import { m } from "../i18n";

const props = defineProps<{
  bars: Bar[];
  /** Línea de referencia, en las mismas unidades que las barras. */
  goal?: number;
}>();

const PLOT = 96;

const max = computed(() => Math.max(1, props.goal ?? 0, ...props.bars.map((b) => b.value)));
const height = (value: number) => (value === 0 ? 2 : Math.max(4, (value / max.value) * PLOT));
const label = computed(() =>
  m.value.history.chartLabel(
    props.bars.map((b) => `${b.label} ${b.value}`).join(", "),
    props.goal,
  ),
);
</script>

<template>
  <div class="chart" role="img" :aria-label="label">
    <div class="plot" :style="{ height: `${PLOT + 22}px` }">
      <div v-if="goal" class="goal" :style="{ bottom: `${height(goal)}px` }">
        <span class="goal-label">{{ m.history.chartGoal(goal) }}</span>
      </div>
      <div v-for="(bar, i) in bars" :key="i" class="col">
        <span class="value mono">{{ bar.value }}</span>
        <div
          :class="['bar', { current: bar.current, empty: bar.value === 0 }]"
          :style="{ height: `${height(bar.value)}px` }"
        />
      </div>
    </div>
    <div class="labels">
      <span v-for="(bar, i) in bars" :key="i" :class="['label', { current: bar.current }]">
        {{ bar.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.chart {
  margin-top: var(--space-3);
}

.plot {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  padding-right: 52px;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  position: relative;
}

.value {
  padding: 0 3px;
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  font-size: 12px;
  line-height: 16px;
  color: var(--ink-muted);
}

.bar {
  width: 100%;
  max-width: 28px;
  border-radius: 6px 6px 3px 3px;
  background: var(--brand-deep);
}

.bar.current {
  background: var(--brand);
}

.bar.empty {
  background: var(--line);
}

.goal {
  position: absolute;
  inset-inline: 0;
  border-top: 1px dashed var(--ink-muted);
}

.goal-label {
  position: absolute;
  right: 0;
  bottom: 2px;
  font-size: 12px;
  line-height: 16px;
  color: var(--ink-muted);
}

.labels {
  display: flex;
  gap: var(--space-2);
  margin-top: 6px;
  padding-right: 52px;
}

.label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  line-height: 16px;
  color: var(--ink-muted);
  white-space: nowrap;
}

.label.current {
  color: var(--ink);
  font-weight: 600;
}
</style>
