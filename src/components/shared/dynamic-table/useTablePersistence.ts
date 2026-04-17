import { useCallback, useEffect, useState } from 'react';
import type { ColumnSizingState, VisibilityState } from '@tanstack/react-table';

type Persisted = { v?: VisibilityState; s?: ColumnSizingState };

const storageKey = (tableId: string) => `catalyst.dynamic-table.${tableId}`;

function read(tableId: string): Persisted {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(tableId));
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function write(tableId: string, next: Persisted) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(tableId), JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Keeps column visibility + sizing in localStorage, keyed by `tableId`.
 * Returns the controlled state + setters shaped for TanStack table props.
 */
export function useTablePersistence(
  tableId: string,
  defaults: { visibility?: VisibilityState; sizing?: ColumnSizingState } = {}
) {
  const [visibility, setVisibility] = useState<VisibilityState>(() => {
    const stored = read(tableId).v;
    return { ...(defaults.visibility ?? {}), ...(stored ?? {}) };
  });
  const [sizing, setSizing] = useState<ColumnSizingState>(() => {
    const stored = read(tableId).s;
    return { ...(defaults.sizing ?? {}), ...(stored ?? {}) };
  });

  useEffect(() => {
    write(tableId, { v: visibility, s: sizing });
  }, [tableId, visibility, sizing]);

  const onVisibilityChange = useCallback(
    (next: VisibilityState | ((prev: VisibilityState) => VisibilityState)) =>
      setVisibility((prev) => (typeof next === 'function' ? next(prev) : next)),
    []
  );
  const onSizingChange = useCallback(
    (next: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) =>
      setSizing((prev) => (typeof next === 'function' ? next(prev) : next)),
    []
  );

  return { visibility, onVisibilityChange, sizing, onSizingChange };
}
