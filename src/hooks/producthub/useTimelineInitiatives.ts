// =====================================================
// TIMELINE INITIATIVES — TanStack Query Hook
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineInitiative, FilterChip, GroupByOption } from '@/types/producthub/initiative';
import { getPriorityFromScore } from '@/types/producthub/initiative';
import { useMemo } from 'react';

/** Fetch all non-archived initiatives from ph_initiatives_list view */
export function useTimelineInitiatives() {
  return useQuery({
    queryKey: ['ph-timeline-initiatives'],
    queryFn: async (): Promise<TimelineInitiative[]> => {
      const { data, error } = await supabase
        .from('ph_initiatives_list' as any)
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any): TimelineInitiative => ({
        id: row.id,
        initiative_key: row.initiative_key,
        title: row.title,
        description: row.description,
        status: row.status,
        assignee_id: row.assignee_id,
        assignee_name: null,
        business_owner_id: row.business_owner_id,
        reporter_id: row.reporter_id,
        department_id: row.department_id,
        department_name: row.department_name ?? null,
        department_code: row.department_code ?? null,
        target_quarter: row.target_quarter,
        business_ask_date: row.business_ask_date,
        kickoff_date: row.kickoff_date,
        target_complete: row.target_complete,
        progress: row.progress ?? 0,
        sort_order: row.sort_order ?? 0,
        risk_count: row.risk_count ?? 0,
        is_archived: row.is_archived ?? false,
        score_strategic_alignment: row.score_strategic_alignment ? Number(row.score_strategic_alignment) : null,
        score_business_impact: row.score_business_impact ? Number(row.score_business_impact) : null,
        score_time_urgency: row.score_time_urgency ? Number(row.score_time_urgency) : null,
        score_resource_feasibility: row.score_resource_feasibility ? Number(row.score_resource_feasibility) : null,
        computed_score: row.computed_score ? Number(row.computed_score) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    refetchInterval: 60000,
  });
}

/** Get current quarter string like "Q1 2026" */
function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

/** Apply filter, search, and grouping */
export function useFilteredInitiatives(
  initiatives: TimelineInitiative[] | undefined,
  filter: FilterChip,
  searchTerm: string,
  groupBy: GroupByOption
) {
  return useMemo(() => {
    if (!initiatives) return { flat: [], groups: [] };

    let filtered = [...initiatives];

    // Apply filter
    const today = new Date().toISOString().split('T')[0];
    const currentQ = getCurrentQuarter();

    switch (filter) {
      case 'quarter':
        filtered = filtered.filter(i => i.target_quarter?.startsWith(currentQ.split(' ')[0]) && i.target_quarter?.includes(currentQ.split(' ')[1]));
        break;
      case 'high':
        filtered = filtered.filter(i => (i.computed_score ?? 0) >= 4.0);
        break;
      case 'unscored':
        filtered = filtered.filter(i => i.computed_score === null);
        break;
      case 'overdue':
        filtered = filtered.filter(i =>
          i.target_complete && i.target_complete < today &&
          !['delivered', 'cancelled'].includes(i.status) &&
          i.progress < 100
        );
        break;
      // 'all', 'my', 'starred' - 'my' and 'starred' need auth context, treat as all for now
      default:
        break;
    }

    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(term) ||
        i.initiative_key.toLowerCase().includes(term)
      );
    }

    // Apply grouping
    if (groupBy === 'none') {
      return { flat: filtered, groups: [] };
    }

    const groupMap = new Map<string, TimelineInitiative[]>();
    for (const item of filtered) {
      let key: string;
      switch (groupBy) {
        case 'department':
          key = item.department_name ?? 'No Department';
          break;
        case 'assignee':
          key = item.assignee_name ?? 'Unassigned';
          break;
        case 'quarter':
          key = item.target_quarter ?? 'No Quarter';
          break;
        case 'priority':
          key = getPriorityFromScore(item.computed_score);
          key = key.charAt(0).toUpperCase() + key.slice(1);
          break;
        case 'status':
          key = item.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          break;
        default:
          key = 'Other';
      }
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    const groups = Array.from(groupMap.entries()).map(([name, items]) => ({
      name,
      items,
      count: items.length,
    }));

    return { flat: filtered, groups };
  }, [initiatives, filter, searchTerm, groupBy]);
}
