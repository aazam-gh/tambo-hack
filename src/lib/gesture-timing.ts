export const GESTURE_STABILITY_MS = 200;
export const GESTURE_EMIT_COOLDOWN_MS = 800;

export function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
