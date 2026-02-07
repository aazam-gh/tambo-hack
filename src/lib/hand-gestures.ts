export type NormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
};

export type HandGesture = "pinch" | "openPalm" | "thumbsUp";

// Gesture heuristics are based on MediaPipe's normalized landmark coordinates.
// These thresholds are intentionally simple to keep the demo lightweight.
const PINCH_DISTANCE_THRESHOLD = 0.055;
const FINGER_EXTENSION_MARGIN_Y = 0.02;

function distance2D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isFingerExtended(
  landmarks: readonly NormalizedLandmark[],
  tipIndex: number,
  pipIndex: number,
): boolean {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  if (!tip || !pip) return false;

  // MediaPipe's normalized Y increases downward, so an extended finger (pointing
  // up toward the camera top) will usually have a smaller Y at the tip.
  return tip.y < pip.y - FINGER_EXTENSION_MARGIN_Y;
}

export function detectHandGesture(
  landmarks: readonly NormalizedLandmark[] | undefined | null,
): HandGesture | null {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  if (!thumbTip || !indexTip) {
    return null;
  }

  const pinchDistance = distance2D(thumbTip, indexTip);
  if (pinchDistance < PINCH_DISTANCE_THRESHOLD) {
    return "pinch";
  }

  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);
  const thumbExtended = isFingerExtended(landmarks, 4, 3);

  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "thumbsUp";
  }

  if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "openPalm";
  }

  return null;
}
