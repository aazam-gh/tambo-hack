import * as React from "react";

import { Callout } from "@/components/tambo/callout";
import { Checklist } from "@/components/tambo/checklist";
import { MetricCard } from "@/components/tambo/metric-card";
import type { HandGesture } from "@/lib/hand-gestures";

export type GestureComponentDetail = {
  messageId: string;
  component: React.ReactNode;
};

type GestureComponentFactory = {
  messageId: string;
  render: () => React.ReactNode;
};

// Note: `HandGesture` includes additional values (e.g. `point`, `fist`) that are
// intentionally left unmapped for now.
const gestureComponentMap: Partial<Record<HandGesture, GestureComponentFactory>> =
  {
    open_palm: {
      messageId: "gesture-open_palm",
      render: () => (
        <Callout
          tone="info"
          title="Open palm"
          message="Mapped to the Tambo Callout component."
        />
      ),
    },
    pinch: {
      messageId: "gesture-pinch",
      render: () => (
        <MetricCard label="Pinch" value="Active" tone="positive" change={1} />
      ),
    },
    thumbs_up: {
      messageId: "gesture-thumbs_up",
      render: () => (
        <Checklist
          title="Thumbs up"
          items={[
            { text: "Gesture detected", checked: true },
            { text: "Component emitted to canvas", checked: true },
            { text: "Keep exploring gestures", checked: false },
          ]}
        />
      ),
    },
  };

export function getGestureComponentForGesture(
  gesture: HandGesture,
): GestureComponentDetail | null {
  const entry = gestureComponentMap[gesture];
  if (!entry) {
    return null;
  }

  return { messageId: entry.messageId, component: entry.render() };
}
