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
  hub: HubType;
}

/**
 * Hub kinds tracked by the Home rail.
 *   - Space-scoped (have a per-space key/code): 'project', 'product'.
 *   - Global single hubs (no per-space key — type word only in the rail):
 *     'task', 'incident', 'release', 'plan'.
 */
export type HubType = 'project' | 'product' | 'task' | 'incident' | 'release' | 'plan';

export interface StoredEntry {
  projectKey: string;
  path: string;
  section: string;
  visitedAt: number;
  hub?: HubType;
}

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  overview: 'Overview',
  backlog: 'Backlog',
  board: 'Board',
  boards: 'Boards',
  allwork: 'All work',
  list: 'List',
  calendar: 'Calendar',
  timeline: 'Timeline',
  dependencies: 'Dependencies',
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
  // Incident hub
  'all-incidents': 'All incidents',
  work: 'Work',
  analytics: 'Analytics',
  insights: 'Insights',
  'committee-queue': 'Committee queue',
  // Release hub
  'command-center': 'Command center',
  compare: 'Compare',
  triage: 'Triage',
  changes: 'Changes',
  'sign-off-queue': 'Sign-off queue',
  'production-events': 'Production events',
  'freeze-windows': 'Freeze windows',
  // Plan hub
  library: 'Library',
  master: 'Master plan',
  resources: 'Resources',
  ai: 'AI',
  capacity: 'Capacity',
  'budget-planner': 'Budget planner',
};

/**
 * Tasks module nav views (standalone hub at /tasks/<view>). Unlike project/
 * product hubs these are not space-scoped — they all live under the single
 * "Tasks" hub, recorded with hub: 'task' and projectKey 'tasks'.
 */
const TASK_NAV_SECTIONS = new Set([
  'board',
  'list',
  'overview',
  'timeline',
  'calendar',
  'settings',
]);
const TASK_SPACE_KEY = 'tasks';

/**
 * Global single-hub nav sections (no per-space key). Each hub records its own
 * section grain and surfaces as ONE space group in the rail, headed by a type
 * word only ("Incident" / "Release" / "Plan"). Mirrors the Tasks precedent.
 */
const INCIDENT_NAV_SECTIONS = new Set([
  'dashboard',
  'all-incidents',
  'board',
  'filters',
  'timeline',
  'work',
  'analytics',
  'insights',
  'reports',
  'committee-queue',
]);
const RELEASE_NAV_SECTIONS = new Set([
  'command-center',
  'releases',
  'compare',
  'triage',
  'changes',
  'sign-off-queue',
  'production-events',
  'freeze-windows',
]);
const PLAN_NAV_SECTIONS = new Set([
  'library',
  'compare',
  'master',
  'resources',
  'ai',
  'reports',
  'capacity',
  'budget-planner',
]);

/** Synthesized header label per global hub (type word only — no key). */
const GLOBAL_HUB_LABEL: Record<'task' | 'incident' | 'release' | 'plan', string> = {
  task: 'Tasks',
  incident: 'Incident',
  release: 'Release',
  plan: 'Plan',
};

function globalHubSections(hub: 'incident' | 'release' | 'plan'): Set<string> {
  return hub === 'incident'
    ? INCIDENT_NAV_SECTIONS
    : hub === 'release'
    ? RELEASE_NAV_SECTIONS
    : PLAN_NAV_SECTIONS;
}

/**
 * Canonical sidebar nav sections — covers both Project Hub and Product Hub slugs.
 * Only sections in this set are recorded and surfaced in the Home rail.
 */
