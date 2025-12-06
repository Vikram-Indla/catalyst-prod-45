import { z } from 'zod';

// Process Step Options - Main workflow flow + orphan statuses
export const PROCESS_STEPS = [
  // Main flow (in order)
  { value: 'new_request', label: 'New Request', color: 'bg-[#4a4a4a]' },
  { value: 'analyse', label: 'Analyse', color: 'bg-[#c4c4c4]' },
  { value: 'approved', label: 'Approved', color: 'bg-[#5c4b8a]' },
  { value: 'implement', label: 'Implement', color: 'bg-[#1a1a1a]' },
  { value: 'closed', label: 'Closed', color: 'bg-[#6abf4b]' },
  // Orphan statuses (not in main flow)
  { value: 'rejected', label: 'Rejected', color: 'bg-[#dc2626]' },
  { value: 'on_hold', label: 'On-Hold', color: 'bg-[#c9a0a0]' },
] as const;

// Health Options
export const HEALTH_OPTIONS = [
  { value: 'green', label: 'Green', color: 'bg-green-100 text-green-700' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-100 text-amber-700' },
  { value: 'red', label: 'Red', color: 'bg-red-100 text-red-600' },
] as const;

// Select Options
export const PLATFORM_OPTIONS = ['Web', 'Mobile', 'API', 'Integration', 'Infrastructure'];
export const COMPLEXITY_OPTIONS = ['Low', 'Medium', 'High', 'Very High'];
export const URGENCY_OPTIONS = ['Low', 'Normal', 'High', 'Critical'];
export const TRACK_OPTIONS = ['Digital', 'Core Banking', 'Payments', 'Analytics', 'Infrastructure'];
export const RISK_RATING_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

// Single source of truth for Delivery Platform options (used in both internal and external forms)
export const DELIVERY_PLATFORM_OPTIONS = [
  { value: 'Senaei Platform', label: { en: 'Senaei Platform', ar: 'منصة صناعي' } },
  { value: 'Innovation Platform', label: { en: 'Innovation Platform', ar: 'منصة الابتكار' } },
  { value: 'Tahommena', label: { en: 'Tahommena', ar: 'طموحنا' } },
  { value: 'Compass', label: { en: 'Compass', ar: 'البوصلة' } },
  { value: 'Mini Apps', label: { en: 'Mini Apps', ar: 'التطبيقات المصغرة' } },
  { value: 'Website', label: { en: 'Website', ar: 'الموقع الإلكتروني' } },
  { value: 'Investor Journey', label: { en: 'Investor Journey', ar: 'رحلة المستثمر' } },
  { value: 'Catalyst', label: { en: 'Catalyst', ar: 'كاتاليست' } },
  { value: 'RHQ Services', label: { en: 'RHQ Services', ar: 'خدمات المقر الإقليمي' } },
  { value: 'Other', label: { en: 'Other', ar: 'أخرى' } },
] as const;

// Single source of truth for Department options (used in both internal and external forms)
export const DEPARTMENT_OPTIONS = [
  { value: 'it', label: { en: 'Information Technology', ar: 'تقنية المعلومات' } },
  { value: 'operations', label: { en: 'Operations', ar: 'العمليات' } },
  { value: 'finance', label: { en: 'Finance', ar: 'المالية' } },
  { value: 'hr', label: { en: 'Human Resources', ar: 'الموارد البشرية' } },
  { value: 'marketing', label: { en: 'Marketing', ar: 'التسويق' } },
  { value: 'sales', label: { en: 'Sales', ar: 'المبيعات' } },
  { value: 'legal', label: { en: 'Legal', ar: 'الشؤون القانونية' } },
  { value: 'strategy', label: { en: 'Strategy', ar: 'الاستراتيجية' } },
  { value: 'business', label: { en: 'Business', ar: 'الأعمال' } },
  { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
] as const;

export const DELIVERY_TRACK_OPTIONS = ['Digital', 'Core Banking', 'Payments', 'Analytics'];
export const INTEGRATION_SYSTEMS_OPTIONS = ['SAP', 'Salesforce', 'Oracle', 'Microsoft Dynamics', 'Custom API', 'Core Banking', 'Payment Gateway'];
export const PORTFOLIO_DECISION_OPTIONS = ['Pending', 'Approve', 'Reject', 'Defer', 'Need More Info'];
export const APPROVAL_DECISION_OPTIONS = ['Approved', 'Rejected', 'Deferred', 'Conditionally Approved'];
export const ENVIRONMENT_DEPENDENCY_OPTIONS = ['Development', 'QA', 'UAT', 'Pre-Production', 'Production'];
export const RESOLUTION_CATEGORY_OPTIONS = ['Completed Successfully', 'Partially Completed', 'Cancelled', 'Rolled Back'];
export const IMPLEMENTATION_OUTCOME_OPTIONS = ['Live in Production', 'Pending Go-Live', 'Failed', 'Decommissioned'];

// Readiness Checklist Interface
export interface ReadinessChecklist {
  requirements_documented: boolean;
  technical_design_approved: boolean;
  resources_allocated: boolean;
  environment_ready: boolean;
  test_cases_prepared: boolean;
}

// Business Request Interface
export interface BusinessRequest {
  id: string;
  request_key: string;
  
  // Overview
  title: string;
  description: string | null;
  platform: string | null;
  complexity: string | null;
  urgency: string | null;
  track: string | null;
  requestor: string | null;
  business_justification: string | null;
  start_date: string | null;
  end_date: string | null;
  
  // Assignment
  department: string | null;
  business_owner: string | null;
  assignee: string | null;
  
  // Process & Health
  process_step: string;
  health: string;
  
  // Portfolio
  dependencies: string | null;
  risk_rating: string | null;
  portfolio_comments: string | null;
  delivery_platform: string | null;
  delivery_track: string | null;
  
  // Technical
  proposed_solution: string | null;
  estimated_effort: string | null;
  estimated_cost: number | null;
  integration_required: boolean;
  integration_systems: string[] | null;
  technical_validator: string | null;
  
  // Estimation
  estimation_notes: string | null;
  estimation_dependencies: string | null;
  estimation_risk_rating: string | null;
  estimated_cost_sar: number | null;
  approval_inputs: string | null;
  portfolio_decision: string | null;
  
  // Approval
  approver_name: string | null;
  approval_date: string | null;
  approval_decision: string | null;
  approved_budget_ceiling: number | null;
  approval_remarks: string | null;
  
  // Readiness
  functional_spec_link: string | null;
  acceptance_criteria: string | null;
  jira_epic_link: string | null;
  environment_dependency: string | null;
  readiness_checklist: ReadinessChecklist;
  
  // Implementation
  implementation_owner: string | null;
  impl_start_date: string | null;
  impl_target_end_date: string | null;
  key_risks_remarks: string | null;
  outcome_summary: string | null;
  qa_remarks: string | null;
  
  // Support
  support_owner: string | null;
  support_remarks: string | null;
  resolution_category: string | null;
  implementation_outcome: string | null;
  
  // On Hold
  on_hold_reason: string | null;
  expected_resume_date: string | null;
  on_hold_comment: string | null;
  
  // Ranking & Scoring
  rank: number | null;
  rank_override_justification: string | null;
  is_force_ranked: boolean;
  executive_urgency: number | null;
  business_value: number | null;
  complexity_score: number | null;
  business_score: number | null;
  
  // Planning
  planned_quarter: string | null;
  
  // Budget - Funding & Budget
  funding_status: string | null;
  budget_year: string | null;
  budget_type: string[] | null;
  approved_budget_sar: number | null;
  current_year_budget_sar: number | null;
  budget_owner_name: string | null;
  project_manager_user_id: string | null;
  planned_external_spend_sar: number | null;
  internal_effort_cost_sar: number | null;
  
  // Budget - Contract & Commercials
  contract_type: string | null;
  primary_vendor_name: string | null;
  po_numbers: string[] | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  delivery_model: string | null;
  
  // Budget - Funding & Capacity Notes
  capacity_status: string | null;
  internal_effort_pct: number | null;
  vendor_effort_pct: number | null;
  funding_assumptions: string | null;
  capacity_risks: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Create Form Schema
export const createBusinessRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().max(1000).optional(),
  platform: z.string().min(1, 'Platform is required'),
  complexity: z.string().min(1, 'Complexity is required'),
  urgency: z.string().min(1, 'Urgency is required'),
  track: z.string().optional(),
  requestor: z.string().optional(),
  business_justification: z.string().max(2000).optional(),
});

export type CreateBusinessRequestFormData = z.infer<typeof createBusinessRequestSchema>;