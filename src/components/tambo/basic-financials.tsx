import { cn } from "@/lib/utils";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const basicFinancialsSchema = z.object({
    symbol: z.string().describe("Stock symbol"),
    metric: z.object({
        "10DayAverageTradingVolume": z.number(),
        "52WeekHigh": z.number(),
        "52WeekLow": z.number(),
        "peNormalized": z.number().optional(),
        "epsExclExtraItemsAnnual": z.number().optional(),
        "revenuePerShareAnnual": z.number().optional(),
        "beta": z.number().optional(),
        "dividendYieldIndicatedAnnual": z.number().optional(),
    }).describe("Core financial metrics"),
});

export type BasicFinancialsProps = z.infer<typeof basicFinancialsSchema>;

export const BasicFinancials = React.forwardRef<HTMLDivElement, BasicFinancialsProps>(
    ({ symbol, metric }, ref) => {
        return (
            <div
                ref={ref}
                className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
            >
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="text-primary" size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-tight">Key Financials • {symbol}</h3>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">P/E Ratio</div>
                        <div className="text-lg font-bold">{metric.peNormalized?.toFixed(2) || "N/A"}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">EPS (Annual)</div>
                        <div className="text-lg font-bold">${metric.epsExclExtraItemsAnnual?.toFixed(2) || "N/A"}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dividend Yield</div>
                        <div className="text-lg font-bold text-emerald-500">{metric.dividendYieldIndicatedAnnual?.toFixed(2) || "0.00"}%</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Beta (Risk)</div>
                        <div className="text-lg font-bold">{metric.beta?.toFixed(2) || "N/A"}</div>
                    </div>
                </div>

                <div className="mt-8 space-y-4 pt-6 border-t border-border/40">
                    <div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase mb-2">
                            <span>52-Week Range</span>
                            <span className="text-primary">${metric["52WeekLow"]} - ${metric["52WeekHigh"]}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/30 relative">
                            <div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-primary/20 rounded-full" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Avg Volume</span>
                    </div>
                    <span className="text-xs font-bold">{(metric["10DayAverageTradingVolume"] / 1000000).toFixed(1)}M</span>
                </div>
            </div>
        );
    }
);

BasicFinancials.displayName = "BasicFinancials";
