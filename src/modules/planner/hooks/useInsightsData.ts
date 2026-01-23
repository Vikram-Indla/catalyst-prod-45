/**
 * Insights Data Hooks
 * Fetches real data for weekly/monthly insights dashboards
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export function useWeeklyInsightsData() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  return useQuery({
    queryKey: ['weekly-insights', weekStart.toISOString()],
    queryFn: async () => {
      const [releases, incidents, defects, stories] = await Promise.all([
        supabase.from('releases')
          .select('id, name, version, status, release_date, created_at')
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString()),
        supabase.from('incidents')
          .select('id, title, status, severity, created_at')
          .is('deleted_at', null)
          .gte('created_at', weekStart.toISOString()),
        supabase.from('defects')
          .select('id, title, status, severity, created_at')
          .gte('created_at', weekStart.toISOString()),
        supabase.from('stories')
          .select('id, title, status, created_at')
          .is('deleted_at', null)
          .gte('created_at', weekStart.toISOString()),
      ]);

      return {
        period: { start: weekStart, end: weekEnd },
        releases: releases.data || [],
        incidents: incidents.data || [],
        defects: defects.data || [],
        stories: stories.data || [],
        releasesCount: releases.data?.length || 0,
        incidentsCount: incidents.data?.length || 0,
        defectsCount: defects.data?.length || 0,
        storiesCount: stories.data?.length || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyInsightsData() {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  return useQuery({
    queryKey: ['monthly-insights', monthStart.toISOString()],
    queryFn: async () => {
      const [releases, incidents, businessRequests, testCycles] = await Promise.all([
        supabase.from('releases')
          .select('id, name, version, status, release_date')
          .gte('created_at', monthStart.toISOString()),
        supabase.from('incidents')
          .select('id, title, status, severity')
          .is('deleted_at', null)
          .gte('created_at', monthStart.toISOString()),
        supabase.from('business_requests')
          .select('id, title, process_step, created_at')
          .is('deleted_at', null)
          .gte('created_at', monthStart.toISOString()),
        supabase.from('tm_test_cycles')
          .select('id, name, status, created_at')
          .gte('created_at', monthStart.toISOString()),
      ]);

      return {
        period: { 
          month: monthStart.toLocaleString('default', { month: 'long' }), 
          year: monthStart.getFullYear(),
          edition: monthStart.getMonth() + 1,
        },
        releases: releases.data || [],
        incidents: incidents.data || [],
        businessRequests: businessRequests.data || [],
        testCycles: testCycles.data || [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
