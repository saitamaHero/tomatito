<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import FloatPill from "../components/FloatPill.vue";
import type { FloatView } from "../core/float";
import { setLocale } from "../i18n";
import { act, connect, drag, layout } from "./bridge";

/** Con menos movimiento que esto es un clic, no un arrastre. */
const THRESHOLD = 4;

const view = shallowRef<FloatView | null>(null);
const docked = ref(false);
const box = useTemplateRef<HTMLElement>("box");

let measured = "";

/* La ventana se ajusta a la píldora, y no al revés. */
function measure() {
  if (!box.value) return;
  const { offsetWidth, offsetHeight } = box.value;
  const size = `${offsetWidth}x${offsetHeight}`;
  if (!offsetWidth || size === measured) return;
  measured = size;
  layout(offsetWidth, offsetHeight);
}

/* El observador no avisa mientras la ventana no se ha mostrado, y es esta medida
   la que la muestra: por eso también se mide tras cada cambio. */
const observer = new ResizeObserver(measure);
watch([view, docked], measure, { flush: "post" });

onMounted(() => {
  observer.observe(box.value!);
  // En la ventana y no en la píldora: compacta es tan pequeña que el primer
  // movimiento de un arrastre puede caer ya fuera de ella.
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  connect(
    (next) => {
      setLocale(next.lang);
      view.value = next;
    },
    (next) => (docked.value = next),
  ).catch(console.error);
});

onBeforeUnmount(() => {
  observer.disconnect();
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
});

let origin: { x: number; y: number } | null = null;
let grab = { x: 0, y: 0 };
let dragging = false;
let moving = false;

function onDown(event: PointerEvent) {
  dragging = false;
  origin = event.button === 0 ? { x: event.screenX, y: event.screenY } : null;
  const { left, top } = box.value!.getBoundingClientRect();
  grab = { x: event.clientX - left, y: event.clientY - top };
}

async function onMove(event: PointerEvent) {
  if (!origin || !(event.buttons & 1)) return;
  if (!dragging) {
    if (Math.hypot(event.screenX - origin.x, event.screenY - origin.y) < THRESHOLD) return;
    dragging = true;
    box.value!.setPointerCapture(event.pointerId);
    void drag({ start: grab });
    return;
  }
  // Rust lee el cursor en cada paso: con uno en vuelo basta.
  if (moving) return;
  moving = true;
  await drag("move");
  moving = false;
}

function onUp() {
  if (dragging) void drag("end");
  origin = null;
}

/* El clic que cierra un arrastre no pulsa nada. */
function onClickCapture(event: MouseEvent) {
  if (!dragging) return;
  dragging = false;
  event.stopPropagation();
  event.preventDefault();
}
</script>

<template>
  <div
    ref="box"
    class="box"
    @pointerdown="onDown"
    @click.capture="onClickCapture"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <FloatPill
      v-if="view"
      :view="view"
      :docked="docked"
      @toggle="act('toggle')"
      @open="act('open')"
    />
  </div>
</template>

<style scoped>
/* Igual que PAD en float.rs: el hueco para la sombra. */
.box {
  --pad: 12px;
  position: absolute;
  top: var(--pad);
  left: var(--pad);
  width: max-content;
}
</style>
