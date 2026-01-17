/**
 * Analytics Data Hook - Fetches and transforms capacity data for V7 grid
 * Aligned with use-capacity-heatmap-data.ts and useCapacityData.ts for consistency
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useEffect } from 'react';
import type { AnalyticsResource, AnalyticsAllocation, CapacityRow, MonthCell, ViewScope } from './types';

interface UseAnalyticsDataOptions {
  departmentFilter?: string;
  viewScope?: ViewScope;
  year?: number;
}

export function useAnalyticsData({ departmentFilter = 'all', viewScope = 'h1', year = 2026 }: UseAnalyticsDataOptions = {}) {
  const queryClient = useQueryClient();

  // Fetch resources from resource_inventory with all related data
  const resourcesQuery = useQuery({
    queryKey: ['analytics-resources'],
    queryFn: async () => {
      // STEP 1: Fetch all resources from resource_inventory (single source of truth)
      const { data: resourceInventory, error: riError } = await supabase
        .from('resource_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (riError) throw riError;

      // STEP 2: Fetch reference data in parallel
      const [
        { data: departments },
        { data: resourceVendors },
        { data: resourceCountries },
        { data: resourceLocations },
        { data: profiles },
        { data: userProductRoles },
        { data: productRoles },
      ] = await Promise.all([
        supabase.from('capacity_departments').select('id, name, color, sort_order').eq('is_active', true),
        supabase.from('resource_vendors').select('id, name').eq('is_active', true),
        supabase.from('resource_countries').select('id, name, code').eq('is_active', true),
        supabase.from('resource_locations').select('id, name').eq('is_active', true),
        supabase.from('profiles').select('id, full_name, email, department_id, contract_end_date, country, country_code, country_flag_svg_url, location, vendor, avatar_url'),
        supabase.from('user_product_roles').select('user_id, role_id'),
        supabase.from('product_roles').select('id, name'),
      ]);

      // Build lookup maps
      const deptMap = new Map(departments?.map(d => [d.id, d]) || []);
      const vendorMap = new Map(resourceVendors?.map(v => [v.id, v.name]) || []);
      const countryMap = new Map(resourceCountries?.map(c => [c.id, { id: c.id, name: c.name, code: c.code }]) || []);
      const locationMap = new Map(resourceLocations?.map(l => [l.id, { id: l.id, name: l.name }]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const profileByName = new Map(profiles?.map(p => [p.full_name?.toLowerCase(), p]) || []);

      // Build role lookup
      const roleIdToName = new Map<string, string>(
        (productRoles || []).map((r: any) => [r.id, r.name])
      );

      const userRoleMap = new Map<string, string>();
      (userProductRoles || []).forEach((upr: any) => {
        const roleName = roleIdToName.get(upr.role_id);
        if (roleName && !userRoleMap.has(upr.user_id)) {
          userRoleMap.set(upr.user_id, roleName);
        }
      });

      // STEP 3: Map resource_inventory to AnalyticsResource format
      return (resourceInventory || []).map((ri: any) => {
        // Find linked profile by profile_id or by name fallback
        const profile = ri.profile_id 
          ? profileMap.get(ri.profile_id) 
          : profileByName.get(ri.name?.toLowerCase());

        // Get department from resource_inventory (source of truth) with fallback
        const departmentId = ri.department_id || profile?.department_id;
        const department = departmentId ? deptMap.get(departmentId) : null;

        // Get role from product_roles table with fallback to resource_inventory
        const profileId = ri.profile_id || profile?.id;
        const roleFromRolesTable = profileId ? userRoleMap.get(profileId) : undefined;
        const roleName = ri.role_name || roleFromRolesTable || 'No role';

        // Get country and location from resource_inventory reference tables
        const countryData = ri.country_id ? countryMap.get(ri.country_id) : null;
        const locationData = ri.location_id ? locationMap.get(ri.location_id) : null;
        const vendorName = ri.vendor_id ? vendorMap.get(ri.vendor_id) : ri.vendor_name;

        return {
          id: ri.id,
          name: ri.name || 'Unknown',
          role_name: roleName,
          vendor: vendorName ? { id: ri.vendor_id || '', name: vendorName } : null,
          location: locationData,
          department: department ? {
            id: department.id,
            name: department.name,
            color: department.color,
            sort_order: department.sort_order,
          } : null,
          contract_end_date: ri.contract_end_date,
          country: countryData,
        } as AnalyticsResource;
      });
    },
    staleTime: 30000,
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

  // Fetch allocations for the date range with assignment details
  const allocationsQuery = useQuery({
    queryKey: ['analytics-allocations', dateRange.start, dateRange.end],
    queryFn: async () => {
      // Fetch allocations with their assignments
      const { data: allocationsData, error } = await supabase
        .from('resource_allocations')
        .select(`
          id, 
          resource_id, 
          assignment_id,
          allocation_percent, 
          start_date, 
          end_date,
          resource_assignments(id, name, color)
        `)
        .gte('end_date', dateRange.start)
        .lte('start_date', dateRange.end)
        .order('start_date');

      if (error) throw error;

      return (allocationsData || []).map((a: any) => ({
        id: a.id,
        resource_id: a.resource_id,
        assignment_id: a.assignment_id || a.resource_assignments?.id || '',
        allocation_percent: a.allocation_percent,
        start_date: a.start_date,
        end_date: a.end_date,
        status: 'committed' as const,
        assignment: a.resource_assignments ? {
          id: a.resource_assignments.id,
          name: a.resource_assignments.name,
          color: a.resource_assignments.color || 'primary',
        } : null,
      })) as AnalyticsAllocation[];
    },
    enabled: !!dateRange.start,
    staleTime: 30000,
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

    // Exclude management roles (same logic as other capacity views)
    filteredResources = filteredResources.filter(r => {
      const roleLower = r.role_name?.toLowerCase() || '';
      return !roleLower.includes('management') && 
             !roleLower.includes('super admin') && 
             !roleLower.includes('superadmin') &&
             roleLower !== 'admin';
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
              id: a.assignment?.id || a.assignment_id || '',
              name: a.assignment?.name || 'Unassigned',
              color: a.assignment?.color || 'primary',
            },
            percent: a.allocation_percent,
            status: a.status,
          }));

        const totalPercent = segments.reduce((sum, s) => sum + s.percent, 0);

        return { month, year: y, segments, isEnded: false, totalPercent };
      });

      // Calculate current month's committed utilization
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-indexed
      const currentYear = now.getFullYear();
      
      const currentMonthCell = monthCells.find(m => m.month === currentMonth && m.year === currentYear);
      const committedPercent = currentMonthCell && !currentMonthCell.isEnded
        ? currentMonthCell.segments
            .filter(s => s.status === 'committed')
            .reduce((sum, seg) => sum + seg.percent, 0)
        : 0;

      return { resource, months: monthCells, committedPercent };
    });
  }, [resourcesQuery.data, allocationsQuery.data, departmentFilter, months]);

  // Compute summary stats
  const summary = useMemo(() => {
    let available = 0;
    let atCapacity = 0;
    let overAllocated = 0;

    capacityRows.forEach(row => {
      // Find first month cell (representing current state)
      const currentCell = row.months[0];
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
  }, [capacityRows]);

  // Real-time subscriptions - aligned with useCapacityData and use-capacity-heatmap-data
  useEffect(() => {
    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-resources'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-allocations'] });
    };

    const channel = supabase
      .channel('analytics-realtime-sync')
      // Core resource tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, invalidateAll)
      // Reference tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_roles' }, invalidateAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
