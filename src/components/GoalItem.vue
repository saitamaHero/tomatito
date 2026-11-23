<script setup lang="ts">
import { Check, Minus, Pencil, Plus, Trash2 } from "@lucide/vue";
import { nextTick, ref, useTemplateRef } from "vue";
import { MAX_ESTIMATE } from "../core/session";
import type { Goal } from "../core/types";
import { m } from "../i18n";

const props = defineProps<{
  goal: Goal;
  /** Solo lectura en el detalle del historial. */
  readonly?: boolean;
  /** Un ciclo cerrado deja marcar, pero no editar. */
  locked?: boolean;
}>();

const emit = defineEmits<{ update: [patch: Partial<Goal>]; remove: [] }>();

const editing = ref(false);
const text = ref("");
const est = ref(1);
const input = useTemplateRef<HTMLInputElement>("input");
const editButton = useTemplateRef<HTMLButtonElement>("editButton");

async function edit() {
  if (props.readonly || props.locked) return;
  text.value = props.goal.text;
  est.value = props.goal.est;
  editing.value = true;
  await nextTick();
  input.value?.select();
}

async function close(save: boolean) {
  if (!editing.value) return;
  if (save) emit("update", { text: text.value, est: est.value });
  editing.value = false;
  await nextTick();
  editButton.value?.focus();
}
</script>

<template>
  <li class="goal">
    <form
      v-if="editing"
      class="edit"
      @submit.prevent="close(true)"
      @keydown.esc.stop.prevent="close(false)"
    >
      <input ref="input" v-model="text" class="field" :aria-label="m.goal.text" />
      <div class="edit-row">
        <span class="hint">{{ m.goal.pomodoros }}</span>
        <div class="est" role="group" :aria-label="m.goal.estimate">
          <button
            type="button"
            class="tool"
            :aria-label="m.goal.less"
            :disabled="est <= 1"
            @click="est--"
          >
            <Minus :size="16" aria-hidden="true" />
          </button>
          <output class="count" aria-live="polite">{{ est }}</output>
          <button
            type="button"
            class="tool"
            :aria-label="m.goal.more"
            :disabled="est >= MAX_ESTIMATE"
            @click="est++"
          >
            <Plus :size="16" aria-hidden="true" />
          </button>
        </div>
        <button type="submit" class="tool save" :aria-label="m.goal.save">
          <Check :size="16" aria-hidden="true" />
        </button>
      </div>
    </form>

    <template v-else>
      <span v-if="readonly" :class="['box', { on: goal.done }]" aria-hidden="true">
        <Check v-if="goal.done" :size="14" :stroke-width="3" />
      </span>
      <button
        v-else
        type="button"
        class="check"
        :aria-pressed="goal.done"
        :aria-label="goal.done ? m.goal.markPending(goal.text) : m.goal.markDone(goal.text)"
        @click="emit('update', { done: !goal.done })"
      >
        <span :class="['box', { on: goal.done }]">
          <Check v-if="goal.done" :size="14" :stroke-width="3" aria-hidden="true" />
        </span>
      </button>

      <span :class="['text', { done: goal.done }]" @dblclick="edit">{{ goal.text }}</span>

      <span v-if="!readonly && !locked" class="tools">
        <button
          ref="editButton"
          type="button"
          class="tool"
          :aria-label="m.goal.editLabel(goal.text)"
          :title="m.goal.edit"
          @click="edit"
        >
          <Pencil :size="15" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tool"
          :aria-label="m.goal.removeLabel(goal.text)"
          :title="m.goal.remove"
          @click="emit('remove')"
        >
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </span>
      <span
        class="count"
        role="img"
        :aria-label="m.goal.spent(goal.spent, goal.est)"
      >
        {{ goal.spent }}/{{ goal.est }}
      </span>
    </template>
  </li>
</template>

<style scoped>
.goal {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  margin: 0 calc(-1 * var(--space-2));
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
}

.check {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 44px;
  margin-left: -7px;
}

.box {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border: 2px solid var(--ink-muted);
  border-radius: var(--radius-sm);
  color: var(--on-brand);
  transition: background-color 200ms;
}

.box.on {
  border-color: var(--leaf);
  background: var(--leaf);
}

.check:hover .box:not(.on) {
  border-color: var(--leaf);
}

.text {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) 0;
  font-size: 15px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.text.done {
  color: var(--ink-muted);
  text-decoration: line-through;
}

/* Encima del contador, para no quitarle ancho al texto mientras están ocultos. */
.tools {
  position: absolute;
  right: 0;
  display: flex;
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  opacity: 0;
  transition: opacity 150ms;
}

.goal:hover .tools,
.tools:focus-within {
  opacity: 1;
}

.tool {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  color: var(--ink-muted);
}

.tool:not(:disabled):hover {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.edit {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) 0;
}

.field {
  width: 100%;
  height: 40px;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.est {
  display: flex;
  align-items: center;
}

.est output {
  min-width: 24px;
  text-align: center;
}

.save {
  margin-left: auto;
  background: var(--brand-tint);
  color: var(--brand-strong);
}
</style>
