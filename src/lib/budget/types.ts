/**
 * Budget Governance Module - Type Definitions
 * Uses camelCase for component compatibility
 */

export type AssignmentType = 'Insourced' | 'Cosourced' | 'Outsourced' | 'BAU';
export type AssignmentStatus = 'in_progress' | 'completed' | 'yet_to_start' | 'on_hold';
export type PaymentStatus = 'not_applicable' | 'on_track' | 'unpaid' | 'paid';
export type ResourceType = 'Fixed' | 'Variable' | 'Freelance' | 'Permanent';
export type BudgetPeriod = 'Q1' | 'H1' | 'Full';
export type DateStatus = 'normal' | 'ending-soon' | 'expired';

export interface BudgetAssignment {
  id: string;
  aid: string; // assignment_id short code "A01"
  name: string;
  type: AssignmentType;
  status: string;
  paymentStatus: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  vendor: string | null;
  department: string;
  computed: boolean;
  resourceCount?: number;
}

export interface BudgetResource {
  id: string;
  name: string;
  rid: string;
  role: string;
  department: string;
  resourceType: ResourceType;
  ctc: number | null;
  aid: string | null;
  assignmentName: string | null;
  vendorName: string | null;
  isActive: boolean;
  contractEnd: string | null;
}

export interface BudgetLicense {
  id: string;
  name: string;
  annualCost: number;
  monthlyCost: number;
  licenseType: string;
  userCount: number | null;
  startDate: string | null;
  renewalDate: string | null;
  departmentName: string | null;
}

export interface BudgetSummary {
  insourced: {
    count: number;
    budget: number;
    resources: number;
  };
  cosourced: {
    count: number;
    budget: number;
    resources: number;
  };
  outsourced: {
    count: number;
    budget: number;
    resources: number;
  };
  licenses: {
    count: number;
    monthly: number;
    periodTotal: number;
    annual: number;
  };
  total: number;
  missingCTC: number;
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

export interface DataQualityIssue {
  name: string;
  department: string;
  issue: string;
}
