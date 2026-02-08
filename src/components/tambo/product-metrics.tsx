import { BarChart3, Package, Percent, TrendingUp } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const productMetricsSchema = z.object({
  productName: z.string().describe("Product name"),
  metrics: z
    .object({
      totalSales: z.number().describe("Total sales (currency)"),
      totalProfit: z.number().describe("Total profit (currency)"),
      profitMarginPercent: z.number().describe("Profit margin percentage"),
      unitsSold: z.number().describe("Total units sold"),
      orderCount: z.number().describe("Number of orders"),
      avgUnitPrice: z.number().describe("Average unit price"),
      highUnitPrice: z.number().describe("Highest unit price"),
      lowUnitPrice: z.number().describe("Lowest unit price"),
    })
    .describe("Core product metrics"),
});

export type ProductMetricsProps = z.infer<typeof productMetricsSchema>;

export const ProductMetrics = React.forwardRef<
  HTMLDivElement,
  ProductMetricsProps
>(({ productName, metrics }, ref) => {
  return (
    <div
      ref={ref}
      className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
    >
      <div className="mb-6 flex items-center gap-2">
        <BarChart3 className="text-primary" size={20} />
        <h3 className="text-sm font-bold uppercase tracking-tight">
          Key metrics • {productName}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Total sales
          </div>
          <div className="text-lg font-bold">${metrics.totalSales.toFixed(2)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Profit
          </div>
          <div className="text-lg font-bold">${metrics.totalProfit.toFixed(2)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Avg unit price
          </div>
          <div className="text-lg font-bold text-emerald-500">
            ${metrics.avgUnitPrice.toFixed(2)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Profit margin
          </div>
          <div className="text-lg font-bold">{metrics.profitMarginPercent.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-border/40 pt-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
            <span>Unit price range</span>
            <span className="text-primary">
              ${metrics.lowUnitPrice.toFixed(2)} - ${metrics.highUnitPrice.toFixed(2)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/30 relative">
            <div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-primary/20 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Units
            </span>
          </div>
          <span className="text-xs font-bold">
            {metrics.unitsSold.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Orders
            </span>
          </div>
          <span className="text-xs font-bold">
            {metrics.orderCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Percent size={14} className="text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            Margin signal
          </span>
        </div>
        <span className="text-xs font-bold">
          {Math.abs(metrics.profitMarginPercent) > 25 ? "Strong" : "Moderate"}
        </span>
      </div>
    </div>
  );
});

ProductMetrics.displayName = "ProductMetrics";
