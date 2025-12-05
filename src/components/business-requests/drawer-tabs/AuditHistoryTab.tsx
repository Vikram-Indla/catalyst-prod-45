import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { History, ArrowRight, Loader2 } from 'lucide-react';

interface AuditHistoryTabProps {
  requestId: string;
}

const PAGE_SIZE = 50;

export function AuditHistoryTab({ requestId }: AuditHistoryTabProps) {
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'SY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format action type for display (snake_case to human readable)
  const formatActionType = (action: string | null, field: string | null) => {
    if (!action) return 'updated';
    if (action === 'CREATE') return 'created this request';
    if (action === 'DELETE') return 'deleted';
    // For updates, show the field that changed
    if (field) {
      return field.replace(/_/g, '_');
    }
    return action.toLowerCase().replace(/_/g, '_');
  };

  // Format value for display
  const formatValue = (value: string | null) => {
    if (value === null || value === 'null' || value === '') return 'None';
    if (value.length > 60) return value.slice(0, 60) + '...';
    return value;
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg overflow-hidden">
      {/* Header - matches reference exactly */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-brand-gold" />
          <span className="text-[13px] font-semibold text-brand-gold uppercase tracking-[0.5px]">
            Audit History
          </span>
        </div>
        <span className="text-[13px] text-[#6B7280] font-normal">
          {totalCount} {totalCount === 1 ? 'change' : 'changes'}
        </span>
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-[#9CA3AF]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-[13px]">Loading history...</span>
            </div>
          ) : allLogs.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-[14px] font-medium">No audit history yet</p>
              <p className="text-[12px]">Changes to this request will appear here</p>
            </div>
          ) : (
            <>
              {allLogs.map((log: any) => (
                <div 
                  key={log.id} 
                  className="flex gap-3 px-5 py-4 hover:bg-[#F9FAFB] transition-colors duration-150"
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
                    {/* User name + action type */}
                    <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                      <span className="text-[14px] font-semibold text-[#1F2937]">
                        {log.actor_name || 'System'}
                      </span>
                      <span className="text-[13px] text-[#9CA3AF] italic">
                        {formatActionType(log.action, log.field_changed)}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-[12px] text-[#9CA3AF] mb-2">
                      {format(new Date(log.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </div>

                    {/* Value Change - Old → New */}
                    {(log.old_value !== null || log.new_value !== null) && (
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

              {/* Load More Button - Gold outline style */}
              {hasNextPage && (
                <div className="flex justify-center py-4 px-5 border-t border-[#E5E7EB]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-[13px] font-medium h-9 px-4 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-150"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load older changes'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

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
