import * as React from "react";
import { useRouterState } from "@tanstack/react-router";

import type { DomainId } from "@/lib/domains";

export type InteractionContext = {
  route: string;
  focusedSurface?: string;
  activeDomains: DomainId[];
  recentActions: string[];
  userRole?: string;
};

export type InteractionContextActions = {
  setFocusedSurface: (surfaceId: string | undefined) => void;
  setActiveDomains: (domains: DomainId[]) => void;
  pushRecentAction: (action: string) => void;
  setUserRole: (role: string | undefined) => void;
  clearRecentActions: () => void;
};

const MAX_RECENT_ACTIONS = 20;

function dedupeDomains(domains: DomainId[]): DomainId[] {
  return [...new Set(domains)];
}

const InteractionContextState = React.createContext<InteractionContext | null>(
  null,
);
const InteractionContextActionsContext =
  React.createContext<InteractionContextActions | null>(null);

export function InteractionContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const route = useRouterState({ select: (s) => s.location.pathname });

  const [focusedSurface, setFocusedSurface] = React.useState<string | undefined>(
    undefined,
  );
  const [activeDomains, setActiveDomainsState] = React.useState<DomainId[]>([]);
  const [recentActions, setRecentActions] = React.useState<string[]>([]);
  const [userRole, setUserRole] = React.useState<string | undefined>(undefined);

  const actions = React.useMemo<InteractionContextActions>(
    () => ({
      setFocusedSurface,
      setActiveDomains: (domains) => setActiveDomainsState(dedupeDomains(domains)),
      pushRecentAction: (action) => {
        setRecentActions((prev) => {
          const next = [action, ...prev];
          return next.slice(0, MAX_RECENT_ACTIONS);
        });
      },
      setUserRole,
      clearRecentActions: () => setRecentActions([]),
    }),
    [],
  );

  const value = React.useMemo<InteractionContext>(
    () => ({
      route,
      focusedSurface,
      activeDomains,
      recentActions,
      userRole,
    }),
    [activeDomains, focusedSurface, recentActions, route, userRole],
  );

  return (
    <InteractionContextState.Provider value={value}>
      <InteractionContextActionsContext.Provider value={actions}>
        {children}
      </InteractionContextActionsContext.Provider>
    </InteractionContextState.Provider>
  );
}

export function useInteractionContext(): InteractionContext {
  const context = React.useContext(InteractionContextState);
  if (!context) {
    throw new Error(
      "useInteractionContext must be used within InteractionContextProvider",
    );
  }
  return context;
}

export function useInteractionContextActions(): InteractionContextActions {
  const actions = React.useContext(InteractionContextActionsContext);
  if (!actions) {
    throw new Error(
      "useInteractionContextActions must be used within InteractionContextProvider",
    );
  }
  return actions;
}
