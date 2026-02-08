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
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

export const tools: TamboTool<any, any>[] = [
  {
    name: "stock_quote_read",
    description: "Get real-time quote data for a stock symbol from Finnhub.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const apiKey = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch quote for ${symbol}`);
      }
      const data = await response.json();
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
      const apiKey = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch profile for ${symbol}`);
      }
      return await response.json();
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
    description: "Get latest market news from Finnhub.",
    tool: async (args: { category: string } = { category: "general" }) => {
      const { category } = args;
      const apiKey = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch news for ${category}`);
      }
      const data = await response.json();
      return { news: data };
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
    description: "Get insider sentiment data for a stock symbol from Finnhub.",
    tool: async (args: { symbol: string }) => {
      const { symbol } = args;
      const apiKey = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${symbol}&from=2024-01-01&token=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch insider sentiment for ${symbol}`);
      }
      const data = await response.json();
      return { symbol, data: data.data };
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
      const apiKey = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch financials for ${symbol}`);
      }
      const data = await response.json();
      return { symbol, metric: data.metric };
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
];
