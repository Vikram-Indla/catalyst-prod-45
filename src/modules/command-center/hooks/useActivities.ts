/**
 * Hook: useActivities
 * Fetches recent activity feed from test executions and defects
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityItem, ActivityType } from '../types';
import { formatDistanceToNow } from 'date-fns';

export function useActivities(limit: number = 10, projectId?: string) {
  const query = useQuery({
    queryKey: ['command-center-activities', limit, projectId],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch test runs and defects in parallel
      const [runsResult, defectsResult] = await Promise.all([
        supabase
          .from('tm_test_runs')
          .select('id, status, created_at, test_case_id, executed_by')
          .not('executed_by', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit) as unknown as Promise<{ data: any[] | null; error: any }>,
        supabase
          .from('tm_defects')
          .select('id, defect_key, title, created_at')
          .order('created_at', { ascending: false })
          .limit(5) as unknown as Promise<{ data: any[] | null; error: any }>,
      ]);

      if (runsResult.error) throw runsResult.error;
      if (defectsResult.error) throw defectsResult.error;

      const activities: ActivityItem[] = [];

      for (const run of runsResult.data || []) {
        let activityType: ActivityType = 'passed';
        if (run.status === 'failed') activityType = 'failed';
        else if (run.status === 'blocked') activityType = 'blocked';

        activities.push({
          id: run.id,
          type: activityType,
          user: 'QA User',
          action: 'executed',
          subject: `TC-${run.test_case_id?.slice(0, 4) || '0000'}`,
          title: 'Test Case',
          time: formatDistanceToNow(new Date(run.created_at), { addSuffix: true }),
          timestamp: new Date(run.created_at),
        });
      }

      for (const defect of defectsResult.data || []) {
        activities.push({
          id: defect.id,
          type: 'defect',
          user: 'Reporter',
          action: 'created',
          subject: defect.defect_key || `DEF-${defect.id.slice(0, 4)}`,
          title: defect.title || 'Defect',
          time: formatDistanceToNow(new Date(defect.created_at), { addSuffix: true }),
          timestamp: new Date(defect.created_at),
        });
      }

      // Sort by timestamp and return top N
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    },
    staleTime: 30000, // Realtime subscription handles updates
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`command-center-activities-${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tm_test_runs',
      }, () => {
        query.refetch();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tm_defects',
      }, () => {
        query.refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
}
