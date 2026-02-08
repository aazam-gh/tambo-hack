import { fetchFinnhubInsiderSentiment } from "@/services/finnhub";
import * as React from "react";
import { z } from "zod";

import { ComposableGraph } from "./composable-graph";
import { graphVariants, type GraphDataType } from "./graph";

function defaultFromDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, Math.max(0, month - 1), 1);
  return date.toLocaleDateString(undefined, {
    year: "2-digit",
    month: "short",
  });
}

export const insiderSentimentChartSchema = z.object({
  symbol: z
    .string()
    .describe("The stock symbol (e.g. AAPL) to chart using Finnhub sentiment"),
  from: z
    .string()
    .optional()
    .describe(
      "Start date (YYYY-MM-DD) for insider sentiment lookup (default: last 2 years)",
    ),
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

export type InsiderSentimentChartProps = z.infer<typeof insiderSentimentChartSchema>;

export const InsiderSentimentChart = React.forwardRef<
  HTMLDivElement,
  InsiderSentimentChartProps
>(({ symbol, from, variant = "solid", size = "default", className }, ref) => {
  const [state, setState] = React.useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; graphData: GraphDataType }
  >({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ status: "loading" });

      try {
        const data = await fetchFinnhubInsiderSentiment({
          symbol,
          from: from ?? defaultFromDate(),
        });

        if (cancelled) {
          return;
        }

        if (data.length === 0) {
          setState({
            status: "error",
            message: `No insider sentiment data returned for ${symbol}.`,
          });
          return;
        }

        const labels = data.map((row) => formatMonthLabel(row.year, row.month));
        const mspr = data.map((row) => row.mspr);
        const changeThousands = data.map((row) => row.change / 1000);

        setState({
          status: "ready",
          graphData: {
            type: "line",
            labels,
            datasets: [
              {
                label: "MSPR",
                data: mspr,
                color: "hsl(32, 100%, 62%)",
              },
              {
                label: "Holdings Δ (k)",
                data: changeThousands,
                color: "hsl(220, 100%, 62%)",
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
  }, [from, symbol]);

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
            <span className="text-sm">Loading {symbol} insider sentiment…</span>
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
      title={`${symbol} insider sentiment`}
      variant={variant}
      size={size}
      incremental={false}
      microPrimitives={["Axis", "DataLine", "FilterControl", "Tooltip", "Legend"]}
      data={state.graphData}
      className={className}
    />
  );
});

InsiderSentimentChart.displayName = "InsiderSentimentChart";
