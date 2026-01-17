/**
 * Analytics Data Hook - Fetches and transforms capacity data for V7 grid
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import type { AnalyticsResource, AnalyticsAllocation, CapacityRow, MonthCell, ViewScope, VIEW_MONTHS, MONTH_LABELS } from './types';

interface UseAnalyticsDataOptions {
  departmentFilter?: string;
  viewScope?: ViewScope;
  year?: number;
}

export function useAnalyticsData({ departmentFilter = 'all', viewScope = 'h1', year = 2026 }: UseAnalyticsDataOptions = {}) {
  // Fetch resources from resource_inventory
  const resourcesQuery = useQuery({
    queryKey: ['analytics-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select(`
          id, name, role_name, contract_end_date,
          country:resource_countries(id, name, code),
          vendor:resource_vendors(id, name),
          location:resource_locations(id, name),
          department:capacity_departments(id, name, color, sort_order)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as unknown as AnalyticsResource[];
    },
  });

  // Determine date range based on view scope
  const months = useMemo(() => {
    const VIEW_MONTHS_MAP: Record<ViewScope, number[]> = {
      q1: [1, 2, 3],
      h1: [1, 2, 3, 4, 5, 6],
      full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    };
    return VIEW_MONTHS_MAP[viewScope].map(m => ({ month: m, year }));
  }, [viewScope, year]);

  const dateRange = useMemo(() => {
    const startMonth = months[0];
    const endMonth = months[months.length - 1];
    return {
      start: `${startMonth.year}-${String(startMonth.month).padStart(2, '0')}-01`,
      end: `${endMonth.year}-${String(endMonth.month).padStart(2, '0')}-${new Date(endMonth.year, endMonth.month, 0).getDate()}`,
    };
  }, [months]);

  // Fetch allocations for the date range
  const allocationsQuery = useQuery({
    queryKey: ['analytics-allocations', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select(`
          id, resource_id, allocation_percent, start_date, end_date,
          assignment:resource_assignments(id, name, color)
        `)
        .gte('end_date', dateRange.start)
        .lte('start_date', dateRange.end)
        .order('start_date');

      if (error) throw error;
      return (data || []).map(a => ({
        ...a,
        status: 'committed' as const,
        assignment_id: (a.assignment as any)?.id || '',
      })) as unknown as AnalyticsAllocation[];
    },
    enabled: !!dateRange.start,
  });

  // Build capacity rows
  const capacityRows = useMemo<CapacityRow[]>(() => {
    const resources = resourcesQuery.data || [];
    const allocations = allocationsQuery.data || [];

    // Filter by department
    let filteredResources = resources;
    if (departmentFilter && departmentFilter !== 'all') {
      filteredResources = resources.filter(r => 
        r.department?.name?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }

    // Exclude management roles
    filteredResources = filteredResources.filter(r => {
      const roleLower = r.role_name?.toLowerCase() || '';
      return !roleLower.includes('management') && !roleLower.includes('super admin') && roleLower !== 'admin';
    });

    // Group allocations by resource_id
    const allocationMap = allocations.reduce((acc, alloc) => {
      if (!acc[alloc.resource_id]) acc[alloc.resource_id] = [];
      acc[alloc.resource_id].push(alloc);
      return acc;
    }, {} as Record<string, AnalyticsAllocation[]>);

    return filteredResources.map((resource) => {
      const resourceAllocs = allocationMap[resource.id] || [];

      const monthCells: MonthCell[] = months.map(({ month, year: y }) => {
        const monthStart = new Date(y, month - 1, 1);
        const monthEnd = new Date(y, month, 0);

        // Check contract ended
        const isEnded = resource.contract_end_date
          ? new Date(resource.contract_end_date) < monthStart
          : false;

        if (isEnded) {
          return { month, year: y, segments: [], isEnded: true, totalPercent: 0 };
        }

        // Find overlapping allocations
        const segments = resourceAllocs
          .filter((a) => {
            const start = new Date(a.start_date);
            const end = new Date(a.end_date);
            return start <= monthEnd && end >= monthStart;
          })
          .map((a) => ({
            assignment: {
              id: a.assignment?.id || '',
              name: a.assignment?.name || 'Unassigned',
              color: a.assignment?.color || 'primary',
            },
            percent: a.allocation_percent,
            status: a.status,
          }));

        const totalPercent = segments.reduce((sum, s) => sum + s.percent, 0);

        return { month, year: y, segments, isEnded: false, totalPercent };
      });

      return { resource, months: monthCells };
    });
  }, [resourcesQuery.data, allocationsQuery.data, departmentFilter, months]);

  // Compute summary stats
  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let available = 0;
    let atCapacity = 0;
    let overAllocated = 0;

    capacityRows.forEach(row => {
      // Find current month cell (or first month if viewing future)
      const currentCell = row.months.find(m => m.month === 1 && m.year === year) || row.months[0];
      if (!currentCell || currentCell.isEnded) return;

      if (currentCell.totalPercent === 0) {
        available++;
      } else if (currentCell.totalPercent <= 100) {
        atCapacity++;
      } else {
        overAllocated++;
      }
    });

    return { available, atCapacity, overAllocated, total: capacityRows.length };
  }, [capacityRows, year]);

  return {
    rows: capacityRows,
    summary,
    months,
    isLoading: resourcesQuery.isLoading || allocationsQuery.isLoading,
    isError: resourcesQuery.isError || allocationsQuery.isError,
    error: resourcesQuery.error || allocationsQuery.error,
    refetch: () => {
      resourcesQuery.refetch();
      allocationsQuery.refetch();
    },
  };
}
