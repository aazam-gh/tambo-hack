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
    description: "Move/resize hovered surfaces",
    signalType: null,
  },
  thumbsUp: {
    label: "Thumbs up",
    description: "Confirm or adjust hovered surface",
    signalType: "confirm",
  },
  peaceSign: {
    label: "Peace sign",
    description: "Select or activate hovered control",
    signalType: "select",
  },
  openPalm: {
    label: "Open palm",
    description: "Summon or dismiss the command surface",
    signalType: "summon_ui",
  },
} as const satisfies Record<HandGesture, GestureMapping>;
