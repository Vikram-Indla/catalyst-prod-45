import { z } from 'zod';

// Process Step Options - matches workflow diagram
export const PROCESS_STEPS = [
  { value: 'new_demand', label: 'NEW DEMAND', color: 'bg-blue-500 text-white' },
  { value: 'portfolio_review', label: 'PORTFOLIO REVIEW', color: 'bg-purple-500 text-white' },
  { value: 'technical_validation', label: 'TECHNICAL VALIDATION', color: 'bg-indigo-500 text-white' },
  { value: 'estimation', label: 'ESTIMATION', color: 'bg-orange-500 text-white' },
  { value: 'demand_approved', label: 'DEMAND APPROVED', color: 'bg-green-500 text-white' },
  { value: 'ready_for_dev', label: 'READY FOR DEV', color: 'bg-teal-500 text-white' },
  { value: 'under_implementation', label: 'UNDER IMPLEMENTATION', color: 'bg-cyan-500 text-white' },
  { value: 'implementation_review', label: 'IMPLEMENTATION REVIEW', color: 'bg-amber-500 text-white' },
  { value: 'in_support_done', label: 'IN SUPPORT / DONE', color: 'bg-emerald-600 text-white' },
  { value: 'on_hold_cancel', label: 'ON HOLD / CANCEL', color: 'bg-red-500 text-white' },
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
export const DELIVERY_PLATFORM_OPTIONS = ['On-Premise', 'Cloud', 'Hybrid'];
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
  
  // Ranking
  rank: number | null;
  rank_override_justification: string | null;
  
  // Planning
  planned_quarter: string | null;
  
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
