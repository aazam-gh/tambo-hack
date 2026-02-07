import type { HandGesture } from "@/lib/hand-gestures";

export type GestureAction = {
  // Opaque unique id assigned by the sensing layer for each emitted action.
  id: number;
  gesture: HandGesture;
  at: number;
  clientX?: number;
  clientY?: number;
};

export type GestureSpawnComponent =
  | "Callout"
  | "Checklist"
  | "MetricCard"
  | "Form"
  | "Graph"
  | "Modal";

export type GestureMapping = {
  label: string;
  description: string;
  componentName: GestureSpawnComponent | null;
};

export const gestureMappings = {
  pinch: {
    label: "Pinch",
    description: "Drag and drop items",
    componentName: null,
  },
  thumbsUp: {
    label: "Thumbs up",
    description: "Spawn a checklist",
    componentName: "Checklist",
  },
  peaceSign: {
    label: "Peace sign",
    description: "Spawn a metric card",
    componentName: "MetricCard",
  },
  openPalm: {
    label: "Open palm",
    description: "Spawn a callout",
    componentName: "Callout",
  },
} as const satisfies Record<HandGesture, GestureMapping>;
