/**
 * Hook: useDefectTrends
 * Fetches defect opened/closed trends over time
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DefectTrendPoint } from '../types';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

type TimeRange = '7d' | '14d' | '30d' | '90d';

const timeRangeMap: Record<TimeRange, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

export function useDefectTrends(timeRange: TimeRange = '30d', projectId?: string) {
  return useQuery({
    queryKey: ['command-center-defect-trends', timeRange, projectId],
    queryFn: async (): Promise<DefectTrendPoint[]> => {
      const days = timeRangeMap[timeRange];
      const startDate = subDays(new Date(), days);
      
      // Get all days in range
      const dateRange = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      // Fetch defects created in range
      let createdQuery = supabase
        .from('tm_defects')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (projectId) {
        createdQuery = createdQuery.eq('project_id', projectId);
      }

      const { data: createdDefects } = await createdQuery;

      // Fetch defects closed in range (using updated_at and status)
      let closedQuery = supabase
        .from('tm_defects')
        .select('updated_at, status')
        .in('status', ['closed', 'resolved'])
        .gte('updated_at', startDate.toISOString());

      if (projectId) {
        closedQuery = closedQuery.eq('project_id', projectId);
      }

      const { data: closedDefects } = await closedQuery;

      // Aggregate by day
      const trendData: DefectTrendPoint[] = dateRange.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const opened = createdDefects?.filter(d => {
          const createdAt = new Date(d.created_at);
          return createdAt >= dayStart && createdAt < dayEnd;
        }).length || 0;

        const closed = closedDefects?.filter(d => {
          const updatedAt = new Date(d.updated_at);
          return updatedAt >= dayStart && updatedAt < dayEnd;
        }).length || 0;

        return {
          date: date.toISOString(),
          dateLabel: format(date, 'MMM d'),
          opened,
          closed,
          net: opened - closed,
        };
      });

      // Reduce data points for longer ranges
      if (days > 30) {
        // Weekly aggregation
        const weeklyData: DefectTrendPoint[] = [];
        for (let i = 0; i < trendData.length; i += 7) {
          const weekSlice = trendData.slice(i, i + 7);
          const weekOpened = weekSlice.reduce((sum, d) => sum + d.opened, 0);
          const weekClosed = weekSlice.reduce((sum, d) => sum + d.closed, 0);
          weeklyData.push({
            date: weekSlice[0].date,
            dateLabel: format(new Date(weekSlice[0].date), 'MMM d'),
            opened: weekOpened,
            closed: weekClosed,
            net: weekOpened - weekClosed,
          });
        }
        return weeklyData;
      }

      return trendData;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
