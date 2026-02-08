export type GestureSignalType =
  | "summon_ui"
  | "confirm"
  | "dismiss"
  | "navigate"
  | "adjust_value"
  | "select"
  | "move_surface"
  | "resize_surface"
  | "combine_surface";

export type GestureSignal = {
  // Opaque unique id assigned by the sensing layer for each emitted signal.
  id: number;
  type: GestureSignalType;
  at: number;
  confidence: number;
  clientX?: number;
  clientY?: number;
};
