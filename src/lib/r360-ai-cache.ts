import { supabase } from '@/integrations/supabase/client';

export interface AICacheEntry {
  scope_type: 'resource' | 'department';
  scope_id: string;
  section: string;
  week_start: string | null;
  data: any;
  status: 'fresh' | 'stale' | 'computing' | 'error';
  computed_at: string;
  is_stale: boolean;
  expires_at?: string;
}

/** Read a single cache section */
export async function readCache(
  scopeType: 'resource' | 'department',
  scopeId: string,
  section: string,
  weekStart?: string
): Promise<AICacheEntry | null> {
  let query = supabase
    .from('r360_ai_cache')
    .select('*')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('section', section);

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  } else {
    query = query.is('week_start', null);
  }

  const { data } = await query.maybeSingle();
  return data as AICacheEntry | null;
}

/** Read all cache entries for a scope (load entire panel at once) */
export async function readAllCache(
  scopeType: 'resource' | 'department',
  scopeId: string
): Promise<Record<string, AICacheEntry>> {
  const { data } = await supabase
    .from('r360_ai_cache')
    .select('*')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId);

  const map: Record<string, AICacheEntry> = {};
  (data || []).forEach((entry: any) => {
    const key = entry.week_start
      ? `${entry.section}:${entry.week_start}`
      : entry.section;
    map[key] = entry as AICacheEntry;
  });
  return map;
}

/** Check if cache entry is fresh */
export function isCacheFresh(entry: AICacheEntry | null): boolean {
  if (!entry) return false;
  if (entry.status !== 'fresh') return false;
  if (entry.is_stale) return false;
  if (entry.expires_at && new Date(entry.expires_at) < new Date()) return false;
  return true;
}

/** Human-readable cache age */
export function getCacheAge(entry: AICacheEntry | null): string {
  if (!entry) return 'No data';
  const diff = Date.now() - new Date(entry.computed_at).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Trigger manual refresh with highest priority */
export async function triggerRefresh(
  scopeType: 'resource' | 'department',
  scopeId: string,
  sections?: string[]
): Promise<void> {
  const defaultSections = scopeType === 'resource'
    ? ['hub_closures', 'delivery_backlog', 'delivery_metrics', 'behavioral_patterns', 'weekly_story']
    : ['health_kpis', 'workload_distribution', 'item_distribution', 'weekly_events', 'resource_leaderboard'];

  // Mark all as stale immediately
  await supabase
    .from('r360_ai_cache')
    .update({
      status: 'stale',
      is_stale: true,
      stale_at: new Date().toISOString(),
      stale_reason: 'manual_refresh',
    })
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId);

  // Queue high-priority job
  await supabase.from('r360_ai_jobs').insert({
    scope_type: scopeType,
    scope_id: scopeId,
    sections: sections || defaultSections,
    triggered_by: 'manual_refresh',
    priority: 1,
  });

  // Call edge function directly for immediate computation
  await supabase.functions.invoke('r360-ai-compute', {
    body: { scope_type: scopeType, scope_id: scopeId, sections: sections || defaultSections },
  });
}
