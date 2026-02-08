import * as React from "react";

import { Domains, type DomainId, type DomainIntent } from "@/lib/domains";
import { cn } from "@/lib/utils";

export type DomainSurfaceFrameProps = {
  domain: DomainId;
  intent: DomainIntent;
  title: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
};

export function DomainSurfaceFrame({
  domain,
  intent,
  title,
  children,
  toolbar,
  className,
}: DomainSurfaceFrameProps) {
  const domainDef = Domains[domain];
  const Icon = domainDef.icon;

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-muted/40 text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {title}
            </div>
            <div className="text-xs text-muted-foreground">
              {domainDef.label} • {intent}
            </div>
          </div>
        </div>
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      </div>
      {children}
    </div>
  );
}
