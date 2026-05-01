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

/** Section slugs we never want to record (ticket detail / modal). */
const EXCLUDED_SECTIONS = new Set(['story', 'issue', 'epic', 'feature']);

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
  const existing = readStore().filter((e) => e.path !== path);
  const next: StoredEntry[] = [
    { projectKey, path, section, visitedAt: now },
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

  const entries = readStore().slice(0, limit);
  const keys = Array.from(new Set(entries.map((e) => e.projectKey)));

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['recent-locations', entries.map((e) => e.path).join('|'), tick],
    enabled: keys.length > 0,
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
