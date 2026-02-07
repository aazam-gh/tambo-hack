import * as React from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { z } from "zod/v3";

import { cn } from "@/lib/utils";

const pipelineStepSchema = z.object({
  name: z.string().describe("Step name"),
  status: z
    .enum(["pending", "running", "success", "failed"])
    .describe("Step status"),
  durationSeconds: z
    .number()
    .optional()
    .describe("Optional duration in seconds"),
});

const pipelineRunSchema = z.object({
  id: z.string().describe("Run id"),
  branch: z.string().describe("Branch name"),
  status: z.enum(["running", "success", "failed"]).describe("Overall status"),
  steps: z.array(pipelineStepSchema).min(1).max(12).describe("Steps"),
});

export const pipelineStatusSchema = z.object({
  title: z.string().describe("Title shown above the pipeline list"),
  pipelines: z.array(pipelineRunSchema).min(1).max(6).describe("Pipelines"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type PipelineStatusProps = z.infer<typeof pipelineStatusSchema>;

function StatusIcon({ status }: { status: string }) {
  if (status === "success") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4 text-rose-400" />;
  }
  if (status === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-amber-300" />;
  }
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export const PipelineStatus = React.forwardRef<HTMLDivElement, PipelineStatusProps>(
  ({ title, pipelines, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-foreground shadow-sm backdrop-blur",
          className,
        )}
      >
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="mt-3 space-y-3">
          {pipelines.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border/50 bg-background/30 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.branch}</div>
                  <div className="text-xs text-muted-foreground">{p.id}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-2 py-1 text-xs text-muted-foreground">
                  <StatusIcon status={p.status} />
                  <span className="font-semibold uppercase tracking-wider">
                    {p.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {p.steps.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusIcon status={s.status} />
                      <span className="truncate text-muted-foreground">
                        {s.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-muted-foreground">
                      {typeof s.durationSeconds === "number"
                        ? `${s.durationSeconds}s`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

PipelineStatus.displayName = "PipelineStatus";
