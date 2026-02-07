import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { CommandSurfaceOverlay } from "@/components/interactive-canvas/CommandSurfaceOverlay";
import { DomainSurfaceFrame } from "@/components/interactive-canvas/DomainSurfaceFrame";
import { WidgetCompositionOverlay } from "@/components/interactive-canvas/WidgetCompositionOverlay";
import { AlertList } from "@/components/tambo/alert-list";
import { ComposableGraph } from "@/components/tambo/composable-graph";
import { Graph } from "@/components/tambo/graph";
import { LogViewer } from "@/components/tambo/log-viewer";
import { PipelineStatus } from "@/components/tambo/pipeline-status";
import { Summary } from "@/components/tambo/summary";
import { Table } from "@/components/tambo/table";
import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { CommandOption } from "@/lib/command-surface";
import {
  getMicroCompositions,
  type MicroComposition,
  type MicroPrimitive,
} from "@/lib/micro-primitives";
import {
  domainIntentFromResolvedIntent,
  resolveIntentHypothesis,
} from "@/lib/intent-resolution";
import {
  useInteractionContext,
  useInteractionContextActions,
} from "@/lib/interaction-context";
import type { InteractionContext } from "@/lib/interaction-context";
import type { GestureSignal } from "@/lib/gesture-signals";
import { emitTamboShowComponent } from "@/lib/tambo-canvas-events";
import type { SurfaceMeta } from "@/lib/surfaces";
import {
  fetchDevData,
  fetchInfraData,
  fetchLegalData,
  fetchMarketingData,
  fetchSalesData,
} from "@/services/domain-data";

const COMMAND_SURFACE_IDLE_MS = 6500;
const MAX_COMMAND_OPTIONS = 5;

function dedupeDomains(domains: DomainId[]): DomainId[] {
  return [...new Set(domains)];
}

