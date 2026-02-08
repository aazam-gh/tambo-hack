import { DomainSurfaceFrame } from "@/components/interactive-canvas/DomainSurfaceFrame";
import { AlertList } from "@/components/tambo/alert-list";
import { ComposableGraph } from "@/components/tambo/composable-graph";
import { Graph } from "@/components/tambo/graph";
import { LogViewer } from "@/components/tambo/log-viewer";
import { PipelineStatus } from "@/components/tambo/pipeline-status";
import { Summary } from "@/components/tambo/summary";
import { Table } from "@/components/tambo/table";
import { Domains } from "@/lib/domains";
import { normalizeMicroPrimitives, type MicroPrimitive } from "@/lib/micro-primitives";
import { useSurfaceManager, useSurfaceManagerActions } from "@/lib/surface-manager";
import type { SurfaceId, SurfaceMeta } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import {
  fetchDevData,
  fetchInfraData,
  fetchLegalData,
  fetchMarketingData,
  fetchSalesData,
} from "@/services/domain-data";

function queryNumber(query: Record<string, unknown>, key: string): number | undefined {
  const value = query[key];
  return typeof value === "number" ? value : undefined;
}

function queryString<Values extends readonly string[]>(
  query: Record<string, unknown>,
  key: string,
  allowed: Values,
): Values[number] | undefined {
  const value = query[key];
  if (typeof value !== "string") {
    return undefined;
  }
  return (allowed as readonly string[]).includes(value) ? (value as Values[number]) : undefined;
}

function queryBoolean(query: Record<string, unknown>, key: string): boolean | undefined {
  const value = query[key];
  return typeof value === "boolean" ? value : undefined;
}

const MICRO_PRIMITIVES: MicroPrimitive[] = [
  "Axis",
  "DataLine",
  "Legend",
  "FilterControl",
  "Tooltip",
];
const MICRO_PRIMITIVE_SET = new Set<string>(MICRO_PRIMITIVES);

function queryMicroPrimitives(query: Record<string, unknown>): MicroPrimitive[] | null {
  const value = query.microPrimitives;
  if (!Array.isArray(value)) {
    return null;
  }

  const filtered = value.filter(
    (entry): entry is MicroPrimitive =>
      typeof entry === "string" && MICRO_PRIMITIVE_SET.has(entry),
  );
  const normalized = normalizeMicroPrimitives(filtered);
  return normalized.length > 0 ? normalized : null;
}

function cycleRangeDays(current: number): number {
  if (current <= 7) return 14;
  if (current <= 14) return 30;
  return 7;
}

function RangeButton({
  value,
  onClick,
}: {
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border/50 bg-background/40 px-2 py-1 text-[11px]",
        "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
      )}
    >
      Range: {value}d
    </button>
  );
}

function HighlightBadge({ sources }: { sources: string[] }) {
  const label = sources.length === 1 ? "Highlighted" : `Highlighted (${sources.length})`;

  return (
    <div className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-200">
      {label}
    </div>
  );
}

