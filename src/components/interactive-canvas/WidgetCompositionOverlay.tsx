import * as React from "react";

import type { DomainId, DomainIntent } from "@/lib/domains";
import type { MicroComposition, MicroPrimitive } from "@/lib/micro-primitives";
import { cn } from "@/lib/utils";

export type WidgetCompositionOverlayProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  domain: DomainId;
  intent: DomainIntent;
  options: MicroComposition[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onConfirm: () => void;
  onBack: () => void;
  onDismiss: () => void;
};

function PrimitivePill({ primitive }: { primitive: MicroPrimitive }) {
  return (
    <span className="rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground">
      {primitive}
    </span>
  );
}

function CompositionThumbnail({ primitives }: { primitives: readonly MicroPrimitive[] }) {
  const has = (p: MicroPrimitive) => primitives.includes(p);

  return (
    <div className="relative h-14 w-full overflow-hidden rounded-xl border border-border/40 bg-muted/20">
      {has("Axis") && (
        <>
          <div className="absolute bottom-2 left-2 h-9 w-px bg-muted-foreground/40" />
          <div className="absolute bottom-2 left-2 right-2 h-px bg-muted-foreground/40" />
        </>
      )}

      {has("FilterControl") && (
        <div className="absolute left-2 top-2 flex gap-1">
          <div className="h-2 w-6 rounded-full bg-muted-foreground/25" />
          <div className="h-2 w-4 rounded-full bg-muted-foreground/25" />
          <div className="h-2 w-5 rounded-full bg-muted-foreground/25" />
        </div>
      )}

      {has("DataLine") && (
        <div className="absolute left-3 right-3 top-7 h-0.5 -rotate-6 rounded-full bg-emerald-400/70" />
      )}

      {has("Tooltip") && (
        <div className="absolute right-3 top-6 h-5 w-10 rounded-lg border border-border/50 bg-background/70" />
      )}

      {has("Legend") && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-1.5 py-1">
          <div className="h-2 w-2 rounded-sm bg-emerald-400/70" />
          <div className="h-2 w-7 rounded bg-muted-foreground/25" />
        </div>
      )}
    </div>
  );
}

function domIdForOption(optionId: string, index: number): string {
  const safeId = optionId
    .split("")
    .map((ch) => (/^[a-zA-Z0-9_-]$/.test(ch) ? ch : ch.charCodeAt(0).toString(16)))
    .join("-");

  return `composition-${index}-${safeId}`;
}

export function WidgetCompositionOverlay({
  open,
  anchor,
  domain,
  intent,
  options,
  selectedIndex,
  onSelectIndex,
  onConfirm,
  onBack,
  onDismiss,
}: WidgetCompositionOverlayProps) {
  const overlayWidth = 360;
  const overlayHeight = 320;
  const offset = 18;
  const padding = 12;

  const [positionStyle, setPositionStyle] = React.useState<
    React.CSSProperties | null
  >(() => {
    if (!open || !anchor) {
      return null;
    }

    return {
      left: anchor.x + offset,
      top: anchor.y + offset,
    };
  });

  React.useEffect(() => {
    if (!open || !anchor) {
      setPositionStyle(null);
      return;
    }

    let left = anchor.x + offset;
    let top = anchor.y + offset;

    if (typeof window !== "undefined") {
      left = Math.min(left, window.innerWidth - overlayWidth - padding);
      top = Math.min(top, window.innerHeight - overlayHeight - padding);
      left = Math.max(padding, left);
      top = Math.max(padding, top);
    }

    setPositionStyle({ left, top });
  }, [anchor, open, offset, overlayHeight, overlayWidth, padding]);

  if (!open || !anchor || !positionStyle) {
    return null;
  }

  const activeOptionId = options[selectedIndex]?.id;
  const activeOptionDomId = activeOptionId
    ? domIdForOption(activeOptionId, selectedIndex)
    : undefined;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute z-30 w-[360px] rounded-2xl border border-border/60",
        "bg-card/80 p-3 text-sm text-foreground shadow-xl shadow-black/10 backdrop-blur",
        "dark:shadow-black/30",
      )}
      style={positionStyle}
      role="dialog"
      aria-label="Widget composition"
      aria-modal="true"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compose widget
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      <div className="mb-2 text-xs text-muted-foreground">
        {domain} • {intent}
      </div>

      <div
        className="space-y-2"
        role="listbox"
        aria-label="Widget layout options"
        aria-activedescendant={activeOptionDomId}
      >
        {options.map((opt, idx) => {
          const selected = idx === selectedIndex;
          const domId = domIdForOption(opt.id, idx);
          return (
            <button
              key={opt.id}
              type="button"
              id={domId}
              role="option"
              aria-selected={selected}
              onClick={() => onSelectIndex(idx)}
              className={cn(
                "w-full rounded-2xl border p-3 text-left",
                selected
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-border/40 bg-background/40 hover:bg-muted/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{opt.label}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opt.primitives.map((primitive) => (
                      <PrimitivePill key={primitive} primitive={primitive} />
                    ))}
                  </div>
                </div>
                <div className="w-[120px] shrink-0">
                  <CompositionThumbnail primitives={opt.primitives} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>Peace sign: cycle • Thumbs up: confirm</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300 hover:bg-emerald-500/15"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
