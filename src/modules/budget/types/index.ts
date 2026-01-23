/**
 * Budget Planning Module Types
 */

// Resource Cost Types
export interface ResourceCostHistory {
  id: string;
  resource_id: string;
  resource_type: 'fixed' | 'variable';
  monthly_cost: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ResourceCurrentCost {
  id: string;
  resource_id: string;
  resource_type: 'fixed' | 'variable';
  monthly_cost: number;
  annual_cost: number;
  effective_from: string;
  effective_to: string | null;
}

// Software License Types
export type LicenseCategory = 
  | 'portfolio_management'
  | 'crm'
  | 'infrastructure'
  | 'productivity'
  | 'design'
  | 'development'
  | 'security'
  | 'other';

export type LicenseType = 'annual' | 'monthly' | 'consumption' | 'perpetual';

export interface SoftwareLicense {
  id: string;
  name: string;
  vendor: string;
  category: LicenseCategory | null;
  license_type: LicenseType;
  user_count: number | null;
  annual_cost: number;
  start_date: string;
  renewal_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SoftwareLicenseWithAllocation extends SoftwareLicense {
  total_allocated: number;
  allocation_status: 'complete' | 'partial' | 'over';
}

// License Allocation Types
export interface AssignmentLicenseAllocation {
  id: string;
  assignment_id: string;
  license_id: string;
  allocation_percent: number;
  created_at: string;
  updated_at: string;
}

export interface LicenseAllocationSummary {
  license_id: string;
  license_name: string;
  total_allocated: number;
  status: 'complete' | 'partial' | 'over';
  assignments: {
    assignment_id: string;
    assignment_name: string;
    percent: number;
  }[];
}

// Budget Aggregation Types
export interface AssignmentBudget {
  assignment_id: string;
  assignment_name: string;
  resource_cost: {
    fixed: number;
    variable: number;
    total: number;
  };
  license_cost: number;
  total_budget: number;
  spent_ytd: number;
  variance: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
}

// Form Types
export interface ResourceCostFormData {
  resource_type: 'fixed' | 'variable';
  monthly_cost: number;
  effective_from: string;
}

export interface SoftwareLicenseFormData {
  name: string;
  vendor: string;
  category: LicenseCategory | null;
  license_type: LicenseType;
  user_count: number | null;
  annual_cost: number;
  start_date: string;
  renewal_date: string | null;
}

// Stats
export interface LicenseStats {
  total: number;
  fully_allocated: number;
  partially_allocated: number;
  renewals_soon: number;
}

export const LICENSE_CATEGORIES: { value: LicenseCategory; label: string }[] = [
  { value: 'portfolio_management', label: 'Portfolio Management' },
  { value: 'crm', label: 'CRM' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export const LICENSE_TYPES: { value: LicenseType; label: string }[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'consumption', label: 'Consumption-based' },
  { value: 'perpetual', label: 'Perpetual' },
];
