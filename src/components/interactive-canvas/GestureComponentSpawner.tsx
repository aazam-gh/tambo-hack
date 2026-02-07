import * as React from "react";

import { useSensing } from "@/components/SensingProvider";
import { Form } from "@/components/tambo/form";
import { Graph } from "@/components/tambo/graph";
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

const componentBuilders: Record<GestureSpawnComponent, (id: number) => React.ReactNode> = {
  Form: buildDemoForm,
  Graph: buildDemoChart,
  Modal: buildDemoModal,
};

function buildComponentForGesture(action: GestureAction): React.ReactNode {
  const mapping = gestureMappings[action.gesture];
  if (!mapping) {
    console.error("Missing gesture mapping", { action });
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
  const { gestureAction, consumeGestureAction } = useSensing();

  // Effects run twice in development under React.StrictMode, so we
  // de-dupe by action id to avoid spawning duplicate canvas items.
  // This component also consumes (clears) each action so it behaves like an event.
  // `gestureAction` is intended to have a single consumer.
  const lastHandledActionIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!gestureAction) {
      return;
    }

    const action = gestureAction;
    const actionId = action.id;

    if (lastHandledActionIdRef.current === actionId) {
      return;
    }

    try {
      const component = buildComponentForGesture(action);
      if (component) {
        const messageId = `gesture-${actionId}-${Math.round(action.at)}`;

        emitTamboShowComponent({
          messageId,
          component,
        });
      } else if (import.meta.env.DEV) {
        console.warn("Gesture action consumed with no component produced", {
          action,
        });
      }
    } catch (error) {
      console.error("Error handling gesture action", {
        action,
        error,
      });
    } finally {
      // Consume the action we observed so stale actions don't linger in context.
      lastHandledActionIdRef.current = actionId;
      consumeGestureAction(actionId);
    }
  }, [consumeGestureAction, gestureAction]);

  return null;
}
