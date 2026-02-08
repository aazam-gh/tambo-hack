import { Calendar, ExternalLink, Newspaper } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const salesHighlightsSchema = z.object({
  highlights: z
    .array(
      z.object({
        id: z.string(),
        headline: z.string(),
        summary: z.string(),
        url: z.string(),
        imageUrl: z.string().optional(),
        datetimeMs: z
          .number()
          .describe("JavaScript timestamp in milliseconds (Date.now() style)"),
        source: z.string(),
      }),
    )
    .describe("List of recent sales highlights"),
});

export type SalesHighlightsProps = z.infer<typeof salesHighlightsSchema>;

export const SalesHighlights = React.forwardRef<
  HTMLDivElement,
  SalesHighlightsProps
>(({ highlights }, ref) => {
  return (
    <div
      ref={ref}
      className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
    >
      <div className="mb-6 flex items-center gap-2">
        <Newspaper className="text-primary" size={20} />
        <h3 className="text-lg font-bold">Latest sales highlights</h3>
      </div>

      <div className="space-y-6">
        {highlights.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col gap-3 border-b border-border/40 pb-6 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="text-primary font-semibold uppercase">
                {item.source}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(item.datetimeMs).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-bold leading-tight transition-colors group-hover:text-primary">
                  {item.headline}
                </h4>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {item.summary}
                </p>
              </div>
              {item.imageUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/20">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                  />
                </div>
              ) : null}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100"
            >
              View detail <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-xl border border-border/60 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-muted/50"
      >
        View all highlights
      </button>
    </div>
  );
});

SalesHighlights.displayName = "SalesHighlights";
