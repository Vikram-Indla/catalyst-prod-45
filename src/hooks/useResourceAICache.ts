import { useQuery } from '@tanstack/react-query';
import { readAllCache, isCacheFresh, getCacheAge, triggerRefresh } from '@/lib/r360-ai-cache';

export function useResourceAICache(resourceId: string | null) {
  const { data: cache, isLoading, refetch } = useQuery({
    queryKey: ['r360-ai-cache', 'resource', resourceId],
    queryFn: () => readAllCache('resource', resourceId!),
    enabled: !!resourceId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const hubClosures = cache?.hub_closures?.data;
  const deliveryBacklog = cache?.delivery_backlog?.data;
  const deliveryMetrics = cache?.delivery_metrics?.data;
  const behavioralPatterns = cache?.behavioral_patterns?.data;

  const getWeeklyStory = (weekStart: Date) => {
    const key = `weekly_story:${weekStart.toISOString().split('T')[0]}`;
    return cache?.[key]?.data;
  };

  const freshest = cache ? Object.values(cache).reduce((newest, entry) =>
    !newest || new Date(entry.computed_at) > new Date(newest.computed_at) ? entry : newest,
    null as any
  ) : null;
  const dataAge = getCacheAge(freshest);
  const isStale = freshest ? !isCacheFresh(freshest) : true;
  const isComputing = Object.values(cache || {}).some(e => e.status === 'computing');
  const hasCache = !!cache && Object.keys(cache).length > 0;

  const refresh = async () => {
    if (!resourceId) return;
    await triggerRefresh('resource', resourceId);
    setTimeout(() => refetch(), 500);
    setTimeout(() => refetch(), 5000);
    setTimeout(() => refetch(), 15000);
  };

  return {
    hubClosures,
    deliveryBacklog,
    deliveryMetrics,
    behavioralPatterns,
    getWeeklyStory,
    dataAge,
    isStale,
    isComputing,
    isLoading,
    hasCache,
    refresh,
    refetch,
  };
}
