import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { History, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface AuditHistoryTabProps {
  requestId: string;
}

const PAGE_SIZE = 50;

export function AuditHistoryTab({ requestId }: AuditHistoryTabProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['business-request-audit', requestId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('business_request_audit_logs')
        .select('*', { count: 'exact' })
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data || [], count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalLoaded = (lastPage.page + 1) * PAGE_SIZE;
      return totalLoaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!requestId
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
    if (!name) return 'SY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatActionType = (action: string | null, field: string | null) => {
    if (!action) return 'updated';
    if (action === 'CREATE') return 'created this request';
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
    <div 
      className="flex flex-col flex-1 min-h-0 rounded-lg overflow-hidden"
      style={{ backgroundColor: 'var(--surface-1)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
          <span 
            className="text-[13px] font-semibold uppercase tracking-[0.5px]"
            style={{ color: 'var(--accent-color)' }}
          >
            Audit History
          </span>
        </div>
        <span className="text-[13px] font-normal" style={{ color: 'var(--text-2)' }}>
          {totalCount} {totalCount === 1 ? 'change' : 'changes'}
        </span>
      </div>

      {/* Scrollable Activity List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-3)' }}>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-[13px]">Loading history...</span>
          </div>
        ) : allLogs.length === 0 ? (
          <div 
            className="text-center py-12"
            style={{ color: 'var(--text-3)' }}
          >
            <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>No audit history yet</p>
            <p className="text-[12px]">Changes to this request will appear here</p>
          </div>
        ) : (
          <>
            {allLogs.map((log: any) => (
              <div 
                key={log.id} 
                className="flex gap-3 px-5 py-4 transition-colors duration-150 last:border-b-0"
                style={{ 
                  animation: 'fadeIn 0.3s ease',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                {/* Gold Avatar */}
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  {getInitials(log.actor_name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                      {log.actor_name || 'System'}
                    </span>
                    <span className="text-[13px] italic" style={{ color: 'var(--text-3)' }}>
                      {formatActionType(log.action, log.field_changed)}
                    </span>
                  </div>

                  <div className="text-[12px] mb-2" style={{ color: 'var(--text-3)' }}>
                    {format(new Date(log.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </div>

                  {(log.old_value !== null || log.new_value !== null) && (
                    <div className="flex items-center gap-2.5 text-[13px]">
                      <span style={{ color: log.old_value ? 'var(--text-1)' : 'var(--text-3)', fontWeight: log.old_value ? 500 : 400 }}>
                        {formatValue(log.old_value)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
                      <span style={{ color: log.new_value ? 'var(--text-1)' : 'var(--text-3)', fontWeight: log.new_value ? 500 : 400 }}>
                        {formatValue(log.new_value)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator when auto-fetching */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-3)' }}>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-[12px]">Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Load More button */}
      {hasNextPage && !isFetchingNextPage && allLogs.length > 0 && (
        <div 
          className="shrink-0 px-5 py-3"
          style={{ 
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            className="w-full text-[13px] font-medium h-9 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-150"
          >
            Load more messages
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
