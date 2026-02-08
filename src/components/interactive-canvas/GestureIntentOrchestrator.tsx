import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { CommandSurfaceOverlay } from "@/components/interactive-canvas/CommandSurfaceOverlay";
import { SurfaceRenderer } from "@/components/interactive-canvas/SurfaceRenderer";
import { WidgetCompositionOverlay } from "@/components/interactive-canvas/WidgetCompositionOverlay";
import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { CommandOption } from "@/lib/command-surface";
import { DEFAULT_MOCK_PRODUCT_NAME } from "@/lib/mock-sales";
import {
  getMicroCompositions,
  type MicroComposition,
} from "@/lib/micro-primitives";
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
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
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

  if (domain === "research" && intent === "analyze") {
    return "Analyze product metrics";
  }
  if (domain === "trading" && intent === "summarize") {
    return "Summarize profit sentiment";
  }
  if (domain === "news" && intent === "summarize") {
    return "Get latest sales highlights";
  }

  const verb =
    intent === "inspect"
      ? "Inspect"
      : intent === "analyze"
        ? "Analyze"
        : intent === "compare"
          ? "Compare"
          : intent === "summarize"
            ? "Summarize"
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
    "trading",
    "research",
    "news",
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
    setFocusedSurface,
  } = useInteractionContextActions();
  const { registerSurface, linkSurfaces } = useSurfaceManagerActions();
  const { submit, setValue, value } = useTamboThreadInput();
  const { thread } = useTamboThread();
  const { hoveredElement } = useSensing();
  const pendingPromptRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (pendingPromptRef.current && value === pendingPromptRef.current) {
      submit({ streamResponse: true }).catch((err) => {
        if (err instanceof Error && err.message.includes("streaming response")) {
          console.warn(
            "Gesture intent streaming submission failed, retrying:",
            err,
          );
          submit({ streamResponse: true }).catch((retryErr) => {
            console.error("Gesture intent retry submission failed:", retryErr);
          });
          return;
        }

        console.error("Gesture intent submission failed:", err);
      });
      pendingPromptRef.current = null;
    }
  }, [value, submit]);

  const processedMessageIdsRef = React.useRef(new Set<string>());
  const lastGestureHandPositionRef = React.useRef<{ x: number; y: number } | null>(
    null,
  );

  React.useEffect(() => {
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      !!lastMessage.renderedComponent &&
      !processedMessageIdsRef.current.has(lastMessage.id)
    ) {
      processedMessageIdsRef.current.add(lastMessage.id);

      const anchor =
        lastGestureHandPositionRef.current ??
        anchorForSurface(focusedSurfaceSnapshot);

      emitTamboShowComponent({
        messageId: lastMessage.id,
        component: lastMessage.renderedComponent,
        clientX: anchor?.x,
        clientY: anchor?.y,
      });
    }
  }, [thread.messages, focusedSurfaceSnapshot]);

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandAnchor, setCommandAnchor] = React.useState<
    { x: number; y: number } | null
  >(null);
  const [commandOptions, setCommandOptions] = React.useState<CommandOption[]>([]);
  const [commandSelectedIndex, setCommandSelectedIndex] = React.useState(0);

  const [compositionOpen, setCompositionOpen] = React.useState(false);
  const [compositionAnchor, setCompositionAnchor] = React.useState<
    { x: number; y: number } | null
  >(null);
  const [compositionTarget, setCompositionTarget] = React.useState<{
    domain: DomainId;
    intent: DomainIntent;
  } | null>(null);
  const [compositionOptions, setCompositionOptions] = React.useState<
    MicroComposition[]
  >([]);
  const [compositionSelectedIndex, setCompositionSelectedIndex] = React.useState(0);

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

  const dismissCompositionOverlay = React.useCallback(() => {
    setCompositionOpen(false);
    setCompositionAnchor(null);
    setCompositionTarget(null);
    setCompositionOptions([]);
    setCompositionSelectedIndex(0);
  }, []);

  const dismissAllTransientOverlays = React.useCallback(() => {
    dismissCompositionOverlay();
    dismissCommandSurface();
  }, [dismissCommandSurface, dismissCompositionOverlay]);

  React.useEffect(() => {
    if (!interactionContext.commandSurfaceOpen && (commandOpen || compositionOpen)) {
      dismissAllTransientOverlays();
    }
  }, [interactionContext.commandSurfaceOpen, commandOpen, compositionOpen, dismissAllTransientOverlays]);

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
      const primaryDomain = hypothesis.targetDomain ?? "research";
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

  const spawnSurfaceForSelection = React.useCallback(
    (
      selection: { domain: DomainId; intent: DomainIntent },
      {
        anchor,
        queryPatch,
      }: {
        anchor: { x: number; y: number } | null;
        queryPatch?: Record<string, unknown>;
      },
    ) => {
      const linkGroup = getAutoLinkedSurfaceGroup(
        selection.domain,
        selection.intent,
      );
      const linkedSuggestions = linkGroup?.linkedSurfaces ?? [];

      surfaceIdRef.current += 1;
      const surfaceId = `${surfaceSessionPrefixRef.current}-surface-${surfaceIdRef.current}`;
      const baseMeta = buildDefaultSurfaceMeta(selection.domain, selection.intent);
      const meta = {
        ...baseMeta,
        query: queryPatch ? { ...baseMeta.query, ...queryPatch } : baseMeta.query,
        intentConfidence: intentConfidenceRef.current,
      };

      registerSurface(surfaceId, meta);

      const dependency = interactionContext.focusedSurface
        ? [interactionContext.focusedSurface]
        : [];

      emitTamboShowComponent({
        messageId: surfaceId,
        component: <SurfaceRenderer surfaceId={surfaceId} initialMeta={meta} />,
        clientX: anchor?.x,
        clientY: anchor?.y,
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
          clientX: anchor?.x != null ? anchor.x + offset.dx : undefined,
          clientY: anchor?.y != null ? anchor.y + offset.dy : undefined,
          surfaceMeta: normalizedMeta,
        });
        registerSurfaceMeta(linkedId, normalizedMeta);
        linkedSurfaceIds.push(linkedId);
      });

      if (linkGroup?.linkType && linkedSurfaceIds.length > 0) {
        linkSurfaces(surfaceId, linkedSurfaceIds, linkGroup.linkType);
      }

      setFocusedSurface(surfaceId);
    },
    [
      interactionContext.focusedSurface,
      linkSurfaces,
      registerSurface,
      registerSurfaceMeta,
      setSurfaceDependencies,
      setFocusedSurface,
    ],
  );

  const confirmSelectedOption = React.useCallback(() => {
    const selected = commandOptions[commandSelectedIndex];
    if (!selected) {
      dismissCommandSurface();
      return;
    }

    lastGestureHandPositionRef.current = commandAnchor;

    if (selected.domain === "news" || selected.domain === "trading" || selected.domain === "research") {
      const prompt = `[GESTURE_SYSTEM]: [REF_${Date.now()}] User confirmed intent "${selected.intent}" for ${selected.domain}. 
        Please use the internal tools backed by the bundled mock sales dataset to fetch the relevant data and display it using the most appropriate UI component (ProductQuote, ProductProfile, SalesHighlights, ProfitSentiment, or ProductMetrics).
        CRITICAL: Only request data for products that exist in the bundled mock dataset. If you are not sure a product exists, always default to "${DEFAULT_MOCK_PRODUCT_NAME}".
        IMPORTANT: If no product is currently active or mentioned in the conversation history, default to "${DEFAULT_MOCK_PRODUCT_NAME}" so that the data can be shown immediately.`;

      setValue(prompt);
      pendingPromptRef.current = prompt;

      // Emit a temporary loading state to give immediate feedback
      const loadingId = `loading-${Date.now()}`;
      emitTamboShowComponent({
        messageId: loadingId,
        component: (
          <div className="w-64 p-4 rounded-xl border border-emerald-500/30 bg-background/80 backdrop-blur-md shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <div className="text-sm font-medium text-emerald-600">Analyzing {Domains[selected.domain]?.label ?? selected.domain}...</div>
          </div>
        ),
        clientX: commandAnchor?.x,
        clientY: commandAnchor?.y,
      });

      setActiveDomains(
        dedupeDomains([selected.domain, ...interactionContext.activeDomains]),
      );
      pushRecentAction(`confirm:${selected.domain}:${selected.intent}`);

      dismissCommandSurface();
      return;
    }

    const compositions = getMicroCompositions(selected.domain, selected.intent);
    if (compositions && compositions.length > 0) {
      setCommandOpen(false);
      setCommandSurfaceOpen(false);
      setCompositionOpen(true);
      setCompositionAnchor(commandAnchor);
      setCompositionTarget({ domain: selected.domain, intent: selected.intent });
      setCompositionOptions(compositions);
      setCompositionSelectedIndex(0);
      lastCommandActivityAtRef.current = performance.now();
      pushRecentAction(`compose:${selected.domain}:${selected.intent}`);
      return;
    }

    spawnSurfaceForSelection(
      { domain: selected.domain, intent: selected.intent },
      { anchor: commandAnchor },
    );

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
    pushRecentAction,
    setActiveDomains,
    setCommandSurfaceOpen,
    spawnSurfaceForSelection,
    submit,
    setValue,
  ]);

  const handleCanvasItemSelection = React.useCallback((itemId: string) => {
    setFocusedSurface(itemId);
    pushRecentAction(`select_surface:${itemId}`);
    dismissAllTransientOverlays();
  }, [dismissAllTransientOverlays, pushRecentAction, setFocusedSurface]);

  const confirmSelectedComposition = React.useCallback(() => {
    if (!compositionTarget) {
      dismissAllTransientOverlays();
      return;
    }

    const selected = compositionOptions[compositionSelectedIndex];
    if (!selected) {
      dismissAllTransientOverlays();
      return;
    }

    spawnSurfaceForSelection(compositionTarget, {
      anchor: compositionAnchor,
      queryPatch: {
        microPrimitives: selected.primitives,
        microIncremental: selected.incremental ?? true,
      },
    });

    setActiveDomains(
      dedupeDomains([
        compositionTarget.domain,
        ...interactionContext.activeDomains,
      ]),
    );
    pushRecentAction(
      `confirm:${compositionTarget.domain}:${compositionTarget.intent}:${selected.id}`,
    );

    dismissAllTransientOverlays();
  }, [
    compositionAnchor,
    compositionOptions,
    compositionSelectedIndex,
    compositionTarget,
    dismissAllTransientOverlays,
    interactionContext.activeDomains,
    pushRecentAction,
    setActiveDomains,
    spawnSurfaceForSelection,
  ]);

  const backToCommandSurface = React.useCallback(() => {
    dismissCompositionOverlay();
    setCommandOpen(true);
    setCommandSurfaceOpen(true);
    lastCommandActivityAtRef.current = performance.now();
  }, [dismissCompositionOverlay, setCommandSurfaceOpen]);

  React.useEffect(() => {
    if (commandOpen || compositionOpen) {
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

    const primaryDomain = hypothesis.targetDomain ?? suggested[0]?.domain ?? "research";
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
    compositionOpen,
    handPosition,
    activeDomainsSnapshot,
    focusedSurfaceSnapshot,
    recentActionsSnapshot,
    recentDomainsSnapshot,
    pushRecentAction,
  ]);

  React.useEffect(() => {
    if (!hoveredElement) return;

    if (commandOpen) {
      const commandIdx = hoveredElement.dataset.commandOptionIndex;
      if (commandIdx !== undefined) {
        setCommandSelectedIndex(parseInt(commandIdx, 10));
        lastCommandActivityAtRef.current = performance.now();
      }
    }

    if (compositionOpen) {
      const compositionIdx = hoveredElement.dataset.compositionOptionIndex;
      if (compositionIdx !== undefined) {
        setCompositionSelectedIndex(parseInt(compositionIdx, 10));
        lastCommandActivityAtRef.current = performance.now();
      }
    }
  }, [hoveredElement, commandOpen, compositionOpen]);

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
    if (!commandOpen && !compositionOpen) {
      return;
    }

    const id = window.setInterval(() => {
      const last = lastCommandActivityAtRef.current;
      if (last == null) {
        return;
      }

      if (performance.now() - last > COMMAND_SURFACE_IDLE_MS) {
        dismissAllTransientOverlays();
      }
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [commandOpen, compositionOpen, dismissAllTransientOverlays]);

  React.useEffect(() => {
    if (!gestureSignal) {
      return;
    }

    if (gestureSignal.type === "summon_ui") {
      if (compositionOpen) {
        dismissAllTransientOverlays();
      } else if (commandOpen) {
        dismissCommandSurface();
      } else {
        openCommandSurface(gestureSignal);
      }
      clearGestureSignal();
      return;
    }

    if (compositionOpen) {
      lastCommandActivityAtRef.current = performance.now();

      if (gestureSignal.type === "dismiss") {
        dismissAllTransientOverlays();
        clearGestureSignal();
        return;
      }

      if (gestureSignal.type === "select") {
        setCompositionSelectedIndex((prev) =>
          compositionOptions.length === 0
            ? 0
            : (prev + 1) % compositionOptions.length,
        );
        clearGestureSignal();
        return;
      }

      if (gestureSignal.type === "confirm") {
        confirmSelectedComposition();
        clearGestureSignal();
        return;
      }

      clearGestureSignal();
      return;
    }

    if (!commandOpen) {
      if (gestureSignal.type === "select") {
        const hoveredItem = hoveredElement?.closest("[data-canvas-item-id]") as HTMLElement | null;
        if (hoveredItem?.dataset.canvasItemId) {
          handleCanvasItemSelection(hoveredItem.dataset.canvasItemId);
          clearGestureSignal();
          return;
        }
      }
      return;
    }

    lastCommandActivityAtRef.current = performance.now();

    if (gestureSignal.type === "dismiss") {
      dismissCommandSurface();
      clearGestureSignal();
      return;
    }

    if (gestureSignal.type === "select") {
      const hoveredItem = hoveredElement?.closest("[data-canvas-item-id]") as HTMLElement | null;
      if (hoveredItem?.dataset.canvasItemId) {
        handleCanvasItemSelection(hoveredItem.dataset.canvasItemId);
        clearGestureSignal();
        return;
      }

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
    compositionOpen,
    compositionOptions.length,
    confirmSelectedComposition,
    dismissAllTransientOverlays,
    dismissCommandSurface,
    gestureSignal,
    openCommandSurface,
    hoveredElement,
    handleCanvasItemSelection,
  ]);

  return (
    <>
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
      {compositionTarget ? (
        <WidgetCompositionOverlay
          open={compositionOpen}
          anchor={compositionAnchor}
          domain={compositionTarget.domain}
          intent={compositionTarget.intent}
          options={compositionOptions}
          selectedIndex={compositionSelectedIndex}
          onSelectIndex={(index) => {
            setCompositionSelectedIndex(index);
            lastCommandActivityAtRef.current = performance.now();
          }}
          onConfirm={confirmSelectedComposition}
          onBack={backToCommandSurface}
          onDismiss={dismissAllTransientOverlays}
        />
      ) : null}
    </>
  );
}
