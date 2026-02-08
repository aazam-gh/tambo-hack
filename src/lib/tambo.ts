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
  CompanyNews,
  companyNewsSchema,
} from "@/components/tambo/company-news";
import {
  InsiderSentiment,
  insiderSentimentSchema,
} from "@/components/tambo/insider-sentiment";
import {
  BasicFinancials,
  basicFinancialsSchema,
} from "@/components/tambo/basic-financials";
import {
  InsiderSentimentChart,
  insiderSentimentChartSchema,
} from "@/components/tambo/insider-sentiment-chart";
import {
  StockPriceChart,
  stockPriceChartSchema,
} from "@/components/tambo/stock-price-chart";
import {
  StockVolumeChart,
  stockVolumeChartSchema,
} from "@/components/tambo/stock-volume-chart";
import { finnhubGetJson } from "@/services/finnhub";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";

type FinnhubQuoteResponse = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  d: number;
  dp: number;
};

type FinnhubMarketNewsItem = Record<string, unknown>;

type FinnhubInsiderSentimentResponse = { data: unknown[] };

type FinnhubBasicFinancialsResponse = { metric: Record<string, unknown> };

export const tools: TamboTool<any, any>[] = [
  {
    name: "stock_quote_read",
    description: "Get real-time quote data for a stock symbol from Finnhub.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      try {
        const data = await finnhubGetJson<FinnhubQuoteResponse>("/quote", {
          symbol,
        });
        return {
          symbol,
          currentPrice: data.c,
          highPrice: data.h,
          lowPrice: data.l,
          openPrice: data.o,
          previousClose: data.pc,
          change: data.d,
          percentChange: data.dp,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch quote for ${symbol}: ${message}`);
      }
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The stock symbol to get a quote for (e.g. AAPL)",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "company_profile_read",
    description: "Get general company information for a given symbol from Finnhub.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      try {
        return await finnhubGetJson<Record<string, unknown>>("/stock/profile2", {
          symbol,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch profile for ${symbol}: ${message}`);
      }
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The stock symbol to get a profile for (e.g. AAPL)",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "market_news_read",
    description: "Get latest market news from Finnhub (up to 5 items).",
    tool: async (args: { category: string } = { category: "general" }) => {
      const { category } = args;
      try {
        const data = await finnhubGetJson<FinnhubMarketNewsItem[]>("/news", {
          category,
        });
        return {
          news: Array.isArray(data) ? data.slice(0, 5) : [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch market news (${category}): ${message}`);
      }
    },
    toolSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "The news category (general, forex, crypto, merger)",
        },
      },
    } as any,
  },
  {
    name: "insider_sentiment_read",
    description:
      "Get insider sentiment data for a stock symbol from Finnhub (up to the latest 12 data points).",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      try {
        const data = await finnhubGetJson<FinnhubInsiderSentimentResponse>(
          "/stock/insider-sentiment",
          {
            symbol,
            from: "2024-01-01",
          },
        );
        return {
          symbol,
          data: data.data.slice(0, 12),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch insider sentiment for ${symbol}: ${message}`);
      }
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The stock symbol (e.g. AAPL)",
        },
      },
      required: ["symbol"],
    } as any,
  },
  {
    name: "basic_financials_read",
    description: "Get basic financial metrics for a stock symbol from Finnhub.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      try {
        const data = await finnhubGetJson<FinnhubBasicFinancialsResponse>(
          "/stock/metric",
          {
            symbol,
            metric: "all",
          },
        );
        return { symbol, metric: data.metric };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch financial metrics for ${symbol}: ${message}`);
      }
    },
    toolSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The stock symbol (e.g. AAPL)",
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
    name: "CompanyNews",
    description:
      "A company-specific news panel that fetches recent headlines for a stock symbol from Finnhub.",
    component: CompanyNews,
    propsSchema: companyNewsSchema as any,
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
    name: "StockPriceChart",
    description:
      "An interactive line chart of a stock's daily close price (with moving averages) fetched from Finnhub.",
    component: StockPriceChart,
    propsSchema: stockPriceChartSchema as any,
  },
  {
    name: "StockVolumeChart",
    description:
      "An interactive bar chart of a stock's daily trading volume fetched from Finnhub.",
    component: StockVolumeChart,
    propsSchema: stockVolumeChartSchema as any,
  },
  {
    name: "InsiderSentimentChart",
    description:
      "An interactive chart of insider sentiment (MSPR) and holdings change fetched from Finnhub.",
    component: InsiderSentimentChart,
    propsSchema: insiderSentimentChartSchema as any,
  },
];
