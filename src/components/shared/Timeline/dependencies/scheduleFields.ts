/**
 * Best-effort extraction of an issue's assigned sprint/iteration and release
 * from its Jira `raw_json`. Used to resolve a lead-time end date when the item
 * has no explicit due date.
 *
 * PLACEHOLDER WIRING (2026-06-24): no synced issue carries these fields yet
 * (sprint customfield + fixVersions are empty across the dataset). These
 * readers parse the standard Jira field shapes — a sprint object array on
 * customfield_10020 (each with `endDate`/`name`) and a fixVersions array (each
 * a Jira version with `releaseDate`/`name`). The moment the sync starts
 * populating those fields the lead time fills in with no further code change.
 *
 * If a future sync stores only the sprint/version NAME (no embedded date), the
 * documented next step is to join the name to `injira_sprints.end_date` /
 * `ph_versions.release_date` here.
 */

export interface SprintField {
  endDate: string | null;
  name: string | null;
}

export interface ReleaseField {
  date: string | null;
  name: string | null;
}

export function extractSprint(rawJson: any): SprintField {
  const arr = rawJson?.fields?.customfield_10020;
  if (!Array.isArray(arr) || arr.length === 0) return { endDate: null, name: null };
  // Last entry = most recent sprint assignment.
  const s = arr[arr.length - 1];
  return { endDate: s?.endDate ?? null, name: s?.name ?? null };
}

export function extractRelease(rawJson: any): ReleaseField {
  const fv = rawJson?.fields?.fixVersions;
  if (!Array.isArray(fv) || fv.length === 0) return { date: null, name: null };
  // Prefer the first version that carries a release date.
  const v = fv.find((x: any) => x?.releaseDate) ?? fv[0];
  return { date: v?.releaseDate ?? null, name: v?.name ?? null };
}
