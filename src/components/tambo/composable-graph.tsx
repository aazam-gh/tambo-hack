import { cn } from "@/lib/utils";
import * as React from "react";
import * as RechartsCore from "recharts";
import { z } from "zod/v3";

import {
  normalizeMicroPrimitives,
  microPrimitiveSchema,
  type MicroPrimitive,
} from "@/lib/micro-primitives";
import { graphDataSchema, graphVariants, type GraphDataType } from "./graph";

type GraphVariant = "default" | "solid" | "bordered";
type GraphSize = "default" | "sm" | "lg";

interface GraphErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

class GraphErrorBoundary extends React.Component<
  GraphErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: GraphErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error rendering chart:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            "p-4 flex h-full items-center justify-center",
            this.props.className,
          )}
        >
          <div className="text-destructive text-center">
            <p className="font-medium">Error loading chart</p>
            <p className="text-sm mt-1">
              An error occurred while rendering. Please try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const composableGraphSchema = z.object({
  data: graphDataSchema.describe(
    "Data object containing chart configuration and values",
  ),
  title: z.string().describe("Title for the chart"),
  microPrimitives: z
    .array(microPrimitiveSchema)
    .describe(
      "Micro chart primitives to render. Example: [Axis, DataLine, Legend, Tooltip].",
    ),
  incremental: z
    .boolean()
    .optional()
    .describe(
      "If true, micro-primitives will reveal in stages instead of appearing all at once.",
    ),
  variant: z
    .enum(["default", "solid", "bordered"])
    .optional()
    .describe("Visual style variant of the graph"),
  size: z
    .enum(["default", "sm", "lg"])
    .optional()
    .describe("Size of the graph"),
  className: z
    .string()
    .optional()
    .describe("Additional CSS classes for styling"),
});

export type ComposableGraphProps = z.infer<typeof composableGraphSchema>;

const defaultColors = [
  "hsl(220, 100%, 62%)",
  "hsl(160, 82%, 47%)",
  "hsl(32, 100%, 62%)",
  "hsl(340, 82%, 66%)",
];

const MICRO_PRIMITIVE_REVEAL_ORDER: MicroPrimitive[] = [
  "Axis",
  "DataLine",
  "FilterControl",
  "Tooltip",
  "Legend",
];

