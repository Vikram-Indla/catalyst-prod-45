import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { History, ArrowRight } from 'lucide-react';
import { BusinessRequest } from '@/types/business-request';

interface AuditHistoryTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function AuditHistoryTab({ data }: AuditHistoryTabProps) {
  const requestId = data.id;

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['business-request-audit', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('business_request_audit_logs')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'DELETE': return 'Deleted';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600';
      case 'UPDATE': return 'text-blue-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change History</h3>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : auditLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No changes recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log: any) => (
            <div
              key={log.id}
              className="p-3 bg-muted/50 rounded-lg space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                    {getActionLabel(log.action)}
                  </span>
                  {log.field_changed && (
                    <span className="text-xs text-muted-foreground">
                      • {log.field_changed}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>

              {log.action === 'UPDATE' && log.old_value !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through truncate max-w-[150px]">
                    {log.old_value || 'Empty'}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {log.new_value || 'Empty'}
                  </span>
                </div>
              )}

              {log.action === 'CREATE' && log.new_value && (
                <p className="text-sm text-muted-foreground truncate">
                  {log.new_value}
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                by {log.actor_name || 'Unknown'} • {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
