import * as React from "react";
import { GripVertical, RotateCcw, X } from "lucide-react";

import { useSensing } from "@/components/SensingProvider";
import {
  TAMBO_SHOW_COMPONENT_EVENT,
  type TamboShowComponentDetail,
} from "@/lib/tambo-canvas-events";
import {
  useInteractionContext,
  useInteractionContextActions,
} from "@/lib/interaction-context";
import type { SurfaceMeta } from "@/lib/surfaces";
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
  surfaceMeta?: SurfaceMeta;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useRefBackedState<T>(
  initial: T,
): [T, React.MutableRefObject<T>, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState(initial);
  const ref = React.useRef(state);

  const set = React.useCallback((updater: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      ref.current = next;
      return next;
    });
  }, []);

  return [state, ref, set];
}

export function InteractiveCanvas({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { handGesture, handPosition, hoveredElement } = useSensing();
  const { focusedSurface } = useInteractionContext();
  const { removeSurface, setFocusedSurface } = useInteractionContextActions();
  const hoveredCanvasItemId =
    (hoveredElement?.closest(
      "[data-canvas-item-id]",
    ) as HTMLElement | null)?.dataset.canvasItemId ?? null;

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

  const [items, itemsRef, setItems] = useRefBackedState<CanvasItem[]>([]);

  const itemDragRef = React.useRef<{
    pointerId: number;
    itemId: string;
    target: HTMLButtonElement;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const handDragRef = React.useRef<{
    itemId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const pendingHandDragUpdateRef = React.useRef<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);
  const handDragRafRef = React.useRef<number | null>(null);

  const flushHandDragUpdate = React.useCallback(() => {
    handDragRafRef.current = null;
    const pending = pendingHandDragUpdateRef.current;
    if (!pending) {
      return;
    }
    pendingHandDragUpdateRef.current = null;
    setItems((prev) =>
      prev.map((item) =>
        item.id === pending.itemId ? { ...item, x: pending.x, y: pending.y } : item,
      ),
    );
  }, [setItems]);

  React.useEffect(() => {
    return () => {
      if (handDragRafRef.current !== null) {
        cancelAnimationFrame(handDragRafRef.current);
        handDragRafRef.current = null;
      }
    };
  }, []);

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
      // If the spawn point is outside the canvas bounds, clamp it to the nearest edge.
      const localX =
        typeof detail.clientX === "number"
          ? clamp(detail.clientX - rect.left, 0, rect.width)
          : rect.width / 2;
      const localY =
        typeof detail.clientY === "number"
          ? clamp(detail.clientY - rect.top, 0, rect.height)
          : rect.height / 2;
      const x = (localX - currentView.x) / currentView.scale;
      const y = (localY - currentView.y) / currentView.scale;

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === detail.messageId);
        if (existingIndex === -1) {
          return [
            ...prev,
            {
              id: detail.messageId,
              node: detail.component,
              x,
              y,
              surfaceMeta: detail.surfaceMeta,
            },
          ];
        }

        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                node: detail.component,
                surfaceMeta: detail.surfaceMeta ?? item.surfaceMeta,
              }
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

  React.useEffect(() => {
    if (!focusedSurface) {
      return;
    }

    const stillExists = items.some((item) => item.id === focusedSurface);
    if (!stillExists) {
      setFocusedSurface(undefined);
    }
  }, [focusedSurface, items, setFocusedSurface]);

  const resetView = React.useCallback(() => {
    setView({ x: 0, y: 0, scale: 1 });
  }, [setView]);

  const startItemDrag = React.useCallback(
    (itemId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const currentItem = itemsRef.current.find((item) => item.id === itemId);
      if (!currentItem) {
        return;
      }

      // Pointer capture ensures we continue receiving drag updates even if the
      // pointer leaves the handle/button.
      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
      itemDragRef.current = {
        pointerId: e.pointerId,
        itemId,
        target: e.currentTarget as HTMLButtonElement,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: currentItem.x,
        startY: currentItem.y,
      };

      setItems((prev) => {
        const idx = prev.findIndex((item) => item.id === itemId);
        if (idx === -1 || idx === prev.length - 1) {
          return prev;
        }
        const next = [...prev];
        const [picked] = next.splice(idx, 1);
        if (!picked) {
          return prev;
        }
        next.push(picked);
        return next;
      });
    },
    [setItems],
  );

  const onItemPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const session = itemDragRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const scale = viewRef.current.scale;
      const dx = (e.clientX - session.startClientX) / scale;
      const dy = (e.clientY - session.startClientY) / scale;
      const nextX = session.startX + dx;
      const nextY = session.startY + dy;

      const current = itemsRef.current.find((item) => item.id === session.itemId);
      if (!current) {
        return;
      }

      if (Math.abs(current.x - nextX) < 0.001 && Math.abs(current.y - nextY) < 0.001) {
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === session.itemId ? { ...item, x: nextX, y: nextY } : item,
        ),
      );
    },
    [setItems],
  );

  const clearItemDragSession = React.useCallback(
    (expected: { pointerId: number; itemId: string }) => {
      const session = itemDragRef.current;
      if (!session) {
        return;
      }

      if (
        (session.pointerId !== expected.pointerId || session.itemId !== expected.itemId)
      ) {
        return;
      }

      try {
        if (
          session.target.isConnected &&
          session.target.hasPointerCapture(session.pointerId)
        ) {
          session.target.releasePointerCapture(session.pointerId);
        }
      } catch {
        // Ignore if pointer capture was already released.
      }

      itemDragRef.current = null;
    },
    [],
  );

  const endItemDrag = React.useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const session = itemDragRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      clearItemDragSession({ pointerId: session.pointerId, itemId: session.itemId });
    },
    [clearItemDragSession],
  );

  React.useEffect(() => {
    const session = itemDragRef.current;
    if (!session) {
      return;
    }

    const itemStillExists = items.some((item) => item.id === session.itemId);
    const targetStillInDom = session.target.isConnected;
    if (!itemStillExists || !targetStillInDom) {
      clearItemDragSession({ pointerId: session.pointerId, itemId: session.itemId });
    }
  }, [clearItemDragSession, items]);

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

  React.useEffect(() => {
    if (handGesture !== "pinch" || !handPosition) {
      handDragRef.current = null;
      pendingHandDragUpdateRef.current = null;
      if (handDragRafRef.current !== null) {
        cancelAnimationFrame(handDragRafRef.current);
        handDragRafRef.current = null;
      }
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const localX = clamp(handPosition.x - rect.left, 0, rect.width);
    const localY = clamp(handPosition.y - rect.top, 0, rect.height);

    const currentView = viewRef.current;
    const worldX = (localX - currentView.x) / currentView.scale;
    const worldY = (localY - currentView.y) / currentView.scale;

    const activeSession = handDragRef.current;
    if (!activeSession) {
      // Pinch-drag begins only when the hand cursor is hovering a canvas item.
      const startItemId = hoveredCanvasItemId;
      if (!startItemId) {
        return;
      }

      const hoveredItem = itemsRef.current.find(
        (item) => item.id === startItemId,
      );

      if (!hoveredItem) {
        return;
      }

      handDragRef.current = {
        itemId: startItemId,
        offsetX: worldX - hoveredItem.x,
        offsetY: worldY - hoveredItem.y,
      };

      setItems((prev) => {
        const idx = prev.findIndex((item) => item.id === startItemId);
        if (idx === -1 || idx === prev.length - 1) {
          return prev;
        }

        const next = [...prev];
        const [picked] = next.splice(idx, 1);
        if (!picked) {
          return prev;
        }
        next.push(picked);
        return next;
      });

      return;
    }

    const target = itemsRef.current.find((item) => item.id === activeSession.itemId);
    if (!target) {
      handDragRef.current = null;
      return;
    }

    const nextX = worldX - activeSession.offsetX;
    const nextY = worldY - activeSession.offsetY;

    if (Math.abs(target.x - nextX) < 0.001 && Math.abs(target.y - nextY) < 0.001) {
      return;
    }

    pendingHandDragUpdateRef.current = {
      itemId: activeSession.itemId,
      x: nextX,
      y: nextY,
    };
    if (handDragRafRef.current === null) {
      handDragRafRef.current = requestAnimationFrame(flushHandDragUpdate);
    }
  }, [flushHandDragUpdate, handGesture, handPosition, hoveredCanvasItemId, setItems]);

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
            data-canvas-item-id={item.id}
            data-canvas-draggable="true"
            data-interactable="true"
            data-surface-domain={item.surfaceMeta?.domain}
            data-surface-intent={item.surfaceMeta?.intent}
            className="absolute pointer-events-auto"
            style={{
              transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
            }}
            onClick={() => setFocusedSurface(item.id)}
          >
            <div
              className={cn(
                "relative rounded-2xl border bg-card/80 p-4 text-foreground shadow-xl shadow-black/10 backdrop-blur",
                "dark:shadow-black/30",
                focusedSurface === item.id
                  ? "border-emerald-500/40 ring-2 ring-emerald-500/40"
                  : "border-border/60",
              )}
            >
              <button
                type="button"
                aria-label="Drag to move canvas item"
                onPointerDown={(e) => startItemDrag(item.id, e)}
                onPointerMove={onItemPointerMove}
                onPointerUp={endItemDrag}
                onPointerCancel={endItemDrag}
                onLostPointerCapture={endItemDrag}
                className={cn(
                  "absolute left-2 top-2 rounded-md p-1 text-muted-foreground",
                  "cursor-grab active:cursor-grabbing",
                  "hover:bg-muted/50 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                )}
              >
                <GripVertical aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Remove canvas item"
                onClick={() => {
                  removeSurface(item.id);
                  setItems((prev) => prev.filter((p) => p.id !== item.id));
                }}
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
