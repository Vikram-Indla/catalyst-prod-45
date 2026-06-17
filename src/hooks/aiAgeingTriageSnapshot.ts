/**
 * aiAgeingTriageSnapshot — synchronous localStorage store for the last Caty
 * ageing-triage result, so the generated cards survive an unmount / tab switch
 * instead of vanishing back to the "Review" button.
 *
 * Mirrors aiThemesSnapshot. The server (ai_ageing_triage_cache) is the source
 * of truth and the no-delta guard makes a re-run cheap; this is the client-side
 * "hold the data if there is any" layer so the user sees their last result
 * immediately on remount.
 */

export interface TriageResultSnapshot {
  issueKey: string;
  summary: string;
  daysOpen: number;
  reason: string;
  suggestion: string;
}

const KEY = 'for-you:ageing-triage:snapshot';

export function readAgeingTriageSnapshot(): TriageResultSnapshot[] | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed as TriageResultSnapshot[];
  } catch {
    return undefined;
  }
}

export function writeAgeingTriageSnapshot(results: TriageResultSnapshot[]): void {
  try {
    if (!Array.isArray(results)) return;
    localStorage.setItem(KEY, JSON.stringify(results));
  } catch {
    /* quota / privacy-mode — snapshot is best-effort, never throw */
  }
}
