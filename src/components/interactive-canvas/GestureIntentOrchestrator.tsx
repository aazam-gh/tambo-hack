import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { CommandSurfaceOverlay } from "@/components/interactive-canvas/CommandSurfaceOverlay";
import { SurfaceRenderer } from "@/components/interactive-canvas/SurfaceRenderer";
import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { CommandOption } from "@/lib/command-surface";
import {
  domainIntentFromResolvedIntent,
  resolveIntentHypothesis,
} from "@/lib/intent-resolution";
import {
  useInteractionContext,
  useInteractionContextActions,
} from "@/lib/interaction-context";
import type { GestureSignal } from "@/lib/gesture-signals";
import { predictIntentHypothesis } from "@/lib/predictive-surfaces";
import {
  describeLinkType,
  getAutoLinkedSurfaceGroup,
  type SurfaceLinkGroup,
  type SurfaceLinkSuggestion,
} from "@/lib/surface-linking";
import { useSurfaceManagerActions } from "@/lib/surface-manager";
import { buildDefaultSurfaceMeta } from "@/lib/surface-meta";
import { emitTamboShowComponent } from "@/lib/tambo-canvas-events";

const COMMAND_SURFACE_IDLE_MS = 6500;
const MAX_COMMAND_OPTIONS = 5;
const PREDICTIVE_AUTO_OPEN_MIN_CONFIDENCE = 0.75;
const LINKED_SURFACE_OFFSET_X = 360;
const LINKED_SURFACE_OFFSET_Y = 280;

function dedupeDomains(domains: DomainId[]): DomainId[] {
  return [...new Set(domains)];
}

function labelForOption(domain: DomainId, intent: DomainIntent): string {
  const domainLabel = Domains[domain].label;

  if (domain === "infra" && intent === "inspect") {
    return "Check infra health";
  }
  if (domain === "infra" && intent === "filter") {
    return "Review infra alerts";
  }
  if (domain === "infra" && intent === "explain") {
    return "Explain error spike";
  }
  if (domain === "dev" && intent === "inspect") {
    return "Review pipeline failures";
  }

  const verb =
    intent === "inspect"
      ? "Inspect"
      : intent === "compare"
        ? "Compare"
        : intent === "filter"
          ? "Filter"
          : intent === "debug"
            ? "Debug"
            : "Explain";

  return `${verb} ${domainLabel.toLowerCase()}`;
}

