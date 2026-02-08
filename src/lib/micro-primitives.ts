import { z } from "zod/v3";

import type { DomainId, DomainIntent } from "@/lib/domains";

export const microPrimitiveSchema = z.enum([
  "Axis",
  "DataLine",
  "Legend",
  "FilterControl",
  "Tooltip",
]);

export type MicroPrimitive = z.infer<typeof microPrimitiveSchema>;

export type MicroComposition = {
  id: string;
  label: string;
  primitives: MicroPrimitive[];
  incremental?: boolean;
};

// Max primitives per composition to keep widget density/layout manageable.
const MAX_MICRO_PRIMITIVES = 5;

export function normalizeMicroPrimitives(
  primitives: readonly MicroPrimitive[],
): MicroPrimitive[] {
  const unique = [...new Set(primitives)];
  return unique.slice(0, MAX_MICRO_PRIMITIVES);
}

function compositionsForIntent(
  domain: DomainId,
  intent: DomainIntent,
): MicroComposition[] {
  if (intent === "compare") {
    return [
      {
        id: "compare:overlay",
        label: "Compare series",
        primitives: ["Axis", "DataLine", "Legend", "Tooltip"],
      },
      {
        id: "compare:filter",
        label: "Compare with filter",
        primitives: ["Axis", "DataLine", "Legend", "FilterControl", "Tooltip"],
      },
    ];
  }

  if (intent === "filter") {
    return [
      {
        id: "filter:control",
        label: "Filter + inspect",
        primitives: ["FilterControl", "Axis", "DataLine", "Tooltip"],
      },
      {
        id: "filter:minimal",
        label: "Filter quick view",
        primitives: ["FilterControl", "DataLine"],
      },
    ];
  }

  if (intent === "explain") {
    return [];
  }

  if (domain === "infra") {
    return [
      {
        id: "inspect:full",
        label: "Inspect chart",
        primitives: ["Axis", "DataLine", "FilterControl", "Tooltip"],
      },
      {
        id: "inspect:compact",
        label: "Compact",
        primitives: ["Axis", "DataLine", "Tooltip"],
      },
    ];
  }

  return [
    {
      id: "inspect:full",
      label: "Inspect chart",
      primitives: ["Axis", "DataLine", "Legend", "Tooltip"],
    },
    {
      id: "inspect:compact",
      label: "Compact",
      primitives: ["Axis", "DataLine", "Tooltip"],
    },
  ];
}

export function getMicroCompositions(
  domain: DomainId,
  intent: DomainIntent,
): MicroComposition[] | null {
  if (domain !== "sales" && domain !== "infra" && domain !== "marketing") {
    return null;
  }

  const compositions = compositionsForIntent(domain, intent);
  if (compositions.length === 0) {
    return null;
  }

  return compositions.map((composition) => ({
    ...composition,
    incremental: composition.incremental ?? true,
    primitives: normalizeMicroPrimitives(composition.primitives),
  }));
}
