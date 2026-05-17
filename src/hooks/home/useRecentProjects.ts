/**
 * useRecentProjects — surfaces the user's most recently visited
 * project sub-pages on the Home rail.
 *
 * Mental model
 * ────────────
 *   Each entry is a (projectKey, sectionPath, sectionLabel) tuple — NOT
 *   just a project. Visiting Senaei BAU Backlog and Senaei BAU Dashboard
 *   produces two distinct rows: "Senaei BAU › Backlog" and "Senaei BAU
 *   › Dashboard". This matches Jira's recent-pages behaviour.
 *
 *   Scope (intentional):
 *   - ONLY /project-hub/:key/<section> URLs are tracked.
 *   - Tickets and modal openers are excluded — we never surface
 *     ticket-grain navigation here.
 *   - Global hub roots (Product Hub, Test Hub) are NOT tracked — those
 *     belong to the global hub switcher, not this rail.
 *
 * Storage shape (key: `catalyst.recentLocations.v2`):
 *   Array<{
 *     projectKey: string;
 *     path: string;        // full URL path the entry navigates to
 *     section: string;     // canonical section slug (e.g. "backlog")
 *     visitedAt: number;
 *   }>  // newest first, deduped by path, capped at MAX_ENTRIES
 *
 * Hydration:
 *   On read we fetch `ph_projects` rows (icon, color, name) and join
 *   them onto each entry, dropping rows whose project is archived or
 *   no longer exists.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'catalyst.recentLocations.v2';
const LEGACY_STORAGE_KEY = 'catalyst.recentProjects.v1';
const MAX_ENTRIES = 16;

export interface RecentLocation {
  projectKey: string;
  path: string;
  section: string;
  sectionLabel: string;
  projectName: string;
  iconName: string | null;
  color: string | null;
  visitedAt: number;
}

interface StoredEntry {
  projectKey: string;
  path: string;
  section: string;
  visitedAt: number;
}

/**
 * Canonical section-slug → human label. Anything not in this map gets a
 * Title-Cased fallback derived from the slug (e.g. "risk-scanner" → "Risk
 * Scanner"), so adding new project routes Just Works without a code
 * change here.
 */
const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  backlog: 'Backlog',
  board: 'Board',
  boards: 'Boards',
  allwork: 'All work',
  list: 'List',
  timeline: 'Timeline',
  releases: 'Releases',
  reports: 'Reports',
  settings: 'Settings',
  hierarchy: 'Hierarchy',
  'sprint-predictor': 'Release Predictor',
  'risk-scanner': 'Risk Scanner',
  'epic-backlog': 'Backlog',
  'feature-backlog': 'Backlog',
  'story-backlog': 'Backlog',
};

/**
 * Canonical sidebar nav sections — the only sections surfaced in the
 * HomeSidebar Recent list. Anything not in this set is a ticket-grain
 * or non-navigable sub-path and is excluded at record time.
 */
// Exact section slugs that appear as nav items in ProjectHubSidebar.
// Derived from the actual `id` values in ProjectHubSidebar.tsx — do not
// add slugs speculatively. If a new sidebar item is added there, add its
// slug here too.
const CANONICAL_NAV_SECTIONS = new Set([
  'dashboard',
  'boards',
  'backlog',
  'allwork',
  'settings',
  // Additional hub-specific sections that have real sidebar routes:
  'sprint-predictor',
  'risk-scanner',
  'epic-backlog',
  'feature-backlog',
  'story-backlog',
  'releases',
  'hierarchy',
  'timeline',
  'reports',
]);

/** Section slugs we never want to record (ticket detail / modal). */
const EXCLUDED_SECTIONS = new Set(['story', 'issue', 'epic', 'feature', 'issues']);

/**
 * Maps a raw section slug to its DISPLAY family — the bucket the Recent
 * sidebar collapses entries into.
 *
 * Why this exists
 * ───────────────
 * The Recent list dedupes by raw `path` so visiting two different URLs
 * always produces two rows. But the display label is derived from the
 * section slug via SECTION_LABELS, and multiple slugs intentionally map
 * to the same label — `backlog`, `epic-backlog`, `feature-backlog`,
 * `story-backlog` all render as "Backlog". Without grouping at the
 * dedup layer, the user sees N identical-looking rows with different
 * timestamps (RCA: 2026-05-17, BAU › Backlog ×4 in the sidebar).
 *
 * The fix is to dedup on (projectKey + family) rather than full path.
 * Path is still stored so clicking the row navigates to whichever
 * variant the user most recently used.
 *
 * Extending: when adding a new SECTION_LABELS entry that intentionally
 * shares a label with an existing slug, add the slug → family mapping
 * here too. Slugs not listed map to themselves (1-to-1 with display).
 */
const SECTION_FAMILY: Record<string, string> = {
  backlog: 'backlog',
  'epic-backlog': 'backlog',
  'feature-backlog': 'backlog',
  'story-backlog': 'backlog',
  // boards + board: both render as "Boards"/"Board" — collapse if they
  // ever appear as separate routes. Currently `boards` is the canonical
  // slug; if a singular `board` route gets added, mirror it here.
  boards: 'boards',
  board: 'boards',
};

function sectionFamily(section: string): string {
  return SECTION_FAMILY[section] ?? section;
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((s) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join(' ');
}

function labelForSection(section: string): string {
  return SECTION_LABELS[section] ?? titleCase(section);
}

function readStore(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: StoredEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode — silently degrade */
  }
}

