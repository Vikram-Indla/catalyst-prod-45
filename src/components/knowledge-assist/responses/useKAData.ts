/**
 * useKAData — Live data hooks for Knowledge Assist responses.
 * All queries use case-insensitive matching and proper error handling.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KAIssue {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string | null;
  priority: string | null;
  issue_type: string;
  project_key: string;
  project_name: string | null;
  assignee_display_name: string | null;
  reporter_display_name: string | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
}

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export { formatTimeAgo };

/** Saudi week start (Sunday) */
function getSaudiWeekStart(): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

/** Recently updated items (changed since yesterday) */
export function useChangedYesterday() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .gte('jira_updated_at', since)
        .order('jira_updated_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** New stories created in last 2 weeks — case-insensitive type match */
export function useNewStories() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .ilike('issue_type', '%story%')
        .gte('jira_created_at', since)
        .order('jira_created_at', { ascending: false })
        .limit(8);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** New defects/bugs logged in last 2 weeks */
export function useNewDefects() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .or('issue_type.ilike.%bug%,issue_type.ilike.%defect%')
        .gte('jira_created_at', since)
        .order('jira_created_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** Blocked items — case-insensitive */
export function useBlockedItems() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .or('status.ilike.%blocked%,status.ilike.%block%,status.ilike.%impediment%')
        .order('jira_updated_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** Closed/Done items recently — case-insensitive */
export function useClosedItems() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', since)
        .order('jira_updated_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** Re-opened items — case-insensitive */
export function useReopenedItems() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .or('status.ilike.%re-open%,status.ilike.%reopen%,status.ilike.%re open%')
        .order('jira_updated_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, total, loading };
}

/** Most active project stats */
export function useMostActiveProject() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [stats, setStats] = useState({ newItems: 0, closed: 0, blocked: 0, totalUpdated: 0, projectName: '', projectKey: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: proj } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .is('jira_removed_at', null)
        .gte('jira_updated_at', since)
        .limit(999);

      if (proj && proj.length > 0) {
        const counts: Record<string, { count: number; name: string }> = {};
        for (const p of proj) {
          if (!counts[p.project_key]) counts[p.project_key] = { count: 0, name: p.project_name || p.project_key };
          counts[p.project_key].count++;
        }
        const topKey = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0];
        const pk = topKey[0];
        const pn = topKey[1].name;

        const { data: allItems } = await supabase
          .from('ph_issues')
          .select(FIELDS)
          .is('jira_removed_at', null)
          .eq('project_key', pk)
          .gte('jira_updated_at', since)
          .order('jira_updated_at', { ascending: false })
          .limit(999);

        if (allItems) {
          const newItems = allItems.filter(i => i.jira_created_at && new Date(i.jira_created_at) >= new Date(since)).length;
          const closed = allItems.filter(i => i.status_category === 'Done' || /done|closed|resolved|completed/i.test(i.status || '')).length;
          const blocked = allItems.filter(i => /block|impediment/i.test(i.status || '')).length;
          setStats({ newItems, closed, blocked, totalUpdated: allItems.length, projectName: pn, projectKey: pk });
          setData(allItems.slice(0, 7) as KAIssue[]);
        }
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, stats, loading };
}

/** Team workload — aggregate by assignee */
export interface TeamMember {
  name: string;
  active: number;
  blocked: number;
  closedRecent: number;
}

export function useTeamWorkload() {
  const [data, setData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: items } = await supabase
        .from('ph_issues')
        .select('assignee_display_name, status, status_category, jira_updated_at')
        .is('jira_removed_at', null)
        .not('assignee_display_name', 'is', null)
        .limit(999);

      if (items) {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const map: Record<string, TeamMember> = {};
        for (const i of items) {
          const name = i.assignee_display_name || 'Unassigned';
          if (!map[name]) map[name] = { name, active: 0, blocked: 0, closedRecent: 0 };
          const statusLower = (i.status || '').toLowerCase();
          if (i.status_category !== 'Done') map[name].active++;
          if (/block|impediment/i.test(statusLower)) map[name].blocked++;
          if ((i.status_category === 'Done' || /done|closed|resolved|completed/.test(statusLower)) && i.jira_updated_at && new Date(i.jira_updated_at) >= twoWeeksAgo) map[name].closedRecent++;
        }
        setData(Object.values(map).sort((a, b) => b.active - a.active).slice(0, 10));
      }
      setLoading(false);
    }
    fetch();
  }, []);
  return { data, loading };
}

