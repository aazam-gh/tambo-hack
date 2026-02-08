/**
* Cycles through the supported surface range presets in a fixed order:
* 7 → 14 → 30 → 7.
*/
export function cycleRangeDays(current: number): number {
  if (current <= 7) return 14;
  if (current <= 14) return 30;
  return 7;
}
