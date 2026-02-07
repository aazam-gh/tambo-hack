import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type HandGesture =
  | "open_palm"
  | "fist"
  | "pinch"
  | "thumbs_up"
  | "point";

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isFingerExtended(
  tip: NormalizedLandmark,
  pip: NormalizedLandmark,
): boolean {
  // MediaPipe coordinates are normalized with y increasing downward.
  return tip.y < pip.y - 0.02;
}

function isFingerCurled(
  tip: NormalizedLandmark,
  pip: NormalizedLandmark,
): boolean {
  return tip.y > pip.y + 0.02;
}

export function detectHandGesture(
  landmarks: NormalizedLandmark[],
): HandGesture | null {
  if (landmarks.length < 21) {
    return null;
  }

  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  const indexExtended = isFingerExtended(indexTip, indexPip);
  const middleExtended = isFingerExtended(middleTip, middlePip);
  const ringExtended = isFingerExtended(ringTip, ringPip);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyPip);

  const indexCurled = isFingerCurled(indexTip, indexPip);
  const middleCurled = isFingerCurled(middleTip, middlePip);
  const ringCurled = isFingerCurled(ringTip, ringPip);
  const pinkyCurled = isFingerCurled(pinkyTip, pinkyPip);

  const thumbUp = thumbTip.y < thumbIp.y - 0.02;
  const thumbIndexDistance = distance(thumbTip, indexTip);

  if (thumbIndexDistance < 0.05) {
    return "pinch";
  }

  if (thumbUp && indexCurled && middleCurled && ringCurled && pinkyCurled) {
    return "thumbs_up";
  }

  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "open_palm";
  }

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "point";
  }

  if (
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended &&
    !thumbUp
  ) {
    return "fist";
  }

  return null;
}
