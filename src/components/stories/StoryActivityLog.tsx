/**
 * Story Activity Log — catalyst-ds replacement.
 * Reads from activity_logs with entity_type='stories'.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFeed } from '@/components/catalyst-ds';
import type { CdsActivityItem } from '@/components/catalyst-ds';

interface StoryActivityLogProps {
  storyId: string;
}

function diffFields(before: any, after: any): { field: string; oldValue: string | null; newValue: string | null }[] {
  if (!before || !after) return [];
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (['updated_at', 'created_at'].includes(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal != null ? String(oldVal) : null, newValue: newVal != null ? String(newVal) : null });
    }
  }
  return changes;
}

export function StoryActivityLog({ storyId }: StoryActivityLogProps) {
  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ['story-activity', storyId],
    enabled: !!storyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles:actor_id(full_name, email)')
        .eq('entity_type', 'stories')
        .eq('entity_id', storyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const items: CdsActivityItem[] = rawLogs.flatMap((log: any) => {
    const actorName = log.profiles?.full_name || log.profiles?.email || 'System';
    const action = log.action;
    let type: CdsActivityItem['type'] = 'update';
    if (action === 'INSERT') type = 'create';
    else if (action === 'DELETE') type = 'delete';

    const changes = diffFields(log.before_json, log.after_json);

    if (changes.length === 0) {
      return [{
        id: log.id,
        type,
        actor: { id: log.actor_id || 'system', name: actorName },
        timestamp: log.created_at,
        description: type === 'create' ? 'created this story' : type === 'delete' ? 'deleted this story' : 'updated this story',
      }];
    }

    return changes.map((c, i) => ({
      id: `${log.id}-${i}`,
      type: type as CdsActivityItem['type'],
      actor: { id: log.actor_id || 'system', name: actorName },
      timestamp: log.created_at,
      fieldChange: c,
    }));
  });

  return <ActivityFeed items={items} isLoading={isLoading} emptyMessage="No activity recorded" />;
}

export default StoryActivityLog;
