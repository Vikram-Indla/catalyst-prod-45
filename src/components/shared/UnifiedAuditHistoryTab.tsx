/**
 * Unified Audit History Tab — catalyst-ds replacement.
 * Routes to activity_logs or business_request_audit_logs based on entityType.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { ActivityFeed } from '@/components/catalyst-ds';
import type { CdsActivityItem } from '@/components/catalyst-ds';

interface UnifiedAuditHistoryTabProps {
  entityId: string;
  entityType: 'business_request' | 'epic' | 'theme' | 'objective' | 'feature' | 'risk' | 'snapshot';
  embedded?: boolean;
}

const PAGE_SIZE = 50;

const ENTITY_TYPE_MAP: Record<string, string> = {
  epic: 'epics', theme: 'strategic_themes', objective: 'objective',
  feature: 'features', risk: 'risks', snapshot: 'strategy_snapshots',
};

function mapBrAudit(raw: any): CdsActivityItem {
  const action = raw.action?.toUpperCase();
  return {
    id: raw.id,
    type: action === 'CREATE' ? 'create' : action === 'DELETE' ? 'delete' : 'update',
    actor: { id: raw.actor_id || 'system', name: raw.actor_name || 'System' },
    timestamp: raw.created_at,
    description: action === 'CREATE' ? 'created this request' : undefined,
    fieldChange: raw.field_changed ? { field: raw.field_changed, oldValue: raw.old_value, newValue: raw.new_value } : undefined,
  };
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

function mapActivityLog(raw: any, profileMap: Map<string, any>): CdsActivityItem[] {
  const profile = profileMap.get(raw.actor_id);
  const actorName = profile?.full_name || 'System';
  let type: CdsActivityItem['type'] = 'update';
  if (raw.action === 'INSERT') type = 'create';
  else if (raw.action === 'DELETE') type = 'delete';

  const changes = diffFields(raw.before_json, raw.after_json);
  if (changes.length === 0) {
    return [{ id: raw.id, type, actor: { id: raw.actor_id || 'system', name: actorName, avatarUrl: profile?.avatar_url }, timestamp: raw.created_at, description: `${raw.action?.toLowerCase()} this item` }];
  }
  return changes.map((c, i) => ({
    id: `${raw.id}-${i}`, type: type as CdsActivityItem['type'],
    actor: { id: raw.actor_id || 'system', name: actorName, avatarUrl: profile?.avatar_url },
    timestamp: raw.created_at, fieldChange: c,
  }));
}

export function UnifiedAuditHistoryTab({ entityId, entityType }: UnifiedAuditHistoryTabProps) {
  const isBR = entityType === 'business_request';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['unified-audit-history', entityType, entityId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (isBR) {
        const { data: logs, error, count } = await typedQuery('business_request_audit_logs')
          .select('*', { count: 'exact' })
          .eq('business_request_id', entityId)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        return { items: (logs || []).map(mapBrAudit), count: count || 0, page: pageParam };
      }

      const dbEntityType = ENTITY_TYPE_MAP[entityType] || entityType;
      const { data: logs, error, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('entity_type', dbEntityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;

      const actorIds = [...new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', actorIds);
        if (profiles) profiles.forEach((p: any) => profileMap.set(p.id, p));
      }

      const items = (logs || []).flatMap((l: any) => mapActivityLog(l, profileMap));
      return { items, count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const loaded = (lastPage.page + 1) * PAGE_SIZE;
      return loaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!entityId,
  });

  const allItems = data?.pages.flatMap(p => p.items) || [];

  return (
    <ActivityFeed
      items={allItems}
      isLoading={isLoading}
      hasMore={!!hasNextPage}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
      emptyMessage="No audit history"
      emptyDescription="Changes will appear here"
    />
  );
}

export default UnifiedAuditHistoryTab;
