/**
 * useKAData — Live data hooks for Knowledge Assist responses.
 * Replaces all hardcoded mock data with real ph_issues queries.
 */
import { useState, useEffect } from 'react';
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

/** New stories created in last 2 weeks */
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
        .eq('issue_type', 'Story')
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
        .in('issue_type', ['Bug', 'QA Bug', 'Defect'])
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

/** Blocked items */
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
        .ilike('status', '%block%')
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

/** Closed/Done items recently */
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
        .eq('status_category', 'Done')
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

/** Re-opened items */
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
        .ilike('status', '%Re-Open%')
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
      // Get most active project by update count
      const { data: proj } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .is('jira_removed_at', null)
        .gte('jira_updated_at', since)
        .limit(999);

      if (proj && proj.length > 0) {
        // Count per project
        const counts: Record<string, { count: number; name: string }> = {};
        for (const p of proj) {
          if (!counts[p.project_key]) counts[p.project_key] = { count: 0, name: p.project_name || p.project_key };
          counts[p.project_key].count++;
        }
        const topKey = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0];
        const pk = topKey[0];
        const pn = topKey[1].name;

        // Get stats for that project
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
          const closed = allItems.filter(i => i.status_category === 'Done').length;
          const blocked = allItems.filter(i => (i.status || '').toLowerCase().includes('block')).length;
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
          if (i.status_category !== 'Done') map[name].active++;
          if ((i.status || '').toLowerCase().includes('block')) map[name].blocked++;
          if (i.status_category === 'Done' && i.jira_updated_at && new Date(i.jira_updated_at) >= twoWeeksAgo) map[name].closedRecent++;
        }
        // Fetch more if needed (pagination for >999)
        const { data: items2 } = await supabase
          .from('ph_issues')
          .select('assignee_display_name, status, status_category, jira_updated_at')
          .is('jira_removed_at', null)
          .not('assignee_display_name', 'is', null)
          .range(999, 1998);
        if (items2) {
          for (const i of items2) {
            const name = i.assignee_display_name || 'Unassigned';
            if (!map[name]) map[name] = { name, active: 0, blocked: 0, closedRecent: 0 };
            if (i.status_category !== 'Done') map[name].active++;
            if ((i.status || '').toLowerCase().includes('block')) map[name].blocked++;
            if (i.status_category === 'Done' && i.jira_updated_at && new Date(i.jira_updated_at) >= twoWeeksAgo) map[name].closedRecent++;
          }
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

/** Landing page stats — live counts */
export interface KALandingStats {
  newStories: number;
  blocked: number;
  reopened: number;
  closed: number;
}

export function useLandingStats() {
  const [stats, setStats] = useState<KALandingStats>({ newStories: 0, blocked: 0, reopened: 0, closed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [storiesRes, blockedRes, reopenedRes, closedRes] = await Promise.all([
        supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
          .is('jira_removed_at', null).eq('issue_type', 'Story').gte('jira_created_at', twoWeeksAgo),
        supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
          .is('jira_removed_at', null).ilike('status', '%block%'),
        supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
          .is('jira_removed_at', null).ilike('status', '%Re-Open%'),
        supabase.from('ph_issues').select('issue_key', { count: 'exact', head: true })
          .is('jira_removed_at', null).eq('status_category', 'Done').gte('jira_updated_at', twoWeeksAgo),
      ]);

      setStats({
        newStories: storiesRes.count || 0,
        blocked: blockedRes.count || 0,
        reopened: reopenedRes.count || 0,
        closed: closedRes.count || 0,
      });
      setLoading(false);
    }
    fetch();
  }, []);
  return { stats, loading };
}
