import type { GestureSignalType } from "@/lib/gesture-signals";
import type { HandGesture } from "@/lib/hand-gestures";

export type GestureMapping = {
  label: string;
  description: string;
  signalType: GestureSignalType | null;
};

export const gestureMappings = {
  pinch: {
    label: "Pinch",
    description: "Drag and drop items",
    signalType: null,
  },
  thumbsUp: {
    label: "Thumbs up",
    description: "Confirm",
    signalType: "confirm",
  },
  peaceSign: {
    label: "Peace sign",
    description: "Select",
    signalType: "select",
  },
  openPalm: {
    label: "Open palm",
    description: "Summon or dismiss the command surface",
    signalType: "summon_ui",
  },
} as const satisfies Record<HandGesture, GestureMapping>;
