import * as React from "react";

import { GestureSidebar } from "@/components/interactive-canvas/GestureSidebar";
import { InteractiveCanvas } from "@/components/interactive-canvas/InteractiveCanvas";
import { cn } from "@/lib/utils";

export type InteractiveCanvasWorkspaceProps = {
  className?: string;
};

export function InteractiveCanvasWorkspace({
  className,
}: InteractiveCanvasWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className={cn("flex w-full", className)}>
      <GestureSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <InteractiveCanvas className="flex-1" />
    </div>
  );
}
