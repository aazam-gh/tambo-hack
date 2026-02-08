/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import {
  ProductQuote,
  productQuoteSchema,
} from "@/components/tambo/product-quote";
import {
  ProductProfile,
  productProfileSchema,
} from "@/components/tambo/product-profile";
import {
  SalesHighlights,
  salesHighlightsSchema,
} from "@/components/tambo/sales-highlights";
import {
  ProfitSentiment,
  profitSentimentSchema,
} from "@/components/tambo/profit-sentiment";
import {
  ProductMetrics,
  productMetricsSchema,
} from "@/components/tambo/product-metrics";
import {
  GestureDataExplorer,
  gestureDataExplorerSchema,
} from "@/components/tambo/GestureDataExplorer";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { appendLogSummaryEvent } from "@/lib/log-summary";

import {
  DEFAULT_MOCK_PRODUCT_NAME,
  salesData,
  type SalesRecord,
} from "@/lib/mock-sales";

function withToolLogging<TArgs, TResult>(
  name: string,
  tool: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs) => {
    appendLogSummaryEvent({
      kind: "tambo_tool",
      label: `Tool call: ${name}`,
      detail: { args },
    });

    const startedAt = Date.now();
    try {
      const result = await tool(args);
      appendLogSummaryEvent({
        kind: "tambo_tool",
        label: `Tool ok: ${name}`,
        detail: {
          durationMs: Date.now() - startedAt,
          resultKeys:
            result && typeof result === "object"
              ? Object.keys(result as Record<string, unknown>)
              : undefined,
        },
      });
      return result;
    } catch (error) {
      appendLogSummaryEvent({
        kind: "tambo_tool",
        label: `Tool error: ${name}`,
        detail: {
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  };
}

// Helper to find relevant records
function getProductRecords(productNameQuery: string): SalesRecord[] {
  if (!productNameQuery) return [];

  // Try exact match first
  let matches = salesData.filter(
    (r) =>
      r["Product Name"].toLowerCase() === productNameQuery.toLowerCase(),
  );

  // If no exact match, try partial match
  if (matches.length === 0) {
    matches = salesData.filter((r) =>
      r["Product Name"].toLowerCase().includes(productNameQuery.toLowerCase()),
    );
  }

  if (matches.length === 0) {
    return [];
  }

  // Sort by date ascending
  return matches.sort(
    (a, b) =>
      new Date(a["Order Date"]).getTime() - new Date(b["Order Date"]).getTime()
  );
}

function getProductRecordsOrDefault(productNameQuery: string): SalesRecord[] {
  const records = getProductRecords(productNameQuery);
  if (records.length > 0) {
    return records;
  }

  if (
    productNameQuery.trim().toLowerCase() ===
    DEFAULT_MOCK_PRODUCT_NAME.toLowerCase()
  ) {
    return [];
  }

  return getProductRecords(DEFAULT_MOCK_PRODUCT_NAME);
}

export const tools: TamboTool<any, any>[] = [
  {
    name: "product_quote_read",
    description:
      "Get a unit price snapshot for a product from the bundled mock sales dataset.",
    tool: withToolLogging("product_quote_read", async (args: { productName: string }) => {
      const { productName } = args;
      const records = getProductRecordsOrDefault(productName);
      if (records.length === 0) {
        throw new Error(`No data found for ${productName}`);
      }

      const resolvedName = records[0]["Product Name"];

      const unitPrice = (r: SalesRecord) =>
        r.Quantity > 0 ? r.Sales / r.Quantity : 0;

      const validRecords = records.filter((r) => r.Quantity > 0);
      if (validRecords.length === 0) {
        throw new Error(`No valid quantity data for ${resolvedName}`);
      }

      const prices = validRecords.map(unitPrice);
      const lastRecord = validRecords[validRecords.length - 1];
      const prevRecord =
        validRecords.length > 1 ? validRecords[validRecords.length - 2] : lastRecord;

      const currentUnitPrice = unitPrice(lastRecord);
      const previousUnitPrice = unitPrice(prevRecord);
      const startUnitPrice = prices[0] ?? currentUnitPrice;
      const change = currentUnitPrice - previousUnitPrice;
      const percentChange =
        previousUnitPrice !== 0 ? (change / previousUnitPrice) * 100 : 0;

      return {
        productName: resolvedName,
        currentUnitPrice,
        highUnitPrice: Math.max(...prices),
        lowUnitPrice: Math.min(...prices),
        startUnitPrice,
        previousUnitPrice,
        change,
        percentChange,
      };
    }),
    toolSchema: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "The product name (e.g. Laptop, Mouse)",
        },
      },
      required: ["productName"],
    } as any,
  },
  {
    name: "product_profile_read",
    description:
      "Get a product overview (category, regions, totals) from the bundled mock sales dataset.",
    tool: withToolLogging("product_profile_read", async (args: { productName: string }) => {
      const { productName } = args;
      const records = getProductRecordsOrDefault(productName);
      if (records.length === 0) {
        throw new Error(`No data found for ${productName}`);
      }

      const latest = records[records.length - 1];
      const normalizedName = latest["Product Name"];
      const sku = normalizedName.toUpperCase().replace(/\s+/g, "").slice(0, 6);
      const totalSales = records.reduce((sum, r) => sum + r.Sales, 0);
      const totalProfit = records.reduce((sum, r) => sum + r.Profit, 0);
      const totalUnits = records.reduce((sum, r) => sum + r.Quantity, 0);
      const regions = [...new Set(records.map((r) => r.Region))];

      return {
        productName: normalizedName,
        sku,
        imageUrl: `https://avatar.vercel.sh/${normalizedName}.png?text=${normalizedName.slice(0, 2).toUpperCase()}`,
        category: latest.Category,
        productUrl: `https://example.com/products/${normalizedName.toLowerCase().replace(/\s+/g, "-")}`,
        totalSales,
        totalProfit,
        totalUnits,
        regions,
      };
    }),
    toolSchema: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["productName"],
    } as any,
  },
  {
    name: "sales_highlights_read",
    description:
      "Get a small feed of notable sales events from the bundled mock dataset.",
    tool: withToolLogging(
      "sales_highlights_read",
      async (args: { category?: string } = {}) => {
      const normalizedCategory = args.category?.trim().toLowerCase();
      const filtered = normalizedCategory
        ? salesData.filter((r) => r.Category.toLowerCase() === normalizedCategory)
        : salesData;

      const highlights = [...filtered]
        .sort((a, b) => {
          const dateDelta =
            new Date(b["Order Date"]).getTime() -
            new Date(a["Order Date"]).getTime();
          return dateDelta !== 0 ? dateDelta : b.Sales - a.Sales;
        })
        .slice(0, 5)
        .map((r, i) => {
          const productName = r["Product Name"];
          const datetimeMs = new Date(r["Order Date"]).getTime();

          return {
            id: `${productName}-${datetimeMs}-${i}`,
            headline: `${productName} spike in ${r.Region}`,
            summary: `Observed $${r.Sales.toFixed(2)} in sales and $${r.Profit.toFixed(2)} profit on ${r["Order Date"]}.`,
            url: `https://example.com/products/${productName.toLowerCase().replace(/\s+/g, "-")}`,
            imageUrl: `https://avatar.vercel.sh/${productName}-news.png?text=NEWS`,
            datetimeMs,
            source: "Mock Analytics",
          };
        });

      return { highlights };
      },
    ),
    toolSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category filter (e.g. Furniture)",
        },
      },
      required: [],
    } as any,
  },
  {
    name: "profit_sentiment_read",
    description:
      "Get a monthly profitability trend (profit + margin) for a product from the bundled mock dataset.",
    tool: withToolLogging(
      "profit_sentiment_read",
      async (args: { productName: string }) => {
      const { productName } = args;
      const records = getProductRecordsOrDefault(productName);
      if (records.length === 0) {
        throw new Error(`No data found for ${productName}`);
      }

      // Aggregate by month for the last 12 months
      const monthlyData = new Map<
        string,
        { year: number; month: number; profit: number; sales: number }
      >();

      records.forEach((r) => {
        const date = new Date(r["Order Date"]);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData.has(key)) {
          monthlyData.set(key, {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            profit: 0,
            sales: 0,
          });
        }
        const entry = monthlyData.get(key)!;
        entry.profit += r.Profit;
        entry.sales += r.Sales;
      });

      // Convert to array and slice
      const data = Array.from(monthlyData.values())
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .slice(-12)
        .map((m) => ({
          year: m.year,
          month: m.month,
          profit: m.profit,
          profitMarginPercent: m.sales !== 0 ? (m.profit / m.sales) * 100 : 0,
        }));

      return { productName: records[0]["Product Name"], data };
      },
    ),
    toolSchema: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["productName"],
    } as any,
  },
  {
    name: "product_metrics_read",
    description:
      "Get key sales metrics for a product from the bundled mock sales dataset.",
    tool: withToolLogging(
      "product_metrics_read",
      async (args: { productName: string }) => {
      const { productName } = args;
      const records = getProductRecordsOrDefault(productName);
      if (records.length === 0) {
        throw new Error(`No data found for ${productName}`);
      }

      const resolvedName = records[0]["Product Name"];

      const validRecords = records.filter((r) => r.Quantity > 0);
      if (validRecords.length === 0) {
        throw new Error(`No valid quantity data for ${resolvedName}`);
      }

      const totalSales = validRecords.reduce((s, r) => s + r.Sales, 0);
      const totalProfit = validRecords.reduce((s, r) => s + r.Profit, 0);
      const unitsSold = validRecords.reduce((s, r) => s + r.Quantity, 0);
      const orderCount = validRecords.length;

      const prices = validRecords.map((r) => r.Sales / r.Quantity);
      const avgUnitPrice = unitsSold > 0 ? totalSales / unitsSold : 0;
      const profitMarginPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      return {
        productName: resolvedName,
        metrics: {
          totalSales,
          totalProfit,
          profitMarginPercent,
          unitsSold,
          orderCount,
          avgUnitPrice,
          highUnitPrice: Math.max(...prices),
          lowUnitPrice: Math.min(...prices),
        },
      };
      },
    ),
    toolSchema: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["productName"],
    } as any,
  },
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "ProductQuote",
    description:
      "A unit price snapshot for a product derived from the mock sales dataset.",
    component: ProductQuote,
    propsSchema: productQuoteSchema as any,
  },
  {
    name: "ProductProfile",
    description:
      "A product profile showing category, regions, sales totals, and a link to the product page.",
    component: ProductProfile,
    propsSchema: productProfileSchema as any,
  },
  {
    name: "SalesHighlights",
    description:
      "A feed of notable sales events sourced from the mock dataset.",
    component: SalesHighlights,
    propsSchema: salesHighlightsSchema as any,
  },
  {
    name: "ProfitSentiment",
    description:
      "A profitability trend card showing profit and profit margin over time for a product.",
    component: ProfitSentiment,
    propsSchema: profitSentimentSchema as any,
  },
  {
    name: "ProductMetrics",
    description:
      "Key product metrics like sales, profit, margin, units sold, and unit price range.",
    component: ProductMetrics,
    propsSchema: productMetricsSchema as any,
  },
  {
    name: "GestureDataExplorer",
    description:
      "A gesture-driven data explorer that shows dynamic visualizations based on hand gesture sequences. Displays sales data summaries, category breakdowns, regional analysis, top products, monthly trends, and more based on detected gestures.",
    component: GestureDataExplorer,
    propsSchema: gestureDataExplorerSchema as any,
  },
];
