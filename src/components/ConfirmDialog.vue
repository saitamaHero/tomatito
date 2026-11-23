<script setup lang="ts">
import { useTemplateRef, watch } from "vue";
import { m } from "../i18n";
import AppButton from "./AppButton.vue";
import { pending } from "./confirm";

const dialog = useTemplateRef<HTMLDialogElement>("dialog");

watch(
  pending,
  (value) => {
    if (value && !dialog.value?.open) dialog.value?.showModal();
    else if (!value) dialog.value?.close();
  },
  { flush: "post" },
);
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="confirm-title"
    @cancel.prevent="pending?.resolve(false)"
    @click.self="pending?.resolve(false)"
  >
    <form v-if="pending" class="body" method="dialog" @submit.prevent="pending.resolve(true)">
      <h2 id="confirm-title" class="card-title">{{ pending.title }}</h2>
      <p class="text">{{ pending.body }}</p>
      <div class="actions">
        <AppButton variant="ghost" @click="pending.resolve(false)">
          {{ pending.cancel ?? m.cancel }}
        </AppButton>
        <AppButton type="submit" autofocus>{{ pending.accept }}</AppButton>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(400px, calc(100vw - 2 * var(--space-8)));
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--ink);
  box-shadow: var(--shadow-soft);
}

.dialog::backdrop {
  background: rgb(28 15 14 / 0.4);
}

.body {
  padding: var(--space-6);
}

.text {
  margin-top: var(--space-2);
  color: var(--ink-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-6);
}
</style>
