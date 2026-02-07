import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  MousePointer2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";

import { useSensing } from "@/components/SensingProvider";
import { cn } from "@/lib/utils";

export type GestureSidebarProps = {
  open: boolean;
  onToggle: () => void;
};

function GestureStatusMessage({
  handTrackingError,
  handTrackingInitializing,
  handTrackingEnabled,
  gestureMappingEnabled,
  gestureLabel,
}: {
  handTrackingError: string | null;
  handTrackingInitializing: boolean;
  handTrackingEnabled: boolean;
  gestureMappingEnabled: boolean;
  gestureLabel: string;
}) {
  if (handTrackingError) {
    return <div className="text-xs text-rose-400">{handTrackingError}</div>;
  }

  if (handTrackingInitializing) {
    return (
      <div className="text-xs text-muted-foreground">
        Requesting camera access...
      </div>
    );
  }

  if (gestureMappingEnabled) {
    return handTrackingEnabled ? (
      <div className="text-xs text-muted-foreground">
        Current gesture: <span className="font-mono">{gestureLabel}</span>
      </div>
    ) : (
      <div className="text-xs text-muted-foreground">
        Starting hand tracking for gesture mapping (camera access may be requested).
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground">
      Turn this on to request camera access and drive the on-screen hand cursor.
      Then enable gesture mapping to emit components onto the canvas.
    </div>
  );
}

export function GestureSidebar({ open, onToggle }: GestureSidebarProps) {
  const {
    handPosition,
    handTrackingEnabled,
    setHandTrackingEnabled,
    handTrackingInitializing,
    handTrackingError,
    handGesture,
    gestureMappingEnabled,
    setGestureMappingEnabled,
  } = useSensing();

  const gestureLabel = !handTrackingEnabled
    ? "Off"
    : !handPosition
      ? "No hand"
      : handGesture
        ? handGesture.replace(/_/g, " ")
        : "No gesture";

  return (
    <aside
      className={cn(
        "relative shrink-0 border-r border-border/50 bg-card/60 backdrop-blur transition-[width] duration-200",
        open ? "w-80" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse gesture controls" : "Expand gesture controls"}
        className={cn(
          "absolute top-4 -right-3 z-10 grid h-6 w-6 place-items-center rounded-full border border-border/50 bg-background text-foreground shadow",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        )}
      >
        {open ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className={cn("h-full", open ? "p-6" : "p-3")}>
        {open ? (
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-zinc-950 shadow shadow-emerald-500/20">
                  <Hand className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    Gesture Controls
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Toggle MediaPipe hand tracking
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Canvas navigation
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="h-4 w-4 text-emerald-400" />
                  <span>Drag to pan</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-emerald-400" />
                  <span>Scroll to zoom</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-emerald-400" />
                  <span>Double-click to reset</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gesture settings
              </div>

              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-foreground">Hand tracking</span>
                  <input
                    type="checkbox"
                    checked={handTrackingEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setHandTrackingEnabled(enabled);
                      if (!enabled) {
                        setGestureMappingEnabled(false);
                      }
                    }}
                    disabled={handTrackingInitializing}
                    aria-label="Hand tracking"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-foreground">Gesture mapping</span>
                  <input
                    type="checkbox"
                    checked={gestureMappingEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      if (enabled && !handTrackingEnabled) {
                        setHandTrackingEnabled(true);
                      }
                      setGestureMappingEnabled(enabled);
                    }}
                    disabled={handTrackingInitializing}
                    aria-label="Gesture mapping"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-foreground">Voice commands</span>
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Voice commands (coming soon)"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <GestureStatusMessage
                  handTrackingError={handTrackingError}
                  handTrackingInitializing={handTrackingInitializing}
                  handTrackingEnabled={handTrackingEnabled}
                  gestureMappingEnabled={gestureMappingEnabled}
                  gestureLabel={gestureLabel}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-3 pt-12 text-muted-foreground">
            <Hand className="h-5 w-5" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/60" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/30" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/20" />
          </div>
        )}
      </div>
    </aside>
  );
}
