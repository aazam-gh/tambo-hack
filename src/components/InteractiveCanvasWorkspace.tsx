import * as React from "react";

import { GestureComponentSpawner } from "@/components/interactive-canvas/GestureComponentSpawner";
import { GestureSidebar } from "@/components/interactive-canvas/GestureSidebar";
import { InteractiveCanvas } from "@/components/interactive-canvas/InteractiveCanvas";
import { SensingProvider } from "@/components/SensingProvider";
import { SensingStatus } from "@/components/SensingStatus";
import { VirtualCursor } from "@/components/VirtualCursor";
import { cn } from "@/lib/utils";

export type InteractiveCanvasWorkspaceProps = {
  className?: string;
};

export function InteractiveCanvasWorkspace({
  className,
}: InteractiveCanvasWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <SensingProvider>
      <div className={cn("flex w-full", className)} data-sensing-surface="true">
        <GestureSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />
        <InteractiveCanvas className="flex-1" />
        <GestureComponentSpawner />
      </div>
      <VirtualCursor />
      <SensingStatus />
    </SensingProvider>
  );
}
