import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { History, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UnifiedAuditHistoryTabProps {
  entityId: string;
  entityType: 'business_request' | 'epic' | 'theme' | 'objective' | 'feature' | 'risk' | 'snapshot';
  /**
   * When true, renders just the activity list (no internal card header/container).
   * Use this when embedding inside another card (e.g., Theme drawer Activity tab).
   */
  embedded?: boolean;
}

const PAGE_SIZE = 50;

// Map entity types to their audit log table and column names
const ENTITY_CONFIG: Record<string, { table: string; idColumn: string; useActivityLogs?: boolean }> = {
  business_request: { table: 'business_request_audit_logs', idColumn: 'business_request_id' },
  epic: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  theme: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  objective: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  feature: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  risk: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  snapshot: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
};

export function UnifiedAuditHistoryTab({ entityId, entityType, embedded = false }: UnifiedAuditHistoryTabProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const config = ENTITY_CONFIG[entityType];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['unified-audit-history', entityType, entityId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (config.useActivityLogs) {
        // Map entity types to their actual table names in activity_logs
        const entityTypeMap: Record<string, string> = {
          epic: 'epics',
          theme: 'strategic_themes',
          objective: 'objective',
          feature: 'features',
          risk: 'risks',
          snapshot: 'strategy_snapshots',
        };

        const entityTypeFilter = entityTypeMap[entityType] || entityType;
        const { data: logs, error, count } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact' })
          .eq('entity_type', entityTypeFilter)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        const actorIds = [...new Set((logs || []).map((log: any) => log.actor_id).filter(Boolean))] as string[];
        let profilesMap: Record<string, any> = {};

        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', actorIds);

          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
          }
        }

        const transformedLogs = (logs || []).map((log: any) => ({
          id: log.id,
          created_at: log.created_at,
          actor_name: profilesMap[log.actor_id]?.full_name || 'Unknown User',
          action: log.action,
          field_changed: null as string | null,
          old_value: log.before_json ? getChangedFieldsDisplay(log.before_json, log.after_json).oldValue : null,
          new_value: log.after_json ? getChangedFieldsDisplay(log.before_json, log.after_json).newValue : null,
          changes: getChangedFields(log.before_json, log.after_json),
        }));

        return { logs: transformedLogs as any[], count: count || 0, page: pageParam };
      }

      const { data: logs, error, count } = await (supabase as any)
        .from('business_request_audit_logs')
        .select('*', { count: 'exact' })
        .eq('business_request_id', entityId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: (logs || []) as any[], count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalLoaded = (lastPage.page + 1) * PAGE_SIZE;
      return totalLoaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!entityId,
  });

  const allLogs = data?.pages.flatMap((page) => page.logs) || [];
  const totalCount = data?.pages[0]?.count || 0;

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'UU';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatActionType = (action: string | null, field: string | null) => {
    if (!action) return 'updated this item';
    if (action === 'INSERT' || action === 'CREATE') return 'created this item';
    if (action === 'DELETE') return 'deleted this item';
    if (field) return field.replace(/_/g, ' ');
    return action.toLowerCase().replace(/_/g, ' ');
  };

  const formatValue = (value: string | null) => {
    if (value === null || value === 'null' || value === '') return 'None';

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      try {
        return format(new Date(value), 'MMM d, yyyy h:mm a');
      } catch {
        // ignore
      }
    }

    return value;
  };

  const List = (
    <>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-[13px]">Loading history...</span>
          </div>
        ) : allLogs.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-[14px] font-medium text-text-secondary">No audit history yet</p>
            <p className="text-[12px]">Changes to this item will appear here</p>
          </div>
        ) : (
          <>
            {allLogs.map((log: any) => (
              <div
                key={log.id}
                className={cn(
                  'flex gap-4 px-3 py-4 rounded-xl transition-colors',
                  'hover:bg-surface-1',
                )}
              >
              <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(217 91% 50%) 100%)',
                    boxShadow: '0 2px 8px hsl(var(--brand-primary) / 0.35)',
                  }}
                >
                  {getInitials(log.actor_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-text-secondary">
                    <strong className="text-text-primary font-semibold">{log.actor_name || 'Unknown User'}</strong>{' '}
                    <span className="text-text-muted italic">{formatActionType(log.action, log.field_changed)}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[12px] text-text-muted mt-1">
                    <span>{format(new Date(log.created_at), "MMMM d, yyyy 'at' h:mm a")}</span>
                  </div>

                  {log.changes && log.changes.length > 0 ? (
                    <div className="space-y-1.5 mt-3">
                      {log.changes.map((change: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[13px]">
                          <span className="text-text-muted italic text-[12px]">{change.field}:</span>
                          <span className={cn('text-text-secondary', change.from ? 'font-medium text-text-primary' : '')}>
                            {formatValue(change.from)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
                          <span className={cn('text-text-secondary', change.to ? 'font-medium text-text-primary' : '')}>
                            {formatValue(change.to)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (log.old_value !== null || log.new_value !== null) && (
                    <div className="flex items-center gap-2.5 text-[13px] mt-3">
                      <span className={cn('text-text-secondary', log.old_value ? 'font-medium text-text-primary' : '')}>
                        {formatValue(log.old_value)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span className={cn('text-text-secondary', log.new_value ? 'font-medium text-text-primary' : '')}>
                        {formatValue(log.new_value)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-[12px]">Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>

      {hasNextPage && !isFetchingNextPage && allLogs.length > 0 && (
        <div className={cn('shrink-0 pt-3', embedded ? '' : 'border-t border-border-subtle px-5 pb-4 bg-surface-1/30')}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            className={cn(
              'w-full text-[13px] font-medium h-9 rounded-xl',
              'border-brand-primary text-brand-primary',
              'hover:bg-brand-primary hover:text-brand-primary-foreground',
              'transition-colors',
            )}
          >
            Load more changes
          </Button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full">{List}</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface-0 rounded-2xl overflow-hidden border border-border-default shadow-xs">
      <div className="flex flex-nowrap items-end gap-2 px-5 py-4 border-b border-border-subtle shrink-0">
        <History className="h-4 w-4 text-brand-primary flex-shrink-0" />
        <span className="text-[13px] font-semibold text-brand-primary uppercase tracking-[0.5px] leading-none whitespace-nowrap">
          Audit History
        </span>
        <span className="text-[13px] text-text-muted font-normal leading-none whitespace-nowrap">
          ({totalCount} {totalCount === 1 ? 'change' : 'changes'})
        </span>
      </div>

      {List}
    </div>
  );
}

// Helper functions
const EXCLUDED_FIELDS = [
  'updated_at',
  'created_at',
  'id',
  'score_config',
  'program_increment_ids',
  'contributors',
  'tags',
  'updated_by',
  'created_by',
];

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  summary: 'Summary',
  description: 'Description',
  tier: 'Tier',
  status: 'Status',
  health: 'Health',
  owner_id: 'Owner',
  start_date: 'Start Date',
  due_date: 'Due Date',
  end_date: 'End Date',
  is_blocked: 'Blocked',
  state: 'State',
  epic_type: 'Type',
  process_step_id: 'Process Step',
  primary_program_id: 'Program',
  theme_id: 'Theme',
  portfolio_id: 'Portfolio',
  estimate: 'Estimate',
  effort_swag: 'Effort',
};

function getChangedFields(before: any, after: any): { field: string; from: string; to: string }[] {
  if (!before || !after) return [];

  const changes: { field: string; from: string; to: string }[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (EXCLUDED_FIELDS.includes(key)) continue;

    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    // Skip if both are objects (complex fields)
    if (typeof beforeVal === 'object' && beforeVal !== null) continue;
    if (typeof afterVal === 'object' && afterVal !== null) continue;

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({
        field: FIELD_LABELS[key] || key.replace(/_/g, ' '),
        from: beforeVal === null || beforeVal === undefined ? 'None' : String(beforeVal),
        to: afterVal === null || afterVal === undefined ? 'None' : String(afterVal),
      });
    }
  }

  return changes.slice(0, 3);
}

function getChangedFieldsDisplay(before: any, after: any): { oldValue: string | null; newValue: string | null } {
  const changes = getChangedFields(before, after);
  if (changes.length === 0) return { oldValue: null, newValue: null };

  return {
    oldValue: changes[0].from,
    newValue: changes[0].to,
  };
}
