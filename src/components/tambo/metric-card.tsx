import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import * as React from "react";
import { z } from "zod/v3";

type MetricTone = "neutral" | "positive" | "negative";

const toneStyles: Record<MetricTone, string> = {
  neutral: "border-border/60 bg-card/70",
  positive: "border-emerald-500/40 bg-emerald-500/10",
  negative: "border-rose-500/40 bg-rose-500/10",
};

export const metricCardSchema = z.object({
  label: z.string().describe("Label shown above the metric value"),
  value: z
    .union([z.number(), z.string()])
    .describe("Main value shown in the card"),
  unit: z.string().optional().describe("Optional unit shown next to the value"),
  change: z
    .number()
    .optional()
    .describe("Optional delta (positive/negative) shown as a trend"),
  tone: z
    .enum(["neutral", "positive", "negative"])
    .optional()
    .describe("Visual tone for the card"),
  className: z
    .string()
    .optional()
    .describe("Additional CSS classes for styling"),
});

export type MetricCardProps = z.infer<typeof metricCardSchema>;

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, unit, change, tone = "neutral", className, ...props }, ref) => {
    const trendTone: MetricTone =
      typeof change === "number" ? (change >= 0 ? "positive" : "negative") : tone;

    const TrendIcon = change && change < 0 ? ArrowDownRight : ArrowUpRight;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border p-4 text-foreground shadow-sm backdrop-blur",
          toneStyles[tone],
          className,
        )}
        {...props}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <div className="text-3xl font-semibold leading-none tracking-tight">
            {value}
          </div>
          {unit && (
            <div className="pb-0.5 text-sm text-muted-foreground">{unit}</div>
          )}
        </div>
        {typeof change === "number" && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
              toneStyles[trendTone],
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            <span className="font-medium">
              {change >= 0 ? "+" : ""}
              {change}
            </span>
          </div>
        )}
      </div>
    );
  },
);

MetricCard.displayName = "MetricCard";
