import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { CapacityResource, CapacityAssignment, CapacityProject, CapacityScenario, ResourceMetric, CapacitySummary } from '../types';

export function useCapacityData() {
  const queryClient = useQueryClient();

  // Fetch all resources from profiles table with assignment_id from resource_inventory
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['capacity-planner-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, created_at, updated_at, department_id')
        .order('full_name');
      if (error) throw error;
      
      // Fetch departments to map names
      const { data: departments } = await supabase
        .from('capacity_departments')
        .select('id, name');
      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      
      // Fetch resource assignments to map names (matches resource_inventory.assignment_id FK)
      const { data: resourceAssignments } = await supabase
        .from('resource_assignments')
        .select('id, name')
        .eq('is_active', true);
      const assignmentTypeMap = new Map(resourceAssignments?.map((a) => [a.id, a.name]) || []);
      
      // Fetch resource_inventory using profile_id for reliable matching
      const { data: resourceInventory } = await supabase
        .from('resource_inventory')
        .select('id, name, assignment_id, profile_id, default_capacity_percent');
      
      // Fetch user_product_roles with role names for synced role display
      const { data: userProductRoles } = await supabase
        .from('user_product_roles')
        .select('user_id, role_id, product_roles(id, name)');
      const userRoleMap = new Map<string, string>();
      (userProductRoles || []).forEach((upr: any) => {
        if (upr.product_roles?.name && !userRoleMap.has(upr.user_id)) {
          userRoleMap.set(upr.user_id, upr.product_roles.name);
        }
      });
      
      // Create maps for both profile_id and name-based lookup (fallback)
      const inventoryByProfileId = new Map(resourceInventory?.filter(r => r.profile_id).map(r => [r.profile_id, r]) || []);
      const inventoryByName = new Map(resourceInventory?.map(r => [r.name?.toLowerCase(), r]) || []);
      
      return (data || []).map(p => {
        const fullName = p.full_name || p.email || 'Unknown';
        // Try profile_id match first, then fall back to name match
        const inventory = inventoryByProfileId.get(p.id) || inventoryByName.get(fullName.toLowerCase());
        const assignmentId = inventory?.assignment_id || null;
        const assignmentName = assignmentId ? assignmentTypeMap.get(assignmentId) || null : null;
        const defaultCapacity = inventory?.default_capacity_percent ?? 0;
        // Use product role if available, fallback to profiles.role
        const roleName = userRoleMap.get(p.id) || p.role || 'Team Member';
        return {
          id: p.id,
          name: fullName,
          email: p.email || '',
          role: roleName,
          department: p.department_id ? deptMap.get(p.department_id) || 'Unassigned' : 'Unassigned',
          department_id: p.department_id,
          assignment_id: assignmentId,
          assignmentName: assignmentName,
          defaultCapacity: defaultCapacity,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      }) as CapacityResource[];
    },
  });

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
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
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
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
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
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
  };
}
