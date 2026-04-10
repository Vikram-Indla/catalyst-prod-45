import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  id: string;
  item_key: string;
  title: string;
  closed_by_name: string;
  closed_at: string;
  closure_reason: string;
  governance_category: number;
  stale_days: number | null;
  reporter_notified: boolean;
  restore_deadline: string;
  restored_at: string | null;
  restored_by_name: string | null;
}

interface UseAuditTrailOptions {
  page: number;
  pageSize?: number;
  statusFilter: 'all' | 'closed' | 'restored';
  categoryFilter: number | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export function useAuditTrail(opts: UseAuditTrailOptions) {
  const pageSize = opts.pageSize ?? 50;
  const from = opts.page * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ['audit-trail', opts.page, opts.statusFilter, opts.categoryFilter, opts.dateFrom, opts.dateTo],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from('governance_closure_log')
        .select(`
          id,
          item_key,
          closed_at,
          closed_by,
          closure_reason,
          governance_category,
          stale_days,
          reporter_notified,
          restore_deadline,
          restored_at,
          restored_by,
          issue_id,
          catalyst_issues!governance_closure_log_issue_id_fkey (issue_key, title),
          closed_by_profile:profiles!governance_closure_log_closed_by_fkey (full_name),
          restored_by_profile:profiles!governance_closure_log_restored_by_fkey (full_name)
        `, { count: 'exact' })
        .order('closed_at', { ascending: false });

      // Filters
      if (opts.statusFilter === 'closed') {
        query = query.is('restored_at', null);
      } else if (opts.statusFilter === 'restored') {
        query = query.not('restored_at', 'is', null);
      }

      if (opts.categoryFilter !== null) {
        query = query.eq('governance_category', opts.categoryFilter);
      }

      if (opts.dateFrom) {
        query = query.gte('closed_at', opts.dateFrom);
      }
      if (opts.dateTo) {
        query = query.lte('closed_at', opts.dateTo + 'T23:59:59.999Z');
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const entries: AuditEntry[] = (data ?? []).map((row: any) => ({
        id: row.id,
        item_key: row.catalyst_issues?.issue_key ?? row.item_key,
        title: row.catalyst_issues?.title ?? row.item_key,
        closed_by_name: row.closed_by_profile?.full_name ?? 'Unknown',
        closed_at: row.closed_at ?? '',
        closure_reason: row.closure_reason ?? '',
        governance_category: row.governance_category ?? 0,
        stale_days: row.stale_days,
        reporter_notified: row.reporter_notified ?? false,
        restore_deadline: row.restore_deadline ?? '',
        restored_at: row.restored_at,
        restored_by_name: row.restored_by_profile?.full_name ?? null,
      }));

      return { entries, total: count ?? 0 };
    },
  });
}

// Also export a hook for fetching ALL entries (for CSV export + stats)
export function useAuditTrailAll(opts: Pick<UseAuditTrailOptions, 'statusFilter' | 'categoryFilter' | 'dateFrom' | 'dateTo'>) {
  return useQuery({
    queryKey: ['audit-trail-all', opts.statusFilter, opts.categoryFilter, opts.dateFrom, opts.dateTo],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from('governance_closure_log')
        .select(`
          id,
          item_key,
          closed_at,
          closed_by,
          closure_reason,
          governance_category,
          stale_days,
          reporter_notified,
          restore_deadline,
          restored_at,
          restored_by,
          issue_id,
          catalyst_issues!governance_closure_log_issue_id_fkey (issue_key, title),
          closed_by_profile:profiles!governance_closure_log_closed_by_fkey (full_name),
          restored_by_profile:profiles!governance_closure_log_restored_by_fkey (full_name)
        `)
        .order('closed_at', { ascending: false })
        .limit(5000);

      if (opts.statusFilter === 'closed') {
        query = query.is('restored_at', null);
      } else if (opts.statusFilter === 'restored') {
        query = query.not('restored_at', 'is', null);
      }
      if (opts.categoryFilter !== null) {
        query = query.eq('governance_category', opts.categoryFilter);
      }
      if (opts.dateFrom) {
        query = query.gte('closed_at', opts.dateFrom);
      }
      if (opts.dateTo) {
        query = query.lte('closed_at', opts.dateTo + 'T23:59:59.999Z');
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        item_key: row.catalyst_issues?.issue_key ?? row.item_key,
        title: row.catalyst_issues?.title ?? row.item_key,
        closed_by_name: row.closed_by_profile?.full_name ?? 'Unknown',
        closed_at: row.closed_at ?? '',
        closure_reason: row.closure_reason ?? '',
        governance_category: row.governance_category ?? 0,
        stale_days: row.stale_days,
        reporter_notified: row.reporter_notified ?? false,
        restore_deadline: row.restore_deadline ?? '',
        restored_at: row.restored_at,
        restored_by_name: row.restored_by_profile?.full_name ?? null,
      })) as AuditEntry[];
    },
  });
}