function useIncrementalMicroPrimitives(
  primitives: MicroPrimitive[],
  incremental: boolean,
): Set<MicroPrimitive> {
  const ordered = React.useMemo(
    () => {
      const baseline = MICRO_PRIMITIVE_REVEAL_ORDER.filter((primitive) =>
        primitives.includes(primitive),
      );
      const extras = primitives.filter(
        (primitive) => !MICRO_PRIMITIVE_REVEAL_ORDER.includes(primitive),
      );
      return [...baseline, ...extras];
    },
    [primitives],
  );

  const [visibleCount, setVisibleCount] = React.useState(
    incremental ? 0 : ordered.length,
  );

  React.useEffect(() => {
    if (!incremental) {
      setVisibleCount(ordered.length);
      return;
    }

    setVisibleCount(0);
    if (ordered.length === 0 || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const step = () => {
      if (cancelled) {
        return;
      }
      setVisibleCount((prev) => {
        if (prev >= ordered.length) {
          return prev;
        }
        return prev + 1;
      });
    };

    const timeouts = ordered.map((_, index) =>
      window.setTimeout(step, 140 + index * 170),
    );

    return () => {
      cancelled = true;
      for (const id of timeouts) {
        window.clearTimeout(id);
      }
    };
  }, [incremental, ordered]);

  return React.useMemo(
    () => new Set(ordered.slice(0, Math.min(visibleCount, ordered.length))),
    [ordered, visibleCount],
  );
}

function buildRechartsData(labels: string[], datasets: GraphDataType["datasets"]) {
  if (labels.length === 0 || datasets.length === 0) {
    return [];
  }

  const maxDataPoints = Math.min(
    labels.length,
    Math.min(...datasets.map((d) => d.data.length)),
  );

  return labels.slice(0, maxDataPoints).map((label, index) => ({
    name: label,
    ...Object.fromEntries(
      datasets.map((dataset) => [dataset.label, dataset.data[index] ?? 0]),
    ),
  }));
}

function FilterControl({
  datasets,
  activeLabels,
  onToggle,
  ranges,
  selectedRange,
  onSelectRange,
}: {
  datasets: GraphDataType["datasets"];
  activeLabels: Set<string>;
  onToggle: (label: string) => void;
  ranges: number[];
  selectedRange: number | null;
  onSelectRange: (range: number | null) => void;
}) {
  return (
    <div className="mb-3 space-y-2">
      {ranges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectRange(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              selectedRange === null
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                : "border-border/50 bg-background/30 text-muted-foreground hover:bg-muted/30",
            )}
          >
            All
          </button>
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onSelectRange(range)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                selectedRange === range
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-border/50 bg-background/30 text-muted-foreground hover:bg-muted/30",
              )}
            >
              Last {range}
            </button>
          ))}
        </div>
      )}

      {datasets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {datasets.map((dataset) => {
            const active = activeLabels.has(dataset.label);
            return (
              <button
                key={dataset.label}
                type="button"
                onClick={() => onToggle(dataset.label)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-border/50 bg-background/30 text-muted-foreground hover:bg-muted/30",
                )}
              >
                {dataset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const ComposableGraph = React.forwardRef<HTMLDivElement, ComposableGraphProps>(
  (
    {
      className,
      variant,
      size,
      data,
      title,
      microPrimitives,
      incremental = false,
    },
    ref,
  ) => {
    if (!data) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
        >
          <div className="p-4 h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-1 h-4">
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.1s]"></span>
              </div>
              <span className="text-sm">Awaiting data...</span>
            </div>
          </div>
        </div>
      );
    }

    const hasValidStructure =
      data.type &&
      data.labels &&
      data.datasets &&
      Array.isArray(data.labels) &&
      Array.isArray(data.datasets) &&
      data.labels.length > 0 &&
      data.datasets.length > 0;

    if (!hasValidStructure) {
      return (
        <div
          ref={ref}
          className={cn(graphVariants({ variant, size }), className)}
        >
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">Building chart...</p>
            </div>
          </div>
        </div>
      );
    }

    const normalizedPrimitives = normalizeMicroPrimitives(microPrimitives);
    const visiblePrimitives = useIncrementalMicroPrimitives(
      normalizedPrimitives,
      incremental,
    );

    const showFilterControl = visiblePrimitives.has("FilterControl");
    const showAxis = visiblePrimitives.has("Axis");
    const showDataLine = visiblePrimitives.has("DataLine");
    const showTooltip = visiblePrimitives.has("Tooltip");
    const showLegend = visiblePrimitives.has("Legend");

    const validDatasets = data.datasets.filter(
      (dataset) =>
        dataset.label &&
        dataset.data &&
        Array.isArray(dataset.data) &&
        dataset.data.length > 0,
    );

    const [activeLabels, setActiveLabels] = React.useState<Set<string>>(
      () => new Set(validDatasets.map((d) => d.label)),
    );

    const datasetLabelsKey = React.useMemo(
      () => JSON.stringify(validDatasets.map((d) => d.label)),
      [validDatasets],
    );

    const availableRanges = React.useMemo(() => {
      const length = data.labels.length;
      return [7, 14, 30].filter((range) => range < length);
    }, [data.labels.length]);

    const [selectedRange, setSelectedRange] = React.useState<number | null>(null);

    React.useEffect(() => {
      setActiveLabels(new Set(validDatasets.map((d) => d.label)));
    }, [datasetLabelsKey]);

    const filteredDatasets = React.useMemo(() => {
      if (!showFilterControl) {
        return validDatasets;
      }
      return validDatasets.filter((dataset) => activeLabels.has(dataset.label));
    }, [activeLabels, showFilterControl, validDatasets]);

    const sliceStart =
      showFilterControl && selectedRange
        ? Math.max(0, data.labels.length - selectedRange)
        : 0;
    const slicedLabels = data.labels.slice(sliceStart);
    const slicedDatasets = React.useMemo(
      () =>
        filteredDatasets.map((dataset) => ({
          ...dataset,
          data: dataset.data.slice(sliceStart),
        })),
      [filteredDatasets, sliceStart],
    );

    const chartData = React.useMemo(() => {
      if (!showDataLine || slicedDatasets.length === 0) {
        return [];
      }
      return buildRechartsData(slicedLabels, slicedDatasets);
    }, [showDataLine, slicedDatasets, slicedLabels]);

    const renderChart = () => {
      if (!["bar", "line", "pie"].includes(data.type)) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">Unsupported chart type: {data.type}</p>
            </div>
          </div>
        );
      }

      if (!showDataLine) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">Chart primitives loading…</p>
            </div>
          </div>
        );
      }

      switch (data.type) {
        case "bar":
          return (
            <RechartsCore.BarChart data={chartData}>
              {showAxis && (
                <RechartsCore.CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
              )}
              {showAxis && (
                <RechartsCore.XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                />
              )}
              {showAxis && (
                <RechartsCore.YAxis
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                />
              )}
              {showTooltip && (
                <RechartsCore.Tooltip
                  cursor={{
                    fill: "var(--muted-foreground)",
                    fillOpacity: 0.1,
                    radius: 4,
                  }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "var(--radius)",
                    color: "var(--foreground)",
                  }}
                />
              )}
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "var(--foreground)",
                  }}
                />
              )}
              {slicedDatasets.map((dataset, index) => (
                <RechartsCore.Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={
                    dataset.color ?? defaultColors[index % defaultColors.length]
                  }
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </RechartsCore.BarChart>
          );

        case "line":
          return (
            <RechartsCore.LineChart data={chartData}>
              {showAxis && (
                <RechartsCore.CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
              )}
              {showAxis && (
                <RechartsCore.XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                />
              )}
              {showAxis && (
                <RechartsCore.YAxis
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                />
              )}
              {showTooltip && (
                <RechartsCore.Tooltip
                  cursor={{
                    stroke: "var(--muted)",
                    strokeWidth: 2,
                    strokeOpacity: 0.3,
                  }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "var(--radius)",
                    color: "var(--foreground)",
                  }}
                />
              )}
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "var(--foreground)",
                  }}
                />
              )}
              {slicedDatasets.map((dataset, index) => (
                <RechartsCore.Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={
                    dataset.color ?? defaultColors[index % defaultColors.length]
                  }
                  dot={false}
                />
              ))}
            </RechartsCore.LineChart>
          );

        case "pie": {
          const pieDataset = slicedDatasets[0];
          if (!pieDataset) {
            return (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground text-center">
                  <p className="text-sm">No valid dataset for pie chart</p>
                </div>
              </div>
            );
          }

          const maxDataPoints = Math.min(slicedLabels.length, pieDataset.data.length);

          return (
            <RechartsCore.PieChart>
              <RechartsCore.Pie
                data={pieDataset.data.slice(0, maxDataPoints).map((value, index) => ({
                  name: slicedLabels[index],
                  value,
                  fill: defaultColors[index % defaultColors.length],
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
              />
              {showTooltip && (
                <RechartsCore.Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "var(--radius)",
                    color: "var(--foreground)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{
                    color: "var(--foreground)",
                  }}
                  labelStyle={{
                    color: "var(--foreground)",
                  }}
                />
              )}
              {showLegend && (
                <RechartsCore.Legend
                  wrapperStyle={{
                    color: "var(--foreground)",
                  }}
                />
              )}
            </RechartsCore.PieChart>
          );
        }
      }
    };

    const toggleDataset = (label: string) => {
      setActiveLabels((prev) => {
        const next = new Set(prev);
        if (next.has(label)) {
          next.delete(label);
        } else {
          next.add(label);
        }
        return next;
      });
    };

    const hasSeriesSelection = !showFilterControl || slicedDatasets.length > 0;

    return (
      <div ref={ref} className={cn(graphVariants({ variant, size }), className)}>
        <GraphErrorBoundary>
          <div className="p-4 h-full">
            {title && (
              <h3 className="text-lg font-medium mb-4 text-foreground">
                {title}
              </h3>
            )}

            {showFilterControl && (
              <FilterControl
                datasets={validDatasets}
                activeLabels={activeLabels}
                onToggle={toggleDataset}
                ranges={availableRanges}
                selectedRange={selectedRange}
                onSelectRange={setSelectedRange}
              />
            )}

            <div className="w-full h-[calc(100%-2rem)]">
              {hasSeriesSelection ? (
                <RechartsCore.ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </RechartsCore.ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No series selected.
                </div>
              )}
            </div>
          </div>
        </GraphErrorBoundary>
      </div>
    );
  },
);
ComposableGraph.displayName = "ComposableGraph";
