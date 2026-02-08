import * as React from "react";

export type LogSummaryEventKind =
  | "gesture"
  | "movement"
  | "component"
  | "tambo_submit"
  | "tambo_tool";

export type LogSummaryEvent = {
  id: number;
  atMs: number;
  kind: LogSummaryEventKind;
  label: string;
  detail?: Record<string, unknown>;
};

type Listener = () => void;

let nextEventId = 1;

type Snapshot = {
  version: number;
  events: LogSummaryEvent[];
};

let snapshot: Snapshot = { version: 0, events: [] };
const listeners = new Set<Listener>();

const MAX_EVENTS = 250;

function emitChange() {
  const snapshotListeners = Array.from(listeners);
  for (const listener of snapshotListeners) {
    listener();
  }
}

export function appendLogSummaryEvent(
  event: Omit<LogSummaryEvent, "id" | "atMs"> & { atMs?: number },
) {
  const entry: LogSummaryEvent = {
    id: nextEventId,
    atMs: event.atMs ?? Date.now(),
    kind: event.kind,
    label: event.label,
    detail: event.detail,
  };

  nextEventId += 1;
  const nextEvents = snapshot.events;
  nextEvents.push(entry);
  if (nextEvents.length > MAX_EVENTS) {
    nextEvents.splice(0, nextEvents.length - MAX_EVENTS);
  }

  snapshot = { version: snapshot.version + 1, events: nextEvents };
  emitChange();
}

export function clearLogSummaryEvents() {
  snapshot = { version: snapshot.version + 1, events: [] };
  emitChange();
}

export function resetLogSummaryStore() {
  nextEventId = 1;
  snapshot = { version: snapshot.version + 1, events: [] };
  listeners.clear();
}

export function useLogSummaryEvents(): LogSummaryEvent[] {
  const subscribe = React.useCallback((listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getSnapshot = React.useCallback(() => snapshot, []);
  const snap = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return snap.events;
}

export function formatLogSummaryTimestamp(atMs: number): string {
  const date = new Date(atMs);

  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
