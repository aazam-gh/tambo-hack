import { InteractiveCanvasWorkspace } from "@/components/InteractiveCanvasWorkspace";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <InteractiveCanvasWorkspace className="h-screen w-full overflow-hidden" />
  );
}
