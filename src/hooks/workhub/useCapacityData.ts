/**
 * Capacity & Analytics Data Hooks
 * Phase 11: Derived data from existing views
 */

import { useMemo } from 'react';
import type { ResourceUtilization } from '@/types/workhub.types';
import { useResourceUtilization } from './useResources';
import { useDashboardKPIs } from './useDashboardKPIs';
import { useReleaseProgress } from './useReleases';
import { useThemeProgress } from './useThemes';
import { useWorkItems } from './useWorkItems';

export interface DepartmentCapacity {
  department: string;
  memberCount: number;
  totalCapacityHours: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  totalActiveItems: number;
  totalCompletedItems: number;
  totalBlockedItems: number;
  avgUtilization: number;
  members: ResourceUtilization[];
}

/** Hook A — Department-level capacity grouped from resource utilization */
export function useDepartmentCapacity() {
  const { data: resources, isLoading } = useResourceUtilization();

  const departments = useMemo(() => {
    if (!resources) return [];

    const grouped = resources.reduce((acc, r) => {
      const dept = r.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          memberCount: 0,
          totalCapacityHours: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          totalActiveItems: 0,
          totalCompletedItems: 0,
          totalBlockedItems: 0,
          avgUtilization: 0,
          members: [] as ResourceUtilization[],
        };
      }
      const d = acc[dept];
      d.memberCount++;
      d.totalCapacityHours += r.capacity_hours_per_week;
      d.totalEstimatedHours += r.total_estimated_hours;
      d.totalActualHours += r.total_actual_hours;
      d.totalActiveItems += r.active_items;
      d.totalCompletedItems += r.completed_items;
      d.totalBlockedItems += r.blocked_items;
      d.members.push(r);
      return acc;
    }, {} as Record<string, DepartmentCapacity>);

    return Object.values(grouped)
      .map(d => ({
        ...d,
        avgUtilization: d.memberCount > 0
          ? Math.round(d.members.reduce((s, m) => s + m.utilization_percent, 0) / d.memberCount)
          : 0,
      }))
      .sort((a, b) => b.avgUtilization - a.avgUtilization);
  }, [resources]);

  return { departments, resources, isLoading };
}

/** Hook B — Aggregated analytics data for charts */
export function useAnalyticsData() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: releases } = useReleaseProgress();
  const { data: themes } = useThemeProgress();
  const { data: workItemsData, isLoading: itemsLoading } = useWorkItems({});
  const workItems = workItemsData?.items;

  const analytics = useMemo(() => {
    if (!workItems?.length || !releases) return null;

    // STATUS DISTRIBUTION
    const statusCounts: Record<string, number> = {};
    workItems.forEach(wi => {
      statusCounts[wi.status] = (statusCounts[wi.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      name: status, value: count,
    }));

    // TYPE DISTRIBUTION
    const typeCounts: Record<string, number> = {};
    workItems.forEach(wi => {
      typeCounts[wi.issue_type] = (typeCounts[wi.issue_type] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
      name: type, value: count,
    }));

    // PRIORITY DISTRIBUTION
    const priorityCounts: Record<string, number> = {};
    workItems.forEach(wi => {
      const p = wi.priority || 'Unset';
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });
    const priorityDistribution = Object.entries(priorityCounts).map(([p, count]) => ({
      name: p, value: count,
    }));

    // RELEASE VELOCITY
    const releaseVelocity = releases
      .filter(r => r.target_date)
      .sort((a, b) => (a.target_date || '').localeCompare(b.target_date || ''))
      .map(r => ({
        name: r.name,
        completion: r.completion_percent,
        totalItems: r.total_items,
        doneItems: r.done_items,
        color: r.color,
      }));

    // PROJECT DISTRIBUTION
    const projectCounts: Record<string, number> = {};
    workItems.forEach(wi => {
      const proj = wi.project_key || 'Unassigned';
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    });
    const projectDistribution = Object.entries(projectCounts).map(([proj, count]) => ({
      name: proj, value: count,
    }));

    return {
      statusDistribution,
      typeDistribution,
      priorityDistribution,
      releaseVelocity,
      projectDistribution,
    };
  }, [workItems, releases]);

  return { analytics, kpis, themes, releases, isLoading: kpisLoading || itemsLoading };
}
