/**
 * Hook for managing software licenses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, differenceInDays } from 'date-fns';
import type { 
  SoftwareLicense, 
  SoftwareLicenseWithAllocation, 
  SoftwareLicenseFormData,
  LicenseStats 
} from '../types';

export function useSoftwareLicenses() {
  return useQuery({
    queryKey: ['software-licenses'],
    queryFn: async () => {
      // Get licenses
      const { data: licenses, error: licensesError } = await typedQuery('software_licenses')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (licensesError) throw licensesError;

      // Get allocation totals
      const { data: allocations, error: allocationsError } = await typedQuery('license_allocation_totals')
        .select('*');

      if (allocationsError) throw allocationsError;

      // Merge allocation data into licenses
      const allocationMap = new Map(
        ((allocations || []) as any[]).map((a: any) => [a.license_id, a])
      );

      const result: SoftwareLicenseWithAllocation[] = ((licenses || []) as any[]).map((license: any) => {
        const allocation = allocationMap.get(license.id);
        return {
          ...license,
          total_allocated: allocation?.total_allocated || 0,
          allocation_status: allocation?.allocation_status || 'partial',
        };
      });

      return result;
    },
  });
}

export function useSoftwareLicense(licenseId: string | undefined) {
  return useQuery({
    queryKey: ['software-license', licenseId],
    queryFn: async () => {
      if (!licenseId) return null;
      
      const { data, error } = await typedQuery('software_licenses')
        .select('*')
        .eq('id', licenseId)
        .single();

      if (error) throw error;
      return data as SoftwareLicense;
    },
    enabled: !!licenseId,
  });
}

export function useLicenseStats() {
  const { data: licenses } = useSoftwareLicenses();
  
  return useQuery({
    queryKey: ['license-stats', licenses?.length],
    queryFn: async (): Promise<LicenseStats> => {
      if (!licenses) return { total: 0, fully_allocated: 0, partially_allocated: 0, renewals_soon: 0 };
      
      const today = new Date();
      const ninetyDaysFromNow = addDays(today, 90);
      
      return {
        total: licenses.length,
        fully_allocated: licenses.filter(l => l.allocation_status === 'complete').length,
        partially_allocated: licenses.filter(l => l.allocation_status === 'partial' || l.allocation_status === 'over').length,
        renewals_soon: licenses.filter(l => {
          if (!l.renewal_date) return false;
          const renewalDate = new Date(l.renewal_date);
          return renewalDate >= today && renewalDate <= ninetyDaysFromNow;
        }).length,
      };
    },
    enabled: !!licenses,
  });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SoftwareLicenseFormData) => {
      const { data: result, error } = await typedQuery('software_licenses')
        .insert({
          name: data.name,
          vendor: data.vendor,
          category: data.category,
          license_type: data.license_type,
          user_count: data.user_count,
          annual_cost: data.annual_cost,
          start_date: data.start_date,
          renewal_date: data.renewal_date,
          department_id: data.department_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License created successfully');
    },
    onError: (error) => {
      console.error('Error creating license:', error);
      toast.error('Failed to create license');
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<SoftwareLicenseFormData> 
    }) => {
      const { data: result, error } = await typedQuery('software_licenses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License updated successfully');
    },
    onError: (error) => {
      console.error('Error updating license:', error);
      toast.error('Failed to update license');
    },
  });
}

export function useDeleteLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await typedQuery('software_licenses')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting license:', error);
      toast.error('Failed to delete license');
    },
  });
}

// Get days until renewal
export function getDaysUntilRenewal(renewalDate: string | null): number | null {
  if (!renewalDate) return null;
  return differenceInDays(new Date(renewalDate), new Date());
}

// Get renewal status badge color
export function getRenewalStatusColor(days: number | null): string {
  if (days === null) return 'bg-muted text-muted-foreground';
  if (days < 0) return 'bg-destructive text-destructive-foreground';
  if (days <= 30) return 'bg-destructive/20 text-destructive';
  if (days <= 90) return 'bg-warning/20 text-warning';
  return 'bg-muted text-muted-foreground';
}
