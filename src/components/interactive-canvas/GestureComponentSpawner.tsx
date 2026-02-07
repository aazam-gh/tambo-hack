import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { Callout } from "@/components/tambo/callout";
import { Checklist } from "@/components/tambo/checklist";
import { Form } from "@/components/tambo/form";
import { Graph } from "@/components/tambo/graph";
import { MetricCard } from "@/components/tambo/metric-card";
import { Modal } from "@/components/tambo/modal";
import {
  gestureMappings,
  type GestureAction,
  type GestureSpawnComponent,
} from "@/lib/gesture-mapping";
import { emitTamboShowComponent } from "@/lib/tambo-canvas-events";

function buildDemoChart(actionId: number) {
  const base = actionId % 7;
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = labels.map((_, idx) => 20 + ((idx + base) % 7) * 8);

  return (
    <Graph
      title="Weekly activity"
      variant="solid"
      size="sm"
      showLegend={false}
      data={{
        type: "bar",
        labels,
        datasets: [
          {
            label: "Events",
            data,
            color: "hsl(160, 82%, 47%)",
          },
        ],
      }}
    />
  );
}

function buildDemoForm(actionId: number) {
  return (
    <Form
      title={`Contact form #${actionId}`}
      variant="solid"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          placeholder: "Jane Doe",
          required: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "jane@example.com",
          required: true,
        },
        {
          name: "subscribe",
          label: "Subscribe to updates",
          type: "checkbox",
        },
      ]}
      submitLabel="Send"
    />
  );
}

function buildDemoModal(actionId: number) {
  return (
    <Modal
      title={`Modal #${actionId}`}
      body="This modal was created from a hand gesture."
      variant="solid"
      defaultOpen
    />
  );
}

function buildDemoCallout(actionId: number) {
  return (
    <Callout
      tone="info"
      title={`Callout #${actionId}`}
      message="This callout was created from a hand gesture."
    />
  );
}

function buildDemoChecklist(actionId: number) {
  return (
    <Checklist
      title={`Checklist #${actionId}`}
      items={[
        { text: "Gesture detected", checked: true },
        { text: "Component spawned", checked: true },
        { text: "Keep exploring", checked: false },
      ]}
    />
  );
}

function buildDemoMetricCard(actionId: number) {
  const change = (actionId % 5) - 2;

  return (
    <MetricCard
      label="Gesture metric"
      value={actionId}
      unit="events"
      change={change}
      tone="neutral"
    />
  );
}

const componentBuilders: Record<GestureSpawnComponent, (id: number) => React.ReactNode> = {
  Callout: buildDemoCallout,
  Checklist: buildDemoChecklist,
  Form: buildDemoForm,
  Graph: buildDemoChart,
  MetricCard: buildDemoMetricCard,
  Modal: buildDemoModal,
};

function buildComponentForGesture(action: GestureAction): React.ReactNode {
  const mapping = gestureMappings[action.gesture];
  if (!mapping) {
    console.error("Missing gesture mapping", { action });
    return null;
  }

  if (!mapping.componentName) {
    const message =
      "Gesture mapping has no componentName; no component will be spawned";
    if (import.meta.env.DEV) {
      console.warn(message, { action, mapping });
    } else {
      console.error(message, { gesture: action.gesture, id: action.id });
    }
    return null;
  }

  const builder = componentBuilders[mapping.componentName];
  if (!builder) {
    console.error("No component builder for gesture mapping", { mapping, action });
    return null;
  }
  return builder(action.id);
}

export function GestureComponentSpawner() {
  const { gestureAction, clearGestureAction } = useSensing();

  // Effects run twice in development under React.StrictMode, so we
  // de-dupe by action id to avoid spawning duplicate canvas items.
  const lastHandledActionIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!gestureAction) {
      return;
    }

    const actionId = gestureAction.id;
    if (lastHandledActionIdRef.current === actionId) {
      return;
    }

    lastHandledActionIdRef.current = actionId;

    const messageId = `gesture-${actionId}-${Math.round(gestureAction.at)}`;

    const component = buildComponentForGesture(gestureAction);
    if (!component) {
      clearGestureAction();
      return;
    }

    emitTamboShowComponent({
      messageId,
      component,
      clientX: gestureAction.clientX,
      clientY: gestureAction.clientY,
    });
    clearGestureAction();
  }, [clearGestureAction, gestureAction]);

  return null;
}
