import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { History, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface UnifiedAuditHistoryTabProps {
  entityId: string;
  entityType: 'business_request' | 'epic' | 'theme' | 'objective' | 'feature';
}

const PAGE_SIZE = 50;

// Map entity types to their audit log table and column names
const ENTITY_CONFIG: Record<string, { table: string; idColumn: string; useActivityLogs?: boolean }> = {
  business_request: { table: 'business_request_audit_logs', idColumn: 'business_request_id' },
  epic: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  theme: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  objective: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
  feature: { table: 'activity_logs', idColumn: 'entity_id', useActivityLogs: true },
};

export function UnifiedAuditHistoryTab({ entityId, entityType }: UnifiedAuditHistoryTabProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const config = ENTITY_CONFIG[entityType];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['unified-audit-history', entityType, entityId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (config.useActivityLogs) {
        // Use activity_logs table for epics, themes, objectives, features
        // Map entity types to their actual table names in activity_logs
        const entityTypeMap: Record<string, string> = {
          'epic': 'epics',
          'theme': 'strategic_themes',
          'objective': 'objective',
          'feature': 'features',
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

        // Fetch profiles for actor_ids
        const actorIds = [...new Set((logs || []).map((log: any) => log.actor_id).filter(Boolean))] as string[];
        let profilesMap: Record<string, any> = {};
        
        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', actorIds);
          
          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
          }
        }

        // Transform to unified format
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
      } else {
        // Use specific audit log table (business_request_audit_logs)
        const { data: logs, error, count } = await supabase
          .from('business_request_audit_logs')
          .select('*', { count: 'exact' })
          .eq('business_request_id', entityId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        return { logs: (logs || []) as any[], count: count || 0, page: pageParam };
      }
    },
    getNextPageParam: (lastPage) => {
      const totalLoaded = (lastPage.page + 1) * PAGE_SIZE;
      return totalLoaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!entityId
  });

  const allLogs = data?.pages.flatMap(page => page.logs) || [];
  const totalCount = data?.pages[0]?.count || 0;

  // Infinite scroll handler
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatActionType = (action: string | null, field: string | null) => {
    if (!action) return 'updated';
    if (action === 'INSERT' || action === 'CREATE') return 'created this item';
    if (action === 'DELETE') return 'deleted';
    if (field) {
      return field.replace(/_/g, ' ');
    }
    return action.toLowerCase().replace(/_/g, ' ');
  };

  const formatValue = (value: string | null) => {
    if (value === null || value === 'null' || value === '') return 'None';
    
    // Check if value looks like an ISO date string and format it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      try {
        return format(new Date(value), 'MMM d, yyyy h:mm a');
      } catch {
        // If parsing fails, return original value
      }
    }
    
    // Don't truncate text - show full value
    return value;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-nowrap items-end gap-2 px-5 py-4 border-b border-border shrink-0">
        <History className="h-4 w-4 text-brand-gold flex-shrink-0" />
        <span className="text-[13px] font-semibold text-brand-gold uppercase tracking-[0.5px] leading-none whitespace-nowrap">
          Audit History
        </span>
        <span className="text-[13px] text-[#6B7280] font-normal leading-none whitespace-nowrap">
          ({totalCount} {totalCount === 1 ? 'change' : 'changes'})
        </span>
      </div>

      {/* Scrollable Activity List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#9CA3AF]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-[13px]">Loading history...</span>
          </div>
        ) : allLogs.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-[14px] font-medium">No audit history yet</p>
            <p className="text-[12px]">Changes to this item will appear here</p>
          </div>
        ) : (
          <>
            {allLogs.map((log: any) => (
              <div 
                key={log.id} 
                className="flex gap-3 px-5 py-4 hover:bg-muted/30 transition-colors duration-150 border-b border-border/50 last:border-b-0"
                style={{ animation: 'fadeIn 0.3s ease' }}
              >
                {/* Gold Avatar */}
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
                  style={{ backgroundColor: '#C4944C' }}
                >
                  {getInitials(log.actor_name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                    <span className="text-[14px] font-semibold text-[#1F2937]">
                      {log.actor_name || 'Unknown User'}
                    </span>
                    <span className="text-[13px] text-[#9CA3AF] italic">
                      {formatActionType(log.action, log.field_changed)}
                    </span>
                  </div>

                  <div className="text-[12px] text-[#9CA3AF] mb-2">
                    {format(new Date(log.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </div>

                  {/* Show changes for activity_logs format */}
                  {log.changes && log.changes.length > 0 ? (
                    <div className="space-y-1">
                      {log.changes.map((change: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[13px]">
                          <span className="text-[#9CA3AF] italic text-[12px]">{change.field}:</span>
                          <span className={`text-[#6B7280] ${change.from ? 'font-medium text-[#1F2937]' : ''}`}>
                            {formatValue(change.from)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                          <span className={`text-[#6B7280] ${change.to ? 'font-medium text-[#1F2937]' : ''}`}>
                            {formatValue(change.to)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (log.old_value !== null || log.new_value !== null) && (
                    <div className="flex items-center gap-2.5 text-[13px]">
                      <span className={`text-[#6B7280] ${log.old_value ? 'font-medium text-[#1F2937]' : ''}`}>
                        {formatValue(log.old_value)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                      <span className={`text-[#6B7280] ${log.new_value ? 'font-medium text-[#1F2937]' : ''}`}>
                        {formatValue(log.new_value)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator when auto-fetching */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 text-[#9CA3AF]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-[12px]">Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Load More button */}
      {hasNextPage && !isFetchingNextPage && allLogs.length > 0 && (
        <div className="shrink-0 border-t border-border px-5 py-3 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            className="w-full text-[13px] font-medium h-9 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-150"
          >
            Load more changes
          </Button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
    
    // Compare stringified values for simple comparison
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ 
        field: FIELD_LABELS[key] || key.replace(/_/g, ' '), 
        from: beforeVal === null || beforeVal === undefined ? 'None' : String(beforeVal), 
        to: afterVal === null || afterVal === undefined ? 'None' : String(afterVal)
      });
    }
  }
  
  return changes.slice(0, 3); // Limit to 3 changes per entry for readability
}

function getChangedFieldsDisplay(before: any, after: any): { oldValue: string | null; newValue: string | null } {
  const changes = getChangedFields(before, after);
  if (changes.length === 0) return { oldValue: null, newValue: null };
  
  return {
    oldValue: changes[0].from,
    newValue: changes[0].to
  };
}
