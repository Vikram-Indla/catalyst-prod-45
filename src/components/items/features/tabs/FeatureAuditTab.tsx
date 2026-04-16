/**
 * Feature Audit Tab — catalyst-ds replacement.
 * Reads from activity_logs with entity_type='features'.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFeed } from '@/components/catalyst-ds';
import type { CdsActivityItem } from '@/components/catalyst-ds';

interface FeatureAuditTabProps {
  featureId?: string;
}

function diffFields(before: any, after: any): { field: string; oldValue: string | null; newValue: string | null }[] {
  if (!before || !after) return [];
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (['updated_at', 'created_at'].includes(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({ field: key, oldValue: before[key] != null ? String(before[key]) : null, newValue: after[key] != null ? String(after[key]) : null });
    }
  }
  return changes;
}

export function FeatureAuditTab({ featureId }: FeatureAuditTabProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feature-audit', featureId],
    enabled: !!featureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'features')
        .eq('entity_id', featureId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const result: CdsActivityItem[] = (data || []).flatMap((log: any): CdsActivityItem[] => {
        let type: CdsActivityItem['type'] = 'update';
        if (log.action === 'INSERT') type = 'create';
        else if (log.action === 'DELETE') type = 'delete';

        const changes = diffFields(log.before_json, log.after_json);
        if (changes.length === 0) {
          return [{ id: log.id, type, actor: { id: log.actor_id || 'system', name: 'System' }, timestamp: log.created_at, description: `${log.action?.toLowerCase()} this feature` } as CdsActivityItem];
        }
        return changes.map((c, i) => ({
          id: `${log.id}-${i}`, type,
          actor: { id: log.actor_id || 'system', name: 'System' },
          timestamp: log.created_at, fieldChange: c,
        } as CdsActivityItem));
      });
      return result;
    },
  });

  return <ActivityFeed items={items} isLoading={isLoading} emptyMessage="No audit history" />;
}

export default FeatureAuditTab;
