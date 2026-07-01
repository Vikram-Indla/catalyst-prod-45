/**
 * useLabelSuggestions — deduped list of every label ever used inside the
 * current mode's table, scoped where practical (project key for ph_issues,
 * product for business_requests). Used by the Add labels multi-select so
 * the user can pick existing labels or create new ones.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { KanbanMode } from './useKanbanData';

interface Params {
  mode: KanbanMode;
  key?: string | null;
  /** For product mode: the product uuid (labels are scoped by product_id). */
  productId?: string | null;
  enabled?: boolean;
}

async function fetchDistinctLabels(mode: KanbanMode, key?: string | null, productId?: string | null): Promise<string[]> {
  const rows: Array<{ labels?: string[] | null }> = [];
  if (mode === 'project') {
    if (!key) return [];
    const { data } = await (supabase as any)
      .from('ph_issues').select('labels').eq('project_key', key).is('deleted_at', null).limit(2000);
    rows.push(...((data ?? []) as any[]));
  } else if (mode === 'incident') {
    const { data } = await (supabase as any)
      .from('ph_issues').select('labels').eq('issue_type', 'Production Incident').is('deleted_at', null).limit(2000);
    rows.push(...((data ?? []) as any[]));
  } else if (mode === 'product') {
    if (!productId) return [];
    const { data } = await (supabase as any)
      .from('business_requests').select('labels').eq('product_id', productId).is('deleted_at', null).limit(2000);
    rows.push(...((data ?? []) as any[]));
  } else if (mode === 'tasks') {
    const { data } = await (supabase as any)
      .from('tasks').select('labels').is('deleted_at', null).limit(2000);
    rows.push(...((data ?? []) as any[]));
  } else if (mode === 'release') {
    const { data } = await (supabase as any)
      .from('rh_releases').select('labels').limit(2000);
    rows.push(...((data ?? []) as any[]));
  } else if (mode === 'test') {
    const { data } = await (supabase as any)
      .from('tm_test_cases').select('labels').limit(2000);
    rows.push(...((data ?? []) as any[]));
  }

  const set = new Set<string>();
  for (const r of rows) {
    if (Array.isArray(r?.labels)) {
      for (const l of r.labels) {
        if (typeof l === 'string' && l.trim()) set.add(l.trim());
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function useLabelSuggestions({ mode, key, productId, enabled = true }: Params) {
  return useQuery({
    queryKey: ['kb-label-suggestions', mode, key ?? '', productId ?? ''],
    queryFn: () => fetchDistinctLabels(mode, key, productId),
    enabled,
    staleTime: 60_000,
  });
}
