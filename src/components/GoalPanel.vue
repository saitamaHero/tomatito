<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { computed, ref, useTemplateRef } from "vue";
import { firstPending, goalsDone } from "../core/session";
import { m } from "../i18n";
import { useFocusStore } from "../stores/focus";
import { useSettingsStore } from "../stores/settings";
import { confirm } from "./confirm";
import AppButton from "./AppButton.vue";
import GoalItem from "./GoalItem.vue";

const focus = useFocusStore();
const settings = useSettingsStore();

const text = ref("");
const input = useTemplateRef<HTMLInputElement>("input");

const locked = computed(() => focus.session.status !== "active");
const done = computed(() => goalsDone(focus.session));
const total = computed(() => focus.session.goals.length);
const next = computed(() =>
  focus.isBreak && !locked.value ? firstPending(focus.session)?.id : undefined,
);
const title = computed(() =>
  locked.value && total.value > 0 && done.value === total.value
    ? m.value.goals.titleDone
    : m.value.goals.title,
);

function add() {
  if (!text.value.trim()) return;
  focus.addGoal(text.value);
  text.value = "";
}

async function end() {
  const { done: pomodoros } = focus.session;
  const ok = await confirm({
    title: m.value.goals.end,
    body: pomodoros === 0 ? m.value.goals.endBodyEmpty : m.value.goals.endBody,
    accept: m.value.goals.end,
    cancel: m.value.goals.endCancel,
  });
  if (ok) focus.endSession();
}

defineExpose({ focusInput: () => input.value?.focus() });
</script>

<template>
  <section class="panel card" aria-labelledby="goals-title">
    <header class="head">
      <h2 id="goals-title" class="card-title">{{ title }}</h2>
      <span v-if="total" class="count">{{ done }}/{{ total }}</span>
    </header>

    <ul v-if="total" class="list">
      <template v-for="goal in focus.session.goals" :key="goal.id">
        <li v-if="goal.id === next" class="next hint">{{ m.goals.next }}</li>
        <GoalItem
          :goal="goal"
          :locked="locked"
          @update="focus.updateGoal(goal.id, $event)"
          @remove="focus.removeGoal(goal.id)"
        />
      </template>
    </ul>
    <p v-else class="empty hint">
      {{ locked ? m.goals.emptyLocked : m.goals.empty }}
    </p>

    <form v-if="!locked" class="add" @submit.prevent="add">
      <label for="new-goal" class="visually-hidden">{{ m.goals.field }}</label>
      <input
        id="new-goal"
        ref="input"
        v-model="text"
        class="field"
        autocomplete="off"
        :placeholder="m.goals.placeholder"
        @keydown.esc="input?.blur()"
      />
      <button type="submit" class="plus" :aria-label="m.goals.add">
        <Plus :size="20" aria-hidden="true" />
      </button>
    </form>

    <footer class="foot">
      <span
        class="count"
        role="img"
        :aria-label="m.goals.todayLabel(focus.today, settings.values.dailyGoal)"
      >
        {{ m.goals.today(focus.today, settings.values.dailyGoal) }}
      </span>
      <AppButton v-if="focus.inProgress" variant="ghost" @click="end">{{ m.goals.end }}</AppButton>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-soft);
  min-height: 0;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.list {
  margin: var(--space-2) calc(-1 * var(--space-2)) 0;
  padding: 0 var(--space-2);
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 44px;
}

.next {
  padding-top: var(--space-2);
}

.empty {
  margin: var(--space-3) 0 var(--space-2);
}

.add {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.add .field {
  flex: 1;
  min-width: 0;
  height: 44px;
}

.plus {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--brand-tint);
  color: var(--brand-strong);
  transition: background-color 200ms;
}

.plus:hover {
  background: var(--line);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin: var(--space-3) -8px -8px 0;
}
</style>
