import * as React from "react";
import { useRouterState } from "@tanstack/react-router";

import type { DomainId } from "@/lib/domains";
import type { SurfaceMeta } from "@/lib/surfaces";

export type InteractionContext = {
  route: string;
  focusedSurface?: string;
  activeDomains: DomainId[];
  recentActions: string[];
  recentDomains: DomainId[];
  recentIntents: string[];
  surfaceDependencies: Record<string, string[]>;
  lastInteractionTimestamps: Record<string, number>;
  userRole?: string;
};

export type InteractionContextActions = {
  setFocusedSurface: (surfaceId: string | undefined, meta?: SurfaceMeta) => void;
  setActiveDomains: (domains: DomainId[]) => void;
  pushRecentAction: (action: string) => void;
  pushRecentDomain: (domain: DomainId) => void;
  pushRecentIntent: (intent: string) => void;
  registerSurfaceMeta: (surfaceId: string, meta: SurfaceMeta) => void;
  setSurfaceDependencies: (surfaceId: string, dependencies: string[]) => void;
  touchSurface: (surfaceId: string, meta?: SurfaceMeta) => void;
  removeSurface: (surfaceId: string) => void;
  setUserRole: (role: string | undefined) => void;
  clearRecentActions: () => void;
};

const MAX_RECENT_ACTIONS = 20;
const MAX_RECENT_DOMAINS = 12;
const MAX_RECENT_INTENTS = 20;

function dedupeDomains(domains: DomainId[]): DomainId[] {
  return [...new Set(domains)];
}

function pushRecentUnique<T>(items: T[], value: T, max: number): T[] {
  const next = [value, ...items.filter((v) => v !== value)];
  return next.slice(0, max);
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

  const [focusedSurface, setFocusedSurfaceState] = React.useState<
    string | undefined
  >(
    undefined,
  );
  const [activeDomains, setActiveDomainsState] = React.useState<DomainId[]>([]);
  const [recentActions, setRecentActions] = React.useState<string[]>([]);
  const [recentDomains, setRecentDomains] = React.useState<DomainId[]>([]);
  const [recentIntents, setRecentIntents] = React.useState<string[]>([]);
  const [surfaceDependencies, setSurfaceDependenciesState] = React.useState<
    Record<string, string[]>
  >({});
  const [lastInteractionTimestamps, setLastInteractionTimestamps] = React.useState<
    Record<string, number>
  >({});
  const [surfaceMetaById, setSurfaceMetaById] = React.useState<
    Record<string, SurfaceMeta>
  >({});
  const [userRole, setUserRole] = React.useState<string | undefined>(undefined);

  const touchSurface = React.useCallback(
    (surfaceId: string, meta?: SurfaceMeta) => {
      const now = Date.now();

      setLastInteractionTimestamps((prev) => ({ ...prev, [surfaceId]: now }));

      if (meta) {
        setSurfaceMetaById((prev) => ({ ...prev, [surfaceId]: meta }));
        setRecentDomains((prev) => pushRecentUnique(prev, meta.domain, MAX_RECENT_DOMAINS));
        setRecentIntents((prev) =>
          pushRecentUnique(prev, meta.intent, MAX_RECENT_INTENTS),
        );
      }
    },
    [],
  );

  const actions = React.useMemo<InteractionContextActions>(
    () => ({
      setFocusedSurface: (surfaceId, meta) => {
        setFocusedSurfaceState(surfaceId);
        if (surfaceId) {
          touchSurface(surfaceId, meta ?? surfaceMetaById[surfaceId]);
        }
      },
      setActiveDomains: (domains) => setActiveDomainsState(dedupeDomains(domains)),
      pushRecentAction: (action) => {
        setRecentActions((prev) => {
          const next = [action, ...prev];
          return next.slice(0, MAX_RECENT_ACTIONS);
        });
      },
      pushRecentDomain: (domain) =>
        setRecentDomains((prev) => pushRecentUnique(prev, domain, MAX_RECENT_DOMAINS)),
      pushRecentIntent: (intent) =>
        setRecentIntents((prev) => pushRecentUnique(prev, intent, MAX_RECENT_INTENTS)),
      registerSurfaceMeta: (surfaceId, meta) => {
        touchSurface(surfaceId, meta);
      },
      setSurfaceDependencies: (surfaceId, dependencies) => {
        setSurfaceDependenciesState((prev) => ({
          ...prev,
          [surfaceId]: [...dependencies],
        }));
      },
      touchSurface,
      removeSurface: (surfaceId) => {
        setSurfaceDependenciesState((prev) => {
          if (!(surfaceId in prev)) {
            return prev;
          }
          const { [surfaceId]: _ignored, ...next } = prev;
          return next;
        });
        setLastInteractionTimestamps((prev) => {
          if (!(surfaceId in prev)) {
            return prev;
          }
          const { [surfaceId]: _ignored, ...next } = prev;
          return next;
        });
        setSurfaceMetaById((prev) => {
          if (!(surfaceId in prev)) {
            return prev;
          }
          const { [surfaceId]: _ignored, ...next } = prev;
          return next;
        });

        setFocusedSurfaceState((current) =>
          current === surfaceId ? undefined : current,
        );
      },
      setUserRole,
      clearRecentActions: () => setRecentActions([]),
    }),
    [surfaceMetaById, touchSurface],
  );

  const value = React.useMemo<InteractionContext>(
    () => ({
      route,
      focusedSurface,
      activeDomains,
      recentActions,
      recentDomains,
      recentIntents,
      surfaceDependencies,
      lastInteractionTimestamps,
      userRole,
    }),
    [
      activeDomains,
      focusedSurface,
      lastInteractionTimestamps,
      recentActions,
      recentDomains,
      recentIntents,
      route,
      surfaceDependencies,
      userRole,
    ],
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
