import * as React from "react";
import { GripVertical, Maximize2, RotateCcw, X } from "lucide-react";

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
  scale: number;
  linkedSurfaces: string[];
  previewScale?: number;
  surfaceMeta?: SurfaceMeta;
};

type PendingOperation =
  | { kind: "resize"; surfaceId: string }
  | { kind: "combine"; sourceId: string; targetId: string };

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

const MIN_SURFACE_SCALE = 0.7;
const MAX_SURFACE_SCALE = 2.2;
const COMBINE_DISTANCE_PX = 140;
const COMBINE_MIN_OVERLAP_RATIO = 0.08;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function overlapRatio(a: DOMRect, b: DOMRect): number {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);

  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const intersection = width * height;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const denom = Math.min(areaA, areaB);
  return denom > 0 ? intersection / denom : 0;
}

function canCombineSurfaces(a: SurfaceMeta | undefined, b: SurfaceMeta | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  return a.domain === b.domain;
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
  const {
    handGesture,
    handPosition,
    hoveredElement,
    pinchDistance,
    gestureSignal,
    clearGestureSignal,
  } = useSensing();
  const { focusedSurface, commandSurfaceOpen } = useInteractionContext();
  const { setFocusedSurface } = useInteractionContextActions();
  const hoveredCanvasItemId =
    (hoveredElement?.closest(
      "[data-canvas-item-id]",
    ) as HTMLElement | null)?.dataset.canvasItemId ?? null;

  const hoveringResizeHandle = Boolean(
    hoveredElement?.closest('[data-canvas-resize-handle="true"]'),
  );

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

  const itemElementRefs = React.useRef(new Map<string, HTMLDivElement>());
  const [pendingOperation, setPendingOperation] = React.useState<
    PendingOperation | null
  >(null);
  const [combineCandidate, setCombineCandidate] = React.useState<
    { sourceId: string; targetId: string } | null
  >(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const itemDragRef = React.useRef<{
    pointerId: number;
    itemId: string;
    target: HTMLButtonElement;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const itemResizeRef = React.useRef<{
    pointerId: number;
    itemId: string;
    target: HTMLButtonElement;
    startClientX: number;
    startClientY: number;
    startScale: number;
  } | null>(null);

  const handSessionRef = React.useRef<
    | { mode: "move"; itemId: string; offsetX: number; offsetY: number }
    | { mode: "resize"; itemId: string; startDistance: number; startScale: number }
    | null
  >(null);

  const pendingHandUpdateRef = React.useRef<
    | { kind: "move"; itemId: string; x: number; y: number }
    | { kind: "resize"; itemId: string; scale: number }
    | null
  >(null);
  const handUpdateRafRef = React.useRef<number | null>(null);

  const flushHandUpdate = React.useCallback(() => {
    handUpdateRafRef.current = null;
    const pending = pendingHandUpdateRef.current;
    if (!pending) {
      return;
    }
    pendingHandUpdateRef.current = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== pending.itemId) {
          return item;
        }

        return pending.kind === "move"
          ? { ...item, x: pending.x, y: pending.y }
          : { ...item, previewScale: pending.scale };
      }),
    );
  }, [setItems]);

  React.useEffect(() => {
    return () => {
      if (handUpdateRafRef.current !== null) {
        cancelAnimationFrame(handUpdateRafRef.current);
        handUpdateRafRef.current = null;
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
              scale: 1,
              linkedSurfaces: [],
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

  const clearPendingOperation = React.useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, previewScale: undefined })));
    setPendingOperation(null);
    setCombineCandidate(null);
  }, [setItems]);

  const updateCombineCandidate = React.useCallback(
    (sourceId: string, nextX: number, nextY: number) => {
      if (pendingOperation) {
        return;
      }

      const surfaces = itemsRef.current;
      const source = surfaces.find((item) => item.id === sourceId);
      if (!source) {
        return;
      }

      let closest: { targetId: string; distance: number } | null = null;
      for (const candidate of surfaces) {
        if (candidate.id === sourceId) continue;
        if (!canCombineSurfaces(source.surfaceMeta, candidate.surfaceMeta)) continue;

        const distance = Math.hypot(candidate.x - nextX, candidate.y - nextY);
        if (distance > COMBINE_DISTANCE_PX) continue;

        if (!closest || distance < closest.distance) {
          closest = { targetId: candidate.id, distance };
        }
      }

      setCombineCandidate((prev) => {
        if (!closest) {
          return prev ? null : prev;
        }

        if (prev?.sourceId === sourceId && prev.targetId === closest.targetId) {
          return prev;
        }

        return { sourceId, targetId: closest.targetId };
      });
    },
    [itemsRef, pendingOperation],
  );

  const maybeBeginCombinePreview = React.useCallback(
    (sourceId: string, targetId: string) => {
      if (pendingOperation) {
        return;
      }

      const sourceEl = itemElementRefs.current.get(sourceId);
      const targetEl = itemElementRefs.current.get(targetId);
      if (!sourceEl || !targetEl) {
        return;
      }

      const ratio = overlapRatio(
        sourceEl.getBoundingClientRect(),
        targetEl.getBoundingClientRect(),
      );

      if (ratio < COMBINE_MIN_OVERLAP_RATIO) {
        setCombineCandidate(null);
        return;
      }

      const source = itemsRef.current.find((item) => item.id === sourceId);
      const target = itemsRef.current.find((item) => item.id === targetId);
      if (!source || !target) {
        setCombineCandidate(null);
        return;
      }

      if (!canCombineSurfaces(source.surfaceMeta, target.surfaceMeta)) {
        setNotice("These surfaces can't be combined.");
        setCombineCandidate(null);
        return;
      }

      setPendingOperation({ kind: "combine", sourceId, targetId });
      setCombineCandidate(null);
    },
    [itemsRef, pendingOperation],
  );

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

      clearPendingOperation();
      setNotice(null);

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
    [clearPendingOperation, setItems],
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

      updateCombineCandidate(session.itemId, nextX, nextY);
    },
    [setItems, updateCombineCandidate],
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

      const candidate = combineCandidate;
      if (candidate?.sourceId === session.itemId) {
        maybeBeginCombinePreview(session.itemId, candidate.targetId);
      } else {
        setCombineCandidate(null);
      }
    },
    [clearItemDragSession, combineCandidate, maybeBeginCombinePreview],
  );

  const startItemResize = React.useCallback(
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

      clearPendingOperation();
      setNotice(null);

      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
      itemResizeRef.current = {
        pointerId: e.pointerId,
        itemId,
        target: e.currentTarget as HTMLButtonElement,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startScale: currentItem.scale,
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
    [clearPendingOperation, setItems],
  );

  const onItemResizePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const session = itemResizeRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const viewScale = viewRef.current.scale;
      const dx = (e.clientX - session.startClientX) / viewScale;
      const dy = (e.clientY - session.startClientY) / viewScale;
      const delta = (dx + dy) / 260;
      const nextScale = clamp(
        session.startScale * Math.exp(delta),
        MIN_SURFACE_SCALE,
        MAX_SURFACE_SCALE,
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === session.itemId ? { ...item, previewScale: nextScale } : item,
        ),
      );
    },
    [setItems],
  );

  const clearItemResizeSession = React.useCallback(
    (expected: { pointerId: number; itemId: string }) => {
      const session = itemResizeRef.current;
      if (!session) {
        return;
      }

      if (
        session.pointerId !== expected.pointerId || session.itemId !== expected.itemId
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

      itemResizeRef.current = null;
    },
    [],
  );

  const endItemResize = React.useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const session = itemResizeRef.current;
      if (!session || session.pointerId !== e.pointerId) {
        return;
      }

      clearItemResizeSession({ pointerId: session.pointerId, itemId: session.itemId });

      const item = itemsRef.current.find((candidate) => candidate.id === session.itemId);
      if (!item || typeof item.previewScale !== "number") {
        setPendingOperation(null);
        return;
      }

      if (Math.abs(item.previewScale - item.scale) < 0.001) {
        setItems((prev) =>
          prev.map((candidate) =>
            candidate.id === session.itemId
              ? { ...candidate, previewScale: undefined }
              : candidate,
          ),
        );
        setPendingOperation(null);
        return;
      }

      setPendingOperation({ kind: "resize", surfaceId: session.itemId });
    },
    [clearItemResizeSession, setItems],
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
      const session = handSessionRef.current;

      if (session?.mode === "move") {
        const candidate = combineCandidate;
        if (candidate?.sourceId === session.itemId) {
          maybeBeginCombinePreview(session.itemId, candidate.targetId);
        } else {
          setCombineCandidate(null);
        }
      }

      if (session?.mode === "resize") {
        const item = itemsRef.current.find((surface) => surface.id === session.itemId);
        if (
          item &&
          typeof item.previewScale === "number" &&
          Math.abs(item.previewScale - item.scale) >= 0.001
        ) {
          setPendingOperation({ kind: "resize", surfaceId: session.itemId });
        } else if (item) {
          setItems((prev) =>
            prev.map((surface) =>
              surface.id === session.itemId
                ? { ...surface, previewScale: undefined }
                : surface,
            ),
          );
        }
      }

      handSessionRef.current = null;
      pendingHandUpdateRef.current = null;
      if (handUpdateRafRef.current !== null) {
        cancelAnimationFrame(handUpdateRafRef.current);
        handUpdateRafRef.current = null;
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

    const activeSession = handSessionRef.current;
    if (!activeSession) {
      const startItemId = hoveredCanvasItemId;
      if (!startItemId) {
        return;
      }

      const hoveredItem = itemsRef.current.find((item) => item.id === startItemId);
      if (!hoveredItem) {
        return;
      }

      clearPendingOperation();
      setNotice(null);

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

      if (hoveringResizeHandle && typeof pinchDistance === "number" && pinchDistance > 0) {
        handSessionRef.current = {
          mode: "resize",
          itemId: startItemId,
          startDistance: pinchDistance,
          startScale: hoveredItem.scale,
        };
        return;
      }

      handSessionRef.current = {
        mode: "move",
        itemId: startItemId,
        offsetX: worldX - hoveredItem.x,
        offsetY: worldY - hoveredItem.y,
      };
      return;
    }

    const target = itemsRef.current.find((item) => item.id === activeSession.itemId);
    if (!target) {
      handSessionRef.current = null;
      setCombineCandidate(null);
      return;
    }

    if (activeSession.mode === "move") {
      const nextX = worldX - activeSession.offsetX;
      const nextY = worldY - activeSession.offsetY;

      if (Math.abs(target.x - nextX) < 0.001 && Math.abs(target.y - nextY) < 0.001) {
        return;
      }

      pendingHandUpdateRef.current = {
        kind: "move",
        itemId: activeSession.itemId,
        x: nextX,
        y: nextY,
      };
      if (handUpdateRafRef.current === null) {
        handUpdateRafRef.current = requestAnimationFrame(flushHandUpdate);
      }

      updateCombineCandidate(activeSession.itemId, nextX, nextY);
      return;
    }

    if (typeof pinchDistance !== "number" || pinchDistance <= 0) {
      return;
    }

    const ratio = clamp(
      pinchDistance / activeSession.startDistance,
      MIN_SURFACE_SCALE / activeSession.startScale,
      MAX_SURFACE_SCALE / activeSession.startScale,
    );

    const nextScale = clamp(
      activeSession.startScale * ratio,
      MIN_SURFACE_SCALE,
      MAX_SURFACE_SCALE,
    );

    pendingHandUpdateRef.current = {
      kind: "resize",
      itemId: activeSession.itemId,
      scale: nextScale,
    };
    if (handUpdateRafRef.current === null) {
      handUpdateRafRef.current = requestAnimationFrame(flushHandUpdate);
    }
  }, [
    clearPendingOperation,
    combineCandidate,
    flushHandUpdate,
    handGesture,
    handPosition,
    hoveringResizeHandle,
    itemsRef,
    maybeBeginCombinePreview,
    pinchDistance,
    setItems,
    updateCombineCandidate,
    hoveredCanvasItemId,
  ]);

  const commitPendingOperation = React.useCallback(() => {
    const pending = pendingOperation;
    if (!pending) {
      return;
    }

    if (pending.kind === "resize") {
      const item = itemsRef.current.find((surface) => surface.id === pending.surfaceId);
      if (!item || typeof item.previewScale !== "number") {
        setPendingOperation(null);
        return;
      }

      const containerRect = containerRef.current?.getBoundingClientRect();
      const itemEl = itemElementRefs.current.get(pending.surfaceId);
      if (containerRect && itemEl) {
        const rect = itemEl.getBoundingClientRect();
        const exceedsDensity =
          rect.width > containerRect.width * 0.92 ||
          rect.height > containerRect.height * 0.92;
        if (exceedsDensity) {
          setNotice("Surface is too large for the current layout.");
          clearPendingOperation();
          return;
        }

        for (const [id, otherEl] of itemElementRefs.current.entries()) {
          if (id === pending.surfaceId) continue;
          const ratio = overlapRatio(rect, otherEl.getBoundingClientRect());
          if (ratio > 0.35) {
            setNotice("Resize would overlap another surface.");
            clearPendingOperation();
            return;
          }
        }
      }

      setItems((prev) =>
        prev.map((surface) =>
          surface.id === pending.surfaceId
            ? {
                ...surface,
                scale: item.previewScale ?? surface.scale,
                previewScale: undefined,
              }
            : surface,
        ),
      );
      setPendingOperation(null);
      return;
    }

    const source = itemsRef.current.find((surface) => surface.id === pending.sourceId);
    const target = itemsRef.current.find((surface) => surface.id === pending.targetId);
    if (!source || !target) {
      setPendingOperation(null);
      return;
    }

    if (!canCombineSurfaces(source.surfaceMeta, target.surfaceMeta)) {
      setNotice("These surfaces can't be combined.");
      clearPendingOperation();
      return;
    }

    const combinedId = `surface-combined-${Date.now()}`;
    const combinedX = (source.x + target.x) / 2;
    const combinedY = (source.y + target.y) / 2;

    const combinedNode = (
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Combined surface
        </div>
        <div className="space-y-6">
          {source.node}
          {target.node}
        </div>
      </div>
    );

    setItems((prev) => {
      const remaining = prev.filter(
        (surface) => surface.id !== source.id && surface.id !== target.id,
      );
      return [
        ...remaining,
        {
          id: combinedId,
          node: combinedNode,
          x: combinedX,
          y: combinedY,
          scale: 1,
          linkedSurfaces: [source.id, target.id],
          surfaceMeta: source.surfaceMeta,
        },
      ];
    });

    setFocusedSurface(combinedId);
    setPendingOperation(null);
  }, [
    clearPendingOperation,
    pendingOperation,
    setFocusedSurface,
    setItems,
  ]);

  React.useEffect(() => {
    if (!pendingOperation) {
      return;
    }

    const id = window.setTimeout(() => {
      clearPendingOperation();
    }, 6000);

    return () => {
      window.clearTimeout(id);
    };
  }, [clearPendingOperation, pendingOperation]);

  React.useEffect(() => {
    if (!gestureSignal || gestureSignal.type === "summon_ui") {
      return;
    }

    if (commandSurfaceOpen) {
      return;
    }

    if (gestureSignal.type === "confirm") {
      if (pendingOperation) {
        commitPendingOperation();
      }
      clearGestureSignal();
      return;
    }

    if (gestureSignal.type === "dismiss") {
      if (pendingOperation) {
        clearPendingOperation();
      }
      clearGestureSignal();
      return;
    }

    clearGestureSignal();
  }, [
    clearGestureSignal,
    clearPendingOperation,
    commandSurfaceOpen,
    commitPendingOperation,
    gestureSignal,
    pendingOperation,
  ]);

  const combinePreview =
    pendingOperation?.kind === "combine"
      ? {
          source:
            items.find((surface) => surface.id === pendingOperation.sourceId) ?? null,
          target:
            items.find((surface) => surface.id === pendingOperation.targetId) ?? null,
        }
      : null;

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

      {notice && (
        <div className="absolute left-4 top-16 z-10 max-w-xs rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-xs text-foreground backdrop-blur">
          {notice}
        </div>
      )}

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
        {combinePreview?.source && combinePreview.target && (
          <div
            aria-hidden
            className="absolute pointer-events-none z-20"
            style={{
              transform: `translate3d(${(combinePreview.source.x + combinePreview.target.x) / 2}px, ${(combinePreview.source.y + combinePreview.target.y) / 2}px, 0)`,
            }}
          >
            <div className="w-72 rounded-2xl border border-amber-500/40 bg-card/80 p-4 text-xs text-foreground shadow-xl shadow-black/10 backdrop-blur dark:shadow-black/30">
              <div className="font-semibold">Preview combine</div>
              <div className="mt-1 text-muted-foreground">
                {combinePreview.source.surfaceMeta?.domain} • {combinePreview.source.surfaceMeta?.intent}
                {"  +  "}
                {combinePreview.target.surfaceMeta?.domain} • {combinePreview.target.surfaceMeta?.intent}
              </div>
              <div className="mt-2 text-muted-foreground">
                Thumbs up to commit, or wait to cancel.
              </div>
            </div>
          </div>
        )}

        {items.map((item) => {
          const appliedScale = item.previewScale ?? item.scale;
          const isPendingResize =
            pendingOperation?.kind === "resize" && pendingOperation.surfaceId === item.id;
          const isPendingCombine =
            pendingOperation?.kind === "combine" &&
            (pendingOperation.sourceId === item.id || pendingOperation.targetId === item.id);
          const isCombineCandidate =
            combineCandidate?.sourceId === item.id || combineCandidate?.targetId === item.id;

          const showConfirmBar =
            isPendingResize ||
            (pendingOperation?.kind === "combine" && pendingOperation.sourceId === item.id);

          return (
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
                ref={(node) => {
                  if (node) {
                    itemElementRefs.current.set(item.id, node);
                  } else {
                    itemElementRefs.current.delete(item.id);
                  }
                }}
                className={cn(
                  "relative rounded-2xl border bg-card/80 p-4 text-foreground shadow-xl shadow-black/10 backdrop-blur",
                  "dark:shadow-black/30",
                  item.previewScale != null ? "border-dashed" : "border-solid",
                  focusedSurface === item.id
                    ? "border-emerald-500/40 ring-2 ring-emerald-500/40"
                    : isPendingCombine
                      ? "border-amber-500/50 ring-2 ring-amber-500/30"
                      : isCombineCandidate
                        ? "border-sky-500/40 ring-2 ring-sky-500/20"
                        : "border-border/60",
                )}
                style={{
                  transform: `scale(${appliedScale})`,
                  transformOrigin: "0 0",
                }}
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
                  data-interactable="true"
                  data-canvas-resize-handle="true"
                  aria-label="Drag to resize canvas item"
                  onPointerDown={(e) => startItemResize(item.id, e)}
                  onPointerMove={onItemResizePointerMove}
                  onPointerUp={endItemResize}
                  onPointerCancel={endItemResize}
                  onLostPointerCapture={endItemResize}
                  className={cn(
                    "absolute bottom-2 right-2 rounded-md p-1 text-muted-foreground",
                    "cursor-nwse-resize",
                    "hover:bg-muted/50 hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                  )}
                >
                  <Maximize2 aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove canvas item"
                  onClick={() => {
                    setItems((prev) => prev.filter((p) => p.id !== item.id));

                    if (
                      pendingOperation?.kind === "resize" &&
                      pendingOperation.surfaceId === item.id
                    ) {
                      clearPendingOperation();
                    }
                    if (
                      pendingOperation?.kind === "combine" &&
                      (pendingOperation.sourceId === item.id ||
                        pendingOperation.targetId === item.id)
                    ) {
                      clearPendingOperation();
                    }
                  }}
                  className={cn(
                    "absolute right-2 top-2 rounded-md p-1 text-muted-foreground",
                    "hover:bg-muted/50 hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                  )}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>

                {showConfirmBar && (
                  <div className="absolute left-2 right-2 -bottom-10 flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground shadow backdrop-blur">
                    <div>Preview active</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearPendingOperation}
                        className="rounded-md px-2 py-1 hover:bg-muted/40 hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={commitPendingOperation}
                        className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300 hover:bg-emerald-500/15"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                {item.node}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