/** Person's work — query by assignee name pattern */
export function usePersonWork(namePattern: string) {
  const [data, setData] = useState<KAIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [personName, setPersonName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: items, count, error } = await supabase
        .from('ph_issues')
        .select(FIELDS, { count: 'exact' })
        .is('jira_removed_at', null)
        .ilike('assignee_display_name', `%${namePattern}%`)
        .not('status_category', 'eq', 'Done')
        .order('jira_updated_at', { ascending: false })
        .limit(7);
      if (!error && items) {
        setData(items as KAIssue[]);
        setTotal(count || items.length);
        if (items.length > 0) setPersonName(items[0].assignee_display_name || namePattern);
      }
      setLoading(false);
    }
    fetch();
  }, [namePattern]);
  return { data, total, personName, loading };
}

/** Landing page stats — live counts with auto-refresh */
export interface KALandingStats {
  newStories: number;
  blocked: number;
  reopened: number;
  closed: number;
}

export function useLandingStats() {
  const [stats, setStats] = useState<KALandingStats>({ newStories: 0, blocked: 0, reopened: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [storiesRes, blockedRes, reopenedRes, closedRes] = await Promise.all([
      supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .is('jira_removed_at', null).ilike('issue_type', '%story%').gte('jira_created_at', twoWeeksAgo),
      supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .is('jira_removed_at', null).or('status.ilike.%blocked%,status.ilike.%block%,status.ilike.%impediment%'),
      supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .is('jira_removed_at', null).or('status.ilike.%re-open%,status.ilike.%reopen%,status.ilike.%re open%'),
      supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .is('jira_removed_at', null).or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', twoWeeksAgo),
    ]);

    setStats({
      newStories: storiesRes.count || 0,
      blocked: blockedRes.count || 0,
      reopened: reopenedRes.count || 0,
      closed: closedRes.count || 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 60 seconds
    intervalRef.current = setInterval(fetchStats, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

/** Load earlier closures (2-6 weeks ago) */
export function useEarlierClosures() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadEarlier = useCallback(async () => {
    if (loading || loaded) return;
    setLoading(true);
    try {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();

      const { data: items, error } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .is('jira_removed_at', null)
        .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', sixWeeksAgo)
        .lt('jira_updated_at', twoWeeksAgo)
        .order('jira_updated_at', { ascending: false })
        .limit(28);

      if (!error && items) {
        setData(items as KAIssue[]);
      }
      setLoaded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [loading, loaded]);

  return { data, loading, loaded, loadEarlier };
}

/** Load earlier stories (2-6 weeks ago) */
export function useEarlierStories() {
  const [data, setData] = useState<KAIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadEarlier = useCallback(async () => {
    if (loading || loaded) return;
    setLoading(true);
    try {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();

      const { data: items, error } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .is('jira_removed_at', null)
        .ilike('issue_type', '%story%')
        .gte('jira_created_at', sixWeeksAgo)
        .lt('jira_created_at', twoWeeksAgo)
        .order('jira_created_at', { ascending: false })
        .limit(28);

      if (!error && items) {
        setData(items as KAIssue[]);
      }
      setLoaded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [loading, loaded]);

  return { data, loading, loaded, loadEarlier };
}

/**
 * Generic "load all / load more" hook.
 * Accepts a fetcher function that returns items beyond initial view.
 */
export function useLoadAllItems(fetcher: () => Promise<KAIssue[]>) {
  const [data, setData] = useState<KAIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadAll = useCallback(async () => {
    if (loading || loaded) return;
    setLoading(true);
    try {
      const items = await fetcher();
      setData(items);
      setLoaded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [loading, loaded, fetcher]);

  return { data, loading, loaded, loadAll };
}
