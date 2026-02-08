import * as React from "react";

import { GestureIntentOrchestrator } from "@/components/interactive-canvas/GestureIntentOrchestrator";
import { GestureSidebar } from "@/components/interactive-canvas/GestureSidebar";
import { InteractiveCanvas } from "@/components/interactive-canvas/InteractiveCanvas";
import { SensingProvider } from "@/components/SensingProvider";
import { SensingStatus } from "@/components/SensingStatus";
import { VirtualCursor } from "@/components/VirtualCursor";
import { SurfaceManagerProvider } from "@/lib/surface-manager";
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
        <SurfaceManagerProvider>
          <GestureSidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />
          <InteractiveCanvas className="flex-1" />
          <GestureIntentOrchestrator />
        </SurfaceManagerProvider>
      </div>
      <VirtualCursor />
      <SensingStatus />
    </SensingProvider>
  );
}
