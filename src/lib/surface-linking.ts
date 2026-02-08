import type { DomainId, DomainIntent } from "@/lib/domains";
import type { SurfaceId } from "@/lib/surfaces";

export type SurfaceLinkType = "filter" | "highlight";

export type SurfaceGraph = Record<
  SurfaceId,
  { linkedSurfaces: SurfaceId[]; linkType: SurfaceLinkType }
>;

export type SurfaceLinkSuggestion = {
  domain: DomainId;
  intent: DomainIntent;
  label: string;
  presetQuery?: Record<string, unknown>;
};

export type SurfaceLinkGroup = {
  linkType: SurfaceLinkType;
  linkedSurfaces: SurfaceLinkSuggestion[];
};

export function getAutoLinkedSurfaceGroup(
  domain: DomainId,
  intent: DomainIntent,
): SurfaceLinkGroup | null {
  // Infra spike -> logs surface (filter link)
  if (domain === "infra" && intent === "explain") {
    return {
      linkType: "filter",
      linkedSurfaces: [
        {
          domain: "infra",
          intent: "filter",
          label: "Logs (filtered)",
          presetQuery: { service: "api" },
        },
      ],
    };
  }

  // Sales -> marketing CTR (highlight link)
  if (domain === "sales") {
    return {
      linkType: "highlight",
      linkedSurfaces: [
        {
          domain: "marketing",
          intent: "inspect",
          label: "Marketing CTR",
        },
      ],
    };
  }

  return null;
}

export function describeLinkType(linkType: SurfaceLinkType): string {
  return linkType === "filter" ? "Filter link" : "Highlight link";
}
