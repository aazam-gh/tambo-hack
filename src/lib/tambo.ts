/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { Form, formSchema } from "@/components/tambo/form";
import { Modal, modalSchema } from "@/components/tambo/modal";
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
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
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
  // Add more components here
];

