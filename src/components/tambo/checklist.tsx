import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import * as React from "react";
import { z } from "zod/v3";

export const checklistItemSchema = z.object({
  text: z.string().describe("Checklist item text"),
  checked: z
    .boolean()
    .optional()
    .describe("Whether the item is checked (default: false)"),
});

export const checklistSchema = z.object({
  title: z.string().describe("Title for the checklist"),
  items: z
    .array(checklistItemSchema)
    .min(1)
    .describe("Checklist items"),
  className: z
    .string()
    .optional()
    .describe("Additional CSS classes for styling"),
});

export type ChecklistProps = z.infer<typeof checklistSchema>;

export const Checklist = React.forwardRef<HTMLDivElement, ChecklistProps>(
  ({ title, items, className }, ref) => {
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
          {items.map((item, idx) => {
            const isChecked = Boolean(item.checked);

            return (
              <div
                key={`${idx}-${item.text}`}
                className={cn(
                  "flex items-start gap-2 rounded-xl px-2 py-1.5",
                  isChecked ? "bg-emerald-500/10" : "bg-transparent",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 grid h-5 w-5 place-items-center rounded-full border",
                    isChecked
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {isChecked ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={cn(
                    "text-sm leading-5",
                    isChecked ? "text-foreground/70 line-through" : "text-foreground",
                  )}
                >
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

Checklist.displayName = "Checklist";
