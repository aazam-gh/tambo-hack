import { cn } from "@/lib/utils";
import { Boxes, Link2, MapPin } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const productProfileSchema = z.object({
  productName: z.string().describe("Product name"),
  sku: z.string().describe("Short product identifier"),
  imageUrl: z.string().optional().describe("URL to a product image"),
  category: z.string().describe("Product category"),
  productUrl: z.string().describe("Product page URL"),
  totalSales: z.number().describe("Total sales (currency)"),
  totalProfit: z.number().describe("Total profit (currency)"),
  totalUnits: z.number().describe("Total units sold"),
  regions: z.array(z.string()).describe("Regions where the product sold"),
});

export type ProductProfileProps = z.infer<typeof productProfileSchema>;

export const ProductProfile = React.forwardRef<
  HTMLDivElement,
  ProductProfileProps
>(
  (
    {
      productName,
      sku,
      imageUrl,
      category,
      productUrl,
      totalSales,
      totalProfit,
      totalUnits,
      regions,
    },
    ref,
  ) => {
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const regionLabel = regions.length > 0 ? regions.join(", ") : "Unknown";

    return (
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
      >
        <div className="flex items-start gap-4">
          {imageUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white p-2 border border-border/40">
              <img
                src={imageUrl}
                alt={productName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-bold">{productName}</h3>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {sku} • {category}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {category}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium border border-border/40">
            <MapPin size={12} />
            {regionLabel}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
            <span className="text-muted-foreground">Total sales</span>
            <span className="font-semibold">${(totalSales ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
            <span className="text-muted-foreground">Profit</span>
            <span
              className={cn(
                "font-semibold",
                totalProfit >= 0 ? "text-emerald-500" : "text-rose-500",
              )}
            >
              ${(totalProfit ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
            <span className="text-muted-foreground">Profit margin</span>
            <span className="font-medium">{profitMargin.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">Units sold</span>
            <span className="font-medium">{(totalUnits ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            <Boxes size={16} />
            Product page
          </a>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/50 transition-colors hover:bg-background"
          >
            <Link2 size={18} />
          </button>
        </div>
      </div>
    );
  },
);

ProductProfile.displayName = "ProductProfile";
