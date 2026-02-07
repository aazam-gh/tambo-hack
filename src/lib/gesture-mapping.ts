import type { HandGesture } from "@/lib/hand-gestures";

export type GestureAction = {
  // Opaque unique id assigned by the sensing layer for each emitted action.
  id: number;
  gesture: HandGesture;
  at: number;
  clientX?: number;
  clientY?: number;
};

export type GestureSpawnComponent = "Form" | "Graph" | "Modal";

export const gestureMappings = {
  pinch: {
    label: "Pinch",
    description: "Spawn a form",
    componentName: "Form",
  },
  thumbsUp: {
    label: "Thumbs up",
    description: "Spawn a chart",
    componentName: "Graph",
  },
  peaceSign: {
    label: "Peace sign",
    description: "Spawn a chart",
    componentName: "Graph",
  },
  openPalm: {
    label: "Open palm",
    description: "Spawn a modal",
    componentName: "Modal",
  },
} as const satisfies Record<HandGesture, {
  label: string;
  description: string;
  componentName: GestureSpawnComponent;
}>;
