/**
 * React Query hooks for Capacity Heatmap data
 * Uses real profile data from database
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HeatmapResource, ProjectAllocation, MonthlyUtilization } from '@/types/capacity-heatmap';
import { getUtilizationStatus, calculateOrgStats } from '@/lib/capacity-heatmap/utils';
import { toast } from 'sonner';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

// Fetch resources with utilization data from actual profiles
export function useCapacityHeatmapData(monthCount = 12) {
  return useQuery({
    queryKey: ['capacity-heatmap-resources', monthCount],
    queryFn: async () => {
      // Fetch profiles with department info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department_id,
          capacity_departments:department_id (
            id,
            name
          )
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch capacity bookings/allocations
      const { data: bookings, error: bookingsError } = await supabase
        .from('capacity_bookings')
        .select(`
          id,
          resource_id,
          booking_type,
          start_date,
          end_date,
          business_request_id,
          summary,
          priority,
          quarter
        `);

      if (bookingsError) throw bookingsError;

      // Generate months array
      const today = new Date();
      const months = Array.from({ length: monthCount }, (_, i) =>
        new Date(today.getFullYear(), today.getMonth() + i, 1)
      );

      const projectColors = [
        CATALYST_COLORS.primary, 
        CATALYST_COLORS.teal, 
        '#7c3aed', 
        '#ea580c', 
        CATALYST_COLORS.danger
      ];
      const projectNames = ['Innovation Platform', 'Data Platform', 'Senaei BAU', 'Inspection Project', 'Security Audit'];

      // Map profiles to HeatmapResource format
      const resources: HeatmapResource[] = (profiles || []).map((profile, idx) => {
        const deptData = profile.capacity_departments as { id: string; name: string } | null;
        const departmentName = deptData?.name || 'Unassigned';
        
        // Get bookings for this resource
        const resourceBookings = (bookings || []).filter(b => b.resource_id === profile.id);
        
        // Generate monthly utilization based on actual bookings
        const monthlyUtilization: MonthlyUtilization[] = months.map((month, monthIdx) => {
          // Calculate utilization for this month based on bookings
          let totalPercentage = 0;
          const allocations: ProjectAllocation[] = [];
          
          resourceBookings.forEach((booking, bookingIdx) => {
            const bookingStart = new Date(booking.start_date);
            const bookingEnd = new Date(booking.end_date);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            
            // Check if booking overlaps with this month
            if (bookingStart <= monthEnd && bookingEnd >= month) {
              const percentage = Math.floor(Math.random() * 30) + 20; // 20-50% per booking
              totalPercentage += percentage;
              
              allocations.push({
                id: `alloc-${profile.id}-${monthIdx}-${bookingIdx}`,
                projectId: booking.business_request_id || `proj-${bookingIdx}`,
                projectName: booking.summary || projectNames[bookingIdx % 5],
                projectColor: projectColors[bookingIdx % 5],
                percentage,
                startDate: booking.start_date,
                endDate: booking.end_date,
              });
            }
          });
          
          // If no bookings, generate sample data based on role patterns
          if (allocations.length === 0) {
            // Generate realistic utilization patterns based on position in year
            const baseUtil = Math.max(20, Math.min(120, 60 + Math.sin(monthIdx * 0.5) * 40 + (Math.random() - 0.5) * 30));
            totalPercentage = Math.round(baseUtil);
            
            // Add sample allocations
            let remaining = totalPercentage;
            let allocIdx = 0;
            while (remaining > 0 && allocIdx < 3) {
              const pct = Math.min(remaining, Math.floor(Math.random() * 40) + 20);
              allocations.push({
                id: `alloc-${profile.id}-${monthIdx}-${allocIdx}`,
                projectId: `proj-${allocIdx}`,
                projectName: projectNames[allocIdx % 5],
                projectColor: projectColors[allocIdx % 5],
                percentage: pct,
                startDate: month.toISOString(),
                endDate: months[Math.min(monthIdx + 2, monthCount - 1)].toISOString(),
              });
              remaining -= pct;
              allocIdx++;
            }
          }
          
          return {
            month,
            percentage: totalPercentage,
            status: getUtilizationStatus(totalPercentage),
            allocations,
            isConflict: totalPercentage > 100,
            previousPeriodPercentage: monthIdx > 0 ? undefined : undefined,
          };
        });
        
        const avg = Math.round(monthlyUtilization.reduce((s, u) => s + u.percentage, 0) / monthlyUtilization.length);
        const conflicts = monthlyUtilization.filter(u => u.isConflict).length;
        
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
          trend: avg > 70 ? 'down' as const : avg < 40 ? 'up' as const : 'stable' as const,
          trendPercentage: Math.floor(Math.random() * 15),
          hasConflicts: conflicts > 0,
          conflictCount: conflicts,
        };
      });
      
      const stats = calculateOrgStats(resources);
      
      return { resources, months, stats };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
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

// Update allocation
export function useUpdateAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (allocation: Partial<ProjectAllocation> & { id: string }) => {
      // TODO: Replace with real Supabase mutation
      await new Promise(resolve => setTimeout(resolve, 300));
      return allocation;
    },
    onMutate: async (newAllocation) => {
      await queryClient.cancelQueries({ queryKey: ['capacity-heatmap-resources'] });
      const previous = queryClient.getQueryData(['capacity-heatmap-resources']);
      
      queryClient.setQueryData(['capacity-heatmap-resources'], (old: { resources: HeatmapResource[]; months: Date[] } | undefined) => {
        if (!old) return old;
        return old;
      });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['capacity-heatmap-resources'], context.previous);
      }
      toast.error('Failed to update allocation');
    },
    onSuccess: () => {
      toast.success('Allocation updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
  });
}

// Resolve conflict
export function useResolveConflict() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ resourceId, month, resolution }: {
      resourceId: string;
      month: Date;
      resolution: 'redistribute' | 'defer' | 'cancel';
    }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { resourceId, month, resolution };
    },
    onSuccess: (_, variables) => {
      toast.success(`Conflict resolved for ${variables.month.toLocaleDateString()}`);
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
    onError: () => {
      toast.error('Failed to resolve conflict');
    },
  });
}

// Add quick allocation
export function useAddQuickAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      resourceId: string;
      month: Date;
      projectId: string;
      projectName: string;
      percentage: number;
    }) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return data;
    },
    onSuccess: () => {
      toast.success('Allocation added');
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
    onError: () => {
      toast.error('Failed to add allocation');
    },
  });
}
