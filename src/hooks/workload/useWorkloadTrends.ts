/**
 * Workload Trends Hook
 * Fetches historical workload data for trend charts
 */

import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import type { WorkloadTrendPoint, CycleWorkload } from '@/types/workload.types';

// Generate mock trend data for last 30 days
function generateMockTrends(): WorkloadTrendPoint[] {
  const points: WorkloadTrendPoint[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Base values with some randomness
    const baseAssigned = isWeekend ? 0 : Math.floor(Math.random() * 8) + 8;
    const baseCompleted = isWeekend ? 0 : Math.floor(Math.random() * 6) + 6;
    
    points.push({
      date: format(date, 'yyyy-MM-dd'),
      assigned: baseAssigned,
      completed: Math.min(baseCompleted, baseAssigned),
    });
  }
  
  return points;
}

// Mock cycle distribution data
const MOCK_CYCLES: CycleWorkload[] = [
  {
    cycleId: '1',
    cycleName: 'Regression R2.1',
    status: 'active',
    totalTests: 45,
    assignees: 4,
    endDate: format(subDays(new Date(), -3), 'yyyy-MM-dd'),
    urgency: 'due_soon',
    memberDistribution: [
      { memberId: '1', memberName: 'Ahmed', count: 15 },
      { memberId: '2', memberName: 'Sara', count: 12 },
      { memberId: '3', memberName: 'Omar', count: 10 },
      { memberId: '4', memberName: 'Fatima', count: 8 },
    ],
  },
  {
    cycleId: '2',
    cycleName: 'Smoke Tests',
    status: 'active',
    totalTests: 14,
    assignees: 2,
    endDate: format(subDays(new Date(), -7), 'yyyy-MM-dd'),
    urgency: 'on_track',
    memberDistribution: [
      { memberId: '1', memberName: 'Ahmed', count: 10 },
      { memberId: '3', memberName: 'Omar', count: 4 },
    ],
  },
  {
    cycleId: '3',
    cycleName: 'UAT Cycle',
    status: 'active',
    totalTests: 14,
    assignees: 2,
    endDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    urgency: 'overdue',
    memberDistribution: [
      { memberId: '2', memberName: 'Sara', count: 6 },
      { memberId: '4', memberName: 'Fatima', count: 8 },
    ],
  },
];

export function useWorkloadTrends(teamId: string) {
  return useQuery({
    queryKey: ['workload-trends', teamId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const trends = generateMockTrends();
      
      // Calculate summary stats
      const totalAssigned = trends.reduce((sum, t) => sum + t.assigned, 0);
      const totalCompleted = trends.reduce((sum, t) => sum + t.completed, 0);
      const completionRate = Math.round((totalCompleted / totalAssigned) * 100);
      const avgPerDay = Math.round(totalCompleted / 30);
      
      return {
        trends,
        stats: {
          completionRate,
          avgPerDay,
          trend: completionRate > 80 ? 'improving' : completionRate > 60 ? 'stable' : 'declining',
        },
      };
    },
  });
}

export function useCycleDistribution(projectId: string) {
  return useQuery({
    queryKey: ['cycle-distribution', projectId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_CYCLES;
    },
  });
}
