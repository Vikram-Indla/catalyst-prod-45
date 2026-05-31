/**
 * useRecentProjects — surfaces the user's most recently visited
 * project and product sub-pages on the Home rail.
 *
 * Mental model
 * ────────────
 *   Each entry is a (spaceKey, sectionPath, sectionLabel) tuple — NOT
 *   just a space. Visiting Senaei BAU Backlog and Senaei BAU Dashboard
 *   produces two distinct rows. This matches Jira's recent-pages behaviour.
 *
 *   Scope (intentional):
 *   - /project-hub/:key/<section> AND /product-hub/:code/<section> URLs are tracked.
 *   - Tickets and modal openers are excluded.
 *   - Global hub roots (Product Hub home, Test Hub) are NOT tracked.
 *
 * Storage shape (key: `catalyst.recentLocations.v2`):
 *   Array<{
 *     projectKey: string;
 *     path: string;
 *     section: string;
 *     visitedAt: number;
 *     hub?: 'project' | 'product';  // defaults to 'project' for legacy entries
 *   }>
 *
 * Hydration:
 *   Project-hub entries hydrate from `ph_projects`, product-hub entries from `products`.
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
  hub: 'project' | 'product';
}

interface StoredEntry {
  projectKey: string;
  path: string;
  section: string;
  visitedAt: number;
  hub?: 'project' | 'product';
}

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
  filters: 'Filters',
  'sprint-predictor': 'Release Predictor',
  'risk-scanner': 'Risk Scanner',
  'epic-backlog': 'Backlog',
  'feature-backlog': 'Backlog',
  'story-backlog': 'Backlog',
};

/**
 * Canonical sidebar nav sections — covers both Project Hub and Product Hub slugs.
 * Only sections in this set are recorded and surfaced in the Home rail.
 */
const CANONICAL_NAV_SECTIONS = new Set([
  'dashboard',
  'boards',
  'backlog',
  'allwork',
  'settings',
  'filters',
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

/** Top-level product-hub path segments that are NOT per-product spaces. */
const GLOBAL_PRODUCT_HUB_SEGMENTS = new Set(['products', 'filters', 'backlog']);

const SECTION_FAMILY: Record<string, string> = {
  backlog: 'backlog',
  'epic-backlog': 'backlog',
  'feature-backlog': 'backlog',
  'story-backlog': 'backlog',
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
        hub: 'project' as const,
      }));
    writeStore(migrated.slice(0, MAX_ENTRIES));
  } catch {
    /* ignore */
  }
}

export function recordLocationVisit(input: {
  projectKey: string;
  path: string;
  section: string;
  hub?: 'project' | 'product';
}) {
  const { projectKey, path, section, hub = 'project' } = input;
  if (!projectKey || !path) return;
  const now = Date.now();

  const normalizedPath =
    hub === 'product'
      ? `/product-hub/${projectKey}/${section}`
      : `/project-hub/${projectKey}/${section}`;

  const family = sectionFamily(section);
  const existing = readStore().filter(
    (e) =>
      !(
        (e.hub ?? 'project') === hub &&
        e.projectKey === projectKey &&
        sectionFamily(e.section) === family
      ),
  );
  const next: StoredEntry[] = [
    { projectKey, path: normalizedPath, section, visitedAt: now, hub },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  writeStore(next);
  window.dispatchEvent(new CustomEvent('catalyst:recent-locations-updated'));
}

/**
 * Records visits for both /project-hub/:key/:section and /product-hub/:code/:section.
 * Mounted in CatalystShell so it runs on every route change.
 */
export function useRecordProjectVisit() {
  const location = useLocation();
  useEffect(() => {
    let match = location.pathname.match(/^\/project-hub\/([^/]+)(?:\/([^/]+))?/);
    let hub: 'project' | 'product' = 'project';

    if (!match) {
      match = location.pathname.match(/^\/product-hub\/([^/]+)(?:\/([^/]+))?/);
      hub = 'product';
    }

    if (!match) return;
    const spaceKey = match[1];
    const section = match[2];

    if (!spaceKey || spaceKey === 'all-projects' || spaceKey === 'resource-360') return;
    if (hub === 'product' && GLOBAL_PRODUCT_HUB_SEGMENTS.has(spaceKey)) return;
    if (!section) return;
    if (EXCLUDED_SECTIONS.has(section)) return;
    if (!CANONICAL_NAV_SECTIONS.has(section)) return;

    recordLocationVisit({ projectKey: spaceKey, path: location.pathname, section, hub });
  }, [location.pathname]);
}

/**
 * Read hook — returns hydrated recent locations ordered by visit recency.
 * Project-hub entries hydrate from `ph_projects`; product-hub entries from `products`.
 */
export function useRecentProjects(limit = 8) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    migrateLegacyIfNeeded();
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('catalyst:recent-locations-updated', handler);
    return () => window.removeEventListener('catalyst:recent-locations-updated', handler);
  }, []);

  const allEntries = readStore().filter((e) => CANONICAL_NAV_SECTIONS.has(e.section));
  const seenFamily = new Set<string>();
  const entries: StoredEntry[] = [];
  for (const e of allEntries) {
    const familyKey = `${e.hub ?? 'project'}|${e.projectKey}|${sectionFamily(e.section)}`;
    if (seenFamily.has(familyKey)) continue;
    seenFamily.add(familyKey);
    entries.push(e);
    if (entries.length >= limit) break;
  }

  const projectKeys = Array.from(
    new Set(entries.filter((e) => (e.hub ?? 'project') === 'project').map((e) => e.projectKey)),
  );
  const productCodes = Array.from(
    new Set(entries.filter((e) => e.hub === 'product').map((e) => e.projectKey)),
  );

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['recent-locations', entries.map((e) => e.path).join('|'), tick],
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: projectData }, { data: productData }] = await Promise.all([
        projectKeys.length > 0
          ? supabase
              .from('ph_projects')
              .select('key, name, icon, color, is_archived')
              .in('key', projectKeys)
          : Promise.resolve({ data: [] as any[], error: null }),
        productCodes.length > 0
          ? supabase
              .from('products')
              .select('code, name, color')
              .in('code', productCodes)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const byProjectKey = new Map((projectData ?? []).map((r: any) => [r.key, r]));
      const byProductCode = new Map((productData ?? []).map((r: any) => [r.code, r]));

      return entries
        .map<RecentLocation | null>((e) => {
          const hub = e.hub ?? 'project';
          if (hub === 'product') {
            const row = byProductCode.get(e.projectKey);
            if (!row) return null;
            return {
              projectKey: row.code,
              path: e.path,
              section: e.section,
              sectionLabel: labelForSection(e.section),
              projectName: row.name,
              iconName: null,
              color: row.color ?? null,
              visitedAt: e.visitedAt,
              hub: 'product',
            };
          }
          const row = byProjectKey.get(e.projectKey);
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
            hub: 'project',
          };
        })
        .filter((x): x is RecentLocation => x !== null);
    },
  });

  return {
    recentLocations: locations,
    loading: isLoading && (projectKeys.length + productCodes.length) > 0,
  };
}
