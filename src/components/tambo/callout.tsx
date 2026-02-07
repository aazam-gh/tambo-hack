import { cn } from "@/lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import * as React from "react";
import { z } from "zod/v3";

type CalloutTone = "info" | "success" | "warning" | "error";

const toneStyles: Record<CalloutTone, string> = {
  info: "border-sky-500/30 bg-sky-500/10",
  success: "border-emerald-500/30 bg-emerald-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  error: "border-rose-500/30 bg-rose-500/10",
};

const toneIcon: Record<CalloutTone, React.ComponentType<{ className?: string }>> =
  {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertOctagon,
  };

export const calloutSchema = z.object({
  title: z.string().describe("Title text shown at the top of the callout"),
  message: z.string().describe("Body text shown within the callout"),
  tone: z
    .enum(["info", "success", "warning", "error"])
    .optional()
    .describe("Visual tone of the callout"),
  className: z
    .string()
    .optional()
    .describe("Additional CSS classes for styling"),
});

export type CalloutProps = z.infer<typeof calloutSchema>;

export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ title, message, tone = "info", className }, ref) => {
    const Icon = toneIcon[tone];

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border px-4 py-3",
          "bg-background text-foreground",
          toneStyles[tone],
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-background/40 p-2">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-5">{title}</div>
            <div className="mt-1 text-sm text-foreground/80">{message}</div>
          </div>
        </div>
      </div>
    );
  },
);

Callout.displayName = "Callout";
