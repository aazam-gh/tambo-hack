import * as React from "react";
import { RotateCcw, X } from "lucide-react";

import {
  TAMBO_SHOW_COMPONENT_EVENT,
  type TamboShowComponentDetail,
} from "@/lib/tambo-canvas-events";
import { cn } from "@/lib/utils";

type CanvasView = {
  x: number;
  y: number;
  scale: number;
};

type CanvasItem = {
  id: string;
  node: React.ReactNode;
  x: number;
  y: number;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function InteractiveCanvas({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [view, setViewState] = React.useState<CanvasView>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const viewRef = React.useRef(view);

  type CanvasViewUpdater = CanvasView | ((prev: CanvasView) => CanvasView);
  const setView = React.useCallback((updater: CanvasViewUpdater) => {
    setViewState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      viewRef.current = next;
      return next;
    });
  }, []);

  const [items, setItems] = React.useState<CanvasItem[]>([]);

  const panRef = React.useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onShowComponent = React.useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<TamboShowComponentDetail>).detail;
      if (!detail?.messageId || !detail.component) {
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const currentView = viewRef.current;
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      const x = (centerScreenX - currentView.x) / currentView.scale;
      const y = (centerScreenY - currentView.y) / currentView.scale;

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === detail.messageId);
        if (existingIndex === -1) {
          return [...prev, { id: detail.messageId, node: detail.component, x, y }];
        }

        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, node: detail.component }
            : item,
        );
      });
    },
    [setItems],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener(TAMBO_SHOW_COMPONENT_EVENT, onShowComponent);
    return () => {
      window.removeEventListener(TAMBO_SHOW_COMPONENT_EVENT, onShowComponent);
    };
  }, [onShowComponent]);

  const resetView = React.useCallback(() => {
    setView({ x: 0, y: 0, scale: 1 });
  }, [setView]);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) {
        return;
      }

      const target = e.target as HTMLElement;
      if (target.closest('[data-canvas-item="true"]')) {
        return;
      }

      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      panRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: viewRef.current.x,
        startY: viewRef.current.y,
      };
    },
    [],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const session = panRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      const dx = e.clientX - session.startClientX;
      const dy = e.clientY - session.startClientY;

      setView((v) => ({
        ...v,
        x: session.startX + dx,
        y: session.startY + dy,
      }));
    },
    [setView],
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const session = panRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already released.
      }
      panRef.current = null;
    },
    [],
  );

  const onPointerLeave = React.useCallback(() => {
    panRef.current = null;
  }, []);

  const onWheel = React.useCallback(
    (e: WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      // This canvas is intended to be the primary full-screen surface.
      // Capturing the wheel event keeps zooming consistent and prevents page scroll.
      e.preventDefault();

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      setView((prev) => {
        const zoomFactor = Math.exp(-e.deltaY * 0.001);
        const nextScale = clamp(prev.scale * zoomFactor, MIN_SCALE, MAX_SCALE);

        const worldX = (localX - prev.x) / prev.scale;
        const worldY = (localY - prev.y) / prev.scale;

        const nextX = localX - worldX * nextScale;
        const nextY = localY - worldY * nextScale;

        return { x: nextX, y: nextY, scale: nextScale };
      });
    },
    [setView],
  );

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  return (
    <div
      ref={containerRef}
      data-canvas-space="true"
      className={cn(
        "relative h-full w-full select-none overflow-hidden bg-background",
        "touch-none",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onPointerLeave={onPointerLeave}
      onDoubleClick={resetView}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0",
          "bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)]",
          "dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)]",
          "bg-[size:32px_32px]",
        )}
      />

      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-xs text-foreground backdrop-blur"
        role="status"
      >
        <span className="text-muted-foreground">Zoom</span>
        <span className="font-mono">{Math.round(view.scale * 100)}%</span>
        <span className="text-muted-foreground/70">•</span>
        <button
          type="button"
          onClick={resetView}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {items.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="max-w-sm rounded-2xl border border-border/50 bg-card/60 px-5 py-4 text-sm text-muted-foreground backdrop-blur">
            Pan and zoom around the canvas. Tambo-rendered components will
            appear here when they’re emitted.
          </div>
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-canvas-item="true"
            className="absolute pointer-events-auto"
            style={{
              transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
            }}
          >
            <div className="relative rounded-2xl border border-border/60 bg-card/80 p-4 text-foreground shadow-xl shadow-black/10 backdrop-blur dark:shadow-black/30">
              <button
                type="button"
                aria-label="Remove canvas item"
                onClick={() =>
                  setItems((prev) => prev.filter((p) => p.id !== item.id))
                }
                className={cn(
                  "absolute right-2 top-2 rounded-md p-1 text-muted-foreground",
                  "hover:bg-muted/50 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                )}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
              {item.node}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
