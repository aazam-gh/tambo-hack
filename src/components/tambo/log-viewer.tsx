import * as React from "react";
import { z } from "zod/v3";

import { cn } from "@/lib/utils";

const logLineSchema = z.object({
  at: z.string().describe("ISO timestamp"),
  level: z.enum(["info", "warn", "error"]).describe("Log severity"),
  message: z.string().describe("Log message"),
});

export const logViewerSchema = z.object({
  title: z.string().describe("Title shown above the log viewer"),
  lines: z.array(logLineSchema).min(1).max(50).describe("Log lines"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type LogViewerProps = z.infer<typeof logViewerSchema>;

export const LogViewer = React.forwardRef<HTMLDivElement, LogViewerProps>(
  ({ title, lines, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-foreground shadow-sm backdrop-blur",
          className,
        )}
      >
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-border/50 bg-background/40 p-3 font-mono text-[11px] leading-relaxed">
          {lines.map((line) => (
            <div key={`${line.at}-${line.message}`} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">
                {new Date(line.at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={cn(
                  "shrink-0 font-semibold",
                  line.level === "error"
                    ? "text-rose-400"
                    : line.level === "warn"
                      ? "text-amber-300"
                      : "text-emerald-300",
                )}
              >
                {line.level.toUpperCase()}
              </span>
              <span className="text-muted-foreground">{line.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

LogViewer.displayName = "LogViewer";
