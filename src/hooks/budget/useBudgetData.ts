/**
 * Budget Governance Module - Data Hook
 * Fetches assignments and resources for budget calculations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetAssignment {
  id: string;
  aid: string;
  name: string;
  type: 'Insourced' | 'Cosourced' | 'Outsourced';
  status: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  vendor: string | null;
  paymentStatus: string;
  department: string;
  computed: boolean;
  resourceCount?: number;
}

export interface BudgetResource {
  id: string;
  rid: string;
  name: string;
  role: string;
  department: string;
  aid: string | null;
  assignmentName: string | null;
  vendor: string | null;
  resourceType: 'Fixed' | 'Variable' | 'Freelance';
  ctc: number;
  contractStart: string | null;
  contractEnd: string | null;
}

export interface ResourceBudget {
  resourceId: string;
  name: string;
  role: string;
  department: string;
  assignmentName: string | null;
  ctc: number;
  contractEnd: string | null;
  assignmentEnd: string | null;
  consumedYTD: number;
  reqToContract: number;
  reqToAssignment: number;
  assignmentExtends: boolean;
  hasIssue: boolean;
}

export interface DepartmentBudget {
  insourced: number;
  cosourced: number;
  outsourced: number;
  licenses: number;
  total: number;
  resources: number;
  dataIssues: number;
}

export interface BudgetLicense {
  id: string;
  name: string;
  annualCost: number;
  monthlyCost: number;
  licenseType: string;
  userCount: number | null;
  renewalDate: string | null;
  startDate: string | null;
}

export type BudgetPeriod = 'Q1' | 'H1' | 'full_year';

const YEAR_START = new Date('2026-01-01');
const TODAY = new Date('2026-01-25');
const MONTHS_YTD = 1; // January 2026

// Period multipliers for budget calculation
export function getPeriodMultiplier(period: BudgetPeriod): number {
  switch (period) {
    case 'Q1': return 3;
    case 'H1': return 6;
    case 'full_year': return 12;
  }
}

// Get period end date for budget calculations
export function getPeriodEndDate(period: BudgetPeriod): Date {
  switch (period) {
    case 'Q1': return new Date('2026-03-31');
    case 'H1': return new Date('2026-06-30');
    case 'full_year': return new Date('2026-12-31');
  }
}

function parseDate(s: string | null): Date | null {
  return s ? new Date(s) : null;
}

function monthsBetween(s: Date | null, e: Date | null): number {
  if (!s || !e || e <= s) return 0;
  return Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

// Calculate months for a resource within a specific period
function calculateMonthsInPeriod(contractEnd: Date | null, periodEnd: Date): number {
  if (!contractEnd) return 0;
  // Use the earlier of contract end or period end
  const effectiveEnd = contractEnd < periodEnd ? contractEnd : periodEnd;
  return monthsBetween(YEAR_START, effectiveEnd);
}

export function calculateResourceBudget(
  resource: BudgetResource,
  assignment: BudgetAssignment | undefined,
  period: BudgetPeriod = 'H1'
): ResourceBudget {
  const contractEnd = parseDate(resource.contractEnd);
  const assignmentEnd = assignment ? parseDate(assignment.endDate) : null;
  const periodEnd = getPeriodEndDate(period);
  
  // Consumed YTD (January 2026 = 1 month)
  const consumedYTD = resource.ctc * MONTHS_YTD;
  
  // Required within period (from Jan 1, 2026 to period end or contract end, whichever is earlier)
  const monthsToContract = contractEnd ? calculateMonthsInPeriod(contractEnd, periodEnd) : 0;
  const reqToContract = resource.ctc * monthsToContract;
  
  // Required to Assignment End (if extends beyond contract within period)
  let reqToAssignment = reqToContract;
  let assignmentExtends = false;
  if (assignmentEnd && contractEnd && assignmentEnd > contractEnd) {
    const effectiveAssignmentEnd = assignmentEnd < periodEnd ? assignmentEnd : periodEnd;
    const monthsToAssignment = Math.max(0, monthsBetween(YEAR_START, effectiveAssignmentEnd));
    reqToAssignment = resource.ctc * monthsToAssignment;
    assignmentExtends = true;
  }
  
  return {
    resourceId: resource.id,
    name: resource.name,
    role: resource.role,
    department: resource.department,
    assignmentName: resource.assignmentName,
    ctc: resource.ctc,
    contractEnd: resource.contractEnd,
    assignmentEnd: assignment?.endDate || null,
    consumedYTD: Math.round(consumedYTD),
    reqToContract: Math.round(reqToContract),
    reqToAssignment: Math.round(reqToAssignment),
    assignmentExtends,
    hasIssue: resource.ctc === 0 && (resource.resourceType === 'Variable' || resource.resourceType === 'Freelance')
  };
}

export function useBudgetData(period: BudgetPeriod = 'H1') {
  return useQuery({
    queryKey: ['budget-governance-data', period],
    queryFn: async () => {
      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await (supabase as any)
        .from('resource_assignments')
        .select(`
          id,
          assignment_id,
          name,
          assignment_type,
          assignment_status,
          budget,
          start_date,
          end_date,
          vendor_id,
          payment_status,
          is_active,
          resource_vendors (id, name)
        `)
        .eq('is_active', true)
        .order('sort_order');

      // Fetch software licenses
      const { data: licensesData, error: licensesError } = await (supabase as any)
        .from('software_licenses')
        .select('*')
        .eq('is_active', true)
        .order('annual_cost', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      if (licensesError) throw licensesError;

      // Transform licenses
      const licenses: BudgetLicense[] = (licensesData || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        annualCost: l.annual_cost || 0,
        monthlyCost: (l.annual_cost || 0) / 12,
        licenseType: l.license_type || 'annual',
        userCount: l.user_count,
        renewalDate: l.renewal_date,
        startDate: l.start_date
      }));

      // Calculate license budget based on period
      const periodMultiplier = getPeriodMultiplier(period);
      const licenseBudget = licenses.reduce((sum, l) => sum + (l.annualCost / 12) * periodMultiplier, 0);

      // Fetch departments from capacity_departments
      const { data: deptData, error: deptError } = await (supabase as any)
        .from('capacity_departments')
        .select('id, name, department_id')
        .eq('is_active', true)
        .order('sort_order');

      if (deptError) throw deptError;

      const deptMap = new Map((deptData || []).map((d: any) => [d.id, d.name]));
      const departmentNames = (deptData || []).map((d: any) => d.name) as string[];

      // Fetch resources with their CTC and department info
      const { data: resourcesData, error: resourcesError } = await (supabase as any)
        .from('resource_inventory')
        .select(`
          id,
          rid,
          name,
          role_name,
          department_id,
          department_name,
          assignment_id,
          vendor_id,
          resource_type,
          ctc,
          contract_start_date,
          contract_end_date,
          resource_assignments (id, name, assignment_id),
          resource_vendors (id, name)
        `)
        .eq('is_active', true);

      if (resourcesError) throw resourcesError;

      // Map assignment type normalization
      const normalizeType = (type: string): 'Insourced' | 'Cosourced' | 'Outsourced' => {
        const lower = type?.toLowerCase() || '';
        if (lower.includes('outsourced')) return 'Outsourced';
        if (lower.includes('cosourced')) return 'Cosourced';
        return 'Insourced';
      };

      const normalizeResourceType = (type: string): 'Fixed' | 'Variable' | 'Freelance' => {
        const lower = type?.toLowerCase() || '';
        if (lower.includes('fixed')) return 'Fixed';
        if (lower.includes('freelance')) return 'Freelance';
        return 'Variable';
      };

      // Transform assignments
      const assignments: BudgetAssignment[] = (assignmentsData || []).map((a: any) => ({
        id: a.id,
        aid: a.assignment_id || `A${String(a.id).substring(0, 2).toUpperCase()}`,
        name: a.name,
        type: normalizeType(a.assignment_type),
        status: a.assignment_status || 'In Progress',
        budget: a.budget || 0,
        startDate: a.start_date,
        endDate: a.end_date,
        vendor: a.resource_vendors?.name || null,
        paymentStatus: a.payment_status || 'N/A',
        department: 'Delivery', // Default, will be enriched from resources
        computed: normalizeType(a.assignment_type) === 'Insourced'
      }));

      // Transform resources - use department_name directly from resource_inventory
      const resources: BudgetResource[] = (resourcesData || []).map((r: any) => ({
        id: r.id,
        rid: r.rid || '',
        name: r.name,
        role: r.role_name || 'Unknown',
        department: r.department_name || deptMap.get(r.department_id) || 'Delivery',
        aid: r.resource_assignments?.assignment_id || null,
        assignmentName: r.resource_assignments?.name || null,
        vendor: r.resource_vendors?.name || null,
        resourceType: normalizeResourceType(r.resource_type),
        ctc: r.ctc || 0,
        contractStart: r.contract_start_date,
        contractEnd: r.contract_end_date
      }));

      // Calculate department budgets from actual departments
      const budgets: Record<string, DepartmentBudget> = {};
      
      // Initialize 'all' and each actual department
      budgets.all = { insourced: 0, cosourced: 0, outsourced: 0, licenses: licenseBudget, total: 0, resources: 0, dataIssues: 0 };
      departmentNames.forEach(d => {
        // Apportion licenses evenly across departments
        const deptLicenseBudget = licenseBudget / departmentNames.length;
        budgets[d] = { insourced: 0, cosourced: 0, outsourced: 0, licenses: deptLicenseBudget, total: 0, resources: 0, dataIssues: 0 };
      });

      // Calculate insourced from resources (exclude Fixed)
      resources.forEach(r => {
        if (r.resourceType === 'Fixed') return; // Fixed resources are cosourced
        
        const assignment = assignments.find(a => a.aid === r.aid);
        const budget = calculateResourceBudget(r, assignment, period);
        
        const dept = r.department;
        if (budgets[dept]) {
          budgets[dept].insourced += budget.reqToContract;
          budgets[dept].resources++;
          if (budget.hasIssue) budgets[dept].dataIssues++;
        }
        
        budgets.all.insourced += budget.reqToContract;
        budgets.all.resources++;
        if (budget.hasIssue) budgets.all.dataIssues++;
      });

      // Add cosourced and outsourced from assignments
      assignments.forEach(a => {
        if (a.type === 'Cosourced') {
          // Cosourced budget goes to 'all' and relevant department
          budgets.all.cosourced += a.budget;
        } else if (a.type === 'Outsourced') {
          // Outsourced budget goes to 'all' 
          budgets.all.outsourced += a.budget;
        }
      });

      // Calculate totals (including licenses)
      Object.keys(budgets).forEach(k => {
        budgets[k].total = budgets[k].insourced + budgets[k].cosourced + budgets[k].outsourced + budgets[k].licenses;
      });

      // Enrich assignments with computed budgets and resource counts
      const enrichedAssignments = assignments.map(a => {
        if (a.type === 'Insourced') {
          const res = resources.filter(r => r.aid === a.aid && r.resourceType !== 'Fixed');
          const budgetVal = res.reduce((sum, r) => {
            const asn = assignments.find(x => x.aid === r.aid);
            return sum + calculateResourceBudget(r, asn, period).reqToContract;
          }, 0);
          return { ...a, budget: budgetVal, resourceCount: res.length };
        }
        return { ...a, resourceCount: resources.filter(r => r.aid === a.aid).length };
      });

      // Get data quality issues
      const dataQualityIssues = resources
        .filter(r => (r.resourceType === 'Variable' || r.resourceType === 'Freelance') && r.ctc === 0)
        .map(r => ({ name: r.name, department: r.department, issue: 'Missing CTC value' }));

      return {
        assignments: enrichedAssignments,
        resources,
        licenses,
        departments: budgets,
        dataQualityIssues,
        period,
        licenseBudget,
        licenseCount: licenses.length,
        monthlyLicenseCost: licenses.reduce((sum, l) => sum + l.monthlyCost, 0)
      };
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

export function formatCurrency(n: number, includeSAR: boolean = false): string {
  const prefix = includeSAR ? 'ج.س ' : '';
  if (n >= 1000000) return prefix + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return prefix + (n / 1000).toFixed(0) + 'K';
  return prefix + n.toString();
}

export function formatFull(n: number, includeSAR: boolean = false): string {
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return includeSAR ? `ج.س ${formatted}` : formatted;
}

export function formatSAR(n: number): string {
  return `ج.س ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