export function SurfaceRenderer({
  surfaceId,
  initialMeta,
}: {
  surfaceId: SurfaceId;
  initialMeta?: SurfaceMeta;
}) {
  const { surfaces, highlightSourcesBySurface } = useSurfaceManager();
  const { updateSurfaceQuery } = useSurfaceManagerActions();
  const meta = surfaces[surfaceId] ?? initialMeta;

  const highlightSources = highlightSourcesBySurface[surfaceId] ?? [];

  if (!meta) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        Surface unavailable.
      </div>
    );
  }

  const rangeDays = queryNumber(meta.query, "rangeDays") ?? 14;
  const onCycleRange = () =>
    updateSurfaceQuery(surfaceId, { rangeDays: cycleRangeDays(rangeDays) });

  const baseToolbar = (
    <div className="flex items-center gap-2">
      {highlightSources.length > 0 ? (
        <HighlightBadge sources={highlightSources} />
      ) : null}
      <RangeButton value={rangeDays} onClick={onCycleRange} />
    </div>
  );

  if (meta.domain === "sales") {
    const region = queryString(meta.query, "region", ["na", "emea", "apac"] as const);
    const plan = queryString(meta.query, "plan", ["starter", "pro", "enterprise"] as const);
    const sales = fetchSalesData({ rangeDays, region, plan });
    const delta = (sales.revenue.values.at(-1) ?? 0) - (sales.revenue.values[0] ?? 0);
    const direction = delta >= 0 ? "up" : "down";
    const microPrimitives = queryMicroPrimitives(meta.query);
    const microIncremental = queryBoolean(meta.query, "microIncremental") ?? true;

    if (meta.intent === "explain") {
      return (
        <DomainSurfaceFrame
          domain={meta.domain}
          intent={meta.intent}
          title="Sales summary"
          toolbar={baseToolbar}
        >
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
      <DomainSurfaceFrame
        domain={meta.domain}
        intent={meta.intent}
        title="Sales performance"
        toolbar={baseToolbar}
      >
        <div className="space-y-3">
          {microPrimitives ? (
            <ComposableGraph
              title="Revenue"
              variant="solid"
              size="sm"
              incremental={microIncremental}
              microPrimitives={microPrimitives}
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

  if (meta.domain === "infra") {
    const service = queryString(meta.query, "service", ["api", "worker", "db"] as const);
    const infra = fetchInfraData({ rangeDays, service });
    const microPrimitives = queryMicroPrimitives(meta.query);
    const microIncremental = queryBoolean(meta.query, "microIncremental") ?? true;

    if (meta.intent === "explain") {
      const last = infra.errorRate.values.at(-1) ?? 0;
      const peak = Math.max(...infra.errorRate.values);
      return (
        <DomainSurfaceFrame
          domain={meta.domain}
          intent={meta.intent}
          title="Infra explanation"
          toolbar={baseToolbar}
        >
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

    const serviceButtons = ("api,worker,db".split(",") as Array<
      NonNullable<typeof service>
    >).map((value) => {
      const selected = value === service;
      return (
        <button
          key={value}
          type="button"
          onClick={() => updateSurfaceQuery(surfaceId, { service: value })}
          className={cn(
            "rounded-lg border px-2 py-1 text-[11px]",
            selected
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
              : "border-border/50 bg-background/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
          )}
        >
          {value}
        </button>
      );
    });

    const toolbar = (
      <div className="flex items-center gap-2">
        {highlightSources.length > 0 ? (
          <HighlightBadge sources={highlightSources} />
        ) : null}
        <div className="flex items-center gap-1">{serviceButtons}</div>
        <RangeButton value={rangeDays} onClick={onCycleRange} />
      </div>
    );

    if (meta.intent === "filter") {
      return (
        <DomainSurfaceFrame
          domain={meta.domain}
          intent={meta.intent}
          title="Infra logs"
          toolbar={toolbar}
        >
          <LogViewer title="Recent logs" lines={infra.logs} />
        </DomainSurfaceFrame>
      );
    }

    return (
      <DomainSurfaceFrame
        domain={meta.domain}
        intent={meta.intent}
        title="Infra health"
        toolbar={toolbar}
      >
        <div className="space-y-3">
          {microPrimitives ? (
            <ComposableGraph
              title="Error rate (%)"
              variant="solid"
              size="sm"
              incremental={microIncremental}
              microPrimitives={microPrimitives}
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

  if (meta.domain === "dev") {
    const pipeline = queryString(
      meta.query,
      "pipeline",
      ["main", "release", "hotfix"] as const,
    );
    const dev = fetchDevData({ pipeline });

    return (
      <DomainSurfaceFrame
        domain={meta.domain}
        intent={meta.intent}
        title="Dev pipelines"
        toolbar={baseToolbar}
      >
        <PipelineStatus title="Recent runs" pipelines={dev.pipelines} />
      </DomainSurfaceFrame>
    );
  }

  if (meta.domain === "marketing") {
    const channel = queryString(
      meta.query,
      "channel",
      ["paid", "organic", "email"] as const,
    );
    const marketing = fetchMarketingData({ rangeDays, channel });

    const microPrimitives = queryMicroPrimitives(meta.query);
    const microIncremental = queryBoolean(meta.query, "microIncremental") ?? true;

    const graphNode = microPrimitives ? (
      <ComposableGraph
        title="CTR (%)"
        variant="solid"
        size="sm"
        incremental={microIncremental}
        microPrimitives={microPrimitives}
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
    );

    const wrappedGraph = (
      <div
        className={cn(
          highlightSources.length > 0 ? "rounded-lg ring-2 ring-fuchsia-500/40" : null,
        )}
      >
        {graphNode}
      </div>
    );

    if (meta.intent === "explain") {
      const peak = Math.max(...marketing.ctr.values);
      return (
        <DomainSurfaceFrame
          domain={meta.domain}
          intent={meta.intent}
          title="Marketing"
          toolbar={baseToolbar}
        >
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
      <DomainSurfaceFrame
        domain={meta.domain}
        intent={meta.intent}
        title="Marketing performance"
        toolbar={baseToolbar}
      >
        <div className="space-y-3">
          {highlightSources.length > 0 ? (
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-2 text-xs text-fuchsia-100">
              Highlighted due to linked surface.
            </div>
          ) : null}
          {wrappedGraph}
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

  const topic = queryString(
    meta.query,
    "topic",
    ["privacy", "contracts", "compliance"] as const,
  );
  const legal = fetchLegalData({ topic });
  const legalTitle = Domains.legal.label;
  const title = `${legalTitle} overview`;
  return (
    <DomainSurfaceFrame
      domain={meta.domain}
      intent={meta.intent}
      title={title}
      toolbar={baseToolbar}
    >
      <Summary title="Notes" bullets={legal.summary} />
    </DomainSurfaceFrame>
  );
}
