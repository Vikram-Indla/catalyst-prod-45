/**
 * Hook for managing license allocations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AssignmentLicenseAllocation, SoftwareLicense } from '../types';

export function useAssignmentLicenseAllocations(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-license-allocations', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      
      const { data, error } = await (supabase as any)
        .from('assignment_license_allocations')
        .select(`
          *,
          software_licenses (*)
        `)
        .eq('assignment_id', assignmentId);

      if (error) throw error;
      return (data || []) as (AssignmentLicenseAllocation & { software_licenses: SoftwareLicense })[];
    },
    enabled: !!assignmentId,
  });
}

export function useLicenseAllocationsByLicense(licenseId: string | undefined) {
  return useQuery({
    queryKey: ['license-allocations-by-license', licenseId],
    queryFn: async () => {
      if (!licenseId) return [];
      
      const { data, error } = await (supabase as any)
        .from('assignment_license_allocations')
        .select(`
          *,
          assignments (id, name)
        `)
        .eq('license_id', licenseId);

      if (error) throw error;
      return (data || []) as (AssignmentLicenseAllocation & { assignments: { id: string; name: string } })[];
    },
    enabled: !!licenseId,
  });
}

export function useUpdateLicenseAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      licenseId, 
      allocationPercent 
    }: { 
      assignmentId: string; 
      licenseId: string; 
      allocationPercent: number;
    }) => {
      // Upsert the allocation
      const { data, error } = await (supabase as any)
        .from('assignment_license_allocations')
        .upsert({
          assignment_id: assignmentId,
          license_id: licenseId,
          allocation_percent: allocationPercent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'assignment_id,license_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { assignmentId, licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-license-allocations', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['license-allocations-by-license', licenseId] });
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
    },
    onError: (error) => {
      console.error('Error updating allocation:', error);
      toast.error('Failed to update allocation');
    },
  });
}

export function useBulkUpdateAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      allocations 
    }: { 
      assignmentId: string; 
      allocations: { license_id: string; allocation_percent: number }[];
    }) => {
      // Delete existing allocations for this assignment
      await (supabase as any)
        .from('assignment_license_allocations')
        .delete()
        .eq('assignment_id', assignmentId);

      // Insert new allocations (only non-zero ones)
      const nonZeroAllocations = allocations.filter(a => a.allocation_percent > 0);
      
      if (nonZeroAllocations.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('assignment_license_allocations')
        .insert(
          nonZeroAllocations.map(a => ({
            assignment_id: assignmentId,
            license_id: a.license_id,
            allocation_percent: a.allocation_percent,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-license-allocations', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License allocations saved');
    },
    onError: (error) => {
      console.error('Error saving allocations:', error);
      toast.error('Failed to save allocations');
    },
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      licenseId 
    }: { 
      assignmentId: string; 
      licenseId: string;
    }) => {
      const { error } = await (supabase as any)
        .from('assignment_license_allocations')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('license_id', licenseId);

      if (error) throw error;
    },
    onSuccess: (_, { assignmentId, licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-license-allocations', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['license-allocations-by-license', licenseId] });
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
    },
  });
}

// Calculate allocated cost
export function calculateAllocatedCost(annualCost: number, allocationPercent: number): number {
  return (annualCost * allocationPercent) / 100;
}

// Get allocation status info
export function getAllocationStatusInfo(totalAllocated: number): {
  status: 'complete' | 'partial' | 'over';
  color: string;
  message: string;
} {
  if (totalAllocated === 100) {
    return {
      status: 'complete',
      color: 'text-green-600',
      message: '100% allocated',
    };
  } else if (totalAllocated < 100) {
    return {
      status: 'partial',
      color: 'text-yellow-600',
      message: `${100 - totalAllocated}% unassigned`,
    };
  } else {
    return {
      status: 'over',
      color: 'text-red-600',
      message: `${totalAllocated - 100}% over-allocated`,
    };
  }
}
