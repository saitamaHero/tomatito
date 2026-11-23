/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Multiplicador del reloj, solo en desarrollo. */
  readonly VITE_SPEED?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
