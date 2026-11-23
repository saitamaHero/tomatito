<script setup lang="ts">
import { computed, reactive } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import AppButton from "../components/AppButton.vue";
import { confirm } from "../components/confirm";
import Stepper from "../components/Stepper.vue";
import SwitchRow from "../components/SwitchRow.vue";
import { duration } from "../core/format";
import {
  cycleMinutes,
  DEFAULT_SETTINGS,
  LIMITS,
  matchesPreset,
  PRESETS,
  stepSetting,
  type NumericSetting,
} from "../core/settings";
import type { Settings } from "../core/types";
import { platform } from "../platform";
import { useFocusStore } from "../stores/focus";
import { useSettingsStore } from "../stores/settings";

const router = useRouter();
const store = useSettingsStore();
const focus = useFocusStore();
const isDesktop = platform().kind === "desktop";

const draft = reactive<Settings>({ ...store.values });

const dirty = computed(() =>
  (Object.keys(draft) as (keyof Settings)[]).some((k) => draft[k] !== store.values[k]),
);

const rows: { key: NumericSetting; label: string; hint: string; unit: string; dot: string }[] = [
  { key: "focus", label: "Enfoque", hint: "Duración de cada pomodoro", unit: " min", dot: "focus" },
  { key: "short", label: "Descanso corto", hint: "Entre pomodoros", unit: " min", dot: "break" },
  { key: "long", label: "Descanso largo", hint: "Al completar el ciclo", unit: " min", dot: "break" },
  { key: "rounds", label: "Pomodoros por ciclo", hint: "Antes del descanso largo", unit: "", dot: "" },
];

function step(key: NumericSetting, direction: 1 | -1) {
  draft[key] = stepSetting(draft, key, direction);
}

function restoreClassic() {
  const { focus: f, short, long, rounds, dailyGoal } = DEFAULT_SETTINGS;
  Object.assign(draft, { focus: f, short, long, rounds, dailyGoal });
}

async function save() {
  if (isDesktop && draft.globalShortcut !== store.values.globalShortcut) {
    if (!(await store.applyShortcut(draft.globalShortcut))) {
      draft.globalShortcut = store.values.globalShortcut;
      return;
    }
  }
  await store.save({ ...draft });
  focus.settingsChanged();
  await router.push({ name: "timer" });
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  return confirm({
    title: "Hay cambios sin guardar",
    body: "Si sales ahora, los ajustes se quedan como estaban.",
    accept: "Salir sin guardar",
    cancel: "Seguir editando",
  });
});
</script>

<template>
  <form class="settings" @submit.prevent="save">
    <header class="head">
      <h1 class="page-title">Ajustes</h1>
      <nav class="presets" aria-label="Plantillas">
        <button
          v-for="preset in PRESETS"
          :key="preset.label"
          type="button"
          :class="['chip', { selected: matchesPreset(draft, preset.values) }]"
          :aria-pressed="matchesPreset(draft, preset.values)"
          @click="Object.assign(draft, preset.values)"
        >
          {{ preset.label }}
        </button>
      </nav>
    </header>

    <div class="columns">
      <section class="card times" aria-labelledby="h-times">
        <h2 id="h-times" class="card-title">Tiempos</h2>
        <div v-for="row in rows" :key="row.key" class="time-row">
          <span class="texts">
            <span class="label">
              <span :class="['dot', row.dot]" aria-hidden="true" />{{ row.label }}
            </span>
            <span class="hint">{{ row.hint }}</span>
          </span>
          <Stepper
            :label="row.label"
            :display="`${draft[row.key]}${row.unit}`"
            :can-dec="draft[row.key] > LIMITS[row.key].min"
            :can-inc="draft[row.key] < LIMITS[row.key].max"
            @step="step(row.key, $event)"
          />
        </div>
        <p class="cycle">
          Un ciclo completo dura <strong>{{ duration(cycleMinutes(draft)) }}</strong>
        </p>
      </section>

      <div class="stack">
        <section class="card" aria-labelledby="h-auto">
          <h2 id="h-auto" class="card-title">Al terminar una fase</h2>
          <SwitchRow v-model="draft.autoBreak" label="Empezar el descanso solo" />
          <SwitchRow v-model="draft.autoFocus" label="Empezar el siguiente pomodoro solo" />
          <SwitchRow v-model="draft.sound" label="Sonido al terminar" />
          <SwitchRow v-model="draft.notify" label="Notificación del sistema" />
        </section>

        <section class="card goal" aria-labelledby="h-goal">
          <div class="texts">
            <h2 id="h-goal" class="goal-title">Meta diaria</h2>
            <span class="hint">
              Pomodoros al día · {{ duration(draft.dailyGoal * draft.focus) }} de enfoque
            </span>
          </div>
          <Stepper
            label="Meta diaria"
            :display="`${draft.dailyGoal}`"
            :can-dec="draft.dailyGoal > LIMITS.dailyGoal.min"
            :can-inc="draft.dailyGoal < LIMITS.dailyGoal.max"
            @step="step('dailyGoal', $event)"
          />
        </section>

        <section v-if="isDesktop" class="card" aria-labelledby="h-desktop">
          <h2 id="h-desktop" class="card-title">Escritorio</h2>
          <SwitchRow
            v-model="draft.globalShortcut"
            label="Atajo global"
            hint="Ctrl/Cmd + Alt + Mayús + T empieza o pausa"
          />
          <p v-if="store.shortcutError" class="error" role="alert">
            El sistema no permitió el atajo: {{ store.shortcutError }}
          </p>
        </section>
      </div>
    </div>

    <footer class="foot">
      <AppButton variant="ghost" @click="restoreClassic">Restablecer valores clásicos</AppButton>
      <AppButton type="submit" size="lg">Guardar</AppButton>
    </footer>
  </form>
</template>

<style scoped>
.settings {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--space-8);
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.times {
  box-shadow: var(--shadow-soft);
}

.stack {
  display: grid;
  gap: var(--space-4);
}

.time-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 68px;
  border-bottom: 1px solid var(--line);
}

.texts {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 500;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--ink-muted);
}

.dot.focus {
  background: var(--brand);
}

.dot.break {
  background: var(--leaf);
}

.cycle {
  margin-top: var(--space-4);
  font-size: 14px;
  line-height: 20px;
  color: var(--ink-muted);
}

.cycle strong {
  color: var(--ink);
  font-weight: 600;
}

.goal {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.goal-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.error {
  font-size: 13px;
  line-height: 18px;
  color: var(--brand-strong);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

@media (max-width: 860px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
}
</style>
