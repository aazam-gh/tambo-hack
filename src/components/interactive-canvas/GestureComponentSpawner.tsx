import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { Form } from "@/components/tambo/form";
import { Graph } from "@/components/tambo/graph";
import { Modal } from "@/components/tambo/modal";
import { gestureMappings, type GestureAction } from "@/lib/gesture-mapping";
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

function buildComponentForGesture(action: GestureAction): React.ReactNode {
  const componentName = gestureMappings[action.gesture].componentName;

  switch (componentName) {
    case "Form":
      return buildDemoForm(action.id);
    case "Graph":
      return buildDemoChart(action.id);
    case "Modal":
      return buildDemoModal(action.id);
    default: {
      const exhaustiveCheck: never = componentName;
      return exhaustiveCheck;
    }
  }
}

export function GestureComponentSpawner() {
  const { gestureAction } = useSensing();

  // Effects run twice in development under React.StrictMode, so we
  // de-dupe by action id to avoid spawning duplicate canvas items.
  const lastHandledIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!gestureAction) {
      return;
    }

    if (lastHandledIdRef.current === gestureAction.id) {
      return;
    }

    lastHandledIdRef.current = gestureAction.id;

    const messageId = `gesture-${gestureAction.id}`;

    emitTamboShowComponent({
      messageId,
      component: buildComponentForGesture(gestureAction),
    });
  }, [gestureAction]);

  return null;
}
