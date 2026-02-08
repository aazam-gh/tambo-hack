import { cn } from "@/lib/utils";
import { Activity, Users, Zap } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const insiderSentimentSchema = z.object({
    symbol: z.string().describe("Stock symbol"),
    data: z.array(z.object({
        year: z.number(),
        month: z.number(),
        mspr: z.number().describe("Monthly Share Purchase Ratio"),
        change: z.number().describe("Total change in holdings"),
    })).describe("Monthly insider sentiment data"),
});

export type InsiderSentimentProps = z.infer<typeof insiderSentimentSchema>;

export const InsiderSentiment = React.forwardRef<HTMLDivElement, InsiderSentimentProps>(
    ({ symbol, data }, ref) => {
        const latest = data[data.length - 1];
        const isBullish = latest?.mspr > 0;

        return (
            <div
                ref={ref}
                className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-tight">Insider Sentiment</h3>
                            <p className="text-xs text-muted-foreground">{symbol} • Monthly Velocity</p>
                        </div>
                    </div>
                    <div className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter",
                        isBullish ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                        {isBullish ? "Bullish" : "Bearish"}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Transaction Velocity (MSPR)</span>
                                <span className={cn("text-lg font-bold", isBullish ? "text-emerald-500" : "text-rose-500")}>
                                    {latest?.mspr.toFixed(2)}
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-1000", isBullish ? "bg-emerald-500" : "bg-rose-500")}
                                    style={{ width: `${Math.min(100, Math.abs(latest?.mspr || 0) * 10)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                <Activity size={10} />
                                Holdings Change
                            </div>
                            <div className="text-sm font-bold">
                                {latest?.change > 0 ? "+" : ""}{latest?.change.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                <Zap size={10} />
                                Confidence
                            </div>
                            <div className="text-sm font-bold">
                                {Math.abs(latest?.mspr) > 5 ? "Strong" : "Moderate"}
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
                    Insider sentiment represents the net buying or selling volume of company executives normalized by total shares.
                </p>
            </div>
        );
    }
);

InsiderSentiment.displayName = "InsiderSentiment";
