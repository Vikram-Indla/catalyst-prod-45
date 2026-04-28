/**
 * useCatalystWorkflow — Canonical hook for workflow statuses & transitions per issue type.
 * Single source of truth replacing all hardcoded status arrays.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

export interface WorkflowScheme {
  id: string;
  name: string;
  description: string | null;
  issue_type: string;
  is_active: boolean;
  is_default: boolean;
}

export interface WorkflowStatus {
  id: string;
  scheme_id: string;
  name: string;
  slug: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
  /** WIP (work-in-progress) limit displayed as `MAX: <n>` on the column header.
   * Mirrors Jira's column constraint surfaced on board 597. NULL = no limit. */
  wip_limit: number | null;
  /** Soft-deactivation flag. Inactive statuses do not render columns on the
   * kanban; preserved so any historical initiative.status keeps mapping. */
  is_active: boolean;
  /** Additional `ph_requests.status` enum values (`initiative_status`)
   * that should fold into THIS column. Mirrors Jira's column→multi-status
   * mapping (board 597 has 0..7 statuses per column). The primary `slug`
   * is implicitly always included. */
  slug_aliases: string[];
}

export interface WorkflowTransition {
  id: string;
  scheme_id: string;
  name: string | null;
  from_status_id: string | null;
  to_status_id: string;
  is_global: boolean;
  sort_order: number;
}

const QUERY_KEY_BASE = ['catalyst', 'workflows'];

/** Fetch the default workflow scheme for an issue type */
export function useCatalystWorkflow(issueType: string) {
  const qc = useQueryClient();

  const { data: scheme, isLoading: schemeLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'scheme', issueType],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .select('*')
        .eq('issue_type', issueType)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as WorkflowScheme;
    },
    staleTime: 120_000,
  });

  const schemeId = scheme?.id;

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'statuses', schemeId],
    queryFn: async () => {
      if (!schemeId) return [];
      // Resilient fetch — the jira-compare migration adds `is_active`,
      // `wip_limit`, and `slug_aliases` columns. Until that migration runs,
      // PostgREST errors on the `is_active` filter. Detect the schema
      // miss and fall back to the legacy query so Catalyst keeps rendering.
      const withFilter = await typedQuery('catalyst_workflow_statuses')
        .select('*')
        .eq('scheme_id', schemeId)
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (!withFilter.error) {
        return (withFilter.data || []) as WorkflowStatus[];
      }
      const legacy = await typedQuery('catalyst_workflow_statuses')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('position', { ascending: true });
      if (legacy.error) throw legacy.error;
      return (legacy.data || []) as WorkflowStatus[];
    },
    enabled: !!schemeId,
    staleTime: 120_000,
  });

  const { data: transitions = [], isLoading: transitionsLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'transitions', schemeId],
    queryFn: async () => {
      if (!schemeId) return [];
      const { data, error } = await typedQuery('catalyst_workflow_transitions')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as WorkflowTransition[];
    },
    enabled: !!schemeId,
    staleTime: 120_000,
  });

  /** Get valid target statuses from a given status */
  function getAvailableTransitions(currentStatusId: string): WorkflowStatus[] {
    const validTargetIds = transitions
      .filter(t => t.from_status_id === currentStatusId || t.is_global)
      .map(t => t.to_status_id);
    const unique = [...new Set(validTargetIds)];
    return unique
      .map(id => statuses.find(s => s.id === id))
      .filter(Boolean) as WorkflowStatus[];
  }

  /** Resolve category for a status name */
  function categoryOf(statusName: string): 'todo' | 'in_progress' | 'done' {
    const found = statuses.find(
      s => s.name.toLowerCase().trim() === statusName.toLowerCase().trim()
    );
    return found?.category || 'todo';
  }

  /** Get the initial status */
  const initialStatus = statuses.find(s => s.is_initial) || statuses[0];

  /** Group statuses by category */
  const byCategory = {
    todo: statuses.filter(s => s.category === 'todo'),
    in_progress: statuses.filter(s => s.category === 'in_progress'),
    done: statuses.filter(s => s.category === 'done'),
  };

  function invalidate() {
    qc.invalidateQueries({ queryKey: QUERY_KEY_BASE });
  }

  return {
    scheme,
    statuses,
    transitions,
    initialStatus,
    byCategory,
    isLoading: schemeLoading || statusesLoading || transitionsLoading,
    getAvailableTransitions,
    categoryOf,
    invalidate,
  };
}

/** Fetch ALL workflow schemes (for admin listing) */
export function useAllWorkflowSchemes() {
  return useQuery({
    queryKey: [...QUERY_KEY_BASE, 'all-schemes'],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .select('*')
        .eq('is_active', true)
        .order('issue_type', { ascending: true });
      if (error) throw error;
      return (data || []) as WorkflowScheme[];
    },
    staleTime: 120_000,
  });
}

/** Build a static lookup for non-hook contexts (server-side / utility) */
let _cachedStatuses: WorkflowStatus[] | null = null;
let _cacheTimestamp = 0;

export async function fetchAllWorkflowStatuses(): Promise<WorkflowStatus[]> {
  const now = Date.now();
  if (_cachedStatuses && now - _cacheTimestamp < 120_000) return _cachedStatuses;
  const { data } = await typedQuery('catalyst_workflow_statuses')
    .select('*')
    .order('position', { ascending: true });
  _cachedStatuses = (data || []) as WorkflowStatus[];
  _cacheTimestamp = now;
  return _cachedStatuses;
}

export function clearWorkflowCache() {
  _cachedStatuses = null;
  _cacheTimestamp = 0;
}
