import type { DomainId, DomainIntent } from "@/lib/domains";

export type SurfaceId = string;

export type Surface = {
  id: SurfaceId;
  domain: DomainId;
  intent: DomainIntent;
  query: Record<string, unknown>;
  actions: DomainIntent[];
};

export type SurfaceMeta = Pick<Surface, "domain" | "intent" | "query" | "actions">;
