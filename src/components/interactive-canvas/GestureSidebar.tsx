import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  MousePointer2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type GestureSidebarProps = {
  open: boolean;
  onToggle: () => void;
};

export function GestureSidebar({ open, onToggle }: GestureSidebarProps) {
  return (
    <aside
      className={cn(
        "relative shrink-0 border-r border-white/10 bg-zinc-950/60 backdrop-blur transition-[width] duration-200",
        open ? "w-80" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse gesture controls" : "Expand gesture controls"}
        className={cn(
          "absolute top-4 -right-3 z-10 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-zinc-950 text-white shadow",
          "hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        )}
      >
        {open ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className={cn("h-full", open ? "p-6" : "p-3")}>
        {open ? (
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-zinc-950 shadow shadow-emerald-500/20">
                  <Hand className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    Gesture Controls
                  </div>
                  <div className="text-xs text-zinc-400">
                    UI scaffold (no gesture logic yet)
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Canvas navigation
              </div>
              <div className="space-y-2 text-sm text-zinc-200">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="h-4 w-4 text-emerald-400" />
                  <span>Drag to pan</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-emerald-400" />
                  <span>Scroll to zoom</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-emerald-400" />
                  <span>Double-click to reset</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Gesture settings
              </div>

              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">Hand tracking</span>
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Hand tracking (coming soon)"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">Gesture mapping</span>
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Gesture mapping (coming soon)"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">Voice commands</span>
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Voice commands (coming soon)"
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <div className="text-xs text-zinc-500">
                  These controls are placeholders. Gesture recognition will be
                  wired up in a follow-up.
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-3 pt-12 text-zinc-400">
            <Hand className="h-5 w-5" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/60" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/30" />
            <div className="h-1 w-1 rounded-full bg-emerald-500/20" />
          </div>
        )}
      </div>
    </aside>
  );
}
