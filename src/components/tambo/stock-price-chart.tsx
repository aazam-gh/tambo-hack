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

function simpleMovingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  let runningSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    runningSum += values[i]!;
    if (i >= windowSize) {
      runningSum -= values[i - windowSize]!;
    }
    const count = Math.min(i + 1, windowSize);
    result.push(runningSum / count);
  }
  return result;
}

function buildSeriesData(candles: FinnhubCandle[]): {
  labels: string[];
  close: number[];
} {
  const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
  return {
    labels: sorted.map((candle) => formatCandleLabel(candle.timestamp)),
    close: sorted.map((candle) => candle.close),
  };
}

export const stockPriceChartSchema = z.object({
  symbol: z
    .string()
    .describe("The stock symbol (e.g. AAPL) to chart using Finnhub candles"),
  rangeDays: z
    .number()
    .int()
    .min(7)
    .max(365)
    .optional()
    .describe("Number of days of price history to fetch (default: 180)"),
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

export type StockPriceChartProps = z.infer<typeof stockPriceChartSchema>;

export const StockPriceChart = React.forwardRef<
  HTMLDivElement,
  StockPriceChartProps
>(({ symbol, rangeDays = 365, variant = "solid", size = "default", className }, ref) => {
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
        const sma20 = simpleMovingAverage(series.close, 20);
        const sma50 = simpleMovingAverage(series.close, 50);

        setState({
          status: "ready",
          graphData: {
            type: "line",
            labels: series.labels,
            datasets: [
              {
                label: "Close",
                data: series.close,
                color: "hsl(220, 100%, 62%)",
              },
              {
                label: "SMA 20",
                data: sma20,
                color: "hsl(160, 82%, 47%)",
              },
              {
                label: "SMA 50",
                data: sma50,
                color: "hsl(32, 100%, 62%)",
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
            <span className="text-sm">Loading {symbol} candles…</span>
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
      title={`${symbol} price`}
      variant={variant}
      size={size}
      incremental={false}
      microPrimitives={["Axis", "DataLine", "FilterControl", "Tooltip", "Legend"]}
      data={state.graphData}
      className={className}
    />
  );
});

StockPriceChart.displayName = "StockPriceChart";
