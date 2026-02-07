import type { ReactNode } from "react";

export const TAMBO_SHOW_COMPONENT_EVENT = "tambo:showComponent" as const;

export type TamboShowComponentDetail = {
  messageId: string;
  component: ReactNode;
};

export function emitTamboShowComponent(detail: TamboShowComponentDetail): void {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<TamboShowComponentDetail>(TAMBO_SHOW_COMPONENT_EVENT, {
      detail,
    }),
  );
}
