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

const gestureComponentMap: Partial<Record<HandGesture, GestureComponentFactory>> =
  {
    openPalm: {
      messageId: "gesture-openPalm",
      render: () => (
        <Callout
          tone="info"
          title="Open palm"
          message="Mapped to the Tambo Callout component."
        />
      ),
    },
    thumbsUp: {
      messageId: "gesture-thumbsUp",
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
    peaceSign: {
      messageId: "gesture-peaceSign",
      render: () => (
        <MetricCard
          label="Peace sign"
          value="Active"
          tone="positive"
          change={1}
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
