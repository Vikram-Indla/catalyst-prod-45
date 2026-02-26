import { useQuery } from '@tanstack/react-query';
import { readAllCache, getCacheAge, isCacheFresh, triggerRefresh } from '@/lib/r360-ai-cache';

export function useDeptAICache(department: string | null) {
  const { data: cache, isLoading, refetch } = useQuery({
    queryKey: ['r360-ai-cache', 'department', department],
    queryFn: () => readAllCache('department', department!),
    enabled: !!department,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const healthKpis = cache?.health_kpis?.data;
  const workloadDistribution = cache?.workload_distribution?.data;
  const itemDistribution = cache?.item_distribution?.data;
  const resourceLeaderboard = cache?.resource_leaderboard?.data;

  const getWeeklyEvents = (weekStart: Date) => {
    const key = `weekly_events:${weekStart.toISOString().split('T')[0]}`;
    return cache?.[key]?.data;
  };

  const freshest = cache ? Object.values(cache).reduce((newest, entry) =>
    !newest || new Date(entry.computed_at) > new Date(newest.computed_at) ? entry : newest,
    null as any
  ) : null;

  const hasCache = !!cache && Object.keys(cache).length > 0;

  const refresh = async () => {
    if (!department) return;
    await triggerRefresh('department', department);
    setTimeout(() => refetch(), 500);
    setTimeout(() => refetch(), 5000);
    setTimeout(() => refetch(), 15000);
  };

  return {
    healthKpis,
    workloadDistribution,
    itemDistribution,
    resourceLeaderboard,
    getWeeklyEvents,
    dataAge: getCacheAge(freshest),
    isStale: freshest ? !isCacheFresh(freshest) : true,
    isComputing: Object.values(cache || {}).some(e => e.status === 'computing'),
    isLoading,
    hasCache,
    refresh,
    refetch,
  };
}
