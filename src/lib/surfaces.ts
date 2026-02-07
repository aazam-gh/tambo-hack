import type { DomainId, DomainIntent } from "@/lib/domains";

export type SurfaceId = string;

export type SurfaceTransform = {
  scale?: number;
  position?: { x: number; y: number };
  linkedSurfaces?: SurfaceId[];
};

export type Surface = {
  id: SurfaceId;
  domain: DomainId;
  intent: DomainIntent;
  query: Record<string, unknown>;
  actions: DomainIntent[];
};

export type SurfaceMeta = Pick<Surface, "domain" | "intent" | "query" | "actions">;
