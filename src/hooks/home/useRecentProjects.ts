/**
 * useRecentProjects — surfaces the user's most recently accessed
 * ProjectHub projects on the Home rail (Jira "Recent projects" parity).
 *
 * Why localStorage (not a server table)
 * ─────────────────────────────────────
 *   Project visits are per-device, transient, and don't need cross-user
 *   visibility. localStorage is fast (no round-trip on Home open),
 *   survives reload, and avoids a new RLS-scoped table. If we later need
 *   cross-device sync we can swap the storage layer without touching the
 *   consumer.
 *
 * Storage shape (key: `catalyst.recentProjects.v1`):
 *   Array<{ projectKey: string; visitedAt: number }>  // newest first, capped at 12
 *
 * Hydration:
 *   On read we fetch `ph_projects` rows for the stored keys (icon, color,
 *   name, avatar) and return them in visit order, filtered to non-archived.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'catalyst.recentProjects.v1';
const MAX_ENTRIES = 12;

export interface RecentProject {
  projectKey: string;
  name: string;
  iconName: string | null;
  color: string | null;
  visitedAt: number;
}

interface StoredEntry {
  projectKey: string;
  visitedAt: number;
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

/**
 * Append a project visit to the log. Dedupes by projectKey, keeps newest
 * MAX_ENTRIES, and dispatches a window event so live consumers refresh
 * without polling.
 */
export function recordProjectVisit(projectKey: string) {
  if (!projectKey) return;
  const now = Date.now();
  const existing = readStore().filter((e) => e.projectKey !== projectKey);
  const next = [{ projectKey, visitedAt: now }, ...existing].slice(0, MAX_ENTRIES);
  writeStore(next);
  window.dispatchEvent(new CustomEvent('catalyst:recent-projects-updated'));
}

/**
 * Mount-once recorder — extracts the project key from
 * `/project-hub/:key/...` and writes a visit on each route change.
 * Mounted in CatalystShell so it runs on every page.
 */
export function useRecordProjectVisit() {
  const location = useLocation();
  useEffect(() => {
    const match = location.pathname.match(/^\/project-hub\/([^/]+)/);
    if (!match) return;
    const key = match[1];
    // Skip non-project segments (e.g., "/project-hub/all-projects")
    if (key === 'all-projects' || key === 'resource-360') return;
    recordProjectVisit(key);
  }, [location.pathname]);
}

/**
 * Read hook — returns hydrated recent projects ordered by visit recency,
 * capped at `limit`. Auto-refreshes when `recordProjectVisit` fires.
 */
export function useRecentProjects(limit = 6) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('catalyst:recent-projects-updated', handler);
    return () => window.removeEventListener('catalyst:recent-projects-updated', handler);
  }, []);

  const entries = readStore().slice(0, limit);
  const keys = entries.map((e) => e.projectKey);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['recent-projects', keys.join(','), tick],
    enabled: keys.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('key, name, icon, color, is_archived')
        .in('key', keys);
      if (error) throw error;
      // Preserve visit order from `entries` and drop archived.
      const byKey = new Map((data ?? []).map((r) => [r.key, r]));
      return entries
        .map<RecentProject | null>((e) => {
          const row = byKey.get(e.projectKey);
          if (!row || row.is_archived) return null;
          return {
            projectKey: row.key,
            name: row.name,
            iconName: row.icon,
            color: row.color,
            visitedAt: e.visitedAt,
          };
        })
        .filter((x): x is RecentProject => x !== null);
    },
  });

  return { recentProjects: projects, loading: isLoading && keys.length > 0 };
}
