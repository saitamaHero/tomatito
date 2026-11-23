import { shallowRef } from "vue";

export interface ConfirmOptions {
  title: string;
  body: string;
  accept: string;
  cancel?: string;
}

export const pending = shallowRef<
  (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
>(null);

export function confirm(options: ConfirmOptions): Promise<boolean> {
  pending.value?.resolve(false);
  return new Promise((resolve) => {
    pending.value = {
      ...options,
      resolve(ok) {
        pending.value = null;
        resolve(ok);
      },
    };
  });
}
