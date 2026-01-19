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
      const activities: ActivityItem[] = [];

      // Fetch recent test runs
      const { data: recentRuns } = await supabase
        .from('tm_test_runs')
        .select(`
          id,
          status,
          created_at,
          test_case_id,
          executed_by
        `)
        .not('executed_by', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit) as { data: any[] | null };

      for (const run of recentRuns || []) {
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

      // Fetch recent defects
      const { data: recentDefects } = await supabase
        .from('tm_defects')
        .select(`
          id,
          defect_key,
          title,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5) as { data: any[] | null };

      for (const defect of recentDefects || []) {
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
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('command-center-activities')
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
