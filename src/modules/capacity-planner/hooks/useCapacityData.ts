import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { CapacityResource, CapacityAssignment, CapacityProject, CapacityScenario, ResourceMetric, CapacitySummary } from '../types';

export function useCapacityData() {
  const queryClient = useQueryClient();

  // Fetch all resources from profiles table
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
      
      return (data || []).map(p => ({
        id: p.id,
        name: p.full_name || p.email || 'Unknown',
        email: p.email || '',
        role: p.role || 'Team Member',
        department: p.department_id ? deptMap.get(p.department_id) || 'Unassigned' : 'Unassigned',
        department_id: p.department_id,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })) as CapacityResource[];
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

    const scenariosChannel = supabase
      .channel('capacity-scenarios-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_scenarios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(scenariosChannel);
    };
  }, [queryClient]);

  // Calculate utilization metrics - only include resources with active assignments
  const calculateMetrics = (): { resources: ResourceMetric[]; summary: CapacitySummary } => {
    // First, get all user IDs that have assignments in this module
    const assignedUserIds = new Set(assignments.map(a => a.user_id));
    
    // Only include resources that have at least one assignment
    const assignedResources = resources.filter(r => assignedUserIds.has(r.id));
    
    const resourceMetrics: ResourceMetric[] = assignedResources.map((resource) => {
      const resourceAssignments = assignments.filter(
        (a) => a.user_id === resource.id && a.status === 'active'
      );
      const totalAllocation = resourceAssignments.reduce((sum, a) => sum + a.allocation_percentage, 0);
      
      let status: ResourceMetric['status'] = 'available';
      if (totalAllocation > 100) status = 'over_allocated';
      else if (totalAllocation > 80) status = 'at_capacity';
      else if (totalAllocation > 0) status = 'healthy';

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
