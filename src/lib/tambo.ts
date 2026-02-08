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
  StockQuote,
  stockQuoteSchema,
} from "@/components/tambo/stock-quote";
import {
  CompanyProfile,
  companyProfileSchema,
} from "@/components/tambo/company-profile";
import {
  MarketNews,
  marketNewsSchema,
} from "@/components/tambo/market-news";
import {
  InsiderSentiment,
  insiderSentimentSchema,
} from "@/components/tambo/insider-sentiment";
import {
  BasicFinancials,
  basicFinancialsSchema,
} from "@/components/tambo/basic-financials";
import {
  GestureDataExplorer,
  gestureDataExplorerSchema,
} from "@/components/tambo/GestureDataExplorer";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";

import rawData from "./mock-data.json";

// Type the JSON data
interface SalesRecord {
  "Order Date": string;
  "Product Name": string;
  "Category": string;
  "Region": string;
  "Quantity": number;
  "Sales": number;
  "Profit": number;
}

const salesData = rawData as SalesRecord[];

// Helper to find relevant records
function getProductRecords(symbol: string): SalesRecord[] {
  if (!symbol) return [];

  // Try exact match first
  let matches = salesData.filter(
    (r) => r["Product Name"].toLowerCase() === symbol.toLowerCase()
  );

  // If no exact match, try partial match
  if (matches.length === 0) {
    matches = salesData.filter((r) =>
      r["Product Name"].toLowerCase().includes(symbol.toLowerCase())
    );
  }

  // If still no match, return random 50 records to show something (fallback for demo)
  if (matches.length === 0) {
    // stable random based on symbol length to get somewhat consistent results for same unknown query
    const seed = symbol.length % 10;
    const start = Math.floor((seed / 10) * (salesData.length - 50));
    matches = salesData.slice(start, start + 50);
  }

  // Sort by date ascending
  return matches.sort(
    (a, b) =>
      new Date(a["Order Date"]).getTime() - new Date(b["Order Date"]).getTime()
  );
}

