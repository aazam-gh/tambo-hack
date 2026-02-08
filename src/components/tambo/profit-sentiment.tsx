import { cn } from "@/lib/utils";
import { Activity, Percent, TrendingUp } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const profitSentimentSchema = z.object({
  productName: z.string().describe("Product name"),
  data: z
    .array(
      z.object({
        year: z.number(),
        month: z.number(),
        profit: z.number().describe("Total profit"),
        profitMarginPercent: z.number().describe("Profit margin percentage"),
      }),
    )
    .describe("Monthly profit and margin data"),
});

export type ProfitSentimentProps = z.infer<typeof profitSentimentSchema>;

export const ProfitSentiment = React.forwardRef<
  HTMLDivElement,
  ProfitSentimentProps
>(({ productName, data }, ref) => {
  const latest = data[data.length - 1];
  const isHealthy = (latest?.profitMarginPercent ?? 0) >= 0;

  return (
    <div
      ref={ref}
      className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-500/10 p-2 text-orange-500">
            <Percent size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight">
              Profit sentiment
            </h3>
            <p className="text-xs text-muted-foreground">
              {productName} • Monthly margin
            </p>
          </div>
        </div>
        <div
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-tighter",
            isHealthy ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
          )}
        >
          {isHealthy ? "Healthy" : "At risk"}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Profit margin
              </span>
              <span
                className={cn(
                  "text-lg font-bold",
                  isHealthy ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {(latest?.profitMarginPercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isHealthy ? "bg-emerald-500" : "bg-rose-500",
                )}
                style={{
                  width: `${Math.min(100, Math.abs(latest?.profitMarginPercent ?? 0) * 2)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Activity size={10} />
              Monthly profit
            </div>
            <div className="text-sm font-bold">
              ${(latest?.profit ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <TrendingUp size={10} />
              Signal strength
            </div>
            <div className="text-sm font-bold">
              {Math.abs(latest?.profitMarginPercent ?? 0) > 25
                ? "Strong"
                : "Moderate"}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 border-l-2 border-primary/20 pl-3 text-[11px] leading-relaxed text-muted-foreground italic">
        Profit sentiment summarizes recent profitability trends based on the mock
        sales dataset.
      </p>
    </div>
  );
});

ProfitSentiment.displayName = "ProfitSentiment";
