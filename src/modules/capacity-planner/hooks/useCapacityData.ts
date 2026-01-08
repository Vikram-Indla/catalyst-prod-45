import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { CapacityResource, CapacityAssignment, CapacityProject, CapacityScenario, ResourceMetric, CapacitySummary } from '../types';

export function useCapacityData() {
  const queryClient = useQueryClient();

  // Fetch all resources from resource_inventory table (single source of truth)
  const { data: resources = [], isLoading: resourcesLoading, isFetching: resourcesFetching, isError: resourcesError, error: resourcesErrorObj, refetch: refetchResources } = useQuery({
    queryKey: ['capacity-planner-resources'],
    staleTime: 30000, // Reduce unnecessary refetches during DnD
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
      
      // STEP 6: Fetch resource_allocations for current allocation
      const now = new Date().toISOString().split('T')[0];
      const { data: allocationsData } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent, start_date, end_date')
        .lte('start_date', now)
        .gte('end_date', now);
      
      // Calculate current allocation per resource_inventory ID
      const currentAllocationByResourceId = new Map<string, number>();
      (allocationsData || []).forEach((alloc: any) => {
        const current = currentAllocationByResourceId.get(alloc.resource_id) || 0;
        currentAllocationByResourceId.set(alloc.resource_id, current + alloc.allocation_percent);
      });
      
      // STEP 7: Map resource_inventory to CapacityResource format
      return (resourceInventory || []).map(ri => {
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
        };
      }) as CapacityResource[];
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CapacityScenario[];
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const assignmentsChannel = supabase
      .channel('capacity-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      })
      .subscribe();

    const profilesChannel = supabase
      .channel('capacity-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      })
      .subscribe();

    const resourceInventoryChannel = supabase
      .channel('capacity-resource-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      })
      .subscribe();

    const resourceAssignmentsChannel = supabase
      .channel('capacity-resource-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
        queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      })
      .subscribe();

    const userProductRolesChannel = supabase
      .channel('capacity-user-product-roles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      })
      .subscribe();

    const scenariosChannel = supabase
      .channel('capacity-scenarios-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_scenarios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(resourceInventoryChannel);
      supabase.removeChannel(resourceAssignmentsChannel);
      supabase.removeChannel(userProductRolesChannel);
      supabase.removeChannel(scenariosChannel);
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
