/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { AlertList, alertListSchema } from "@/components/tambo/alert-list";
import { Callout, calloutSchema } from "@/components/tambo/callout";
import { Checklist, checklistSchema } from "@/components/tambo/checklist";
import {
  ComposableGraph,
  composableGraphSchema,
} from "@/components/tambo/composable-graph";
import { Form, formSchema } from "@/components/tambo/form";
import { Graph, graphSchema } from "@/components/tambo/graph";
import { LogViewer, logViewerSchema } from "@/components/tambo/log-viewer";
import { MetricCard, metricCardSchema } from "@/components/tambo/metric-card";
import { Modal, modalSchema } from "@/components/tambo/modal";
import {
  PipelineStatus,
  pipelineStatusSchema,
} from "@/components/tambo/pipeline-status";
import { Summary, summarySchema } from "@/components/tambo/summary";
import { Table, tableSchema } from "@/components/tambo/table";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";

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
    name: "AlertList",
    description:
      "A list of alerts with severity levels. Use for infra health overviews and incident summaries.",
    component: AlertList,
    propsSchema: alertListSchema,
  },
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
    name: "ComposableGraph",
    description:
      "A composable graph that renders a chart as micro-primitives (Axis, DataLine, Legend, Tooltip, FilterControl) so the UI can be assembled per intent.",
    component: ComposableGraph,
    propsSchema: composableGraphSchema,
  },
  {
    name: "LogViewer",
    description:
      "A compact log viewer showing timestamped log lines with severity.",
    component: LogViewer,
    propsSchema: logViewerSchema,
  },
  {
    name: "MetricCard",
    description:
      "A metric card for displaying a labeled value with an optional unit and change indicator. Use `change` to show a positive/negative delta.",
    component: MetricCard,
    propsSchema: metricCardSchema,
  },
  {
    name: "Form",
    description:
      "A dynamic, schema-driven form component that renders text inputs, textareas, numbers, emails, and checkboxes. Submits locally and shows the payload for demo/prototyping.",
    component: Form,
    propsSchema: formSchema,
  },
  {
    name: "Modal",
    description:
      "A modal dialog with an open trigger and a dismissible overlay. Useful for confirmations, details panels, and quick callouts.",
    component: Modal,
    propsSchema: modalSchema,
  },
  {
    name: "PipelineStatus",
    description:
      "A pipeline status card showing recent runs and step-level states.",
    component: PipelineStatus,
    propsSchema: pipelineStatusSchema,
  },
  {
    name: "Summary",
    description:
      "A short summary card with a title and bullet points. Use for explanations and key takeaways.",
    component: Summary,
    propsSchema: summarySchema,
  },
  {
    name: "Table",
    description:
      "A compact table component with explicit columns and row objects.",
    component: Table,
    propsSchema: tableSchema,
  },
  // Add more components here
];

