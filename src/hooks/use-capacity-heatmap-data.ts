/**
 * React Query hooks for Capacity Heatmap data
 * Uses real profile and allocation data from database
 * Catalyst V5 compliant
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HeatmapResource, ProjectAllocation, MonthlyUtilization } from '@/types/capacity-heatmap';
import { getUtilizationStatus, calculateOrgStats } from '@/lib/capacity-heatmap/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { getContractStatus } from '@/hooks/useResourceProfiles';

// Assignment colors - Catalyst V5 compliant
const ASSIGNMENT_COLORS: Record<string, string> = {
  'Senaei BAU': '#2563eb',
  'Innovation Platform': '#1d4ed8',
  'Inspection Project': '#0d9488',
  'International Relations': '#0f766e',
  'MIM Website': '#14b8a6',
  'Senaei OPS': '#3b82f6',
  'Sectorial Services': '#64748b',
  'Tahommena': '#0d9488',
  'Data Platform': '#3b82f6',
  'Unassigned': '#94a3b8',
};

function getAssignmentColor(name: string | null | undefined): string {
  if (!name) return ASSIGNMENT_COLORS['Unassigned'];
  return ASSIGNMENT_COLORS[name] || CATALYST_COLORS.primary;
}

// Fetch resources with utilization data from actual database
export function useCapacityHeatmapData(monthCount = 12) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['capacity-heatmap-resources', monthCount],
    queryFn: async () => {
      // Fetch profiles with department info AND contract/location data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department_id,
          contract_end_date,
          country,
          country_code,
          country_flag_svg_url,
          location,
          vendor,
          avatar_url,
          capacity_departments:department_id (
            id,
            name
          )
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch resource_allocations with assignment names
      const { data: allocationsData, error: allocError } = await supabase
        .from('resource_allocations')
        .select(`
          id,
          resource_id,
          assignment_id,
          allocation_percent,
          start_date,
          end_date,
          resource_inventory!inner(profile_id, name),
          resource_assignments(name)
        `)
        .order('start_date');

      if (allocError) throw allocError;

      // Build allocation map by profile_id
      const allocationsByProfileId = new Map<string, Array<{
        id: string;
        percent: number;
        startDate: string;
        endDate: string;
        assignmentName: string;
      }>>();

      (allocationsData || []).forEach((alloc: any) => {
        const profileId = alloc.resource_inventory?.profile_id;
        if (!profileId) return;
        
        const existing = allocationsByProfileId.get(profileId) || [];
        existing.push({
          id: alloc.id,
          percent: alloc.allocation_percent || 0,
          startDate: alloc.start_date,
          endDate: alloc.end_date,
          assignmentName: alloc.resource_assignments?.name || 'Unassigned',
        });
        allocationsByProfileId.set(profileId, existing);
      });

      // Generate months array for the current year (2026 as shown in UI)
      const baseYear = 2026; // Match UI expectation
      const months = Array.from({ length: monthCount }, (_, i) =>
        new Date(baseYear, i, 1)
      );

      // Map profiles to HeatmapResource format
      const resources: HeatmapResource[] = (profiles || []).map((profile) => {
        const deptData = profile.capacity_departments as { id: string; name: string } | null;
        const departmentName = deptData?.name || 'Unassigned';
        
        // Calculate contract status for this resource
        const contractStatus = getContractStatus(profile.contract_end_date);
        
        // Get allocations for this profile
        const profileAllocations = allocationsByProfileId.get(profile.id) || [];
        
        // Generate monthly utilization based on actual allocations
        const monthlyUtilization: MonthlyUtilization[] = months.map((month) => {
          // Check if this month is after contract end (locked)
          const isLockedMonth = profile.contract_end_date && 
            new Date(profile.contract_end_date) < month;
          
          // If month is locked (past contract end), show 0%
          if (isLockedMonth) {
            return {
              month,
              percentage: 0,
              status: 'available' as const,
              allocations: [],
              isConflict: false,
              isLocked: true,
            };
          }
          
          // Calculate utilization for this month based on overlapping allocations
          let totalPercentage = 0;
          const monthAllocations: ProjectAllocation[] = [];
          const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
          const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          profileAllocations.forEach((alloc, allocIdx) => {
            const allocStart = new Date(alloc.startDate);
            const allocEnd = new Date(alloc.endDate);
            
            // Check if allocation overlaps with this month
            if (allocStart <= monthEnd && allocEnd >= monthStart) {
              totalPercentage += alloc.percent;
              
              monthAllocations.push({
                id: alloc.id,
                projectId: `assignment-${allocIdx}`,
                projectName: alloc.assignmentName,
                projectColor: getAssignmentColor(alloc.assignmentName),
                percentage: alloc.percent,
                startDate: alloc.startDate,
                endDate: alloc.endDate,
              });
            }
          });
          
          return {
            month,
            percentage: totalPercentage,
            status: getUtilizationStatus(totalPercentage),
            allocations: monthAllocations,
            isConflict: totalPercentage > 100,
            isLocked: false,
          };
        });
        
        // Calculate average (excluding locked months)
        const activeMonths = monthlyUtilization.filter(u => !u.isLocked);
        const avg = activeMonths.length > 0
          ? Math.round(activeMonths.reduce((s, u) => s + u.percentage, 0) / activeMonths.length)
          : 0;
        
        const conflicts = monthlyUtilization.filter(u => u.isConflict).length;
        
        // Calculate trend (first half vs second half)
        const firstHalf = monthlyUtilization.slice(0, 6).filter(u => !u.isLocked);
        const secondHalf = monthlyUtilization.slice(6, 12).filter(u => !u.isLocked);
        const firstHalfAvg = firstHalf.length > 0 
          ? firstHalf.reduce((s, u) => s + u.percentage, 0) / firstHalf.length 
          : 0;
        const secondHalfAvg = secondHalf.length > 0 
          ? secondHalf.reduce((s, u) => s + u.percentage, 0) / secondHalf.length 
          : 0;
        
        const trend: 'up' | 'down' | 'stable' = 
          secondHalfAvg > firstHalfAvg + 10 ? 'up' 
          : secondHalfAvg < firstHalfAvg - 10 ? 'down' 
          : 'stable';
        
        // Get role display name
        const roleDisplay = getRoleDisplayName(profile.role);
        
        return {
          id: profile.id,
          name: profile.full_name || 'Unknown',
          initials: getInitials(profile.full_name || 'UN'),
          email: profile.email || '',
          role: roleDisplay,
          department: departmentName,
          team: departmentName,
          monthlyUtilization,
          averageUtilization: avg,
          trend,
          trendPercentage: Math.abs(Math.round(secondHalfAvg - firstHalfAvg)),
          hasConflicts: conflicts > 0,
          conflictCount: conflicts,
          // Profile fields
          contractEndDate: profile.contract_end_date,
          contractStatus,
          country: profile.country,
          countryCode: profile.country_code,
          countryFlagUrl: profile.country_flag_svg_url,
          location: profile.location,
          vendor: profile.vendor,
          avatarUrl: profile.avatar_url,
        };
      });
      
      const stats = calculateOrgStats(resources);
      
      return { resources, months, stats };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('heatmap-realtime-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resource_allocations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleDisplayName(role: string | null): string {
  if (!role) return 'Team Member';
  
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'user': 'Team Member',
    'program_manager': 'Program Manager',
    'product_owner': 'Product Owner',
    'Frontend Developer': 'Frontend Developer',
    'Backend Developer': 'Backend Developer',
    'QA Engineer': 'QA Engineer',
    'DevOps Engineer': 'DevOps Engineer',
  };
  
  return roleMap[role] || role;
}
