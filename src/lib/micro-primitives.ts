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
  primitives: readonly MicroPrimitive[];
};

const MAX_MICRO_PRIMITIVES = 5;

export function normalizeMicroPrimitives(
  primitives: readonly MicroPrimitive[],
): MicroPrimitive[] {
  const unique = [...new Set(primitives)];
  return unique.slice(0, MAX_MICRO_PRIMITIVES);
}

function compositionsForIntent(intent: DomainIntent): MicroComposition[] {
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
    return [
      {
        id: "explain:annotated",
        label: "Explain with tooltip",
        primitives: ["Axis", "DataLine", "Tooltip"],
      },
      {
        id: "explain:summary",
        label: "Minimal chart",
        primitives: ["Axis", "DataLine"],
      },
    ];
  }

  if (intent === "debug") {
    return [
      {
        id: "debug:inspect",
        label: "Inspect signals",
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
  if (
    (domain === "sales" || domain === "infra" || domain === "marketing") &&
    (intent === "inspect" || intent === "compare" || intent === "filter")
  ) {
    return compositionsForIntent(intent).map((composition) => ({
      ...composition,
      primitives: normalizeMicroPrimitives(composition.primitives),
    }));
  }

  return null;
}
