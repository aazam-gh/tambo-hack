/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Callout, calloutSchema } from "@/components/tambo/callout";
import { Checklist, checklistSchema } from "@/components/tambo/checklist";
import { Graph, graphSchema } from "@/components/tambo/graph";
import { MetricCard, metricCardSchema } from "@/components/tambo/metric-card";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod/v3";

export const tools: TamboTool[] = [
  // Add tools here
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "Callout",
    description:
      "A callout card for highlighting information, success states, warnings, or errors. Use `tone` to set the visual style (info/success/warning/error).",
    component: Callout,
    propsSchema: calloutSchema,
  },
  {
    name: "Checklist",
    description:
      "A checklist card with a title and a list of items. Each item supports an optional `checked` boolean to show completion state.",
    component: Checklist,
    propsSchema: checklistSchema,
  },
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "MetricCard",
    description:
      "A metric card for displaying a labeled value with an optional unit and change indicator. Use `change` to show a positive/negative delta.",
    component: MetricCard,
    propsSchema: metricCardSchema,
  },
  // Add more components here
];

