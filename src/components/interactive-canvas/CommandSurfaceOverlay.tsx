import * as React from "react";

import { Domains } from "@/lib/domains";
import type { CommandOption } from "@/lib/command-surface";
import { cn } from "@/lib/utils";

export type CommandSurfaceOverlayProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  options: CommandOption[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function CommandSurfaceOverlay({
  open,
  anchor,
  options,
  selectedIndex,
  onSelectIndex,
  onConfirm,
  onDismiss,
}: CommandSurfaceOverlayProps) {
  if (!open || !anchor) {
    return null;
  }

  const positionStyle: React.CSSProperties = {
    left: anchor.x + 18,
    top: anchor.y + 18,
  };

  return (
    <div
      className={cn(
        "pointer-events-auto absolute z-30 w-[320px] rounded-2xl border border-border/60",
        "bg-card/80 p-3 text-sm text-foreground shadow-xl shadow-black/10 backdrop-blur",
        "dark:shadow-black/30",
      )}
      style={positionStyle}
      role="dialog"
      aria-label="Command surface"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Command surface
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-1">
        {options.map((opt, idx) => {
          const domain = Domains[opt.domain];
          const Icon = domain.icon;
          const selected = idx === selectedIndex;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left",
                selected
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-border/40 bg-background/40 hover:bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                  selected
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">
                  {domain.label} • {opt.intent}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Peace sign: cycle • Thumbs up: confirm
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300 hover:bg-emerald-500/15"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
