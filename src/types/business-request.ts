import { z } from 'zod';

/**
 * =============================================================================
 * PROCESS STEPS - DYNAMIC FROM DATABASE
 * =============================================================================
 * 
 * IMPORTANT: Process steps are now managed dynamically from the 
 * demand_process_steps table. DO NOT use the legacy PROCESS_STEPS constant below.
 * 
 * USE INSTEAD:
 * - useProcessSteps() hook from '@/contexts/ProcessStepsContext'
 * - useProcessStepOptions() for dropdown options
 * - useProcessStepInfo() for label lookup
 * 
 * When process steps are renamed/added/deleted in admin, all consumers update automatically.
 * =============================================================================
 */

// =============================================================================
// LEGACY EXPORTS - DEPRECATED (kept for backwards compatibility during migration)
// These will be REMOVED in future. Use useProcessSteps() context hook instead.
// =============================================================================

/** @deprecated Use useProcessSteps() from '@/contexts/ProcessStepsContext' instead */
export const PROCESS_STEP_CONFIG: Record<string, { label: string }> = {
  'new_request': { label: 'New request' },
  'new_demand': { label: 'New demand' },
  'in_review': { label: 'In review' },
  'analyse': { label: 'Analyse' },
  'approved': { label: 'Approved' },
  'ready_to_implement': { label: 'Ready to implement' },
  'implement': { label: 'Implement' },
  'closed': { label: 'Closed' },
  'rejected': { label: 'Rejected' },
  'on_hold': { label: 'On-hold' },
};

/** @deprecated Use useProcessStepInfo() from '@/contexts/ProcessStepsContext' instead */
export const getProcessStepInfo = (value: string | null | undefined) => {
  if (!value) return { label: 'Unknown' };
  const normalized = value.toLowerCase();
  return PROCESS_STEP_CONFIG[normalized] || { 
    label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
  };
};

