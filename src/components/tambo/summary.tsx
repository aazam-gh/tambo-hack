import * as React from "react";
import { z } from "zod/v3";

import { cn } from "@/lib/utils";

export const summarySchema = z.object({
  title: z.string().describe("Title for the summary card"),
  bullets: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe("Bullet points to show in the summary"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type SummaryProps = z.infer<typeof summarySchema>;

export const Summary = React.forwardRef<HTMLDivElement, SummaryProps>(
  ({ title, bullets, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-foreground shadow-sm backdrop-blur",
          className,
        )}
      >
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {bullets.map((b, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

Summary.displayName = "Summary";
