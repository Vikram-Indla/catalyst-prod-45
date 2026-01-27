/**
 * Budget Scenarios Hook - V8 Scenario Planning
 * Manages CRUD operations for budget scenarios with Supabase
 * 
 * Preset calculations:
 * - Baseline: Current state, no extensions
 * - Critical +3mo: Resources with contracts ending within 90 days
 * - Expiring <3mo +3mo: Resources with contracts ending before Q2 end
 * - Delivery +6mo: All Delivery department Variable/Freelance resources
 * - Freelancers +3mo: All Freelance type resources
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
  vendorName: string | null;
  location?: string;
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

export interface BaselineBudget {
  insourced: number;
  cosourced: number;
  outsourced: number;
  licenses: number;
  total: number;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  extensions: ScenarioExtension[];
  filterDepartment?: string;
  filterExpiryStart?: string;
  filterExpiryEnd?: string;
  baselineBudget: BaselineBudget;
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

// Helper: add months to a date string
function addMonthsToDate(dateStr: string | null, months: number): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

// Helper: filter resources that are Variable or Freelance (insourced types)
function getInsourcedResources(resources: BudgetResource[]): BudgetResource[] {
  return resources.filter(r => 
    r.resourceType?.toLowerCase() === 'variable' || 
    r.resourceType?.toLowerCase() === 'freelance'
  );
}

// Create extension records for a set of resources
function createExtensions(resources: BudgetResource[], months: number): ScenarioExtension[] {
  return resources.map(r => {
    const deltaCost = (r.ctc || 0) * months;
    return {
      resourceId: r.id,
      resourceName: r.name,
      department: r.department,
      originalEnd: r.contractEnd,
      extensionMonths: months,
      newEnd: addMonthsToDate(r.contractEnd, months),
      deltaCost,
      monthlyCTC: r.ctc || 0,
      rid: r.rid,
      role: r.role,
      resourceType: r.resourceType,
      vendorName: r.vendorName,
    };
  });
}

// Calculate total delta from extensions
function calcDelta(extensions: ScenarioExtension[]): number {
  return extensions.reduce((sum, e) => sum + e.deltaCost, 0);
}

/**
 * Generate preset scenarios from live resource data
 * 
 * - Baseline: No changes
 * - Critical +3mo: Resources expiring within 90 days
 * - Expiring <3mo +3mo: All resources expiring before Q2 end (Jun 30)
 * - Delivery +6mo: All Delivery department Variable/Freelance
 * - Freelancers +3mo: All Freelance type resources
 */
export function generatePresetScenarios(
  resources: BudgetResource[],
  baselineBudget: BaselineBudget
): Omit<BudgetScenario, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>[] {
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);
  
  const q2End = new Date(2026, 5, 30); // Jun 30, 2026
  
  // Get only insourced resources (Variable/Freelance)
  const insourcedResources = getInsourcedResources(resources);
  
  // Critical: contracts ending within 90 days
  const criticalResources = insourcedResources.filter(r => {
    if (!r.contractEnd) return false;
    const endDate = new Date(r.contractEnd);
    return endDate >= now && endDate <= ninetyDaysFromNow;
  });
  
  // Expiring <Q2 end: all resources with contracts ending before Jun 30, 2026
  const expiringQ2Resources = insourcedResources.filter(r => {
    if (!r.contractEnd) return false;
    const endDate = new Date(r.contractEnd);
    return endDate <= q2End && endDate >= now;
  });
  
  // Delivery department only
  const deliveryResources = insourcedResources.filter(r => 
    r.department?.toLowerCase() === 'delivery'
  );
  
  // Freelancers only
  const freelancers = insourcedResources.filter(r => 
    r.resourceType?.toLowerCase() === 'freelance'
  );
  
  // Create extension sets
  const critical3mo = createExtensions(criticalResources, 3);
  const expiring3mo = createExtensions(expiringQ2Resources, 3);
  const delivery6mo = createExtensions(deliveryResources, 6);
  const freelance3mo = createExtensions(freelancers, 3);
  
  const createScenario = (
    name: string,
    description: string,
    extensions: ScenarioExtension[],
    avgMonths: number,
    filterDept: string | null = null,
    filterExpiryEnd: string | null = null
  ): Omit<BudgetScenario, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> => {
    const delta = calcDelta(extensions);
    return {
      name,
      description,
      type: 'preset',
      totalBudget: baselineBudget.total + delta,
      deltaFromBaseline: delta,
      resourceCount: extensions.length,
      avgExtensionMonths: avgMonths,
      insourcedBudget: baselineBudget.insourced + delta,
      cosourcedBudget: baselineBudget.cosourced,
      outsourcedBudget: baselineBudget.outsourced,
      licensesBudget: baselineBudget.licenses,
      filterDepartment: filterDept,
      filterExpiryStart: null,
      filterExpiryEnd,
      scenarioData: extensions,
      isActive: true,
    };
  };
  
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
    createScenario(
      'Critical +3mo',
      `Extend ${criticalResources.length} resources expiring within 90 days by 3 months`,
      critical3mo,
      3,
      null,
      ninetyDaysFromNow.toISOString().split('T')[0]
    ),
    createScenario(
      'Expiring <Q2 +3mo',
      `Extend ${expiringQ2Resources.length} resources expiring before Q2 end by 3 months`,
      expiring3mo,
      3,
      null,
      q2End.toISOString().split('T')[0]
    ),
    createScenario(
      'Delivery +6mo',
      `Extend all ${deliveryResources.length} Delivery department resources by 6 months`,
      delivery6mo,
      6,
      'Delivery',
      null
    ),
    createScenario(
      'Freelancers +3mo',
      `Extend all ${freelancers.length} Freelance resources by 3 months`,
      freelance3mo,
      3,
      null,
      null
    ),
  ];
}

/**
 * Calculate scenario budget breakdown by department
 */
export function calculateScenarioBudgetByDepartment(
  scenario: BudgetScenario,
  baselineBudget: BaselineBudget,
  department: string
): { insourced: number; delta: number } {
  if (department === 'all') {
    return {
      insourced: scenario.insourcedBudget,
      delta: scenario.deltaFromBaseline,
    };
  }
  
  const deptExtensions = scenario.scenarioData.filter(
    e => e.department?.toLowerCase() === department.toLowerCase()
  );
  const deptDelta = deptExtensions.reduce((sum, e) => sum + e.deltaCost, 0);
  
  return {
    insourced: baselineBudget.insourced + deptDelta,
    delta: deptDelta,
  };
}
