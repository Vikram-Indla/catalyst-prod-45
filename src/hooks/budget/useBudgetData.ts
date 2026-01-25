/**
 * Budget Governance Module - Data Hook
 * Fetches from existing Supabase tables with camelCase transformation
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import type { 
  BudgetAssignment, 
  BudgetResource, 
  BudgetLicense, 
  BudgetSummary,
  DepartmentBudget,
  DataQualityIssue,
  BudgetPeriod 
} from '@/lib/budget/types';
import { 
  getPeriodMonths, 
  formatCurrency as formatCurrencyUtil, 
  formatFullCurrency, 
  formatSAR as formatSARUtil 
} from '@/lib/budget/utils';

// Re-export utilities for backward compatibility
export function formatCurrency(n: number, includeSAR: boolean = false): string {
  const prefix = includeSAR ? 'ج.س ' : '';
  return prefix + formatCurrencyUtil(n);
}

export function formatFull(n: number, includeSAR: boolean = false): string {
  const formatted = formatFullCurrency(n);
  return includeSAR ? `ج.س ${formatted}` : formatted;
}

export function formatSAR(n: number): string {
  return formatSARUtil(n);
}

// Re-export types
export type { BudgetAssignment, BudgetResource, BudgetLicense, DepartmentBudget, BudgetPeriod };

export interface BudgetData {
  assignments: BudgetAssignment[];
  resources: BudgetResource[];
  licenses: BudgetLicense[];
  departments: Record<string, DepartmentBudget>;
  dataQualityIssues: DataQualityIssue[];
  period: BudgetPeriod;
  licenseBudget: number;
  licenseCount: number;
  monthlyLicenseCost: number;
}

export function useBudgetData(period: BudgetPeriod = 'H1') {
  // Fetch assignments with vendor
  const assignmentsQuery = useQuery({
    queryKey: ['budget-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select(`
          id,
          name,
          assignment_id,
          assignment_type,
          assignment_status,
          payment_status,
          budget,
          start_date,
          end_date,
          vendor_id,
          resource_vendors(name)
        `)
        .eq('is_active', true)
        .order('budget', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch active resources with assignment and vendor
  const resourcesQuery = useQuery({
    queryKey: ['budget-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select(`
          id,
          name,
          rid,
          role_name,
          department_name,
          resource_type,
          ctc,
          assignment_id,
          vendor_id,
          is_active,
          contract_end_date,
          resource_vendors(name),
          resource_assignments(name, assignment_type, assignment_id)
        `)
        .eq('is_active', true)
        .order('ctc', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch licenses
  const licensesQuery = useQuery({
    queryKey: ['budget-licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_licenses')
        .select('*')
        .eq('is_active', true)
        .order('annual_cost', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const months = getPeriodMonths(period);

  // Transform and calculate
  const data = useMemo((): BudgetData | null => {
    if (!assignmentsQuery.data || !resourcesQuery.data || !licensesQuery.data) {
      return null;
    }

    // Normalize assignment type
    const normalizeType = (type: string | null): 'Insourced' | 'Cosourced' | 'Outsourced' => {
      if (!type) return 'Insourced';
      const lower = type.toLowerCase();
      if (lower.includes('outsourced')) return 'Outsourced';
      if (lower.includes('cosourced')) return 'Cosourced';
      return 'Insourced';
    };

    // Transform resources (do this first to derive department info)
    const resources: BudgetResource[] = resourcesQuery.data.map((r: any) => ({
      id: r.id,
      name: r.name,
      rid: r.rid || '',
      role: r.role_name || 'Unknown',
      department: r.department_name || 'Delivery',
      resourceType: r.resource_type || 'Variable',
      ctc: r.ctc,
      aid: r.resource_assignments?.assignment_id || null,
      assignmentName: r.resource_assignments?.name || null,
      vendorName: r.resource_vendors?.name || null,
      isActive: r.is_active,
      contractEnd: r.contract_end_date
    }));

    // Transform assignments with resource-derived department
    const assignments: BudgetAssignment[] = assignmentsQuery.data.map((a: any) => {
      const type = normalizeType(a.assignment_type);
      // Find resources for this assignment to determine department
      const assignmentResources = resources.filter(r => r.aid === a.assignment_id);
      const department = assignmentResources.length > 0 
        ? assignmentResources[0].department 
        : 'Delivery';

      return {
        id: a.id,
        aid: a.assignment_id || `A${a.id.substring(0, 2).toUpperCase()}`,
        name: a.name,
        type,
        status: a.assignment_status || 'in_progress',
        paymentStatus: a.payment_status || 'not_applicable',
        budget: a.budget || 0,
        startDate: a.start_date,
        endDate: a.end_date,
        vendor: a.resource_vendors?.name || null,
        department,
        computed: type === 'Insourced',
        resourceCount: assignmentResources.length
      };
    });

    // Transform licenses
    const licenses: BudgetLicense[] = licensesQuery.data.map((l: any) => ({
      id: l.id,
      name: l.name,
      annualCost: l.annual_cost || 0,
      monthlyCost: (l.annual_cost || 0) / 12,
      licenseType: l.license_type || 'annual',
      userCount: l.user_count,
      startDate: l.start_date,
      renewalDate: l.renewal_date
    }));

    // Calculate department budgets
    const deptNames = [...new Set(resources.map(r => r.department))].filter(Boolean);
    const licenseBudget = licenses.reduce((sum, l) => sum + l.monthlyCost * months, 0);
    
    const departments: Record<string, DepartmentBudget> = {};
    
    // Initialize 'all'
    departments.all = { 
      insourced: 0, cosourced: 0, outsourced: 0, 
      licenses: licenseBudget, total: 0, resources: 0, dataIssues: 0 
    };

    // Initialize each department
    deptNames.forEach(d => {
      const deptLicenseBudget = licenseBudget / deptNames.length;
      departments[d] = { 
        insourced: 0, cosourced: 0, outsourced: 0, 
        licenses: deptLicenseBudget, total: 0, resources: 0, dataIssues: 0 
      };
    });

    // Calculate insourced from Variable/Freelance resources only
    resources.forEach(r => {
      const dept = r.department;
      if (!departments[dept]) return;
      
      // Only Variable and Freelance resource types contribute to insourced
      const isInsourcedResource = 
        r.resourceType?.toLowerCase() === 'variable' || 
        r.resourceType?.toLowerCase() === 'freelance' ||
        r.resourceType?.toLowerCase() === 'core'; // legacy value
      
      if (isInsourcedResource) {
        const ctcBudget = (r.ctc || 0) * months;
        
        departments[dept].insourced += ctcBudget;
        departments[dept].resources++;
        if (!r.ctc || r.ctc === 0) departments[dept].dataIssues++;
        
        departments.all.insourced += ctcBudget;
        departments.all.resources++;
        if (!r.ctc || r.ctc === 0) departments.all.dataIssues++;
      }
    });

    // Add cosourced and outsourced from assignments
    assignments.forEach(a => {
      if (a.type === 'Cosourced') {
        departments.all.cosourced += a.budget;
      } else if (a.type === 'Outsourced') {
        departments.all.outsourced += a.budget;
      }
    });

    // Calculate totals
    Object.keys(departments).forEach(k => {
      departments[k].total = departments[k].insourced + departments[k].cosourced + 
                            departments[k].outsourced + departments[k].licenses;
    });

    // Recalculate insourced budgets for assignments
    const enrichedAssignments = assignments.map(a => {
      if (a.type === 'Insourced') {
        const res = resources.filter(r => r.aid === a.aid);
        const computedBudget = res.reduce((sum, r) => sum + (r.ctc || 0) * months, 0);
        return { ...a, budget: computedBudget, resourceCount: res.length };
      }
      return a;
    });

    // Data quality issues
    const dataQualityIssues: DataQualityIssue[] = resources
      .filter(r => !r.ctc || r.ctc === 0)
      .map(r => ({
        name: r.name,
        department: r.department,
        issue: 'Missing CTC value'
      }));

    return {
      assignments: enrichedAssignments,
      resources,
      licenses,
      departments,
      dataQualityIssues,
      period,
      licenseBudget,
      licenseCount: licenses.length,
      monthlyLicenseCost: licenses.reduce((sum, l) => sum + l.monthlyCost, 0)
    };
  }, [assignmentsQuery.data, resourcesQuery.data, licensesQuery.data, months, period]);

  // Get resources for a specific assignment
  const getResourcesForAssignment = (assignmentId: string): BudgetResource[] => {
    return data?.resources.filter(r => r.aid === assignmentId) ?? [];
  };

  return {
    data,
    isLoading: assignmentsQuery.isLoading || resourcesQuery.isLoading || licensesQuery.isLoading,
    error: assignmentsQuery.error || resourcesQuery.error || licensesQuery.error,
    refetch: async () => {
      await Promise.all([
        assignmentsQuery.refetch(),
        resourcesQuery.refetch(),
        licensesQuery.refetch()
      ]);
    },
    getResourcesForAssignment
  };
}
