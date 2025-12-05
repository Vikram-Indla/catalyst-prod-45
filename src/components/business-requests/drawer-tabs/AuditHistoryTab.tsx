import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { History, ArrowRight, Loader2 } from 'lucide-react';

interface AuditHistoryTabProps {
  requestId: string;
}

const PAGE_SIZE = 50;

export function AuditHistoryTab({ requestId }: AuditHistoryTabProps) {
  // Infinite query for lazy loading audit logs
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

  // Format field name to human-readable
  const formatFieldName = (field: string | null) => {
    if (!field) return 'Record';
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get action description
  const getActionDescription = (log: any) => {
    const actorName = log.actor_name || 'System';
    const field = formatFieldName(log.field_changed);
    
    switch (log.action) {
      case 'CREATE':
        return <><span className="font-semibold text-foreground">{actorName}</span> created this request</>;
      case 'UPDATE':
        return <><span className="font-semibold text-foreground">{actorName}</span> updated the <span className="font-medium">{field}</span></>;
      case 'DELETE':
        return <><span className="font-semibold text-foreground">{actorName}</span> deleted the <span className="font-medium">{field}</span></>;
      case 'STATUS_CHANGE':
        return <><span className="font-semibold text-foreground">{actorName}</span> changed the status</>;
      default:
        return <><span className="font-semibold text-foreground">{actorName}</span> {log.action.toLowerCase()}</>;
    }
  };

  // Format value for display (handle nulls, long text, etc.)
  const formatValue = (value: string | null) => {
    if (value === null || value === 'null' || value === '') return 'None';
    if (value.length > 80) return value.slice(0, 80) + '...';
    return value;
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-[15px] font-semibold text-foreground">Audit History</h3>
        </div>
        <span className="text-[12px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          {totalCount.toLocaleString()} {totalCount === 1 ? 'change' : 'changes'}
        </span>
      </div>

      {/* Audit Log List - Jira Style */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-[13px]">Loading history...</span>
            </div>
          ) : allLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-[14px] font-medium">No audit history yet</p>
              <p className="text-[12px]">Changes to this request will appear here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {allLogs.map((log: any, index: number) => (
                <div 
                  key={log.id} 
                  className={`flex gap-4 py-4 ${index !== allLogs.length - 1 ? 'border-b border-border/30' : ''}`}
                >
                  {/* Avatar - Jira Blue Style */}
                  <Avatar className="h-10 w-10 shrink-0 bg-[#0052CC]">
                    <AvatarFallback className="text-[13px] font-medium bg-[#0052CC] text-white">
                      {getInitials(log.actor_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Action Description */}
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      {getActionDescription(log)}
                    </p>

                    {/* Timestamp */}
                    <p className="text-[12px] text-muted-foreground/70 mt-0.5">
                      {format(new Date(log.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>

                    {/* Value Change - Only show for updates */}
                    {log.old_value !== null || log.new_value !== null ? (
                      <div className="flex items-center gap-2 mt-2 text-[14px]">
                        <span className="text-muted-foreground">
                          {formatValue(log.old_value)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <span className="text-foreground font-medium">
                          {formatValue(log.new_value)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="pt-4 pb-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-[12px] h-8"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load more (${totalCount - allLogs.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}