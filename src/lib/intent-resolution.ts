import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { GestureSignal } from "@/lib/gesture-signals";
import type { InteractionContext } from "@/lib/interaction-context";

export type ResolvedIntent =
  | "inspect_domain"
  | "compare_domain"
  | "explain_domain"
  | "filter_domain"
  | "debug_domain"
  | "move_surface"
  | "resize_surface"
  | "combine_surface"
  | "confirm_intent"
  | "dismiss_surface"
  | "navigate"
  | "adjust_value"
  | "select"
  | "noop";

export type IntentHypothesis = {
  primary: ResolvedIntent;
  targetDomain?: DomainId;
  alternatives: string[];
};

function toResolvedIntent(intent: DomainIntent): ResolvedIntent {
  switch (intent) {
    case "inspect":
      return "inspect_domain";
    case "compare":
      return "compare_domain";
    case "explain":
      return "explain_domain";
    case "filter":
      return "filter_domain";
    case "debug":
      return "debug_domain";
    case "summarize":
      return "explain_domain";
  }
}

export function domainIntentFromResolvedIntent(
  resolved: ResolvedIntent,
): DomainIntent {
  switch (resolved) {
    case "compare_domain":
      return "compare";
    case "explain_domain":
      return "explain";
    case "filter_domain":
      return "filter";
    case "debug_domain":
      return "debug";
    case "inspect_domain":
    case "move_surface":
    case "resize_surface":
    case "combine_surface":
    case "confirm_intent":
    case "dismiss_surface":
    case "navigate":
    case "adjust_value":
    case "select":
    case "noop":
      return "inspect";
  }
}

function pickPrimaryDomain(context: InteractionContext): DomainId {
  const active = context.activeDomains[0];
  if (active) {
    return active;
  }

  return "infra";
}

export function resolveIntentHypothesis(
  signal: GestureSignal,
  context: InteractionContext,
): IntentHypothesis {
  if (signal.type === "move_surface") {
    return { primary: "move_surface", alternatives: [] };
  }

  if (signal.type === "resize_surface") {
    return { primary: "resize_surface", alternatives: [] };
  }

  if (signal.type === "combine_surface") {
    return { primary: "combine_surface", alternatives: [] };
  }

  if (signal.type === "confirm") {
    return { primary: "confirm_intent", alternatives: [] };
  }

  if (signal.type === "dismiss") {
    return { primary: "dismiss_surface", alternatives: [] };
  }

  if (signal.type === "navigate") {
    return { primary: "navigate", alternatives: [] };
  }

  if (signal.type === "adjust_value") {
    return { primary: "adjust_value", alternatives: [] };
  }

  if (signal.type === "select") {
    return { primary: "select", alternatives: [] };
  }

  if (signal.type !== "summon_ui") {
    return { primary: "noop", alternatives: [] };
  }

  const domain = pickPrimaryDomain(context);
  const domainDef = Domains[domain];
  const primaryIntent = domainDef.intents[0] ?? "inspect";
  const primaryResolved = toResolvedIntent(primaryIntent);

  const alternatives = Object.values(Domains)
    .flatMap((d) => d.intents.map((intent) => `${toResolvedIntent(intent)}:${d.id}`))
    .filter((value) => value !== `${primaryResolved}:${domain}`)
    .slice(0, 8);

  return {
    primary: primaryResolved,
    targetDomain: domain,
    alternatives,
  };
}
