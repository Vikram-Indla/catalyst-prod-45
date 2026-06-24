/**
 * Lead-time resolution for the timeline dependency popovers.
 *
 * A work item's "effective end date" is resolved via a fallback chain:
 *   1. the item's own due / end date            → source 'due'   (badge "End date")
 *   2. else the assigned sprint/iteration end    → source 'sprint' (badge "Sprint")
 *   3. else the assigned release date            → source 'release' (badge "Release")
 *
 * Lead time = calendar days from `today` to that end date (positive = days
 * remaining, negative = overdue). The resolved `source` drives a badge so the
 * user can see WHICH field produced the date.
 *
 * Sprint + release are first-class inputs here even though the sync does not
 * populate them yet — the resolver reads them when present, so the moment the
 * fields are wired through the data layer the lead time fills in automatically.
 */

export type EndDateSource = 'due' | 'sprint' | 'release';

export interface LeadTimeInput {
  dueDate?: string | null;
  sprintEndDate?: string | null;
  sprintName?: string | null;
  releaseDate?: string | null;
  releaseName?: string | null;
}

export interface ResolvedEnd {
  endDate: string | null;
  source: EndDateSource | null;
  /** Human name of the sprint/release the date came from (null for 'due'). */
  sourceName: string | null;
}

/** Apply the due → sprint → release fallback chain. */
export function resolveEffectiveEnd(i: LeadTimeInput): ResolvedEnd {
  if (i.dueDate) return { endDate: i.dueDate, source: 'due', sourceName: null };
  if (i.sprintEndDate) return { endDate: i.sprintEndDate, source: 'sprint', sourceName: i.sprintName ?? null };
  if (i.releaseDate) return { endDate: i.releaseDate, source: 'release', sourceName: i.releaseName ?? null };
  return { endDate: null, source: null, sourceName: null };
}

/** Calendar days from `todayIso` to `endDate`. null when either is missing/invalid. */
export function computeLeadTimeDays(endDate: string | null, todayIso: string): number | null {
  if (!endDate) return null;
  const e = Date.parse(endDate);
  const t = Date.parse(todayIso);
  if (Number.isNaN(e) || Number.isNaN(t)) return null;
  return Math.round((e - t) / 86_400_000);
}

/** Jira-style day text. "5 days" / "1 day" / "3 days overdue" / "—". */
export function formatLeadTime(days: number | null): string {
  if (days === null) return '—';
  const n = Math.abs(days);
  const unit = `${n} day${n === 1 ? '' : 's'}`;
  if (days < 0) return `${unit} overdue`;
  return unit;
}

/** Badge label per source. */
export function sourceLabel(source: EndDateSource | null): string | null {
  if (source === 'due') return 'End date';
  if (source === 'sprint') return 'Sprint';
  if (source === 'release') return 'Release';
  return null;
}
