import * as React from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Trash2 } from "lucide-react";

import {
  clearLogSummaryEvents,
  formatLogSummaryTimestamp,
  useLogSummaryEvents,
  type LogSummaryEventKind,
} from "@/lib/log-summary";
import { cn } from "@/lib/utils";

function kindBadgeClass(kind: LogSummaryEventKind): string {
  switch (kind) {
    case "gesture":
      return "bg-emerald-500/15 text-emerald-300";
    case "movement":
      return "bg-sky-500/15 text-sky-300";
    case "component":
      return "bg-violet-500/15 text-violet-300";
    case "tambo_submit":
      return "bg-amber-500/15 text-amber-300";
    case "tambo_tool":
      return "bg-fuchsia-500/15 text-fuchsia-300";
    default:
      return "bg-muted/40 text-muted-foreground";
  }
}

function kindLabel(kind: LogSummaryEventKind): string {
  switch (kind) {
    case "gesture":
      return "gesture";
    case "movement":
      return "move";
    case "component":
      return "component";
    case "tambo_submit":
      return "tambo";
    case "tambo_tool":
      return "tool";
    default:
      return kind;
  }
}

export function LogSummarySidebar({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(true);
  const events = useLogSummaryEvents();

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const lastEventId = events.length > 0 ? events[events.length - 1]?.id : null;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [lastEventId, open]);

  return (
    <aside
      className={cn(
        "relative shrink-0 border-l border-border/50 bg-card/60 backdrop-blur transition-[width] duration-200",
        open ? "w-80" : "w-12",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse log summary" : "Expand log summary"}
        className={cn(
          "absolute top-4 -left-3 z-10 grid h-6 w-6 place-items-center rounded-full border border-border/50 bg-background text-foreground shadow",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        )}
      >
        {open ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className={cn("h-full", open ? "p-6" : "p-3")}>
        {open ? (
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 text-zinc-950 shadow shadow-violet-500/20">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">Log summary</div>
                  <div className="text-xs text-muted-foreground">
                    Gestures, movement, components, and Tambo calls
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => clearLogSummaryEvents()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-xs text-muted-foreground",
                  "hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                )}
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-auto rounded-2xl border border-border/50 bg-muted/10 p-3"
            >
              {events.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No events yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-border/40 bg-background/30 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              kindBadgeClass(event.kind),
                            )}
                          >
                            {kindLabel(event.kind)}
                          </span>
                          <span className="text-xs text-foreground">
                            {event.label}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {formatLogSummaryTimestamp(event.atMs)}
                        </span>
                      </div>

                      {event.detail && Object.keys(event.detail).length > 0 ? (
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/20 p-2 font-mono text-[10px] text-muted-foreground">
                          {JSON.stringify(event.detail, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ClipboardList className="h-5 w-5" />
          </div>
        )}
      </div>
    </aside>
  );
}