function buildCommandOptions(
  activeDomains: DomainId[],
  primaryDomain: DomainId,
  primaryIntent: DomainIntent,
  suggested: CommandOption[] = [],
): CommandOption[] {
  const priority: DomainId[] = [
    ...activeDomains,
    primaryDomain,
    "infra",
    "sales",
    "dev",
    "marketing",
    "legal",
  ];

  const ordered = dedupeDomains(priority);
  const options: CommandOption[] = [];
  const seen = new Set<string>();
  const primaryId = `${primaryDomain}:${primaryIntent}`;
  const reserveForPrimary = !suggested.some(
    (opt) => `${opt.domain}:${opt.intent}` === primaryId,
  );

  const push = (domain: DomainId, intent: DomainIntent) => {
    if (options.length >= MAX_COMMAND_OPTIONS) {
      return;
    }
    const id = `${domain}:${intent}`;
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    options.push({ id, domain, intent, label: labelForOption(domain, intent) });
  };

  for (const opt of suggested) {
    if (
      reserveForPrimary &&
      options.length >= Math.max(0, MAX_COMMAND_OPTIONS - 1)
    ) {
      break;
    }
    if (!reserveForPrimary && options.length >= MAX_COMMAND_OPTIONS) {
      break;
    }

    const id = `${opt.domain}:${opt.intent}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    options.push({
      ...opt,
      id,
      label: opt.label || labelForOption(opt.domain, opt.intent),
    });
  }

  push(primaryDomain, primaryIntent);

  if (options.length >= MAX_COMMAND_OPTIONS) {
    return options;
  }

  const primaryDef = Domains[primaryDomain];
  const secondaryIntent = primaryDef.intents.find((i) => i !== primaryIntent);
  if (secondaryIntent) {
    push(primaryDomain, secondaryIntent);
  }

  if (options.length >= MAX_COMMAND_OPTIONS) {
    return options;
  }

  for (const domain of ordered) {
    if (options.length >= MAX_COMMAND_OPTIONS) {
      break;
    }
    if (domain === primaryDomain) continue;

    const firstIntent = Domains[domain].intents[0] ?? "inspect";
    push(domain, firstIntent);
  }

  return options;
}

function buildSuggestedOptions(
  hypothesis: ReturnType<typeof predictIntentHypothesis>,
): CommandOption[] {
  const candidates = hypothesis?.recommendedSurfaces;
  if (!candidates || candidates.length === 0) {
    return [];
  }

  return candidates.map((surface) => ({
    id: `${surface.domain}:${surface.intent}`,
    domain: surface.domain,
    intent: surface.intent,
    label: labelForOption(surface.domain, surface.intent),
    suggested: true,
    suggestedReason: surface.reason,
    confidence: hypothesis.confidence,
  }));
}

function anchorForSurface(surfaceId: string | undefined): { x: number; y: number } | null {
  if (!surfaceId || typeof document === "undefined") {
    return null;
  }

  const escapeFn =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape
      : (value: string) => value;
  const escaped = escapeFn(surfaceId);
  const el = document.querySelector<HTMLElement>(
    `[data-canvas-item-id="${escaped}"]`,
  );
  if (!el) {
    return null;
  }

  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function toPreview(
  linkType: SurfaceLinkGroup["linkType"],
  suggestion: SurfaceLinkSuggestion,
): {
  label: string;
  description: string;
} {
  return {
    label: suggestion.label,
    description: `${Domains[suggestion.domain].label} • ${describeLinkType(linkType)}`,
  };
}

function mergeShallowSurfaceQuery(
  base: Record<string, unknown>,
  patch?: Record<string, unknown>,
): Record<string, unknown> {
  // Surface queries are intentionally shallow (top-level keys only). If we
  // introduce nested query structures later, switch to a more explicit merge
  // strategy.
  if (patch && import.meta.env.DEV) {
    for (const key of Object.keys(patch)) {
      if (key in base) {
        console.warn("Surface link preset overwrote query key", { key });
      }
    }
  }
  return patch ? { ...base, ...patch } : base;
}

function getLinkedSurfaceOffset(idx: number): { dx: number; dy: number } {
  const row = Math.floor(idx / 2);
  const col = idx % 2;

  if (col === 0) {
    return { dx: LINKED_SURFACE_OFFSET_X, dy: row * LINKED_SURFACE_OFFSET_Y };
  }

  return { dx: 0, dy: (row + 1) * LINKED_SURFACE_OFFSET_Y };
}

function createSurfaceSessionPrefix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sess-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `sess-${Math.random().toString(36).slice(2, 10)}`;
}

export function GestureIntentOrchestrator() {
  // Contract: gestures only emit low-entropy signals. This orchestrator is the
  // only place that may translate confirmed intent into `tambo:showComponent`.
  const { gestureSignal, clearGestureSignal, handPosition } = useSensing();
  const interactionContext = useInteractionContext();
  const {
    activeDomains: activeDomainsSnapshot,
    focusedSurface: focusedSurfaceSnapshot,
    recentActions: recentActionsSnapshot,
    recentDomains: recentDomainsSnapshot,
  } = interactionContext;
  const {
    registerSurfaceMeta,
    setActiveDomains,
    setSurfaceDependencies,
    pushRecentAction,
    setCommandSurfaceOpen,
  } = useInteractionContextActions();
  const { registerSurface, linkSurfaces } = useSurfaceManagerActions();

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandAnchor, setCommandAnchor] = React.useState<
    { x: number; y: number } | null
  >(null);
  const [commandOptions, setCommandOptions] = React.useState<CommandOption[]>([]);
  const [commandSelectedIndex, setCommandSelectedIndex] = React.useState(0);
  const lastCommandActivityAtRef = React.useRef<number | null>(null);
  const surfaceIdRef = React.useRef(0);
  const surfaceSessionPrefixRef = React.useRef(createSurfaceSessionPrefix());
  const lastPredictiveKeyRef = React.useRef<string | null>(null);
  const intentConfidenceRef = React.useRef<number | undefined>(undefined);

  const dismissCommandSurface = React.useCallback(() => {
    setCommandOpen(false);
    setCommandAnchor(null);
    setCommandOptions([]);
    setCommandSelectedIndex(0);
    lastCommandActivityAtRef.current = null;
    intentConfidenceRef.current = undefined;
    setCommandSurfaceOpen(false);
  }, [setCommandSurfaceOpen]);

  React.useEffect(() => {
    return () => {
      setCommandSurfaceOpen(false);
    };
  }, [setCommandSurfaceOpen]);

  const openCommandSurface = React.useCallback(
    (signal: GestureSignal) => {
      const anchor =
        (signal.clientX != null && signal.clientY != null
          ? { x: signal.clientX, y: signal.clientY }
          : null) ?? handPosition;

      if (!anchor) {
        return;
      }

      const hypothesis = resolveIntentHypothesis(signal, interactionContext);
      const primaryDomain = hypothesis.targetDomain ?? "infra";
      const primaryIntent = domainIntentFromResolvedIntent(hypothesis.primary);

      const predictiveHypothesis = predictIntentHypothesis(interactionContext);
      const suggested = buildSuggestedOptions(predictiveHypothesis);

      const options = buildCommandOptions(
        interactionContext.activeDomains,
        primaryDomain,
        primaryIntent,
        suggested,
      );

      setCommandAnchor(anchor);
      setCommandOptions(options);
      setCommandSelectedIndex(0);
      setCommandOpen(true);
      setCommandSurfaceOpen(true);
      lastCommandActivityAtRef.current = performance.now();
      intentConfidenceRef.current = signal.confidence;
      pushRecentAction("command_surface:open");
    },
    [handPosition, interactionContext, pushRecentAction, setCommandSurfaceOpen],
  );

  const confirmSelectedOption = React.useCallback(() => {
    const selected = commandOptions[commandSelectedIndex];
    if (!selected) {
      dismissCommandSurface();
      return;
    }

    const linkGroup = getAutoLinkedSurfaceGroup(selected.domain, selected.intent);
    const linkedSuggestions = linkGroup?.linkedSurfaces ?? [];

    surfaceIdRef.current += 1;
    const surfaceId = `${surfaceSessionPrefixRef.current}-surface-${surfaceIdRef.current}`;
    const meta = {
      ...buildDefaultSurfaceMeta(selected.domain, selected.intent),
      intentConfidence: intentConfidenceRef.current,
    };

    registerSurface(surfaceId, meta);

    const dependency = interactionContext.focusedSurface
      ? [interactionContext.focusedSurface]
      : [];

    emitTamboShowComponent({
      messageId: surfaceId,
      component: <SurfaceRenderer surfaceId={surfaceId} initialMeta={meta} />,
      clientX: commandAnchor?.x,
      clientY: commandAnchor?.y,
      surfaceMeta: meta,
    });

    registerSurfaceMeta(surfaceId, meta);
    if (dependency.length > 0) {
      setSurfaceDependencies(surfaceId, dependency);
    }

    const linkedSurfaceIds: string[] = [];
    linkedSuggestions.forEach((suggestion, idx) => {
      const linkedId = `${surfaceId}-linked-${idx + 1}`;
      const linkedMeta = {
        ...buildDefaultSurfaceMeta(suggestion.domain, suggestion.intent),
        intentConfidence: intentConfidenceRef.current,
      };
      const mergedQuery = mergeShallowSurfaceQuery(
        linkedMeta.query,
        suggestion.presetQuery,
      );
      const normalizedMeta = { ...linkedMeta, query: mergedQuery };

      const offset = getLinkedSurfaceOffset(idx);

      registerSurface(linkedId, normalizedMeta);

      emitTamboShowComponent({
        messageId: linkedId,
        component: (
          <SurfaceRenderer surfaceId={linkedId} initialMeta={normalizedMeta} />
        ),
        clientX:
          commandAnchor?.x != null ? commandAnchor.x + offset.dx : undefined,
        clientY:
          commandAnchor?.y != null ? commandAnchor.y + offset.dy : undefined,
        surfaceMeta: normalizedMeta,
      });
      registerSurfaceMeta(linkedId, normalizedMeta);
      linkedSurfaceIds.push(linkedId);
    });

    if (linkGroup?.linkType && linkedSurfaceIds.length > 0) {
      linkSurfaces(surfaceId, linkedSurfaceIds, linkGroup.linkType);
    }

    setActiveDomains(
      dedupeDomains([selected.domain, ...interactionContext.activeDomains]),
    );
    pushRecentAction(`confirm:${selected.domain}:${selected.intent}`);

    dismissCommandSurface();
  }, [
    commandAnchor,
    commandOptions,
    commandSelectedIndex,
    dismissCommandSurface,
    interactionContext.activeDomains,
    interactionContext.focusedSurface,
    linkSurfaces,
    pushRecentAction,
    registerSurface,
    registerSurfaceMeta,
    setActiveDomains,
    setSurfaceDependencies,
  ]);

  React.useEffect(() => {
    if (commandOpen) {
      return;
    }

    const hypothesis = predictIntentHypothesis({
      recentActions: recentActionsSnapshot,
      recentDomains: recentDomainsSnapshot,
    });
    if (!hypothesis || hypothesis.confidence < PREDICTIVE_AUTO_OPEN_MIN_CONFIDENCE) {
      return;
    }

    const latestAction = recentActionsSnapshot[0];
    if (!latestAction?.startsWith("confirm:")) {
      return;
    }

    const suggested = buildSuggestedOptions(hypothesis);
    if (suggested.length === 0) {
      return;
    }

    const key = `${latestAction}:${hypothesis.primary}`;
    if (lastPredictiveKeyRef.current === key) {
      return;
    }

    const anchor = handPosition ?? anchorForSurface(focusedSurfaceSnapshot);
    if (!anchor) {
      return;
    }

    const primaryDomain = hypothesis.targetDomain ?? suggested[0]?.domain ?? "infra";
    const primaryIntent = suggested[0]?.intent ?? "inspect";
    const options = buildCommandOptions(
      activeDomainsSnapshot,
      primaryDomain,
      primaryIntent,
      suggested,
    );

    lastPredictiveKeyRef.current = key;
    setCommandAnchor(anchor);
    setCommandOptions(options);
    setCommandSelectedIndex(0);
    setCommandOpen(true);
    lastCommandActivityAtRef.current = performance.now();
    pushRecentAction("command_surface:predictive_open");
  }, [
    commandOpen,
    handPosition,
    activeDomainsSnapshot,
    focusedSurfaceSnapshot,
    recentActionsSnapshot,
    recentDomainsSnapshot,
    pushRecentAction,
  ]);

  const linkedPreview = React.useMemo(() => {
    const selected = commandOptions[commandSelectedIndex];
    if (!selected) {
      return [];
    }
    const group = getAutoLinkedSurfaceGroup(selected.domain, selected.intent);
    if (!group) {
      return [];
    }
    return group.linkedSurfaces.map((surface) => toPreview(group.linkType, surface));
  }, [commandOptions, commandSelectedIndex]);

  React.useEffect(() => {
    if (!commandOpen) {
      return;
    }

    const id = window.setInterval(() => {
      const last = lastCommandActivityAtRef.current;
      if (last == null) {
        return;
      }

      if (performance.now() - last > COMMAND_SURFACE_IDLE_MS) {
        dismissCommandSurface();
      }
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [commandOpen, dismissCommandSurface]);

  React.useEffect(() => {
    if (!gestureSignal) {
      return;
    }

    if (gestureSignal.type === "summon_ui") {
      if (commandOpen) {
        dismissCommandSurface();
      } else {
        openCommandSurface(gestureSignal);
      }
      clearGestureSignal();
      return;
    }

    if (!commandOpen) {
      return;
    }

    lastCommandActivityAtRef.current = performance.now();

    if (gestureSignal.type === "dismiss") {
      dismissCommandSurface();
      clearGestureSignal();
      return;
    }

    if (gestureSignal.type === "select") {
      setCommandSelectedIndex((prev) =>
        commandOptions.length === 0 ? 0 : (prev + 1) % commandOptions.length,
      );
      clearGestureSignal();
      return;
    }

    if (gestureSignal.type === "confirm") {
      confirmSelectedOption();
      clearGestureSignal();
      return;
    }

    clearGestureSignal();
  }, [
    clearGestureSignal,
    commandOpen,
    commandOptions.length,
    confirmSelectedOption,
    dismissCommandSurface,
    gestureSignal,
    openCommandSurface,
  ]);

  return (
    <CommandSurfaceOverlay
      open={commandOpen}
      anchor={commandAnchor}
      options={commandOptions}
      selectedIndex={commandSelectedIndex}
      linkedPreview={linkedPreview}
      onSelectIndex={(index) => {
        setCommandSelectedIndex(index);
        lastCommandActivityAtRef.current = performance.now();
      }}
      onConfirm={confirmSelectedOption}
      onDismiss={dismissCommandSurface}
    />
  );
}
