import type { DomainId, DomainIntent } from "@/lib/domains";

export type CommandOption = {
  id: string;
  label: string;
  domain: DomainId;
  intent: DomainIntent;
  suggested?: boolean;
  suggestedReason?: string;
  confidence?: number;
};
