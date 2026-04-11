/**
 * Hook for managing resource cost data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ResourceCostHistory, ResourceCurrentCost, ResourceCostFormData } from '../types';

export function useResourceCostHistory(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-cost-history', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];
      
      const { data, error } = await typedQuery('resource_cost_history')
        .select('*')
        .eq('resource_id', resourceId)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return (data || []) as ResourceCostHistory[];
    },
    enabled: !!resourceId,
  });
}

export function useResourceCurrentCost(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-current-cost', resourceId],
    queryFn: async () => {
      if (!resourceId) return null;
      
      const { data, error } = await typedQuery('resource_current_cost')
        .select('*')
        .eq('resource_id', resourceId)
        .maybeSingle();

      if (error) throw error;
      return data as ResourceCurrentCost | null;
    },
    enabled: !!resourceId,
  });
}

export function useAddResourceCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      resourceId, 
      data 
    }: { 
      resourceId: string; 
      data: ResourceCostFormData 
    }) => {
      const { data: result, error } = await typedQuery('resource_cost_history')
        .insert({
          resource_id: resourceId,
          resource_type: data.resource_type,
          monthly_cost: data.monthly_cost,
          effective_from: data.effective_from,
          effective_to: null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ['resource-cost-history', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-current-cost', resourceId] });
      toast.success('Cost record added successfully');
    },
    onError: (error) => {
      console.error('Error adding cost record:', error);
      toast.error('Failed to add cost record');
    },
  });
}

export function useUpdateResourceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      resourceId, 
      resourceType 
    }: { 
      resourceId: string; 
      resourceType: 'fixed' | 'variable' 
    }) => {
      // Update the current active cost record's resource type
      const { data, error } = await typedQuery('resource_cost_history')
        .update({ resource_type: resourceType })
        .eq('resource_id', resourceId)
        .is('effective_to', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ['resource-cost-history', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-current-cost', resourceId] });
    },
  });
}

// Helper function to calculate YTD cost
export function calculateYTDCost(
  costHistory: ResourceCostHistory[],
  yearStart: Date,
  currentDate: Date
): number {
  let totalCost = 0;
  
  for (const period of costHistory) {
    const periodStart = new Date(Math.max(
      new Date(period.effective_from).getTime(),
      yearStart.getTime()
    ));
    const periodEnd = new Date(Math.min(
      period.effective_to ? new Date(period.effective_to).getTime() : currentDate.getTime(),
      currentDate.getTime()
    ));
    
    if (periodStart <= periodEnd) {
      const months = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 
        + (periodEnd.getMonth() - periodStart.getMonth()) + 1;
      totalCost += months * period.monthly_cost;
    }
  }
  
  return totalCost;
}

// Format currency in SAR
export function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' SAR';
}
