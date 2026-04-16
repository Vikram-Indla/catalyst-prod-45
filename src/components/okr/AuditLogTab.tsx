/**
 * OKR Audit Log Tab — catalyst-ds replacement.
 * Reads from activity_logs for objectives + key results.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFeed } from '@/components/catalyst-ds';
import type { CdsActivityItem } from '@/components/catalyst-ds';

interface AuditLogTabProps {
  objectiveId: string;
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

export function AuditLogTab({ objectiveId }: AuditLogTabProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['audit-logs', objectiveId],
    enabled: !!objectiveId,
    queryFn: async () => {
      const { data: objLogs } = await (supabase as any).from('activity_logs')
        .select('*, profiles:actor_id(full_name, avatar_url)')
        .eq('entity_type', 'objective').eq('entity_id', objectiveId)
        .order('created_at', { ascending: false });

      const { data: krs } = await supabase.from('key_results_v2').select('id').eq('objective_id', objectiveId);
      const krIds = (krs || []).map((kr: any) => kr.id);

      let krLogs: any[] = [];
      if (krIds.length > 0) {
        const { data } = await (supabase as any).from('activity_logs')
          .select('*, profiles:actor_id(full_name, avatar_url)')
          .eq('entity_type', 'key_result').in('entity_id', krIds)
          .order('created_at', { ascending: false });
        krLogs = data || [];
      }

      const allLogs = [...(objLogs || []), ...krLogs];
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const result: CdsActivityItem[] = allLogs.flatMap((log: any): CdsActivityItem[] => {
        const actorName = log.profiles?.full_name || 'System';
        const action = log.action;
        let type: CdsActivityItem['type'] = 'update';
        if (action === 'INSERT') type = 'create';
        else if (action === 'DELETE') type = 'delete';

        const entityLabel = log.entity_type === 'key_result' ? 'key result' : 'objective';
        const changes = diffFields(log.before_json, log.after_json);

        if (changes.length === 0) {
          return [{
            id: log.id, type,
            actor: { id: log.actor_id || 'system', name: actorName, avatarUrl: log.profiles?.avatar_url },
            timestamp: log.created_at,
            description: `${action.toLowerCase()} ${entityLabel}`,
          } as CdsActivityItem];
        }

        return changes.map((c, i) => ({
          id: `${log.id}-${i}`, type,
          actor: { id: log.actor_id || 'system', name: actorName, avatarUrl: log.profiles?.avatar_url },
          timestamp: log.created_at, fieldChange: c,
        } as CdsActivityItem));
      });

      return result;
    },
  });

  return <ActivityFeed items={items} isLoading={isLoading} emptyMessage="No audit history" emptyDescription="Changes to this objective and its key results will appear here" />;
}

export default AuditLogTab;