export const tools: TamboTool<any, any>[] = [
  {
    name: "stock_quote_read",
    description: "Get real-time quote data for a product from internal sales data.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const records = getProductRecords(symbol);

      if (records.length === 0) {
        throw new Error(`No data found for ${symbol}`);
      }

      const lastRecord = records[records.length - 1];
      const prevRecord = records.length > 1 ? records[records.length - 2] : lastRecord;

      const currentPrice = lastRecord.Sales / lastRecord.Quantity;
      const allPrices = records.map(r => r.Sales / r.Quantity);
      const highPrice = Math.max(...allPrices);
      const lowPrice = Math.min(...allPrices);
      const openPrice = allPrices[0];
      const previousClose = prevRecord.Sales / prevRecord.Quantity;
      const change = currentPrice - previousClose;
      const percentChange = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: lastRecord["Product Name"],
        currentPrice,
        highPrice,
        lowPrice,
        openPrice,
        previousClose,
        change,
        percentChange,
      };
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The product name (e.g. Laptop, Mouse)",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "company_profile_read",
    description: "Get general product information for a given symbol from internal sales data.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const records = getProductRecords(symbol);
      if (records.length === 0) {
        throw new Error(`No data found for ${symbol}`);
      }

      const latest = records[records.length - 1];
      // Calculate total market cap as sum of all sales
      const marketCap = salesData
        .filter(r => r["Product Name"] === latest["Product Name"])
        .reduce((sum, r) => sum + r.Sales, 0);

      // Unique regions
      const regions = [...new Set(records.map(r => r.Region))].join(", ");

      return {
        name: latest["Product Name"],
        ticker: latest["Product Name"].toUpperCase().slice(0, 4),
        logo: `https://avatar.vercel.sh/${latest["Product Name"]}.png?text=${latest["Product Name"].slice(0, 2).toUpperCase()}`,
        industry: latest.Category,
        weburl: `https://example.com/products/${latest["Product Name"].toLowerCase().replace(/\s+/g, '-')}`,
        marketCapitalization: marketCap / 1000, // In millions (mock scale)
        exchange: "E-COM",
        country: regions || "Global",
      };
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "market_news_read",
    description: "Get latest market news from internal sales trends.",
    tool: async (args: { category: string } = { category: "general" }) => {
      const { category } = args;
      // Generate some mock news based on recent high sales
      const recentHighSales = salesData
        .filter(r => r.Sales > 5000)
        .slice(-5)
        .reverse();

      const news = recentHighSales.map((r, i) => ({
        category: r.Category,
        datetime: new Date(r["Order Date"]).getTime(),
        headline: `${r["Product Name"]} Sales Surge in ${r.Region}`,
        id: i + 1000,
        image: `https://avatar.vercel.sh/${r["Product Name"]}-news.png?text=NEWS`,
        related: r["Product Name"],
        source: "Internal Analytics",
        summary: `Record breaking sales of $${r.Sales.toFixed(2)} observed for ${r["Product Name"]} in the ${r.Region} region on ${r["Order Date"]}.`,
        url: "#"
      }));

      return { news };
    },
    toolSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "The news category",
        },
      },
      required: ["category"]
    } as any,
  },
  {
    name: "insider_sentiment_read",
    description: "Get sentiment data for a product based on profit margins.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const records = getProductRecords(symbol);
      if (records.length === 0) {
        throw new Error(`No data found for ${symbol}`);
      }

      // Aggregate by month for the last 12 months
      const monthlyData = new Map<string, { year: number, month: number, profit: number, sales: number }>();

      records.forEach(r => {
        const date = new Date(r["Order Date"]);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData.has(key)) {
          monthlyData.set(key, { year: date.getFullYear(), month: date.getMonth() + 1, profit: 0, sales: 0 });
        }
        const entry = monthlyData.get(key)!;
        entry.profit += r.Profit;
        entry.sales += r.Sales;
      });

      // Convert to array and slice
      const data = Array.from(monthlyData.values())
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .slice(-12)
        .map(m => ({
          symbol: records[0]["Product Name"],
          year: m.year,
          month: m.month,
          change: m.profit, // Use profit as "change" proxy
          mspr: m.sales !== 0 ? (m.profit / m.sales) * 100 : 0 // Profit margin as sentiment proxy
        }));

      return { symbol: records[0]["Product Name"], data };
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "basic_financials_read",
    description: "Get basic financial metrics for a product from internal sales data.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const records = getProductRecords(symbol);
      if (records.length === 0) {
        throw new Error(`No data found for ${symbol}`);
      }

      const totalSales = records.reduce((s, r) => s + r.Sales, 0);
      const totalProfit = records.reduce((s, r) => s + r.Profit, 0);
      const totalQuant = records.reduce((s, r) => s + r.Quantity, 0);

      const prices = records.map(r => r.Sales / r.Quantity);

      // Prevent division by zero
      const eps = totalQuant > 0 ? totalProfit / totalQuant : 0;
      const pe = eps > 0 ? (prices[prices.length - 1] / eps) : 0;

      return {
        symbol: records[0]["Product Name"],
        metric: {
          "52WeekHigh": Math.max(...prices),
          "52WeekLow": Math.min(...prices),
          "beta": 0.85 + (Math.random() * 0.5), // Mock beta
          "dividendYield": totalSales > 0 ? (totalProfit / totalSales) * 5 : 0, // Mock yield based on margin
          "eps": eps, // Profit per unit
          "marketCapitalization": totalSales / 1000,
          "pe": pe || 15 // P/E ratio
        }
      };
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The product name",
        },
      },
      required: ["symbol"],
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
    name: "StockQuote",
    description:
      "A real-time stock quote card showing the current price, high/low/open for the day, and change percent.",
    component: StockQuote,
    propsSchema: stockQuoteSchema as any,
  },
  {
    name: "CompanyProfile",
    description:
      "A company profile card showing the logo, industry, exchange, market cap, and website link.",
    component: CompanyProfile,
    propsSchema: companyProfileSchema as any,
  },
  {
    name: "MarketNews",
    description:
      "A list of the latest market news articles with headlines, summaries, and images.",
    component: MarketNews,
    propsSchema: marketNewsSchema as any,
  },
  {
    name: "InsiderSentiment",
    description:
      "A card showing insider sentiment trends for a company based on monthly share purchase ratios.",
    component: InsiderSentiment,
    propsSchema: insiderSentimentSchema as any,
  },
  {
    name: "BasicFinancials",
    description:
      "A component showing key financial metrics like P/E ratio, EPS, Dividend Yield, and Beta.",
    component: BasicFinancials,
    propsSchema: basicFinancialsSchema as any,
  },
  {
    name: "GestureDataExplorer",
    description:
      "A gesture-driven data explorer that shows dynamic visualizations based on hand gesture sequences. Displays sales data summaries, category breakdowns, regional analysis, top products, monthly trends, and more based on detected gestures.",
    component: GestureDataExplorer,
    propsSchema: gestureDataExplorerSchema as any,
  },
];
