import * as React from "react";

import { GestureSidebar } from "@/components/interactive-canvas/GestureSidebar";
import { InteractiveCanvas } from "@/components/interactive-canvas/InteractiveCanvas";
import { SensingProvider, useSensing } from "@/components/SensingProvider";
import { SensingStatus } from "@/components/SensingStatus";
import { VirtualCursor } from "@/components/VirtualCursor";
import type { HandGesture } from "@/lib/hand-gestures";
import { getGestureComponentForGesture } from "@/lib/gesture-component-mapping";
import { GESTURE_EMIT_COOLDOWN_MS } from "@/lib/gesture-timing";
import { emitTamboShowComponent } from "@/lib/tambo-canvas-events";
import { cn } from "@/lib/utils";

export type InteractiveCanvasWorkspaceProps = {
  className?: string;
};

export function InteractiveCanvasWorkspace({
  className,
}: InteractiveCanvasWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <SensingProvider>
      <div className={cn("flex w-full", className)} data-sensing-surface="true">
        <GestureSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />
        <InteractiveCanvas className="flex-1" />
      </div>
      <GestureComponentBridge />
      <VirtualCursor />
      <SensingStatus />
    </SensingProvider>
  );
}

// Bridges stable gesture detection to the canvas by emitting a mapped component.
//
// Emission is rate-limited to avoid spamming the canvas during noisy transitions;
// within a cooldown window, the latest gesture wins.
function GestureComponentBridge() {
  const { handGesture, handTrackingEnabled, gestureMappingEnabled } = useSensing();
  const lastGestureRef = React.useRef<HandGesture | null>(null);
  const lastEmittedAtRef = React.useRef<number | null>(null);
  // When gestures change during the cooldown window, we only emit the latest one.
  const pendingGestureRef = React.useRef<HandGesture | null>(null);
  const emitTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureEnabledRef = React.useRef(handTrackingEnabled && gestureMappingEnabled);

  // Keep the enable flag readable from the cooldown timer callback.
  gestureEnabledRef.current = handTrackingEnabled && gestureMappingEnabled;

  const scheduleEmit = React.useCallback((gesture: HandGesture) => {
    // Intentionally only uses refs (no state/props) so this callback can remain stable.
    const mapped = getGestureComponentForGesture(gesture);
    if (!mapped) {
      return;
    }

    if (!gestureEnabledRef.current) {
      return;
    }

    const cooldownMs = GESTURE_EMIT_COOLDOWN_MS;
    const now = performance.now();
    const lastEmittedAt = lastEmittedAtRef.current;

    if (lastEmittedAt === null || now - lastEmittedAt >= cooldownMs) {
      lastEmittedAtRef.current = now;
      emitTamboShowComponent(mapped);
      return;
    }

    const elapsed = now - lastEmittedAt;

    pendingGestureRef.current = gesture;

    if (emitTimeoutRef.current !== null) {
      return;
    }

    emitTimeoutRef.current = setTimeout(() => {
      emitTimeoutRef.current = null;

      if (!gestureEnabledRef.current) {
        return;
      }

      const pendingGesture = pendingGestureRef.current;
      pendingGestureRef.current = null;
      if (!pendingGesture) {
        return;
      }

      const pendingMapped = getGestureComponentForGesture(pendingGesture);
      if (!pendingMapped) {
        return;
      }

      lastEmittedAtRef.current = performance.now();
      emitTamboShowComponent(pendingMapped);
    }, cooldownMs - elapsed);
  }, []);

  React.useEffect(() => {
    return () => {
      if (emitTimeoutRef.current !== null) {
        clearTimeout(emitTimeoutRef.current);
        emitTimeoutRef.current = null;
      }

      gestureEnabledRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!gestureEnabledRef.current) {
      lastGestureRef.current = null;
      pendingGestureRef.current = null;
      if (emitTimeoutRef.current !== null) {
        clearTimeout(emitTimeoutRef.current);
        emitTimeoutRef.current = null;
      }
      return;
    }

    if (!handGesture) {
      lastGestureRef.current = null;
      pendingGestureRef.current = null;
      return;
    }

    if (handGesture === lastGestureRef.current) {
      return;
    }

    lastGestureRef.current = handGesture;

    scheduleEmit(handGesture);
  }, [gestureMappingEnabled, handGesture, handTrackingEnabled, scheduleEmit]);

  return null;
}
