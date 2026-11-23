<script setup lang="ts">
import { Pause, Play, RotateCcw, SkipForward } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import AppButton from "../components/AppButton.vue";
import { confirm, pending } from "../components/confirm";
import GoalPanel from "../components/GoalPanel.vue";
import PhaseSwitch from "../components/PhaseSwitch.vue";
import PomodoroDots from "../components/PomodoroDots.vue";
import TimerRing from "../components/TimerRing.vue";
import { toMinutes } from "../core/format";
import { focusMs } from "../core/session";
import { hasProgress } from "../core/timer";
import type { Phase } from "../core/types";
import { m } from "../i18n";
import { useFocusStore } from "../stores/focus";
import { useSettingsStore } from "../stores/settings";

const focus = useFocusStore();
const settings = useSettingsStore();
const panel = useTemplateRef<InstanceType<typeof GoalPanel>>("panel");

const breakMessage = computed(() => {
  const { done, rounds, status } = focus.session;
  return status === "active"
    ? m.value.timer.nextPomodoro(done + 1, rounds)
    : m.value.timer.nextSession;
});

const summary = computed(() =>
  m.value.summary(focus.session.done, toMinutes(focusMs(focus.session))),
);

function confirmDiscard(accept: string) {
  return confirm({
    title: m.value.timer.discard.title,
    body: m.value.timer.discard.body,
    accept,
    cancel: m.value.timer.discard.cancel,
  });
}

async function pick(phase: Phase) {
  const discard = m.value.timer.discard.changePhase;
  if (hasProgress(focus.timer) && !(await confirmDiscard(discard))) return;
  focus.pickPhase(phase);
}

/* Una tecla suelta no debe tirar ni cerrar un pomodoro: con teclado se confirma. */
async function resetFromKeyboard() {
  if (!hasProgress(focus.timer)) return;
  if (!(await confirmDiscard(m.value.timer.discard.reset))) return;
  focus.reset();
}

async function skipFromKeyboard() {
  if (!focus.canSkip) return;
  if (!focus.isBreak) {
    const ok = await confirm(m.value.timer.finish);
    if (!ok) return;
  }
  focus.skip();
}

function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || pending.value) return;
  const target = event.target as HTMLElement;
  if (target.closest("input, textarea, select, [contenteditable]")) return;

  const key = event.key.toLowerCase();
  if (key === " ") {
    if (target.closest("button, a")) return;
    event.preventDefault();
    focus.toggle();
  } else if (key === "n") {
    event.preventDefault();
    panel.value?.focusInput();
  } else if (!focus.celebrating && key === "r") {
    void resetFromKeyboard();
  } else if (!focus.celebrating && key === "s") {
    void skipFromKeyboard();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="timer-view">
    <h1 class="visually-hidden">Tomatito</h1>

    <Transition name="fade" mode="out-in">
      <section v-if="focus.celebrating" key="done" class="stage" aria-live="polite">
        <PomodoroDots :done="focus.session.done" :total="focus.session.rounds" :size="20" />
        <h2 class="display">{{ m.complete }}</h2>
        <p class="muted">{{ summary }}</p>
        <AppButton variant="leaf" size="lg" class="long" @click="focus.toggle()">
          <Play :size="18" aria-hidden="true" />
          {{ m.timer.startLong(settings.values.long) }}
        </AppButton>
        <div class="row">
          <AppButton variant="outline" @click="focus.endSession()">
            {{ m.timer.newSession }}
          </AppButton>
          <AppButton
            variant="ghost"
            :to="{ name: 'history', params: { id: focus.session.id } }"
          >
            {{ m.timer.viewSummary }}
          </AppButton>
        </div>
      </section>

      <section v-else key="timer" class="stage">
        <PhaseSwitch :phase="focus.timer.phase" @pick="pick" />
        <TimerRing
          class="ring"
          :timer="focus.timer"
          :remaining-ms="focus.remainingMs"
          :done="focus.session.done"
          :rounds="focus.session.rounds"
        />

        <div v-if="focus.isBreak" class="controls column">
          <p class="muted">
            {{ m.timer.breakHint }}<br />
            {{ breakMessage }}
          </p>
          <AppButton variant="leaf" size="lg" @click="focus.toggle()">
            <component :is="focus.running ? Pause : Play" :size="18" aria-hidden="true" />
            {{ focus.toggleLabel }}
          </AppButton>
          <AppButton variant="ghost" class="skip" @click="focus.skip()">
            <SkipForward :size="16" aria-hidden="true" />
            {{ m.skip.break }}
          </AppButton>
        </div>

        <div v-else class="controls">
          <AppButton
            variant="outline"
            icon
            :aria-label="m.timer.reset"
            :title="m.timer.withKey(m.timer.reset, 'R')"
            :disabled="focus.timer.status === 'idle'"
            @click="focus.reset()"
          >
            <RotateCcw :size="20" aria-hidden="true" />
          </AppButton>
          <AppButton
            size="lg"
            :title="m.timer.withKey(focus.toggleLabel, m.timer.space)"
            @click="focus.toggle()"
          >
            <component :is="focus.running ? Pause : Play" :size="18" aria-hidden="true" />
            {{ focus.toggleLabel }}
          </AppButton>
          <AppButton
            variant="outline"
            icon
            :aria-label="focus.skipLabel"
            :title="m.timer.withKey(focus.skipLabel, 'S')"
            :disabled="!focus.canSkip"
            @click="focus.skip()"
          >
            <SkipForward :size="20" aria-hidden="true" />
          </AppButton>
        </div>
      </section>
    </Transition>

    <aside class="side">
      <GoalPanel ref="panel" />
    </aside>
  </div>
</template>

<style scoped>
.timer-view {
  --ring: clamp(240px, min(100vh - 360px, 36vw), 360px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(300px, 32vw, 380px);
  gap: var(--space-8);
  height: 100%;
  padding: var(--space-8);
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  min-height: 0;
  text-align: center;
}

.ring {
  margin: clamp(var(--space-6), 5vh, var(--space-12)) 0;
}

/* Alto fijo, el del descanso: el anillo no se mueve al cambiar de fase. */
.controls {
  display: flex;
  align-items: center;
  align-content: flex-start;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-4);
  min-height: 176px;
}

.column {
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: var(--space-2);
}

.column .muted {
  margin-bottom: var(--space-4);
}

.muted {
  color: var(--ink-muted);
}

.skip {
  color: var(--ink);
}

.display {
  margin-top: 28px;
  font-size: 40px;
  line-height: 44px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.display + .muted {
  margin-top: var(--space-3);
}

.long {
  margin-top: var(--space-12);
}

.row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

@media (max-width: 860px) {
  .timer-view {
    --ring: clamp(240px, 52vw, 320px);
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    height: auto;
    min-height: 100%;
  }

  .side {
    justify-content: flex-start;
  }

  .controls {
    min-height: 0;
  }
}
</style>
