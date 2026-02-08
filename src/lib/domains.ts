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
  | "sales"
  | "infra"
  | "marketing"
  | "legal"
  | "dev"
  | "stripe";

export type DomainIntent =
  | "inspect"
  | "compare"
  | "explain"
  | "filter"
  | "debug"
  | "summarize";

export type DomainUiComponent =
  | "Graph"
  | "Table"
  | "Summary"
  | "LogViewer"
  | "AlertList"
  | "PipelineStatus";

export type DomainDefinition = {
  id: DomainId;
  label: string;
  icon: LucideIcon;
  intents: readonly DomainIntent[];
  components: readonly DomainUiComponent[];
  dataSource: DomainId;
};

export const Domains = {
  sales: {
    id: "sales",
    label: "Sales",
    icon: DollarSign,
    intents: ["inspect", "compare", "explain"],
    components: ["Graph", "Table", "Summary"],
    dataSource: "sales",
  },
  stripe: {
    id: "stripe",
    label: "Stripe",
    icon: CreditCard,
    intents: ["inspect", "summarize", "compare"],
    components: ["Graph", "Table", "Summary"],
    dataSource: "stripe",
  },
  infra: {
    id: "infra",
    label: "Infrastructure",
    icon: Server,
    intents: ["inspect", "filter", "explain"],
    components: ["LogViewer", "Graph", "AlertList"],
    dataSource: "infra",
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    intents: ["inspect", "compare", "explain"],
    components: ["Graph", "Table", "Summary"],
    dataSource: "marketing",
  },
  legal: {
    id: "legal",
    label: "Legal",
    icon: Scale,
    intents: ["inspect", "explain"],
    components: ["Summary", "Table"],
    dataSource: "legal",
  },
  dev: {
    id: "dev",
    label: "Dev Pipelines",
    icon: Code2,
    intents: ["inspect", "debug"],
    components: ["PipelineStatus", "Table", "Summary"],
    dataSource: "dev",
  },
} as const satisfies Record<DomainId, DomainDefinition>;
