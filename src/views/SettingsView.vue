<script setup lang="ts">
import { Languages } from "@lucide/vue";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import AppButton from "../components/AppButton.vue";
import ChipGroup from "../components/ChipGroup.vue";
import { confirm } from "../components/confirm";
import FloatPill from "../components/FloatPill.vue";
import Stepper from "../components/Stepper.vue";
import SwitchRow from "../components/SwitchRow.vue";
import type { FloatView } from "../core/float";
import { duration } from "../core/format";
import { LOCALE_NAMES } from "../core/i18n";
import {
  cycleMinutes,
  DEFAULT_SETTINGS,
  FLOAT_SIZE,
  FLOAT_WHEN,
  LANGUAGES,
  LIMITS,
  matchesPreset,
  PRESETS,
  stepSetting,
  type NumericSetting,
} from "../core/settings";
import type { Settings } from "../core/types";
import { locale, m } from "../i18n";
import { platform } from "../platform";
import type { FloatProblem } from "../platform/types";
import { useFocusStore } from "../stores/focus";
import { useSettingsStore } from "../stores/settings";

const router = useRouter();
const store = useSettingsStore();
const focus = useFocusStore();
const isDesktop = platform().kind === "desktop";

const draft = reactive<Settings>({ ...store.values });

const floatProblem = ref<FloatProblem | null>(null);

onMounted(async () => {
  floatProblem.value = await platform().floatProblem();
});

// La bandeja también enciende y apaga la ventana flotante.
watch(
  () => store.values.float,
  (on) => (draft.float = on),
);

const floatSample = computed<FloatView>(() => ({
  kind: "timer",
  tone: "focus",
  label: m.value.float.focus,
  time: "14:32",
  progress: 0.42,
  running: true,
  toggleLabel: m.value.toggle.running,
  done: 2,
  rounds: draft.rounds,
  compact: draft.floatSize === "compact",
  lang: locale.value,
}));

const floatWhen = computed(() =>
  FLOAT_WHEN.map((value) => ({ value, label: m.value.settings.floatWhenOption[value] })),
);
const floatSize = computed(() =>
  FLOAT_SIZE.map((value) => ({ value, label: m.value.settings.floatSizeOption[value] })),
);
const languages = computed(() =>
  LANGUAGES.map((value) => ({
    value,
    label: value === "system" ? m.value.settings.languageSystem : LOCALE_NAMES[value],
  })),
);

const dirty = computed(() =>
  (Object.keys(draft) as (keyof Settings)[]).some((k) => draft[k] !== store.values[k]),
);

const rows = [
  { key: "focus", minutes: true, dot: "focus" },
  { key: "short", minutes: true, dot: "break" },
  { key: "long", minutes: true, dot: "break" },
  { key: "rounds", minutes: false, dot: "" },
] as const;

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
  return confirm(m.value.settings.unsaved);
});
</script>

