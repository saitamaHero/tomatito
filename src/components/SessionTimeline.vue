<script setup lang="ts">
import { computed } from "vue";
import { hour, toMinutes } from "../core/format";
import type { Session } from "../core/types";

const props = defineProps<{ session: Session }>();

const label = computed(() =>
  props.session.segments
    .map((s) => `${s.kind === "focus" ? "enfoque" : "descanso"} ${toMinutes(s.activeMs)} min`)
    .join(", "),
);

const end = computed(() => {
  const { segments } = props.session;
  return segments[segments.length - 1]?.endedAt;
});
</script>

<template>
  <section aria-labelledby="h-timeline">
    <h3 id="h-timeline" class="title">Línea de tiempo</h3>
    <div class="track" role="img" :aria-label="label">
      <span
        v-for="(segment, i) in session.segments"
        :key="i"
        :class="['segment', segment.kind]"
        :style="{ flexGrow: segment.activeMs }"
        :title="`${segment.kind === 'focus' ? 'Enfoque' : 'Descanso'} · ${toMinutes(segment.activeMs)} min · ${hour(segment.startedAt)} – ${hour(segment.endedAt)}`"
      />
    </div>
    <div class="ends mono">
      <span>{{ hour(session.startedAt!) }}</span>
      <span v-if="end">{{ hour(end) }}</span>
    </div>
    <div class="legend hint">
      <span><i class="key focus" />Enfoque</span>
      <span><i class="key break" />Descanso</span>
    </div>
  </section>
</template>

<style scoped>
.title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.track {
  display: flex;
  gap: 3px;
  height: 16px;
  margin-top: var(--space-3);
}

.segment {
  flex-basis: 0;
  min-width: 6px;
  border-radius: var(--radius-full);
}

.focus {
  background: var(--brand);
}

.break {
  background: var(--leaf-soft);
}

.ends {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  line-height: 16px;
  color: var(--ink-muted);
}

.legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
}

.legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}
</style>
