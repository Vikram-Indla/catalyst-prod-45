/**
 * Budget Scenarios Hook - V8 Scenario Planning
 * Manages CRUD operations for budget scenarios with Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BudgetResource } from '@/lib/budget/types';

export interface ScenarioExtension {
  resourceId: string;
  resourceName: string;
  department: string;
  originalEnd: string | null;
  extensionMonths: number;
  newEnd: string;
  deltaCost: number;
  monthlyCTC: number;
  rid: string;
  role: string;
  resourceType: string;
}

export interface BudgetScenario {
  id: string;
  name: string;
  description: string | null;
  type: 'preset' | 'custom';
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  totalBudget: number;
  deltaFromBaseline: number;
  resourceCount: number;
  avgExtensionMonths: number;
  insourcedBudget: number;
  cosourcedBudget: number;
  outsourcedBudget: number;
  licensesBudget: number;
  filterDepartment: string | null;
  filterExpiryStart: string | null;
  filterExpiryEnd: string | null;
  scenarioData: ScenarioExtension[];
  isActive: boolean;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  extensions: ScenarioExtension[];
  filterDepartment?: string;
  filterExpiryStart?: string;
  filterExpiryEnd?: string;
  baselineBudget: {
    insourced: number;
    cosourced: number;
    outsourced: number;
    licenses: number;
    total: number;
  };
}

// Transform DB row to typed object
function transformScenario(row: any): BudgetScenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as 'preset' | 'custom',
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    totalBudget: parseFloat(row.total_budget) || 0,
    deltaFromBaseline: parseFloat(row.delta_from_baseline) || 0,
    resourceCount: row.resource_count || 0,
    avgExtensionMonths: parseFloat(row.avg_extension_months) || 0,
    insourcedBudget: parseFloat(row.insourced_budget) || 0,
    cosourcedBudget: parseFloat(row.cosourced_budget) || 0,
    outsourcedBudget: parseFloat(row.outsourced_budget) || 0,
    licensesBudget: parseFloat(row.licenses_budget) || 0,
    filterDepartment: row.filter_department,
    filterExpiryStart: row.filter_expiry_start,
    filterExpiryEnd: row.filter_expiry_end,
    scenarioData: (row.scenario_data || []) as ScenarioExtension[],
    isActive: row.is_active,
  };
}

export function useBudgetScenarios() {
  return useQuery({
    queryKey: ['budget-scenarios'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('budget_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(transformScenario);
    },
  });
}

export function useBudgetScenario(scenarioId: string | null) {
  return useQuery({
    queryKey: ['budget-scenario', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return null;
      
      const { data, error } = await (supabase as any)
        .from('budget_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (error) throw error;
      return transformScenario(data);
    },
    enabled: !!scenarioId,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScenarioInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const totalDelta = input.extensions.reduce((sum, e) => sum + e.deltaCost, 0);
      const avgExtension = input.extensions.length > 0
        ? input.extensions.reduce((sum, e) => sum + e.extensionMonths, 0) / input.extensions.length
        : 0;
      
      const newTotal = input.baselineBudget.total + totalDelta;
      const insourcedWithDelta = input.baselineBudget.insourced + totalDelta;

      const { data, error } = await (supabase as any)
        .from('budget_scenarios')
        .insert({
          name: input.name,
          description: input.description || null,
          type: 'custom',
          created_by: userId,
          total_budget: newTotal,
          delta_from_baseline: totalDelta,
          resource_count: input.extensions.length,
          avg_extension_months: avgExtension,
          insourced_budget: insourcedWithDelta,
          cosourced_budget: input.baselineBudget.cosourced,
          outsourced_budget: input.baselineBudget.outsourced,
          licenses_budget: input.baselineBudget.licenses,
          filter_department: input.filterDepartment || null,
          filter_expiry_start: input.filterExpiryStart || null,
          filter_expiry_end: input.filterExpiryEnd || null,
          scenario_data: input.extensions,
        })
        .select()
        .single();

      if (error) throw error;
      return transformScenario(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-scenarios'] });
      toast.success('Scenario saved successfully');
    },
    onError: (error) => {
      console.error('Failed to create scenario:', error);
      toast.error('Failed to save scenario');
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await (supabase as any)
        .from('budget_scenarios')
        .update({ is_active: false })
        .eq('id', scenarioId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-scenarios'] });
      toast.success('Scenario deleted');
    },
    onError: (error) => {
      console.error('Failed to delete scenario:', error);
      toast.error('Failed to delete scenario');
    },
  });
}

// Generate preset scenarios from live resource data
export function generatePresetScenarios(
  resources: BudgetResource[],
  baselineBudget: { insourced: number; cosourced: number; outsourced: number; licenses: number; total: number }
): Omit<BudgetScenario, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>[] {
  const now = new Date();
  const q1End = new Date(2026, 2, 31); // Mar 31, 2026
  const q2End = new Date(2026, 5, 30); // Jun 30, 2026
  
  // Critical resources: contract ending within 90 days
  const criticalResources = resources.filter(r => {
    if (!r.contractEnd) return false;
    const endDate = new Date(r.contractEnd);
    const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilEnd <= 90 && daysUntilEnd > 0;
  });
  
  // Expiring <3 months
  const expiringResources = resources.filter(r => {
    if (!r.contractEnd) return false;
    const endDate = new Date(r.contractEnd);
    return endDate <= q2End;
  });
  
  // Delivery department only
  const deliveryResources = resources.filter(r => 
    r.department === 'Delivery' && 
    (r.resourceType === 'Variable' || r.resourceType === 'Freelance')
  );
  
  // Freelancers only
  const freelancers = resources.filter(r => r.resourceType === 'Freelance');
  
  const createExtensions = (res: BudgetResource[], months: number): ScenarioExtension[] => {
    return res.map(r => {
      const originalEnd = r.contractEnd ? new Date(r.contractEnd) : new Date();
      const newEnd = new Date(originalEnd);
      newEnd.setMonth(newEnd.getMonth() + months);
      const deltaCost = (r.ctc || 0) * months;
      
      return {
        resourceId: r.id,
        resourceName: r.name,
        department: r.department,
        originalEnd: r.contractEnd,
        extensionMonths: months,
        newEnd: newEnd.toISOString().split('T')[0],
        deltaCost,
        monthlyCTC: r.ctc || 0,
        rid: r.rid,
        role: r.role,
        resourceType: r.resourceType,
      };
    });
  };
  
  const calcDelta = (extensions: ScenarioExtension[]) => 
    extensions.reduce((sum, e) => sum + e.deltaCost, 0);
  
  const critical3mo = createExtensions(criticalResources, 3);
  const expiring3mo = createExtensions(expiringResources, 3);
  const delivery6mo = createExtensions(deliveryResources, 6);
  const freelance3mo = createExtensions(freelancers, 3);
  
  return [
    {
      name: 'Baseline',
      description: 'Current budget with no extensions',
      type: 'preset',
      totalBudget: baselineBudget.total,
      deltaFromBaseline: 0,
      resourceCount: 0,
      avgExtensionMonths: 0,
      insourcedBudget: baselineBudget.insourced,
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: null,
      filterExpiryStart: null,
      filterExpiryEnd: null,
      scenarioData: [],
      isActive: true,
    },
    {
      name: 'Critical +3mo',
      description: `Extend ${criticalResources.length} critical resources expiring within 90 days`,
      type: 'preset',
      totalBudget: baselineBudget.total + calcDelta(critical3mo),
      deltaFromBaseline: calcDelta(critical3mo),
      resourceCount: criticalResources.length,
      avgExtensionMonths: 3,
      insourcedBudget: baselineBudget.insourced + calcDelta(critical3mo),
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: null,
      filterExpiryStart: null,
      filterExpiryEnd: null,
      scenarioData: critical3mo,
      isActive: true,
    },
    {
      name: 'Expiring <Q2 +3mo',
      description: `Extend ${expiringResources.length} resources expiring before Q2 end`,
      type: 'preset',
      totalBudget: baselineBudget.total + calcDelta(expiring3mo),
      deltaFromBaseline: calcDelta(expiring3mo),
      resourceCount: expiringResources.length,
      avgExtensionMonths: 3,
      insourcedBudget: baselineBudget.insourced + calcDelta(expiring3mo),
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: null,
      filterExpiryStart: null,
      filterExpiryEnd: q2End.toISOString().split('T')[0],
      scenarioData: expiring3mo,
      isActive: true,
    },
    {
      name: 'Delivery +6mo',
      description: `Extend all ${deliveryResources.length} Delivery resources by 6 months`,
      type: 'preset',
      totalBudget: baselineBudget.total + calcDelta(delivery6mo),
      deltaFromBaseline: calcDelta(delivery6mo),
      resourceCount: deliveryResources.length,
      avgExtensionMonths: 6,
      insourcedBudget: baselineBudget.insourced + calcDelta(delivery6mo),
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: 'Delivery',
      filterExpiryStart: null,
      filterExpiryEnd: null,
      scenarioData: delivery6mo,
      isActive: true,
    },
    {
      name: 'Freelancers +3mo',
      description: `Extend all ${freelancers.length} freelance resources by 3 months`,
      type: 'preset',
      totalBudget: baselineBudget.total + calcDelta(freelance3mo),
      deltaFromBaseline: calcDelta(freelance3mo),
      resourceCount: freelancers.length,
      avgExtensionMonths: 3,
      insourcedBudget: baselineBudget.insourced + calcDelta(freelance3mo),
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: null,
      filterExpiryStart: null,
      filterExpiryEnd: null,
      scenarioData: freelance3mo,
      isActive: true,
    },
  ];
}
