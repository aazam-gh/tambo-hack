import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const productQuoteSchema = z.object({
  productName: z.string().describe("The product name (e.g. Laptop)"),
  currentUnitPrice: z.number().describe("Current unit price"),
  highUnitPrice: z.number().describe("Highest unit price in the selected range"),
  lowUnitPrice: z.number().describe("Lowest unit price in the selected range"),
  startUnitPrice: z.number().describe("First unit price in the selected range"),
  previousUnitPrice: z.number().describe("Previous unit price"),
  change: z.number().describe("Unit price change"),
  percentChange: z.number().describe("Percentage unit price change"),
});

export type ProductQuoteProps = z.infer<typeof productQuoteSchema>;

export const ProductQuote = React.forwardRef<HTMLDivElement, ProductQuoteProps>(
  (
    {
      productName,
      currentUnitPrice,
      highUnitPrice,
      lowUnitPrice,
      startUnitPrice,
      previousUnitPrice,
      change,
      percentChange,
    },
    ref,
  ) => {
    const isPositive = (change ?? 0) >= 0;

    return (
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {productName}
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">
              ${(currentUnitPrice ?? 0).toFixed(2)}
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
              isPositive
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500",
            )}
          >
            {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            {Math.abs(percentChange ?? 0).toFixed(2)}%
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Start</div>
            <div className="font-medium">${(startUnitPrice ?? 0).toFixed(2)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Previous</div>
            <div className="font-medium">${(previousUnitPrice ?? 0).toFixed(2)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">High</div>
            <div className="font-medium text-emerald-500">
              ${(highUnitPrice ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Low</div>
            <div className="font-medium text-rose-500">
              ${(lowUnitPrice ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-border/40 pt-4">
          <div
            className={cn(
              "rounded-lg p-2",
              isPositive ? "bg-emerald-500/10" : "bg-rose-500/10",
            )}
          >
            {isPositive ? (
              <TrendingUp
                className={isPositive ? "text-emerald-500" : "text-rose-500"}
                size={20}
              />
            ) : (
              <TrendingDown
                className={isPositive ? "text-emerald-500" : "text-rose-500"}
                size={20}
              />
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Unit price change</div>
            <div
              className={cn(
                "text-sm font-semibold",
                isPositive ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {isPositive ? "+" : ""}
              {(change ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ProductQuote.displayName = "ProductQuote";