export const CANONICAL_NAV_SECTIONS = new Set([
  'dashboard',
  'boards',
  'dependencies',
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

/**
 * Select the recent entries to surface: TODAY's actions only (since local
 * midnight), deduped by hub|project|section-family, capped at `limit`. If
 * nothing was visited today, fall back to the most-recent entries so the
 * Home rail is never blank (2026-06-18 today-only scope + empty guard).
 */
export function selectRecentEntries(
  entries: StoredEntry[],
  limit: number,
  nowMs: number,
): StoredEntry[] {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();

  const dedupe = (src: StoredEntry[]): StoredEntry[] => {
    const seen = new Set<string>();
    const out: StoredEntry[] = [];
    for (const e of src) {
      const familyKey = `${e.hub ?? 'project'}|${e.projectKey}|${sectionFamily(e.section)}`;
      if (seen.has(familyKey)) continue;
      seen.add(familyKey);
      out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  };

  const today = dedupe(entries.filter((e) => e.visitedAt >= startMs));
  return today.length > 0 ? today : dedupe(entries);
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
  hub?: HubType;
}) {
  const { projectKey, path, section, hub = 'project' } = input;
  if (!projectKey || !path) return;
  const now = Date.now();

  const normalizedPath =
    hub === 'task'
      ? `/tasks/${section}`
      : hub === 'incident'
      ? `/incident-hub/${section}`
      : hub === 'release'
      ? `/release-hub/${section}`
      : hub === 'plan'
      ? section === 'library'
        ? '/planhub'
        : `/planhub/${section}`
      : hub === 'product'
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
    // Tasks module is a standalone hub: /tasks/<view>. Record it on its own
    // grain so each view (Board, List, Overview, …) surfaces as a Recent row.
    const taskMatch = location.pathname.match(/^\/tasks\/([^/]+)/);
    if (taskMatch) {
      const view = taskMatch[1];
      if (TASK_NAV_SECTIONS.has(view)) {
        recordLocationVisit({ projectKey: TASK_SPACE_KEY, path: location.pathname, section: view, hub: 'task' });
      }
      return;
    }

    // Global single hubs — one space group each, headed by a type word.
    const incidentMatch = location.pathname.match(/^\/incident-hub\/([^/]+)/);
    if (incidentMatch) {
      const sec = incidentMatch[1];
      if (INCIDENT_NAV_SECTIONS.has(sec)) {
        recordLocationVisit({ projectKey: 'incident', path: location.pathname, section: sec, hub: 'incident' });
      }
      return;
    }
    const releaseMatch = location.pathname.match(/^\/release-hub\/([^/]+)/);
    if (releaseMatch) {
      const sec = releaseMatch[1];
      if (RELEASE_NAV_SECTIONS.has(sec)) {
        recordLocationVisit({ projectKey: 'release', path: location.pathname, section: sec, hub: 'release' });
      }
      return;
    }
    const planMatch = location.pathname.match(/^\/planhub(?:\/([^/]+))?/);
    if (planMatch) {
      const sec = planMatch[1] ?? 'library';
      if (PLAN_NAV_SECTIONS.has(sec)) {
        recordLocationVisit({ projectKey: 'plan', path: location.pathname, section: sec, hub: 'plan' });
      }
      return;
    }

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

  const allEntries = readStore().filter((e) => {
    const hub = e.hub ?? 'project';
    if (hub === 'task') return TASK_NAV_SECTIONS.has(e.section);
    if (hub === 'incident' || hub === 'release' || hub === 'plan') {
      return globalHubSections(hub).has(e.section);
    }
    return CANONICAL_NAV_SECTIONS.has(e.section);
  });
  // Today's actions only — falls back to most-recent when today is empty.
  const entries = selectRecentEntries(allEntries, limit, Date.now());

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
          if (hub === 'task' || hub === 'incident' || hub === 'release' || hub === 'plan') {
            // Global single hub — no DB row to hydrate. Synthesize directly.
            // Header is a type word only; no per-space key, no icon/color
            // (HomeSidebar renders the hub icon from its own registry).
            return {
              projectKey: GLOBAL_HUB_LABEL[hub],
              path: e.path,
              section: e.section,
              sectionLabel: labelForSection(e.section),
              projectName: GLOBAL_HUB_LABEL[hub],
              iconName: null,
              color: null,
              visitedAt: e.visitedAt,
              hub,
            };
          }
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
