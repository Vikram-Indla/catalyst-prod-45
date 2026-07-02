/**
 * Report picker default resolution — CAT-REPORTS-HUB-20260703-001 (S1.5).
 *
 * Kills the "alphabetical-first" auto-selection:
 *  - exactly one option  → auto-select it
 *  - a valid last-used id in localStorage → restore it
 *  - otherwise           → null (caller renders an empty-state until the user picks)
 *
 * Last selection is shared across reports via a per-entity storage key.
 */
import { useMemo } from 'react';

/** Shared last-used-project key (project pickers across all reports). */
export const REPORTS_LAST_PROJECT_KEY = 'catalyst.reports.lastProject';
/** Shared last-used-sprint key. */
export const REPORTS_LAST_SPRINT_KEY = 'catalyst.reports.lastSprint';
/** Shared last-used-tester key (tester ids are not project ids — separate key). */
export const REPORTS_LAST_TESTER_KEY = 'catalyst.reports.lastTester';

function readStored(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/** Persist the user's pick. Call from the picker's onChange. */
export function rememberReportPick(storageKey: string, value: string): void {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    /* storage unavailable — selection just won't persist */
  }
}

/**
 * Resolve the active option for a report picker.
 * `selected` is the user's in-session pick (wins outright).
 */
export function useReportPickerDefault<T extends { value: string }>(
  storageKey: string,
  options: T[] | undefined,
  selected: T | null,
): T | null {
  return useMemo(() => {
    if (selected) return selected;
    if (!options?.length) return null;
    if (options.length === 1) return options[0];
    const stored = readStored(storageKey);
    if (stored) {
      const match = options.find((o) => o.value === stored);
      if (match) return match;
    }
    return null;
  }, [storageKey, options, selected]);
}