<template>
  <form class="settings" @submit.prevent="save">
    <header class="head">
      <h1 class="page-title">{{ m.settings.title }}</h1>
      <nav class="presets" :aria-label="m.settings.presets">
        <button
          v-for="preset in PRESETS"
          :key="preset.id"
          type="button"
          :class="['chip', { selected: matchesPreset(draft, preset.values) }]"
          :aria-pressed="matchesPreset(draft, preset.values)"
          @click="Object.assign(draft, preset.values)"
        >
          {{ m.settings.preset[preset.id] }}
        </button>
      </nav>
    </header>

    <div class="columns">
      <div class="stack">
        <section class="card times" aria-labelledby="h-times">
          <h2 id="h-times" class="card-title">{{ m.settings.times }}</h2>
          <div v-for="row in rows" :key="row.key" class="time-row">
            <span class="texts">
              <span class="label">
                <span :class="['dot', row.dot]" aria-hidden="true" />{{ m.settings.field[row.key].label }}
              </span>
              <span class="hint">{{ m.settings.field[row.key].hint }}</span>
            </span>
            <Stepper
              :label="m.settings.field[row.key].label"
              :display="row.minutes ? m.minutes(draft[row.key]) : `${draft[row.key]}`"
              :can-dec="draft[row.key] > LIMITS[row.key].min"
              :can-inc="draft[row.key] < LIMITS[row.key].max"
              @step="step(row.key, $event)"
            />
          </div>
          <p class="cycle">
            {{ m.settings.cycle }} <strong>{{ duration(cycleMinutes(draft)) }}</strong>
          </p>
        </section>

        <section class="card goal" aria-labelledby="h-goal">
          <div class="texts">
            <h2 id="h-goal" class="goal-title">{{ m.settings.dailyGoal }}</h2>
            <span class="hint">
              {{ m.settings.dailyGoalHint(duration(draft.dailyGoal * draft.focus)) }}
            </span>
          </div>
          <Stepper
            :label="m.settings.dailyGoal"
            :display="`${draft.dailyGoal}`"
            :can-dec="draft.dailyGoal > LIMITS.dailyGoal.min"
            :can-inc="draft.dailyGoal < LIMITS.dailyGoal.max"
            @step="step('dailyGoal', $event)"
          />
        </section>

        <section v-if="isDesktop" class="card" aria-labelledby="h-desktop">
          <h2 id="h-desktop" class="card-title">{{ m.settings.desktop }}</h2>
          <SwitchRow
            v-model="draft.globalShortcut"
            :label="m.settings.shortcut"
            :hint="m.settings.shortcutHint"
          />
          <p v-if="store.shortcutError" class="error" role="alert">
            {{ m.settings.shortcutProblem[store.shortcutError] }}
          </p>
        </section>

        <section class="card">
          <!-- El icono se reconoce aunque el idioma no se entienda. -->
          <h2 class="goal-title language">
            <Languages :size="18" aria-hidden="true" />
            {{ m.settings.language }}
          </h2>
          <ChipGroup
            v-model="draft.language"
            :label="m.settings.language"
            label-hidden
            :options="languages"
          />
        </section>
      </div>

      <div class="stack">
        <section class="card" aria-labelledby="h-auto">
          <h2 id="h-auto" class="card-title">{{ m.settings.whenPhaseEnds }}</h2>
          <SwitchRow v-model="draft.autoBreak" :label="m.settings.autoBreak" />
          <SwitchRow v-model="draft.autoFocus" :label="m.settings.autoFocus" />
          <SwitchRow v-model="draft.sound" :label="m.settings.sound" />
          <SwitchRow v-model="draft.notify" :label="m.settings.notify" />
        </section>

        <section v-if="isDesktop" class="card">
          <template v-if="floatProblem">
            <h2 class="goal-title">{{ m.settings.float }}</h2>
            <p class="hint">{{ m.settings.floatProblem[floatProblem] }}</p>
          </template>
          <template v-else>
            <SwitchRow
              v-model="draft.float"
              heading
              :label="m.settings.float"
              :hint="m.settings.floatHint"
            />
            <div v-if="draft.float" class="float-options">
              <ChipGroup
                v-model="draft.floatWhen"
                :label="m.settings.floatWhen"
                :options="floatWhen"
              />
              <ChipGroup
                v-model="draft.floatSize"
                :label="m.settings.floatSize"
                :options="floatSize"
              />
              <div aria-hidden="true">
                <span class="legend">{{ m.settings.floatPreview }}</span>
                <div class="preview" inert>
                  <FloatPill :view="floatSample" />
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <footer class="foot">
      <AppButton variant="ghost" @click="restoreClassic">{{ m.settings.restore }}</AppButton>
      <AppButton type="submit" size="lg">{{ m.settings.save }}</AppButton>
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

.language {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.goal-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.float-options {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.legend {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}

/* Un fondo cualquiera, como el de otra app. */
.preview {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 104px;
  margin-top: var(--space-2);
  padding: 0 var(--space-4);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 10%, var(--surface-raised));
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
