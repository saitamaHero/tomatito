<script setup lang="ts">
import AppRail from "./components/AppRail.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
</script>

<template>
  <div class="shell">
    <AppRail />
    <main class="content">
      <RouterView />
    </main>
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  height: 100%;
}

.content {
  min-height: 0;
  overflow-y: auto;
}
</style>
