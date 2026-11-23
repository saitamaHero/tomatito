<script setup lang="ts">
import { RotateCcw } from "@lucide/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { dayName, hour, toMinutes } from "../core/format";
import { breakMs, focusMs, goalsDone } from "../core/session";
import type { Session } from "../core/types";
import { useFocusStore } from "../stores/focus";
import AppButton from "./AppButton.vue";
import { confirm } from "./confirm";
import GoalItem from "./GoalItem.vue";
import SessionTimeline from "./SessionTimeline.vue";
import StatTile from "./StatTile.vue";

const props = defineProps<{ session: Session }>();

const focus = useFocusStore();
const router = useRouter();

const isCurrent = computed(() => props.session.status === "active");
const heading = computed(() => {
  const { startedAt, endedAt } = props.session;
  const end = endedAt === null ? "EN CURSO" : hour(endedAt);
  return `${dayName(startedAt!).toUpperCase()} · ${hour(startedAt!)} – ${end}`;
});

async function repeat() {
  if (focus.inProgress) {
    const ok = await confirm({
      title: "Hay una sesión en curso",
      body: "Se terminará tal como está y empezarás otra con estos objetivos.",
      accept: "Terminar y repetir",
    });
    if (!ok) return;
  }
  focus.repeat(props.session);
  await router.push({ name: "timer" });
}
</script>

<template>
  <article class="detail" aria-labelledby="h-session">
    <h2 id="h-session" class="caption">{{ heading }}</h2>
    <p class="score">
      <span class="big mono">{{ session.done }}/{{ session.rounds }}</span>
      <span class="muted">pomodoros</span>
    </p>
    <p v-if="session.status === 'completed'" class="complete">¡Tomatito completo!</p>

    <div class="stats">
      <StatTile :value="`${toMinutes(focusMs(session))}`" label="min enfoque" />
      <StatTile :value="`${toMinutes(breakMs(session))}`" label="min descanso" />
      <StatTile
        :value="`${session.pauses}`"
        :label="session.pauses === 1 ? 'pausa' : 'pausas'"
      />
    </div>

    <SessionTimeline class="block" :session="session" />

    <section v-if="session.goals.length" class="block card goals" aria-labelledby="h-goals">
      <header class="head">
        <h3 id="h-goals" class="title">Objetivos</h3>
        <span class="count">{{ goalsDone(session) }}/{{ session.goals.length }}</span>
      </header>
      <ul>
        <GoalItem v-for="goal in session.goals" :key="goal.id" :goal="goal" readonly />
      </ul>
    </section>

    <AppButton v-if="!isCurrent" variant="outline" class="repeat" @click="repeat">
      <RotateCcw :size="18" aria-hidden="true" />
      Repetir esta sesión
    </AppButton>
  </article>
</template>

<style scoped>
.score {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: var(--space-2);
}

.big {
  font-size: 64px;
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.02em;
}

.muted {
  color: var(--ink-muted);
}

.complete {
  margin-top: var(--space-2);
  font-weight: 600;
  color: var(--leaf);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.block {
  margin-top: var(--space-6);
}

.goals {
  box-shadow: var(--shadow-soft);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.repeat {
  width: 100%;
  height: 52px;
  margin-top: var(--space-6);
}
</style>
