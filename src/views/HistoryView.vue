<script setup lang="ts">
import { ChevronLeft } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import AppButton from "../components/AppButton.vue";
import BarChart from "../components/BarChart.vue";
import SessionDetail from "../components/SessionDetail.vue";
import SessionRow from "../components/SessionRow.vue";
import StatTile from "../components/StatTile.vue";
import { duration, startOfDay, toMinutes } from "../core/format";
import { computeStats, groupByDay, sessionsInRange, type Range } from "../core/stats";
import { useFocusStore } from "../stores/focus";
import { useSettingsStore } from "../stores/settings";

const route = useRoute();
const focus = useFocusStore();
const settings = useSettingsStore();

const ranges: { id: Range; label: string }[] = [
  { id: "week", label: "7 días" },
  { id: "month", label: "30 días" },
];

const range = ref<Range>("week");
// El día y no la hora: así no se recalcula en cada tick.
const today = computed(() => startOfDay(focus.nowTs));
const stats = computed(() => computeStats(focus.allSessions, range.value, today.value));
const groups = computed(() =>
  groupByDay(sessionsInRange(focus.allSessions, range.value, today.value), today.value),
);

const chosen = computed(() => focus.allSessions.find((s) => s.id === route.params.id));
const shown = computed(() => chosen.value ?? groups.value[0]?.sessions[0]);
</script>

<template>
  <div :class="['history', { 'has-chosen': chosen }]">
    <section class="list" aria-labelledby="h-history">
      <header class="head">
        <h1 id="h-history" class="page-title">Historial</h1>
        <nav class="ranges" aria-label="Periodo">
          <button
            v-for="r in ranges"
            :key="r.id"
            type="button"
            :class="['chip', { selected: r.id === range }]"
            :aria-pressed="r.id === range"
            @click="range = r.id"
          >
            {{ r.label }}
          </button>
        </nav>
      </header>

      <template v-if="groups.length">
        <div class="stats" role="group" aria-label="Resumen">
          <StatTile :value="`${stats.pomodoros}`" label="Pomodoros" />
          <StatTile :value="duration(toMinutes(stats.focusMs))" label="De enfoque" />
          <StatTile :value="`${stats.goalsDone}/${stats.goalsTotal}`" label="Objetivos" />
        </div>

        <section class="card chart-card" aria-labelledby="h-chart">
          <header class="head">
            <h2 id="h-chart" class="chart-title">Pomodoros</h2>
            <span class="hint">{{ range === "week" ? "Por día" : "Por semana" }}</span>
          </header>
          <BarChart
            :bars="stats.bars"
            :goal="range === 'week' ? settings.values.dailyGoal : undefined"
          />
        </section>

        <section class="days" aria-label="Sesiones">
          <div v-for="day in groups" :key="day.key" class="day">
            <h2 class="caption">{{ day.label }}</h2>
            <SessionRow
              v-for="session in day.sessions"
              :key="session.id"
              :session="session"
              :selected="session.id === shown?.id"
            />
          </div>
        </section>
      </template>

      <div v-else class="empty">
        <p class="display">Nada por aquí todavía</p>
        <p class="muted">
          {{
            focus.allSessions.length
              ? "No hay sesiones en este periodo."
              : "Cuando termines tu primer pomodoro, la sesión aparecerá aquí."
          }}
        </p>
        <AppButton :to="{ name: 'timer' }">Ir al temporizador</AppButton>
      </div>
    </section>

    <aside v-if="shown" class="side">
      <RouterLink class="back" :to="{ name: 'history' }">
        <ChevronLeft :size="20" aria-hidden="true" />
        Historial
      </RouterLink>
      <SessionDetail :key="shown.id" :session="shown" />
    </aside>
  </div>
</template>

<style scoped>
.history {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  align-items: start;
  gap: var(--space-8);
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-8);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.ranges {
  display: flex;
  gap: var(--space-2);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.chart-card {
  margin-top: var(--space-4);
}

.chart-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.days {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  margin-top: var(--space-6);
}

.day {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
}

.side {
  position: sticky;
  top: var(--space-8);
  padding-top: var(--space-2);
}

.back {
  display: none;
}

.empty {
  grid-column: 1 / -1;
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: 15vh 0;
  text-align: center;
}

.history:not(:has(.side)) {
  grid-template-columns: minmax(0, 1fr);
}

.display {
  font-size: 40px;
  line-height: 44px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.muted {
  margin-bottom: var(--space-3);
  color: var(--ink-muted);
}

/* En estrecho, la lista y el detalle se turnan. */
@media (max-width: 860px) {
  .history {
    grid-template-columns: minmax(0, 1fr);
  }

  .history:not(.has-chosen) .side,
  .history.has-chosen .list {
    display: none;
  }

  .side {
    position: static;
    padding-top: 0;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin: 0 0 var(--space-4) -4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--brand-strong);
  }
}
</style>
