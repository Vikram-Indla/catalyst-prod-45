import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface FeatureAuditTabProps {
  featureId?: string;
}

export function FeatureAuditTab({ featureId }: FeatureAuditTabProps) {
  const { data: auditLogs } = useQuery({
    queryKey: ['feature-audit', featureId],
    queryFn: async () => {
      if (!featureId) return [];

      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'features')
        .eq('entity_id', featureId)
        .order('created_at', { ascending: false })
        .limit(50);

      return data || [];
    },
    enabled: !!featureId,
  });

  if (!featureId) {
    return (
      <div className="text-sm text-muted-foreground">
        Save feature to view audit log
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {auditLogs && auditLogs.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{log.action}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {log.created_at && formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No audit history yet
        </div>
      )}
    </div>
  );
}
