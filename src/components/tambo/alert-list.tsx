import * as React from "react";
import { z } from "zod/v3";

import { cn } from "@/lib/utils";

const alertSchema = z.object({
  title: z.string().describe("Alert title"),
  severity: z.enum(["low", "medium", "high"]).describe("Severity level"),
});

export const alertListSchema = z.object({
  title: z.string().describe("Title shown above the alerts"),
  alerts: z.array(alertSchema).min(1).max(12).describe("Alerts"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type AlertListProps = z.infer<typeof alertListSchema>;

const severityStyles: Record<
  AlertListProps["alerts"][number]["severity"],
  string
> = {
  low: "border-border/50 bg-muted/20 text-muted-foreground",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  high: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

export const AlertList = React.forwardRef<HTMLDivElement, AlertListProps>(
  ({ title, alerts, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-foreground shadow-sm backdrop-blur",
          className,
        )}
      >
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="mt-3 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.title}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
                severityStyles[a.severity],
              )}
            >
              <div className="min-w-0 truncate">{a.title}</div>
              <div className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                {a.severity}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

AlertList.displayName = "AlertList";
