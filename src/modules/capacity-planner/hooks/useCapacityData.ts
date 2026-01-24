import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { CapacityResource, CapacityAssignment, CapacityProject, CapacityScenario, ResourceMetric, CapacitySummary } from '../types';

export function useCapacityData() {
  const queryClient = useQueryClient();

  // Fetch all resources from resource_inventory table (single source of truth)
  const { data: resources = [], isLoading: resourcesLoading, isFetching: resourcesFetching, isError: resourcesError, error: resourcesErrorObj, refetch: refetchResources } = useQuery({
    queryKey: ['capacity-planner-resources'],
    staleTime: 0, // Always fetch fresh data to ensure country flags are current
    gcTime: 0, // Don't cache - force fresh fetch
    refetchOnMount: 'always', // Always refetch when component mounts
    queryFn: async () => {
      // STEP 1: Fetch all resources from resource_inventory (72 records)
      const { data: resourceInventory, error: riError } = await supabase
        .from('resource_inventory')
        .select('*')
        .order('name');
      if (riError) throw riError;
      
      // STEP 2: Fetch departments to map names
      const { data: departments } = await supabase
        .from('capacity_departments')
        .select('id, name');
      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      
      // STEP 3: Fetch resource assignments to map names
      const { data: resourceAssignments } = await supabase
        .from('resource_assignments')
        .select('id, name')
        .eq('is_active', true);
      const assignmentTypeMap = new Map(resourceAssignments?.map((a) => [a.id, a.name]) || []);
      
      // STEP 3b: Fetch resource vendors to map names
      const { data: resourceVendors } = await supabase
        .from('resource_vendors')
        .select('id, name');
      const vendorMap = new Map(resourceVendors?.map(v => [v.id, v.name]) || []);
      
      // STEP 3c: Fetch resource countries to map names and flags
      const { data: resourceCountries } = await supabase
        .from('resource_countries')
        .select('id, name, code, flag_svg');
      const countryMap = new Map(resourceCountries?.map(c => [c.id, { name: c.name, code: c.code, flag_svg: c.flag_svg }]) || []);
      
      // STEP 3d: Fetch resource locations to map names
      const { data: resourceLocations } = await supabase
        .from('resource_locations')
        .select('id, name');
      const locationMap = new Map(resourceLocations?.map(l => [l.id, l.name]) || []);
      
      // STEP 4: Fetch profiles for avatar, email, etc (enrichment only)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, department_id');
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const profileByName = new Map(profiles?.map(p => [p.full_name?.toLowerCase(), p]) || []);
      
      // STEP 5: Fetch product roles for role display
      const [{ data: userProductRoles }, { data: productRoles }] = await Promise.all([
        supabase.from('user_product_roles').select('user_id, role_id'),
        supabase.from('product_roles').select('id, name'),
      ]);

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
      
      // STEP 6: Fetch resource_allocations for current month (committed only for utilization)
      // Use current month range to sync with Resource Utilization which saves monthly allocations
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: allocationsData } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent, start_date, end_date, status')
        .lte('start_date', currentMonthEnd)
        .gte('end_date', currentMonthStart)
        .eq('status', 'committed');
      
      // Calculate current allocation per resource_inventory ID
      const currentAllocationByResourceId = new Map<string, number>();
      (allocationsData || []).forEach((alloc: any) => {
        const current = currentAllocationByResourceId.get(alloc.resource_id) || 0;
        currentAllocationByResourceId.set(alloc.resource_id, current + alloc.allocation_percent);
      });
      
      // STEP 7: Map resource_inventory to CapacityResource format
      const mappedResources = (resourceInventory || []).map(ri => {
        // Try to find linked profile by profile_id or name
        const profile = ri.profile_id 
          ? profileMap.get(ri.profile_id) 
          : profileByName.get(ri.name?.toLowerCase());
        
        const assignmentName = ri.assignment_id ? assignmentTypeMap.get(ri.assignment_id) || null : null;
        const defaultCapacity = currentAllocationByResourceId.get(ri.id) ?? 0;
        
        // Get role from job roles table with resource_inventory fallback
        const profileId = ri.profile_id || profile?.id;
        const roleFromRolesTable = profileId ? userRoleMap.get(profileId) : undefined;
        const roleName = ri.role_name || roleFromRolesTable || 'No role';
        
        // Get department from resource_inventory (source of truth) with fallback to profile
        const departmentId = ri.department_id || profile?.department_id;
        const departmentName = departmentId ? deptMap.get(departmentId) || 'Unassigned' : 'Unassigned';
        
        // Get country and location from resource_inventory
        const countryData = ri.country_id ? countryMap.get(ri.country_id) : null;
        const locationName = ri.location_id ? locationMap.get(ri.location_id) : null;
        
        return {
          id: ri.profile_id || ri.id, // Use profile_id if linked, otherwise resource_inventory id
          resourceInventoryId: ri.id, // Always keep track of ri.id
          name: ri.name || 'Unknown',
          email: profile?.email || '',
          role: roleName,
          department: departmentName,
          department_id: departmentId,
          assignment_id: ri.assignment_id,
          assignmentName: assignmentName,
          defaultCapacity: defaultCapacity,
          avatar_url: profile?.avatar_url || null,
          created_at: ri.created_at,
          updated_at: ri.updated_at,
          contract_start_date: ri.contract_start_date || null,
          contract_end_date: ri.contract_end_date || null,
          vendor_name: ri.vendor_id ? vendorMap.get(ri.vendor_id) || ri.vendor_name || null : ri.vendor_name || null,
          country: countryData?.name || null,
          country_code: countryData?.code || null,
          country_flag_svg: countryData?.flag_svg || null,
          location: locationName || null,
        };
      });
      
      // QA: Log resources with country flags for verification
      const resourcesWithFlags = mappedResources.filter(r => r.country_flag_svg);
      console.log('[Capacity QA] Resources with country flags:', resourcesWithFlags.map(r => ({
        name: r.name,
        country: r.country,
        flag_svg: r.country_flag_svg
      })));
      
      return mappedResources as CapacityResource[];
    },
  });

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ['capacity-planner-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key, status')
        .order('name');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        code: p.key || p.name?.substring(0, 3).toUpperCase() || 'PRJ',
        status: (p.status === 'active' ? 'active' : 'on_hold') as CapacityProject['status'],
      })) as CapacityProject[];
    },
  });

  // Fetch all active assignments
  const { data: assignments = [], isLoading: assignmentsLoading, isError: assignmentsError } = useQuery({
    queryKey: ['capacity-planner-assignments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('assignments')
        .select('*')
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CapacityAssignment[];
    },
  });

  // Fetch scenarios
  const { data: scenarios = [], isLoading: scenariosLoading, isError: scenariosError } = useQuery({
    queryKey: ['capacity-planner-scenarios'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('capacity_scenarios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CapacityScenario[];
    },
  });

  // Real-time subscriptions - Unified sync with /admin/users
  useEffect(() => {
    const invalidateResources = () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
    };

    const channel = supabase
      .channel('capacity-unified-sync')
      // Core resource tables (same as /admin/users)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations' }, () => {
        invalidateResources();
        queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      })
      // Reference tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, invalidateResources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => {
        invalidateResources();
        queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_roles' }, invalidateResources)
      // Assignments and scenarios
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_scenarios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate utilization metrics - include ALL resources
  const calculateMetrics = (): { resources: ResourceMetric[]; summary: CapacitySummary } => {
    // Include ALL resources, not just those with assignments
    const resourceMetrics: ResourceMetric[] = resources.map((resource) => {
      const resourceAssignments = assignments.filter(
        (a) => a.user_id === resource.id && a.status === 'active'
      );
      // Use defaultCapacity from resource_inventory as the primary source
      // Fall back to sum of assignments if no defaultCapacity set
      const totalAllocation = resource.defaultCapacity ?? 
        resourceAssignments.reduce((sum, a) => sum + a.allocation_percentage, 0);
      
      let status: ResourceMetric['status'] = 'available';
      if (totalAllocation > 100) status = 'over_allocated';
      else if (totalAllocation > 80) status = 'at_capacity';
      else if (totalAllocation > 0) status = 'healthy';
      // Resources with 0 allocation are 'available'

      return { ...resource, allocation: totalAllocation, assignments: resourceAssignments, status };
    });

    const available = resourceMetrics.filter((r) => r.status === 'available').length;
    const healthy = resourceMetrics.filter((r) => r.status === 'healthy').length;
    const atCapacity = resourceMetrics.filter((r) => r.status === 'at_capacity').length;
    const overAllocated = resourceMetrics.filter((r) => r.status === 'over_allocated').length;
    const avgUtilization = resourceMetrics.length > 0
      ? Math.round(resourceMetrics.reduce((sum, r) => sum + Math.min(r.allocation, 100), 0) / resourceMetrics.length)
      : 0;

    return {
      resources: resourceMetrics,
      summary: { total: resourceMetrics.length, available, healthy, atCapacity, overAllocated, avgUtilization },
    };
  };

  return {
    resources,
    projects,
    assignments,
    scenarios,
    metrics: calculateMetrics(),
    isLoading: resourcesLoading || projectsLoading || assignmentsLoading || scenariosLoading,
    isFetching: resourcesFetching,
    isError: resourcesError || projectsError || assignmentsError || scenariosError,
    error: resourcesErrorObj,
    refetch: refetchResources,
  };
}
