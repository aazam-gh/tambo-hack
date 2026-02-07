export const CANVAS_ITEM_SELECTOR = "[data-canvas-item-id]";
export const INTERACTABLE_SELECTOR = "[data-interactable]";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampClientPointToViewport(clientX: number, clientY: number) {
  if (typeof window === "undefined") {
    return { x: clientX, y: clientY };
  }

  const maxX = Math.max(0, window.innerWidth - 1);
  const maxY = Math.max(0, window.innerHeight - 1);

  return {
    x: clamp(clientX, 0, maxX),
    y: clamp(clientY, 0, maxY),
  };
}

export function getInteractableAtClientPoint(clientX: number, clientY: number) {
  if (typeof document === "undefined") {
    return { interactable: null, canvasItem: null } as const;
  }

  const { x, y } = clampClientPointToViewport(clientX, clientY);
  const element = document.elementFromPoint(x, y) as HTMLElement | null;
  const canvasItem = (element?.closest(CANVAS_ITEM_SELECTOR) as HTMLElement | null) ?? null;
  const interactable =
    canvasItem ?? ((element?.closest(INTERACTABLE_SELECTOR) as HTMLElement | null) ?? null);

  return { interactable, canvasItem } as const;
}

export function getCanvasItemIdAtClientPoint(clientX: number, clientY: number) {
  const { canvasItem } = getInteractableAtClientPoint(clientX, clientY);
  return canvasItem?.dataset.canvasItemId ?? null;
}
