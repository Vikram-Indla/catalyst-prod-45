import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { History, User, ArrowRight } from 'lucide-react';

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: string;
  entityName: string;
}

export function AuditLogDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  entityName
}: AuditLogDialogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: open
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'DELETE': return 'Deleted';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'text-success';
      case 'UPDATE': return 'text-info';
      case 'DELETE': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getChangedFields = (beforeJson: any, afterJson: any) => {
    if (!beforeJson || !afterJson) return [];
    const changes: { field: string; from: any; to: any }[] = [];
    
    Object.keys(afterJson).forEach(key => {
      if (key === 'updated_at' || key === 'created_at') return;
      if (JSON.stringify(beforeJson[key]) !== JSON.stringify(afterJson[key])) {
        changes.push({
          field: key.replace(/_/g, ' '),
          from: beforeJson[key],
          to: afterJson[key]
        });
      }
    });
    
    return changes.slice(0, 5); // Limit to 5 changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            Activity history for "{entityName}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading audit log...
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  
                  {log.action === 'UPDATE' && log.before_json && log.after_json && (
                    <div className="mt-2 space-y-1">
                      {getChangedFields(log.before_json, log.after_json).map((change, idx) => (
                        <div key={idx} className="text-sm flex items-center gap-2">
                          <span className="text-muted-foreground capitalize">{change.field}:</span>
                          <span className="text-destructive/70 line-through">
                            {String(change.from || 'empty').slice(0, 30)}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-success">
                            {String(change.to || 'empty').slice(0, 30)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit history available</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
