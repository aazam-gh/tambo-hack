import type { DomainId } from "@/lib/domains";
import type { InteractionContext } from "@/lib/interaction-context";
import type { SurfaceMeta } from "@/lib/surfaces";

export type AdaptiveLayoutItemMetrics = {
  createdAt: number;
  lastInteractedAt: number;
  interactionCount: number;
  manualUntil?: number;
};

export type AdaptiveLayoutItem = {
  id: string;
  x: number;
  y: number;
  surfaceMeta?: SurfaceMeta;
  metrics: AdaptiveLayoutItemMetrics;
};

export type AdaptiveLayoutResult = {
  anchorId: string | null;
  targets: Record<
    string,
    {
      importance: number;
      x?: number;
      y?: number;
      scale: number;
      opacity: number;
    }
  >;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function domainBasePriority(domain: DomainId): number {
  switch (domain) {
    case "infra":
      return 1;
    case "dev":
      return 0.86;
    case "sales":
      return 0.74;
    case "marketing":
      return 0.62;
    case "legal":
      return 0.5;
  }
}

function domainPriority(domain: DomainId, context: InteractionContext): number {
  const activeIndex = context.activeDomains.indexOf(domain);
  if (activeIndex === -1) {
    return domainBasePriority(domain);
  }

  const boost = clamp(0.14 - activeIndex * 0.04, 0, 0.14);
  return clamp(domainBasePriority(domain) + boost, 0, 1);
}

function recentActionBoost(domain: DomainId, context: InteractionContext): number {
  const prefix = `confirm:${domain}:`;
  const idx = context.recentActions.findIndex((a) => a.startsWith(prefix));
  if (idx === -1) {
    return 0;
  }

  // Recent actions decay quickly; the first ~5 items should matter most.
  return clamp(Math.exp(-idx / 4), 0, 1);
}

export function scoreSurfaceImportance(args: {
  meta?: SurfaceMeta;
  metrics: AdaptiveLayoutItemMetrics;
  context: InteractionContext;
  focused: boolean;
  now: number;
}): number {
  const { meta, metrics, context, focused, now } = args;

  const domainScore = meta?.domain ? domainPriority(meta.domain, context) : 0.42;
  const actionScore = meta?.domain ? recentActionBoost(meta.domain, context) : 0;
  const confidenceScore = clamp(meta?.intentConfidence ?? 0.6, 0, 1);

  const secondsSinceInteraction = (now - metrics.lastInteractedAt) / 1000;
  const recentInteraction = clamp(Math.exp(-secondsSinceInteraction / 12), 0, 1);
  const frequency = clamp(metrics.interactionCount / 6, 0, 1);
  const interactionScore = 0.6 * recentInteraction + 0.4 * frequency;

  const base =
    0.34 * domainScore +
    0.24 * actionScore +
    0.22 * confidenceScore +
    0.2 * interactionScore;

  const focusBoost = focused ? 0.25 : 0;
  return clamp(base + focusBoost, 0, 1);
}

export function spiralGridSlot(index: number): { col: number; row: number } {
  if (index <= 0) {
    return { col: 0, row: 0 };
  }

  // Simple outward spiral in grid coordinates.
  let layer = 1;
  while ((2 * layer + 1) ** 2 <= index) {
    layer += 1;
  }

  const layerStart = (2 * (layer - 1) + 1) ** 2;
  const offset = index - layerStart;
  const sideLen = layer * 2;

  const side = Math.floor(offset / sideLen);
  const pos = offset % sideLen;

  switch (side) {
    case 0:
      return { col: layer, row: -layer + 1 + pos };
    case 1:
      return { col: layer - 1 - pos, row: layer };
    case 2:
      return { col: -layer, row: layer - 1 - pos };
    default:
      return { col: -layer + 1 + pos, row: -layer };
  }
}

function visualForImportance(importance: number): { scale: number; opacity: number } {
  if (importance >= 0.75) {
    return { scale: 1.06, opacity: 1 };
  }
  if (importance >= 0.5) {
    return { scale: 1, opacity: 0.95 };
  }
  if (importance >= 0.28) {
    return { scale: 0.92, opacity: 0.78 };
  }
  if (importance >= 0.16) {
    return { scale: 0.84, opacity: 0.6 };
  }
  return { scale: 0.76, opacity: 0.42 };
}

export function computeAdaptiveLayout(args: {
  items: AdaptiveLayoutItem[];
  context: InteractionContext;
  focusedSurfaceId?: string;
  now: number;
  spacing?: { x: number; y: number };
}): AdaptiveLayoutResult {
  const { items, context, focusedSurfaceId, now } = args;
  const spacing = args.spacing ?? { x: 440, y: 360 };

  const scored = items
    .map((item) => ({
      item,
      importance: scoreSurfaceImportance({
        meta: item.surfaceMeta,
        metrics: item.metrics,
        context,
        focused: focusedSurfaceId === item.id,
        now,
      }),
    }))
    .sort((a, b) => b.importance - a.importance);

  const anchor = scored[0]?.item ?? null;

  const targets: AdaptiveLayoutResult["targets"] = {};
  for (let index = 0; index < scored.length; index += 1) {
    const { item, importance } = scored[index] ?? {};
    if (!item) {
      continue;
    }

    const { scale, opacity } = visualForImportance(importance);
    const locked =
      typeof item.metrics.manualUntil === "number" && item.metrics.manualUntil > now;

    if (!anchor || item.id === anchor.id || locked) {
      targets[item.id] = { importance, scale, opacity };
      continue;
    }

    const slot = spiralGridSlot(index);
    targets[item.id] = {
      importance,
      x: anchor.x + slot.col * spacing.x,
      y: anchor.y + slot.row * spacing.y,
      scale,
      opacity,
    };
  }

  return {
    anchorId: anchor?.id ?? null,
    targets,
  };
}
