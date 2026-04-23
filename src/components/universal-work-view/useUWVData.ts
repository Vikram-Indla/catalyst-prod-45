// @ts-nocheck
/**
 * useUWVData — data hook for the Universal Work View.
 *
 * Mirrors the column shape that DemandFulfilmentGadget already queries from
 * `ph_issues` so the UWV always renders the same rows the gadget shows.
 * See: src/components/project-hub/dashboard/widgets/DemandFulfilmentGadget.tsx
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UWVParams, UWVItem, UWVSort } from './uwv.types';

const PAGE_SIZE = 50;

/** Load assignee profiles (display name + avatar) keyed by user id. */
async function loadAssigneeProfiles(ids: string[]): Promise<Record<string, any>> {
  const distinct = Array.from(new Set(ids.filter(Boolean)));
  if (distinct.length === 0) return {};
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, full_name, avatar_url')
    .in('id', distinct);
  return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
}

/**
 * Quarter-string → ISO date range. Mirrors quarterRange() in
 * DemandFulfilmentGadget: '2025-Q1' → 2025-01-01 / 2025-03-31.
 */
function quarterRange(q?: string | null): { start: string; end: string } | null {
  if (!q) return null;
  // Accept either 'YYYY-QN' or 'QN-YYYY' (gadget emits the latter).
  const m1 = /^(\d{4})-Q([1-4])$/.exec(q);
  const m2 = /^Q([1-4])-(\d{4})$/.exec(q);
  const m = m1 ?? (m2 ? [q, m2[2], m2[1]] as RegExpExecArray : null);
  if (!m) return null;
  const year = Number(m[1]);
  const qnum = Number(m[2]);
  const startMonth = (qnum - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function useUWVData(params: UWVParams, statusFilter: string[], sort: UWVSort[]) {
  return useInfiniteQuery({
    queryKey: ['uwv-data', params, statusFilter, sort],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const items: UWVItem[] = [];
      let total = 0;

      // ─── ProjectHub source ────────────────────────────────────────────────
      if (params.hubSource.includes('projecthub')) {
        let q = (supabase as any)
          .from('ph_issues')
          .select(
            `id, issue_key, summary, status, status_category, issue_type,
             assignee_user_id, assignee_display_name, parent_key, project_key,
             jira_created_at, jira_updated_at, due_date, priority`,
            { count: 'exact' },
          )
          .eq('project_key', params.project)
          .is('jira_removed_at', null)
          .is('deleted_at', null);

        if (statusFilter.length > 0) q = q.in('status', statusFilter);

        if (params.issueTypes && params.issueTypes.length > 0) {
          q = q.in('issue_type', params.issueTypes);
        }

        // Scope filter — match gadget semantics.
        if (params.scope === 'quarter' && params.quarter) {
          const r = quarterRange(params.quarter);
          if (r) {
            q = q.gte('jira_created_at', `${r.start}T00:00:00.000Z`)
                 .lte('jira_created_at', `${r.end}T23:59:59.999Z`);
          }
        }
        if (params.scope === 'custom' && params.dateFrom) {
          q = q.gte('jira_created_at', params.dateFrom);
          if (params.dateTo) q = q.lte('jira_created_at', params.dateTo);
        }

        if (params.keys?.length) q = q.in('issue_key', params.keys);

        const sortMap: Record<string, string> = {
          key: 'issue_key',
          summary: 'summary',
          status: 'status',
          assignee: 'assignee_display_name',
          created: 'jira_created_at',
          updated: 'jira_updated_at',
          dueDate: 'due_date',
          priority: 'priority',
        };
        const sf = sort[0];
        if (sf && sortMap[sf.fieldId]) {
          q = q.order(sortMap[sf.fieldId], { ascending: sf.direction === 'asc' });
        } else {
          q = q.order('issue_key', { ascending: true });
        }

        q = q.range(pageParam * PAGE_SIZE, pageParam * PAGE_SIZE + PAGE_SIZE - 1);

        const { data, error, count } = await q;
        if (error) throw error;
        total += count ?? 0;

        const profiles = await loadAssigneeProfiles(
          (data ?? []).map((r: any) => r.assignee_user_id).filter(Boolean),
        );

        items.push(
          ...(data ?? []).map((r: any): UWVItem => {
            const profile = r.assignee_user_id ? profiles[r.assignee_user_id] : null;
            return {
              id: r.id,
              key: r.issue_key,
              summary: r.summary ?? '',
              issueType: r.issue_type ?? 'Story',
              status: r.status ?? '',
              statusCategory: r.status_category ?? '',
              assigneeId: r.assignee_user_id,
              assigneeName:
                profile?.display_name ?? profile?.full_name ?? r.assignee_display_name ?? null,
              assigneeAvatar: profile?.avatar_url ?? null,
              parentKey: r.parent_key,
              priority: r.priority,
              created: r.jira_created_at,
              updated: r.jira_updated_at,
              dueDate: r.due_date,
              commentCount: 0,
              hubSource: 'projecthub',
              level: r.parent_key ? 1 : 0,
            };
          }),
        );
      }

      // ─── ProductHub source (initiatives / MDTs) ───────────────────────────
      if (params.hubSource.includes('producthub')) {
        let q = (supabase as any)
          .from('ph_initiatives')
          .select(
            'id, initiative_key, title, status, target_quarter, target_complete, assignee_id, updated_at',
            { count: 'exact' },
          )
          .eq('is_deleted', false);

        if (params.scope === 'quarter' && params.quarter) {
          q = q.eq('target_quarter', params.quarter);
        }
        if (params.keys?.length) q = q.in('initiative_key', params.keys);
        q = q.range(pageParam * PAGE_SIZE, pageParam * PAGE_SIZE + PAGE_SIZE - 1);

        const { data, error, count } = await q;
        if (error) throw error;
        total += count ?? 0;

        const profiles = await loadAssigneeProfiles(
          (data ?? []).map((r: any) => r.assignee_id).filter(Boolean),
        );

        items.push(
          ...(data ?? []).map((r: any): UWVItem => {
            const profile = r.assignee_id ? profiles[r.assignee_id] : null;
            return {
              id: r.id,
              key: r.initiative_key,
              summary: r.title ?? '',
              issueType: 'MDT',
              status: r.status ?? '',
              statusCategory: r.status === 'Active' ? 'In Progress' : r.status ?? '',
              assigneeId: r.assignee_id,
              assigneeName: profile?.display_name ?? profile?.full_name ?? null,
              assigneeAvatar: profile?.avatar_url ?? null,
              parentKey: null,
              priority: null,
              created: null,
              updated: r.updated_at,
              dueDate: r.target_complete,
              commentCount: 0,
              hubSource: 'producthub',
              level: 0,
            };
          }),
        );
      }

      return { items, total };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length : undefined;
    },
  });
}

/** Returns all real statuses for the project, grouped by status_category. */
export function useUWVStatuses(project: string) {
  return useQuery({
    queryKey: ['uwv-statuses', project],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_issues')
        .select('status, status_category')
        .eq('project_key', project)
        .is('jira_removed_at', null)
        .not('status', 'is', null)
        .limit(1000);

      const map = new Map<string, Set<string>>();
      (data ?? []).forEach((r: any) => {
        const cat = r.status_category ?? 'Other';
        if (!map.has(cat)) map.set(cat, new Set());
        map.get(cat)!.add(r.status);
      });

      const order = ['To Do', 'In Progress', 'Done', 'Other'];
      return [...map.keys()]
        .sort(
          (a, b) =>
            (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
            (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
        )
        .map((cat) => ({
          label: cat,
          options: [...map.get(cat)!]
            .sort()
            .map((s) => ({ label: s, value: s })),
        }));
    },
    enabled: !!project,
  });
}

/** Distinct assignees in the project — for the avatar quick-filter. */
export function useUWVAssignees(project: string) {
  return useQuery({
    queryKey: ['uwv-assignees', project],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_issues')
        .select('assignee_user_id, assignee_display_name')
        .eq('project_key', project)
        .is('jira_removed_at', null)
        .not('assignee_user_id', 'is', null)
        .limit(2000);

      const seen = new Map<string, { id: string; name: string }>();
      (data ?? []).forEach((r: any) => {
        if (r.assignee_user_id && !seen.has(r.assignee_user_id)) {
          seen.set(r.assignee_user_id, {
            id: r.assignee_user_id,
            name: r.assignee_display_name ?? 'Unassigned',
          });
        }
      });

      const ids = Array.from(seen.keys());
      if (ids.length === 0) return [];

      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, display_name, full_name, avatar_url')
        .in('id', ids);

      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      return Array.from(seen.values()).map((u) => {
        const p = profileMap[u.id];
        return {
          id: u.id,
          name: p?.display_name ?? p?.full_name ?? u.name,
          avatar: p?.avatar_url ?? undefined,
        };
      });
    },
    enabled: !!project,
  });
}
