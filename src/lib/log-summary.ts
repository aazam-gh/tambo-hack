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
let events: LogSummaryEvent[] = [];
const listeners = new Set<Listener>();

const MAX_EVENTS = 250;

function emitChange() {
  for (const listener of listeners) {
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
  events = [...events, entry].slice(-MAX_EVENTS);
  emitChange();
}

export function clearLogSummaryEvents() {
  events = [];
  emitChange();
}

export function useLogSummaryEvents(): LogSummaryEvent[] {
  const subscribe = React.useCallback((listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getSnapshot = React.useCallback(() => events, []);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
