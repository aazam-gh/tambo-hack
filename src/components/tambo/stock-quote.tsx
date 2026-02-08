import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const stockQuoteSchema = z.object({
    symbol: z.string().describe("The stock symbol (e.g. AAPL)"),
    currentPrice: z.number().describe("Open price of the day"),
    highPrice: z.number().describe("High price of the day"),
    lowPrice: z.number().describe("Low price of the day"),
    openPrice: z.number().describe("Open price of the day"),
    previousClose: z.number().describe("Previous close price"),
    change: z.number().describe("Price change"),
    percentChange: z.number().describe("Percentage price change"),
});

export type StockQuoteProps = z.infer<typeof stockQuoteSchema>;

export const StockQuote = React.forwardRef<HTMLDivElement, StockQuoteProps>(
    (
        {
            symbol,
            currentPrice,
            highPrice,
            lowPrice,
            openPrice,
            previousClose,
            change,
            percentChange,
        },
        ref
    ) => {
        const isPositive = change >= 0;

        return (
            <div
                ref={ref}
                className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {symbol}
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight">
                            ${currentPrice.toFixed(2)}
                        </div>
                    </div>
                    <div
                        className={cn(
                            "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                            isPositive
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-rose-500/10 text-rose-500"
                        )}
                    >
                        {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        {Math.abs(percentChange).toFixed(2)}%
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Open</div>
                        <div className="font-medium">${openPrice.toFixed(2)}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Prev Close</div>
                        <div className="font-medium">${previousClose.toFixed(2)}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">High</div>
                        <div className="font-medium text-emerald-500">${highPrice.toFixed(2)}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Low</div>
                        <div className="font-medium text-rose-500">${lowPrice.toFixed(2)}</div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-2 pt-4 border-t border-border/40">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isPositive ? "bg-emerald-500/10" : "bg-rose-500/10"
                    )}>
                        {isPositive ? (
                            <TrendingUp className={isPositive ? "text-emerald-500" : "text-rose-500"} size={20} />
                        ) : (
                            <TrendingDown className={isPositive ? "text-emerald-500" : "text-rose-500"} size={20} />
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Daily Change</div>
                        <div className={cn("text-sm font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
                            {isPositive ? "+" : ""}{change.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

StockQuote.displayName = "StockQuote";