function labelForOption(domain: DomainId, intent: DomainIntent): string {
  const domainLabel = Domains[domain].label;

  if (domain === "infra" && intent === "inspect") {
    return "Check infra health";
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
  context: InteractionContext,
  primaryDomain: DomainId,
  primaryIntent: DomainIntent,
): CommandOption[] {
  const priority: DomainId[] = [
    ...context.activeDomains,
    primaryDomain,
    "infra",
    "sales",
    "dev",
    "marketing",
    "legal",
  ];

  const ordered = dedupeDomains(priority);
  const options: CommandOption[] = [];

  const push = (domain: DomainId, intent: DomainIntent) => {
    options.push({
      id: `${domain}:${intent}`,
      domain,
      intent,
      label: labelForOption(domain, intent),
    });
  };

  push(primaryDomain, primaryIntent);

  const primaryDef = Domains[primaryDomain];
  const secondaryIntent = primaryDef.intents.find((i) => i !== primaryIntent);
  if (secondaryIntent) {
    push(primaryDomain, secondaryIntent);
  }

  for (const domain of ordered) {
    if (options.length >= MAX_COMMAND_OPTIONS) break;
    if (domain === primaryDomain) continue;

    const firstIntent = Domains[domain].intents[0] ?? "inspect";
    push(domain, firstIntent);
  }

  return options.slice(0, MAX_COMMAND_OPTIONS);
}

function buildSurfaceMeta(domain: DomainId, intent: DomainIntent): SurfaceMeta {
  const domainDef = Domains[domain];
  const query = { rangeDays: 14 };
  const actions = domainDef.intents.filter((i) => i !== intent);

  return {
    domain,
    intent,
    query,
    actions: [...actions],
  };
}

type SurfaceComposition = {
  kind: "graph";
  primitives: MicroPrimitive[];
  incremental: boolean;
};

// `composition` is currently only applied to the primary graph widget inside a surface.
function buildSurfaceNode(
  domain: DomainId,
  intent: DomainIntent,
  composition?: SurfaceComposition,
): React.ReactNode {
  if (domain === "sales") {
    const sales = fetchSalesData();
    if (intent === "explain") {
      const delta = (sales.revenue.values.at(-1) ?? 0) - (sales.revenue.values[0] ?? 0);
      const direction = delta >= 0 ? "up" : "down";
      return (
        <DomainSurfaceFrame domain={domain} intent={intent} title="Sales summary">
          <Summary
            title="What changed"
            bullets={[
              `Revenue is ${direction} ${Math.abs(delta).toLocaleString()} over the period.`,
              "NA continues to lead; APAC is growing steadily.",
              "Enterprise conversions are the biggest driver of variance.",
            ]}
          />
        </DomainSurfaceFrame>
      );
    }

    return (
      <DomainSurfaceFrame domain={domain} intent={intent} title="Sales performance">
        <div className="space-y-3">
          {composition?.kind === "graph" ? (
            <ComposableGraph
              title="Revenue"
              variant="solid"
              size="sm"
              incremental={composition.incremental}
              microPrimitives={composition.primitives}
              data={{
                type: "line",
                labels: sales.revenue.labels,
                datasets: [
                  {
                    label: "Revenue",
                    data: sales.revenue.values,
                    color: "hsl(160, 82%, 47%)",
                  },
                ],
              }}
            />
          ) : (
            <Graph
              title="Revenue"
              variant="solid"
              size="sm"
              showLegend={false}
              data={{
                type: "line",
                labels: sales.revenue.labels,
                datasets: [
                  {
                    label: "Revenue",
                    data: sales.revenue.values,
                    color: "hsl(160, 82%, 47%)",
                  },
                ],
              }}
            />
          )}
          <Table
            title="By region"
            columns={[
              { key: "region", label: "Region" },
              { key: "revenue", label: "Revenue" },
            ]}
            rows={sales.byRegion.map((r) => ({
              region: r.region,
              revenue: r.revenue.toLocaleString(),
            }))}
          />
        </div>
      </DomainSurfaceFrame>
    );
  }

  if (domain === "infra") {
    const infra = fetchInfraData();
    if (intent === "explain") {
      const last = infra.errorRate.values.at(-1) ?? 0;
      const peak = Math.max(...infra.errorRate.values);
      return (
        <DomainSurfaceFrame domain={domain} intent={intent} title="Infra explanation">
          <Summary
            title="Likely cause"
            bullets={[
              `Error rate peaked at ${peak.toFixed(2)}% and is now ${last.toFixed(2)}%.`,
              "Logs show elevated 502s consistent with an upstream dependency issue.",
              "Prioritize API and DB retry pressure if alerts persist.",
            ]}
          />
        </DomainSurfaceFrame>
      );
    }

    return (
      <DomainSurfaceFrame domain={domain} intent={intent} title="Infra health">
        <div className="space-y-3">
          {composition?.kind === "graph" ? (
            <ComposableGraph
              title="Error rate (%)"
              variant="solid"
              size="sm"
              incremental={composition.incremental}
              microPrimitives={composition.primitives}
              data={{
                type: "line",
                labels: infra.errorRate.labels,
                datasets: [
                  {
                    label: "Error rate",
                    data: infra.errorRate.values,
                    color: "hsl(340, 82%, 66%)",
                  },
                ],
              }}
            />
          ) : (
            <Graph
              title="Error rate (%)"
              variant="solid"
              size="sm"
              showLegend={false}
              data={{
                type: "line",
                labels: infra.errorRate.labels,
                datasets: [
                  {
                    label: "Error rate",
                    data: infra.errorRate.values,
                    color: "hsl(340, 82%, 66%)",
                  },
                ],
              }}
            />
          )}
          <AlertList title="Alerts" alerts={infra.alerts} />
          <LogViewer title="Recent logs" lines={infra.logs.slice(-16)} />
        </div>
      </DomainSurfaceFrame>
    );
  }

  if (domain === "dev") {
    const dev = fetchDevData();
    return (
      <DomainSurfaceFrame domain={domain} intent={intent} title="Dev pipelines">
        <PipelineStatus title="Recent runs" pipelines={dev.pipelines} />
      </DomainSurfaceFrame>
    );
  }

  if (domain === "marketing") {
    const marketing = fetchMarketingData();
    if (intent === "explain") {
      const peak = Math.max(...marketing.ctr.values);
      return (
        <DomainSurfaceFrame domain={domain} intent={intent} title="Marketing">
          <Summary
            title="CTR explanation"
            bullets={[
              `CTR peaked at ${peak.toFixed(2)}%.`,
              "Top campaigns are driving the majority of engagement.",
              "Consider shifting spend toward the highest-CTR segments.",
            ]}
          />
        </DomainSurfaceFrame>
      );
    }

    return (
      <DomainSurfaceFrame domain={domain} intent={intent} title="Marketing performance">
        <div className="space-y-3">
          {composition?.kind === "graph" ? (
            <ComposableGraph
              title="CTR (%)"
              variant="solid"
              size="sm"
              incremental={composition.incremental}
              microPrimitives={composition.primitives}
              data={{
                type: "line",
                labels: marketing.ctr.labels,
                datasets: [
                  {
                    label: "CTR",
                    data: marketing.ctr.values,
                    color: "hsl(220, 100%, 62%)",
                  },
                ],
              }}
            />
          ) : (
            <Graph
              title="CTR (%)"
              variant="solid"
              size="sm"
              showLegend={false}
              data={{
                type: "line",
                labels: marketing.ctr.labels,
                datasets: [
                  {
                    label: "CTR",
                    data: marketing.ctr.values,
                    color: "hsl(220, 100%, 62%)",
                  },
                ],
              }}
            />
          )}
          <Table
            title="Top campaigns"
            columns={[
              { key: "campaign", label: "Campaign" },
              { key: "ctr", label: "CTR" },
              { key: "spend", label: "Spend" },
            ]}
            rows={marketing.topCampaigns.map((c) => ({
              campaign: c.campaign,
              ctr: `${c.ctr.toFixed(2)}%`,
              spend: `$${c.spend.toLocaleString()}`,
            }))}
          />
        </div>
      </DomainSurfaceFrame>
    );
  }

  const legal = fetchLegalData();
  return (
    <DomainSurfaceFrame domain={domain} intent={intent} title="Legal overview">
      <Summary title="Notes" bullets={legal.summary} />
    </DomainSurfaceFrame>
  );
}

export function GestureIntentOrchestrator() {
  // Contract: gestures only emit low-entropy signals. This orchestrator is the
  // only place that may translate confirmed intent into `tambo:showComponent`.
  const { gestureSignal, clearGestureSignal, handPosition } = useSensing();
  const interactionContext = useInteractionContext();
  const { setActiveDomains, pushRecentAction } = useInteractionContextActions();

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

  const dismissCommandSurface = React.useCallback(() => {
    setCommandOpen(false);
    setCommandAnchor(null);
    setCommandOptions([]);
    setCommandSelectedIndex(0);
    lastCommandActivityAtRef.current = null;
  }, []);

  const dismissCompositionSurface = React.useCallback(() => {
    setCompositionOpen(false);
    setCompositionAnchor(null);
    setCompositionTarget(null);
    setCompositionOptions([]);
    setCompositionSelectedIndex(0);
    lastCommandActivityAtRef.current = null;
  }, []);

  const dismissAllTransientOverlays = React.useCallback(() => {
    dismissCompositionSurface();
    dismissCommandSurface();
  }, [dismissCommandSurface, dismissCompositionSurface]);

  const dismissTransientOverlays = React.useCallback(() => {
    if (compositionOpen) {
      dismissAllTransientOverlays();
      return;
    }
    dismissCommandSurface();
  }, [compositionOpen, dismissAllTransientOverlays, dismissCommandSurface]);

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

      const options = buildCommandOptions(
        interactionContext,
        primaryDomain,
        primaryIntent,
      );

      setCommandAnchor(anchor);
      setCommandOptions(options);
      setCommandSelectedIndex(0);
      setCommandOpen(true);
      lastCommandActivityAtRef.current = performance.now();
      pushRecentAction("command_surface:open");
    },
    [handPosition, interactionContext, pushRecentAction],
  );

  const confirmSelectedOption = React.useCallback(() => {
    const selected = commandOptions[commandSelectedIndex];
    if (!selected) {
      dismissCommandSurface();
      return;
    }

    const compositions = getMicroCompositions(selected.domain, selected.intent);
    if (compositions && compositions.length > 0) {
      setCommandOpen(false);
      setCompositionOpen(true);
      setCompositionAnchor(commandAnchor);
      setCompositionTarget({ domain: selected.domain, intent: selected.intent });
      setCompositionOptions(compositions);
      setCompositionSelectedIndex(0);
      lastCommandActivityAtRef.current = performance.now();
      pushRecentAction(`compose:${selected.domain}:${selected.intent}`);
      return;
    }

    surfaceIdRef.current += 1;
    const surfaceId = `surface-${surfaceIdRef.current}-${Date.now()}`;
    const meta = buildSurfaceMeta(selected.domain, selected.intent);
    const node = buildSurfaceNode(selected.domain, selected.intent);

    emitTamboShowComponent({
      messageId: surfaceId,
      component: node,
      clientX: commandAnchor?.x,
      clientY: commandAnchor?.y,
      surfaceMeta: meta,
    });

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
  ]);

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

    surfaceIdRef.current += 1;
    const surfaceId = `surface-${surfaceIdRef.current}-${Date.now()}`;
    const meta = buildSurfaceMeta(compositionTarget.domain, compositionTarget.intent);
    const node = buildSurfaceNode(compositionTarget.domain, compositionTarget.intent, {
      kind: "graph",
      primitives: selected.primitives,
      incremental: selected.incremental ?? false,
    });

    emitTamboShowComponent({
      messageId: surfaceId,
      component: node,
      clientX: compositionAnchor?.x,
      clientY: compositionAnchor?.y,
      surfaceMeta: meta,
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
  ]);

  const backToCommandSurface = React.useCallback(() => {
    setCompositionOpen(false);
    setCompositionAnchor(null);
    setCompositionTarget(null);
    setCompositionOptions([]);
    setCompositionSelectedIndex(0);
    setCommandOpen(true);
    lastCommandActivityAtRef.current = performance.now();
  }, []);

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
        dismissTransientOverlays();
      }
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [commandOpen, compositionOpen, dismissTransientOverlays]);

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
      clearGestureSignal();
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
    compositionOpen,
    compositionOptions.length,
    confirmSelectedComposition,
    dismissAllTransientOverlays,
    dismissCommandSurface,
    gestureSignal,
    openCommandSurface,
  ]);

  return (
    <>
      <CommandSurfaceOverlay
        open={commandOpen}
        anchor={commandAnchor}
        options={commandOptions}
        selectedIndex={commandSelectedIndex}
        onSelectIndex={(index) => {
          setCommandSelectedIndex(index);
          lastCommandActivityAtRef.current = performance.now();
        }}
        onConfirm={confirmSelectedOption}
        onDismiss={dismissCommandSurface}
      />
      {compositionTarget && (
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
      )}
    </>
  );
}