/** One-time migration of the old v1 project-only store into v2. */
function migrateLegacyIfNeeded() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return;
    const legacy = JSON.parse(legacyRaw);
    if (!Array.isArray(legacy)) return;
    const migrated: StoredEntry[] = legacy
      .filter((e: any) => e && typeof e.projectKey === 'string')
      .map((e: any) => ({
        projectKey: e.projectKey,
        path: `/project-hub/${e.projectKey}/dashboard`,
        section: 'dashboard',
        visitedAt: typeof e.visitedAt === 'number' ? e.visitedAt : Date.now(),
      }));
    writeStore(migrated.slice(0, MAX_ENTRIES));
  } catch {
    /* ignore */
  }
}

/**
 * Append a location visit to the log. Dedupes by full path, keeps newest
 * MAX_ENTRIES, and dispatches a window event so live consumers refresh
 * without polling.
 */
export function recordLocationVisit(input: {
  projectKey: string;
  path: string;
  section: string;
}) {
  const { projectKey, path, section } = input;
  if (!projectKey || !path) return;
  const now = Date.now();

  // Normalize path → section ROOT. The caller often passes
  // `location.pathname` verbatim, which on detail routes carries an issue
  // key tail (e.g. `/project-hub/BAU/backlog/BAU-5717`). Storing the
  // verbatim path means every issue-detail click creates a new row that
  // all read "BAU › Backlog" in the sidebar (RCA 2026-05-17 — deep-path
  // dedup bypass). Section-root normalization is what the dedup-by-path
  // contract was always meant to imply.
  const normalizedPath = `/project-hub/${projectKey}/${section}`;

  // Dedup by (projectKey + section-family). Family collapses display-label
  // collisions (`backlog`, `epic-backlog`, `feature-backlog`, `story-
  // backlog` all → "Backlog"), so visiting the epic-backlog after the
  // story-backlog evicts the older row instead of stacking up.
  const family = sectionFamily(section);
  const existing = readStore().filter(
    (e) => !(e.projectKey === projectKey && sectionFamily(e.section) === family),
  );
  const next: StoredEntry[] = [
    { projectKey, path: normalizedPath, section, visitedAt: now },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  writeStore(next);
  window.dispatchEvent(new CustomEvent('catalyst:recent-locations-updated'));
}

/**
 * Mount-once recorder — extracts (projectKey, section, path) from
 * `/project-hub/:key/:section/...` and writes a visit on each route
 * change. Mounted in CatalystShell so it runs on every page.
 *
 * Skips:
 *   - non-project segments (`all-projects`, `resource-360`)
 *   - ticket-grain sections (`story`, `issue`, `epic`, `feature`)
 *   - the bare `/project-hub/:key` (route immediately redirects to
 *     /dashboard, which we'll capture on the next tick)
 */
export function useRecordProjectVisit() {
  const location = useLocation();
  useEffect(() => {
    const match = location.pathname.match(/^\/project-hub\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return;
    const projectKey = match[1];
    const section = match[2];
    if (!projectKey || projectKey === 'all-projects' || projectKey === 'resource-360') return;
    if (!section) return; // wait for the redirect to land on a real section
    if (EXCLUDED_SECTIONS.has(section)) return;
    if (!CANONICAL_NAV_SECTIONS.has(section)) return;
    recordLocationVisit({
      projectKey,
      path: location.pathname,
      section,
    });
  }, [location.pathname]);
}

/**
 * Read hook — returns hydrated recent locations ordered by visit
 * recency, capped at `limit`. Auto-refreshes when `recordLocationVisit`
 * fires.
 */
export function useRecentProjects(limit = 8) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    migrateLegacyIfNeeded();
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('catalyst:recent-locations-updated', handler);
    return () => window.removeEventListener('catalyst:recent-locations-updated', handler);
  }, []);

  // Read-time dedup safety net: when localStorage was populated BEFORE the
  // recordLocationVisit dedup-by-family fix landed, the store can still hold
  // multiple rows that collapse to the same display label (e.g. 4 backlog-
  // variant rows that all read "BAU › Backlog"). Collapse here too so the
  // sidebar shows the latest entry per (projectKey, family). Newer visits
  // are guaranteed first by the writer's prepend ordering.
  const allEntries = readStore().filter((e) => CANONICAL_NAV_SECTIONS.has(e.section));
  const seenFamily = new Set<string>();
  const entries: StoredEntry[] = [];
  for (const e of allEntries) {
    const familyKey = `${e.projectKey}|${sectionFamily(e.section)}`;
    if (seenFamily.has(familyKey)) continue;
    seenFamily.add(familyKey);
    entries.push(e);
    if (entries.length >= limit) break;
  }
  const keys = Array.from(new Set(entries.map((e) => e.projectKey)));

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['recent-locations', entries.map((e) => e.path).join('|'), tick],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('key, name, icon, color, is_archived')
        .in('key', keys);
      if (error) throw error;
      const byKey = new Map((data ?? []).map((r) => [r.key, r]));
      return entries
        .map<RecentLocation | null>((e) => {
          const row = byKey.get(e.projectKey);
          if (!row || row.is_archived) return null;
          return {
            projectKey: row.key,
            path: e.path,
            section: e.section,
            sectionLabel: labelForSection(e.section),
            projectName: row.name,
            iconName: row.icon,
            color: row.color,
            visitedAt: e.visitedAt,
          };
        })
        .filter((x): x is RecentLocation => x !== null);
    },
  });

  return { recentLocations: locations, loading: isLoading && keys.length > 0 };
}
