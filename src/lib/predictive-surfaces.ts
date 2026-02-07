import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { InteractionContext } from "@/lib/interaction-context";

export type SurfaceTemplate = {
  domain: DomainId;
  intent: DomainIntent;
  reason: string;
};

export type PredictedIntentHypothesis = {
  primary: string;
  targetDomain?: DomainId;
  confidence: number;
  recommendedSurfaces?: SurfaceTemplate[];
};

type ConfirmAction = {
  domain: DomainId;
  intent: DomainIntent;
};

function parseConfirmAction(action: string): ConfirmAction | null {
  if (!action.startsWith("confirm:")) {
    return null;
  }

  const parts = action.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const domain = parts[1];
  const intent = parts[2];

  if (!domain || !intent) {
    return null;
  }

  if (!(domain in Domains)) {
    return null;
  }

  const def = Domains[domain as DomainId];
  if (!(def.intents as readonly string[]).includes(intent)) {
    return null;
  }

  return { domain: domain as DomainId, intent: intent as DomainIntent };
}

export function predictIntentHypothesis(
  context: InteractionContext,
): PredictedIntentHypothesis | null {
  const latestAction = context.recentActions[0];
  const confirm = latestAction ? parseConfirmAction(latestAction) : null;

  if (confirm?.domain === "infra" && confirm.intent === "explain") {
    return {
      primary: "follow_up_infra_spike",
      targetDomain: "infra",
      confidence: 0.9,
      recommendedSurfaces: [
        {
          domain: "infra",
          intent: "inspect",
          reason: "Suggested next: check logs and alerts while the spike is fresh.",
        },
        {
          domain: "infra",
          intent: "filter",
          reason: "Suggested next: narrow to the most urgent alerts.",
        },
      ],
    };
  }

  if (confirm?.domain === "dev" && confirm.intent === "inspect") {
    return {
      primary: "follow_up_pipeline_failures",
      targetDomain: "dev",
      confidence: 0.78,
      recommendedSurfaces: [
        {
          domain: "infra",
          intent: "inspect",
          reason: "Suggested next: check infra signals for a deploy-related regression.",
        },
      ],
    };
  }

  const recentDomains = context.recentDomains;
  if (recentDomains.includes("infra") && recentDomains.includes("dev")) {
    return {
      primary: "cross_domain_infra_dev",
      targetDomain: "infra",
      confidence: 0.6,
      recommendedSurfaces: [
        {
          domain: "dev",
          intent: "inspect",
          reason: "Suggested: recent infra + dev activity often points to a rollout.",
        },
      ],
    };
  }

  return null;
}
