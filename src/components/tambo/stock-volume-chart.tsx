import { fetchFinnhubCandles, type FinnhubCandle } from "@/services/finnhub";
import * as React from "react";
import { z } from "zod";

import { ComposableGraph } from "./composable-graph";
import { graphVariants, type GraphDataType } from "./graph";

function formatCandleLabel(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildSeriesData(candles: FinnhubCandle[]): {
  labels: string[];
  volume: number[];
} {
  const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
  return {
    labels: sorted.map((candle) => formatCandleLabel(candle.timestamp)),
    volume: sorted.map((candle) => candle.volume),
  };
}

export const stockVolumeChartSchema = z.object({
  symbol: z
    .string()
    .describe("The stock symbol (e.g. AAPL) to chart using Finnhub candles"),
  rangeDays: z
    .number()
    .int()
    .min(7)
    .max(365)
    .optional()
    .describe("Number of days of volume history to fetch (default: 180)"),
  variant: z
    .enum(["default", "solid", "bordered"])
    .optional()
    .describe("Visual style variant of the chart container"),
  size: z
    .enum(["default", "sm", "lg"])
    .optional()
    .describe("Chart height preset"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type StockVolumeChartProps = z.infer<typeof stockVolumeChartSchema>;

export const StockVolumeChart = React.forwardRef<
  HTMLDivElement,
  StockVolumeChartProps
>(({ symbol, rangeDays = 180, variant = "solid", size = "default", className }, ref) => {
  const [state, setState] = React.useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; graphData: GraphDataType }
  >({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });

      const to = Math.floor(Date.now() / 1000);
      const from = to - rangeDays * 24 * 60 * 60;

      try {
        const candles = await fetchFinnhubCandles({
          symbol,
          resolution: "D",
          from,
          to,
        });

        if (cancelled) {
          return;
        }

        if (candles.length === 0) {
          setState({
            status: "error",
            message: `No candle data returned for ${symbol}.`,
          });
          return;
        }

        const series = buildSeriesData(candles);
        setState({
          status: "ready",
          graphData: {
            type: "bar",
            labels: series.labels,
            datasets: [
              {
                label: "Volume",
                data: series.volume,
                color: "hsl(340, 82%, 66%)",
              },
            ],
          },
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: "error", message });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [rangeDays, symbol]);

  const frameClassName = graphVariants({ variant, size });

  if (state.status === "loading") {
    return (
      <div ref={ref} className={`${frameClassName} ${className ?? ""}`.trim()}>
        <div className="p-4 h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="flex items-center gap-1 h-4">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.2s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.1s]" />
            </div>
            <span className="text-sm">Loading {symbol} volume…</span>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div ref={ref} className={`${frameClassName} ${className ?? ""}`.trim()}>
        <div className="p-4 h-full flex items-center justify-center">
          <div className="text-muted-foreground text-center">
            <p className="text-sm">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComposableGraph
      ref={ref}
      title={`${symbol} volume`}
      variant={variant}
      size={size}
      incremental={false}
      microPrimitives={["Axis", "DataLine", "FilterControl", "Tooltip"]}
      data={state.graphData}
      className={className}
    />
  );
});

StockVolumeChart.displayName = "StockVolumeChart";
