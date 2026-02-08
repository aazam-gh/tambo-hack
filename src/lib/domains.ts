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
  | "news"
  | "sales"
  | "infra"
  | "dev"
  | "marketing"
  | "legal";

export type DomainIntent =
  | "inspect"
  | "analyze"
  | "summarize"
  | "compare"
  | "explain"
  | "filter";

export type DomainUiComponent =
  | "ProductQuote"
  | "ProductProfile"
  | "SalesHighlights"
  | "ProfitSentiment"
  | "ProductMetrics";

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
    label: "Product Insights",
    icon: DollarSign,
    intents: ["inspect", "analyze", "summarize"],
    components: ["ProductProfile", "ProductMetrics"],
    dataSource: "research",
  },
  trading: {
    id: "trading",
    label: "Pricing & Profit",
    icon: CreditCard,
    intents: ["inspect", "summarize"],
    components: ["ProductQuote", "ProfitSentiment"],
    dataSource: "trading",
  },
  news: {
    id: "news",
    label: "Sales Highlights",
    icon: Megaphone,
    intents: ["summarize"],
    components: ["SalesHighlights"],
    dataSource: "news",
  },
  sales: {
    id: "sales",
    label: "Sales Hub",
    icon: DollarSign,
    intents: ["inspect", "explain"],
    components: [],
    dataSource: "sales",
  },
  infra: {
    id: "infra",
    label: "Infrastructure",
    icon: Server,
    intents: ["inspect", "explain", "filter"],
    components: [],
    dataSource: "infra",
  },
  dev: {
    id: "dev",
    label: "Development",
    icon: Code2,
    intents: ["inspect"],
    components: [],
    dataSource: "dev",
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    intents: ["inspect", "explain"],
    components: [],
    dataSource: "marketing",
  },
  legal: {
    id: "legal",
    label: "Legal & Compliance",
    icon: Scale,
    intents: ["inspect"],
    components: [],
    dataSource: "legal",
  },
} as const satisfies Record<DomainId, DomainDefinition>;
