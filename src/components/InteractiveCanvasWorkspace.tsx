import * as React from "react";

import { GestureDataButton } from "@/components/GestureDataButton";
import { GestureIntentOrchestrator } from "@/components/interactive-canvas/GestureIntentOrchestrator";
import { GestureSidebar } from "@/components/interactive-canvas/GestureSidebar";
import { InteractiveCanvas } from "@/components/interactive-canvas/InteractiveCanvas";
import { LogSummarySidebar } from "@/components/interactive-canvas/LogSummarySidebar";
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
          <LogSummarySidebar />
          <GestureIntentOrchestrator />
        </SurfaceManagerProvider>
      </div>
      {/* Gesture Data Explorer Button - Fixed position in top right */}
      <div className="fixed top-4 right-4 z-40">
        <GestureDataButton />
      </div>
      <VirtualCursor />
      <SensingStatus />
    </SensingProvider>
  );
}
