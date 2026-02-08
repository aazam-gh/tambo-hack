import { cn } from "@/lib/utils";
import { Calendar, ExternalLink, Newspaper } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const marketNewsSchema = z.object({
    news: z.array(z.object({
        id: z.number(),
        headline: z.string(),
        summary: z.string(),
        url: z.string(),
        image: z.string().optional(),
        datetime: z.number(),
        source: z.string(),
    })).describe("List of recent news articles"),
});

export type MarketNewsProps = z.infer<typeof marketNewsSchema>;

export const MarketNews = React.forwardRef<HTMLDivElement, MarketNewsProps>(
    ({ news }, ref) => {
        return (
            <div
                ref={ref}
                className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Newspaper className="text-primary" size={20} />
                    <h3 className="text-lg font-bold">Latest Market News</h3>
                </div>

                <div className="space-y-6">
                    {news.slice(0, 3).map((item) => (
                        <div key={item.id} className="group relative flex flex-col gap-3 pb-6 border-b border-border/40 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                <span className="text-primary font-semibold uppercase">{item.source}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(item.datetime * 1000).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                        {item.headline}
                                    </h4>
                                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                        {item.summary}
                                    </p>
                                </div>
                                {item.image && (
                                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted shrink-0 border border-border/20">
                                        <img src={item.image} alt="" className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                                    </div>
                                )}
                            </div>

                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                Read Article <ExternalLink size={10} />
                            </a>
                        </div>
                    ))}
                </div>

                <button className="mt-6 w-full rounded-xl border border-border/60 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-muted/50 transition-colors">
                    View All news
                </button>
            </div>
        );
    }
);

MarketNews.displayName = "MarketNews";
