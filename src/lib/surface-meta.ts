import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import type { SurfaceMeta } from "@/lib/surfaces";

export function buildDefaultSurfaceMeta(
  domain: DomainId,
  intent: DomainIntent,
): SurfaceMeta {
  const domainDef = Domains[domain];
  const query = { rangeDays: 14 };
  const actions = domainDef.intents.filter((i) => i !== intent);

  return {
    domain,
    intent,
    query,
    actions: [...actions],
  };
}
