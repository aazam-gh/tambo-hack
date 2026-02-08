import * as React from "react";

import { GestureCanvasController } from "@/components/interactive-canvas/GestureCanvasController";
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
      {/* Gesture Canvas Controller - Integrated gesture-to-component spawning */}
      <GestureCanvasController />
      <VirtualCursor />
      <SensingStatus />
    </SensingProvider>
  );
}

