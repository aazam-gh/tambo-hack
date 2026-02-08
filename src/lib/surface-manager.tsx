import * as React from "react";

import type { SurfaceMeta, SurfaceId } from "@/lib/surfaces";
import type { SurfaceGraph, SurfaceLinkType } from "@/lib/surface-linking";

export type SurfaceManagerState = {
  surfaces: Record<SurfaceId, SurfaceMeta>;
  graph: SurfaceGraph;
  highlightSourcesBySurface: Record<SurfaceId, SurfaceId[]>;
};

export type SurfaceManagerActions = {
  registerSurface: (surfaceId: SurfaceId, meta: SurfaceMeta) => void;
  dismissSurface: (surfaceId: SurfaceId) => void;
  updateSurfaceQuery: (
    surfaceId: SurfaceId,
    updater:
      | Record<string, unknown>
      | ((prev: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  linkSurfaces: (
    surfaceId: SurfaceId,
    linkedSurfaceIds: SurfaceId[],
    linkType: SurfaceLinkType,
  ) => void;
};

function computeHighlightSources(graph: SurfaceGraph): Record<SurfaceId, SurfaceId[]> {
  const result: Record<SurfaceId, SurfaceId[]> = {};

  for (const [source, entry] of Object.entries(graph)) {
    if (entry.linkType !== "highlight") {
      continue;
    }
    for (const linked of entry.linkedSurfaces) {
      const existing = result[linked] ?? [];
      result[linked] = [...existing, source];
    }
  }

  return result;
}

function uniq(items: string[]): string[] {
  return [...new Set(items)];
}

function normalizeGraph(graph: SurfaceGraph): SurfaceGraph {
  const next: SurfaceGraph = {};
  for (const [surfaceId, entry] of Object.entries(graph)) {
    const linkedSurfaces = uniq(entry.linkedSurfaces);
    if (linkedSurfaces.length === 0) {
      continue;
    }
    next[surfaceId] = { linkedSurfaces, linkType: entry.linkType };
  }
  return next;
}

type StateUpdate = (prev: SurfaceManagerState) => SurfaceManagerState;

const SurfaceManagerStateContext =
  React.createContext<SurfaceManagerState | null>(null);
const SurfaceManagerActionsContext =
  React.createContext<SurfaceManagerActions | null>(null);

export function SurfaceManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<SurfaceManagerState>(() => ({
    surfaces: {},
    graph: {},
    highlightSourcesBySurface: {},
  }));

  const pendingUpdatesRef = React.useRef<StateUpdate[]>([]);
  const flushRafRef = React.useRef<number | null>(null);

  const flushUpdates = React.useCallback(() => {
    flushRafRef.current = null;
    const pending = pendingUpdatesRef.current;
    if (pending.length === 0) {
      return;
    }

    pendingUpdatesRef.current = [];
    setState((prev) => pending.reduce((next, update) => update(next), prev));
  }, []);

  const queueUpdate = React.useCallback(
    (update: StateUpdate) => {
      pendingUpdatesRef.current.push(update);
      if (flushRafRef.current !== null) {
        return;
      }
      flushRafRef.current = window.requestAnimationFrame(flushUpdates);
    },
    [flushUpdates],
  );

  React.useEffect(() => {
    return () => {
      if (flushRafRef.current !== null) {
        cancelAnimationFrame(flushRafRef.current);
      }
    };
  }, []);

  const actions = React.useMemo<SurfaceManagerActions>(
    () => ({
      registerSurface: (surfaceId, meta) => {
        queueUpdate((prev) => {
          if (prev.surfaces[surfaceId] === meta) {
            return prev;
          }
          return {
            ...prev,
            surfaces: {
              ...prev.surfaces,
              [surfaceId]: meta,
            },
          };
        });
      },
      dismissSurface: (surfaceId) => {
        // Idempotent: safe to call even if the surface was never registered.
        queueUpdate((prev) => {
          if (!prev.surfaces[surfaceId] && !prev.graph[surfaceId]) {
            return prev;
          }

          const { [surfaceId]: _removedSurface, ...nextSurfaces } = prev.surfaces;
          const { [surfaceId]: _removedLink, ...remainingGraph } = prev.graph;

          const prunedGraph: SurfaceGraph = {};
          for (const [source, entry] of Object.entries(remainingGraph)) {
            const nextLinked = entry.linkedSurfaces.filter((id) => id !== surfaceId);
            if (nextLinked.length === 0) {
              continue;
            }
            prunedGraph[source] = { ...entry, linkedSurfaces: nextLinked };
          }

          const normalizedGraph = normalizeGraph(prunedGraph);
          const highlightSourcesBySurface = computeHighlightSources(normalizedGraph);

          return {
            surfaces: nextSurfaces,
            graph: normalizedGraph,
            highlightSourcesBySurface,
          };
        });
      },
      updateSurfaceQuery: (surfaceId, updater) => {
        queueUpdate((prev) => {
          const current = prev.surfaces[surfaceId];
          if (!current) {
            return prev;
          }

          const nextQuery =
            typeof updater === "function" ? updater(current.query) : { ...current.query, ...updater };
          const nextSurface: SurfaceMeta = { ...current, query: nextQuery };
          const nextSurfaces: Record<SurfaceId, SurfaceMeta> = {
            ...prev.surfaces,
            [surfaceId]: nextSurface,
          };

          const linkEntry = prev.graph[surfaceId];
          if (linkEntry) {
            const propagateAllFilters = linkEntry.linkType === "filter";
            const parentRangeDays = nextQuery.rangeDays;

            for (const linkedId of linkEntry.linkedSurfaces) {
              const linked = nextSurfaces[linkedId];
              if (!linked) {
                continue;
              }

              const mergedQuery = propagateAllFilters
                ? { ...linked.query, ...nextQuery }
                : {
                    ...linked.query,
                    ...(typeof parentRangeDays === "number"
                      ? { rangeDays: parentRangeDays }
                      : {}),
                  };

              nextSurfaces[linkedId] = { ...linked, query: mergedQuery };
            }
          }

          return {
            ...prev,
            surfaces: nextSurfaces,
          };
        });
      },
      linkSurfaces: (surfaceId, linkedSurfaceIds, linkType) => {
        queueUpdate((prev) => {
          if (linkedSurfaceIds.length === 0) {
            return prev;
          }

          const normalizedLinkedIds = uniq(linkedSurfaceIds);
          const existing = prev.graph[surfaceId];
          const effectiveLinkType = existing?.linkType ?? linkType;
          const combinedLinkedIds = uniq([
            ...(existing?.linkedSurfaces ?? []),
            ...normalizedLinkedIds,
          ]);

          const nextGraph: SurfaceGraph = {
            ...prev.graph,
            [surfaceId]: { linkedSurfaces: combinedLinkedIds, linkType: effectiveLinkType },
          };
          const normalizedGraph = normalizeGraph(nextGraph);
          const highlightSourcesBySurface = computeHighlightSources(normalizedGraph);

          const sourceSurface = prev.surfaces[surfaceId];
          const nextSurfaces: Record<SurfaceId, SurfaceMeta> = { ...prev.surfaces };
          if (sourceSurface) {
            for (const linkedId of combinedLinkedIds) {
              const linkedSurface = nextSurfaces[linkedId];
              if (!linkedSurface) {
                continue;
              }
              if (effectiveLinkType === "filter") {
                nextSurfaces[linkedId] = {
                  ...linkedSurface,
                  query: { ...linkedSurface.query, ...sourceSurface.query },
                };
                continue;
              }

              const parentRangeDays = sourceSurface.query.rangeDays;
              if (typeof parentRangeDays === "number") {
                nextSurfaces[linkedId] = {
                  ...linkedSurface,
                  query: { ...linkedSurface.query, rangeDays: parentRangeDays },
                };
              }
            }
          }

          return {
            surfaces: nextSurfaces,
            graph: normalizedGraph,
            highlightSourcesBySurface,
          };
        });
      },
    }),
    [queueUpdate],
  );

  return (
    <SurfaceManagerStateContext.Provider value={state}>
      <SurfaceManagerActionsContext.Provider value={actions}>
        {children}
      </SurfaceManagerActionsContext.Provider>
    </SurfaceManagerStateContext.Provider>
  );
}

export function useSurfaceManager(): SurfaceManagerState {
  const context = React.useContext(SurfaceManagerStateContext);
  if (!context) {
    throw new Error(
      "useSurfaceManager must be used within SurfaceManagerProvider",
    );
  }
  return context;
}

export function useSurfaceManagerActions(): SurfaceManagerActions {
  const context = React.useContext(SurfaceManagerActionsContext);
  if (!context) {
    throw new Error(
      "useSurfaceManagerActions must be used within SurfaceManagerProvider",
    );
  }
  return context;
}
