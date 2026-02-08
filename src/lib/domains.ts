import {
  Code2,
  CreditCard,
  DollarSign,
  Megaphone,
  Scale,
  Server,
  type LucideIcon,
} from "lucide-react";

export type DomainId =
  | "research"
  | "trading"
  | "news";

export type DomainIntent =
  | "inspect"
  | "analyze"
  | "summarize"
  | "compare";

export type DomainUiComponent =
  | "StockQuote"
  | "CompanyProfile"
  | "MarketNews"
  | "InsiderSentiment"
  | "BasicFinancials";

export type DomainDefinition = {
  id: DomainId;
  label: string;
  icon: LucideIcon;
  intents: readonly DomainIntent[];
  components: readonly DomainUiComponent[];
  dataSource: DomainId;
};

export const Domains = {
  research: {
    id: "research",
    label: "Equity Research",
    icon: DollarSign,
    intents: ["inspect", "analyze", "summarize"],
    components: ["CompanyProfile", "BasicFinancials"],
    dataSource: "research",
  },
  trading: {
    id: "trading",
    label: "Trading Desk",
    icon: CreditCard,
    intents: ["inspect", "summarize"],
    components: ["StockQuote", "InsiderSentiment"],
    dataSource: "trading",
  },
  news: {
    id: "news",
    label: "Market News",
    icon: Megaphone,
    intents: ["summarize"],
    components: ["MarketNews"],
    dataSource: "news",
  },
} as const satisfies Record<DomainId, DomainDefinition>;