/** @deprecated Use useProcessStepOptions() from '@/contexts/ProcessStepsContext' instead */
export const PROCESS_STEPS = Object.entries(PROCESS_STEP_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

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

// REMOVED: DEPARTMENT_OPTIONS - departments must come ONLY from admin-configured data
// Use useDepartments() hook from @/hooks/useDepartmentsAndOwners to get department options
// See ZERO-SEED / ZERO-HALLUCINATION policy

export const DELIVERY_TRACK_OPTIONS = ['Digital', 'Core Banking', 'Payments', 'Analytics'];
export const INTEGRATION_SYSTEMS_OPTIONS = ['SAP', 'Salesforce', 'Oracle', 'Microsoft Dynamics', 'Custom API', 'Core Banking', 'Payment Gateway'];
export const PORTFOLIO_DECISION_OPTIONS = ['Pending', 'Approve', 'Reject', 'Defer', 'Need More Info'];
export const APPROVAL_DECISION_OPTIONS = ['Approved', 'Rejected', 'Deferred', 'Conditionally Approved'];
export const ENVIRONMENT_DEPENDENCY_OPTIONS = ['Development', 'QA', 'UAT', 'Pre-Production', 'Production'];
export const RESOLUTION_CATEGORY_OPTIONS = ['Completed Successfully', 'Partially Completed', 'Cancelled', 'Rolled Back'];
export const IMPLEMENTATION_OUTCOME_OPTIONS = ['Live in Production', 'Pending Go-Live', 'Failed', 'Decommissioned'];

// =============================================================================
// NOTION FEATURES UNIFICATION (2026-04-27) — added by migration
// 20260427120000_business_request_feature_unification.sql
// =============================================================================

/**
 * Strategic themes — sourced from Notion ⭐ Features (18 values, mostly Arabic).
 * Stored on `business_requests.theme` as freeform TEXT.
 * Atlaskit Select uses { value, label } where label renders Arabic for RTL fields.
 */
export const THEME_OPTIONS: { value: string; label: string; labelEn?: string }[] = [
  { value: 'digitization_new_procedure',     label: 'رقمنة إجراء جديد',          labelEn: 'Digitize new procedure' },
  { value: 'improve_existing_procedure',     label: 'تحسين إجراء قائم',          labelEn: 'Improve existing procedure' },
  { value: 'digital_maturity_2026',          label: 'Digital Maturity 2026' },
  { value: 'industrial_market',              label: 'السوق الصناعي',             labelEn: 'Industrial market' },
  { value: 'enable_services',                label: 'اتاحة خدمات',               labelEn: 'Enable services' },
  { value: 'embed_sector_service',           label: 'تضمين خدمة قطاعية',        labelEn: 'Embed sector service' },
  { value: 'services_for_sbc',               label: 'Provide Services for SBC' },
  { value: 'internal_employee_services',     label: 'خدمات الموظف الداخلية',     labelEn: 'Internal employee services' },
  { value: 'reports_and_indicators',         label: 'تقارير ومؤشرات',            labelEn: 'Reports & indicators' },
  { value: 'website_efficiency',             label: 'كفاءة الموقع',              labelEn: 'Website efficiency' },
  { value: 'improve_partner_service',        label: 'تحسين خدمة الشركاء',       labelEn: 'Improve partner service' },
  { value: 'verification_inquiry',           label: 'استعلام تحققي',             labelEn: 'Verification inquiry' },
  { value: 'ux',                             label: 'UX' },
  { value: 'industrial_survey',              label: 'المسح الصناعي',            labelEn: 'Industrial survey' },
  { value: 'marketplace',                    label: 'Marketplace' },
  { value: 'internal_tasks',                 label: 'مهام داخلية',               labelEn: 'Internal tasks' },
  { value: 'data_quality',                   label: 'جودة بيانات',               labelEn: 'Data quality' },
  { value: 'operational_issues',             label: 'مشاكل تشغيلية',             labelEn: 'Operational issues' },
];

/**
 * Stakeholders — Saudi MoIM ministry agencies and partner entities.
 * Stored on `business_requests.stakeholders` as JSONB array of value strings.
 * Starter list — additional values populated from Notion data import. The
 * Atlaskit picker is creatable so freeform append is supported.
 */
export const STAKEHOLDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'moim',                  label: 'وزارة الصناعة والثروة المعدنية' },
  { value: 'modon',                 label: 'مدن — هيئة المدن الصناعية' },
  { value: 'monshaat',              label: 'منشآت — هيئة المنشآت الصغيرة والمتوسطة' },
  { value: 'sidf',                  label: 'صندوق التنمية الصناعية السعودي' },
  { value: 'industrial_development',label: 'هيئة تنمية الصادرات السعودية' },
  { value: 'export_authority',      label: 'الهيئة العامة للصادرات' },
  { value: 'gosi',                  label: 'المؤسسة العامة للتأمينات الاجتماعية' },
  { value: 'hrdf',                  label: 'صندوق تنمية الموارد البشرية' },
  { value: 'investment_ministry',   label: 'وزارة الاستثمار' },
  { value: 'commerce_ministry',     label: 'وزارة التجارة' },
  { value: 'misa',                  label: 'هيئة الاستثمار' },
  { value: 'sfda',                  label: 'الهيئة العامة للغذاء والدواء' },
  { value: 'saso',                  label: 'الهيئة السعودية للمواصفات والمقاييس' },
  { value: 'kacst',                 label: 'مدينة الملك عبدالعزيز للعلوم والتقنية' },
  { value: 'sabic',                 label: 'سابك' },
  { value: 'aramco',                label: 'أرامكو السعودية' },
  { value: 'maaden',                label: 'معادن' },
  { value: 'rcrc',                  label: 'الهيئة الملكية للجبيل وينبع' },
  { value: 'najm',                  label: 'نجم لخدمات التأمين' },
  { value: 'monsha_at',             label: 'منصة الابتكار' },
  { value: 'tahomma',               label: 'طموحنا' },
  { value: 'compass',               label: 'البوصلة' },
  { value: 'investor_journey',      label: 'رحلة المستثمر' },
  { value: 'rhq_services',          label: 'خدمات المقر الإقليمي' },
  { value: 'mini_apps',             label: 'التطبيقات المصغرة' },
  { value: 'ministry_website',      label: 'موقع الوزارة' },
  { value: 'industrial_partners',   label: 'الشركاء الصناعيون' },
  { value: 'investors',             label: 'المستثمرون' },
  { value: 'sbc',                   label: 'Saudi Business Center' },
  { value: 'private_sector',        label: 'القطاع الخاص' },
  { value: 'government',            label: 'الجهات الحكومية' },
];

/**
 * Notion request type values — mirrors the 4 new initiative_types rows
 * seeded by the same migration. Use this when filtering/displaying
 * BR records by their initiative_type.key.
 */
export const REQUEST_TYPE_OPTIONS = [
  { value: 'feature',      label: 'Feature' },
  { value: 'gap',          label: 'Gap' },
  { value: 'integration',  label: 'Integration' },
  { value: 'data_request', label: 'Data Request' },
] as const;

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
  
  // Resolved names (populated from profiles table)
  requestor_name?: string;
  assignee_name?: string;
  
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
  planned_quarter: string[] | null;
  
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
  
  // Notion Features unification (2026-04-27)
  // Migration: 20260427120000_business_request_feature_unification.sql
  arabic_title: string | null;
  theme: string | null;
  stakeholders: string[];        // JSONB array — DB default '[]' (NOT NULL)
  targeted_feature: boolean;     // DB default false (NOT NULL)
  po_user_id: string | null;     // FK auth.users — DM remains on project_manager_user_id
  import_source: string | null;  // 'notion' for imported rows; null for native
  import_ref: string | null;     // Notion page URL — conflict key for upsert idempotency

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