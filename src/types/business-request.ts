import { z } from 'zod';

/**
 * Business Request — canonical type
 *
 * 2026-06-01: schema slimmed from 108 → 22 columns. Drop migration:
 *   supabase/migrations/20260601200000_drop_legacy_business_request_columns.sql
 *
 * Surface alignment:
 *   • CatalystViewBusinessRequest.v3 (view) + CreateBusinessRequestModal (create)
 *   • Every kept field maps 1:1 to a visible field in those two surfaces.
 *
 * Process steps are managed dynamically from `demand_process_steps`.
 * Use `useProcessSteps()` from '@/contexts/ProcessStepsContext' for labels.
 */

// ─── Option vocabularies (kept fields only) ─────────────────────────────────

/** Priority — maps to `business_requests.urgency`. */
export const URGENCY_OPTIONS = ['Low', 'Normal', 'High', 'Critical'] as const;

/** Category — 4 buckets used in Create + product backlog inline-edit. */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Industrial',          label: 'Industrial' },
  { value: 'Ministry Website',    label: 'Ministry Website' },
  { value: 'Internal Services',   label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

/** Planned-release quarters — product backlog inline-edit multi-select. */
export const PLANNED_QUARTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Q1 2026', label: 'Q1 2026' }, { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' }, { value: 'Q4 2026', label: 'Q4 2026' },
  { value: 'Q1 2027', label: 'Q1 2027' }, { value: 'Q2 2027', label: 'Q2 2027' },
];

/**
 * Strategic themes — Notion ⭐ Features (18 values, mostly Arabic).
 * Stored on `business_requests.theme` as freeform TEXT.
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

/** Stakeholders — Saudi MoIM agencies + partner entities (creatable). */
export const STAKEHOLDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'moim',                  label: 'Ministry of Industry & Mineral Resources' },
  { value: 'modon',                 label: 'MODON — Saudi Industrial Property Authority' },
  { value: 'monshaat',              label: 'Monsha\'at — SME General Authority' },
  { value: 'sidf',                  label: 'Saudi Industrial Development Fund (SIDF)' },
  { value: 'industrial_development',label: 'Saudi Exports Development Authority' },
  { value: 'export_authority',      label: 'General Authority for Exports' },
  { value: 'gosi',                  label: 'General Organization for Social Insurance (GOSI)' },
  { value: 'hrdf',                  label: 'Human Resources Development Fund (HRDF)' },
  { value: 'investment_ministry',   label: 'Ministry of Investment' },
  { value: 'commerce_ministry',     label: 'Ministry of Commerce' },
  { value: 'misa',                  label: 'Ministry of Investment (MISA)' },
  { value: 'sfda',                  label: 'Saudi Food & Drug Authority (SFDA)' },
  { value: 'saso',                  label: 'Saudi Standards, Metrology & Quality Org (SASO)' },
  { value: 'kacst',                 label: 'King Abdulaziz City for Science & Technology (KACST)' },
  { value: 'sabic',                 label: 'SABIC' },
  { value: 'aramco',                label: 'Saudi Aramco' },
  { value: 'maaden',                label: 'Ma\'aden' },
  { value: 'rcrc',                  label: 'Royal Commission for Jubail & Yanbu' },
  { value: 'najm',                  label: 'Najm for Insurance Services' },
  { value: 'monsha_at',             label: 'Innovation Platform' },
  { value: 'tahomma',               label: 'Tahomma' },
  { value: 'compass',               label: 'Compass' },
  { value: 'investor_journey',      label: 'Investor Journey' },
  { value: 'rhq_services',          label: 'Regional HQ Services' },
  { value: 'mini_apps',             label: 'Mini Apps' },
  { value: 'ministry_website',      label: 'Ministry Website' },
  { value: 'industrial_partners',   label: 'Industrial Partners' },
  { value: 'investors',             label: 'Investors' },
  { value: 'sbc',                   label: 'Saudi Business Center' },
  { value: 'private_sector',        label: 'Private Sector' },
  { value: 'government',            label: 'Government Entities' },
];

/** Request type — 4 buckets. Mirrors `initiative_types`. */
export const REQUEST_TYPE_OPTIONS = [
  { value: 'feature',      label: 'Feature' },
  { value: 'gap',          label: 'Gap' },
  { value: 'integration',  label: 'Integration' },
  { value: 'data_request', label: 'Data Request' },
] as const;

// ─── Canonical BusinessRequest type — 22 columns ────────────────────────────

export interface BusinessRequest {
  // System
  id: string;
  request_key: string;
  product_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  rank: number | null;

  // Content
  title: string;
  arabic_title: string | null;
  description: string | null;

  // Key details (left rail)
  request_type: string | null;
  category: string | null;
  theme: string | null;
  stakeholders: string[];
  targeted_feature: boolean;

  // Details (right rail)
  process_step: string;                  // Status pill
  urgency: string | null;                // Priority
  project_manager_user_id: string | null; // Delivery Manager
  po_user_id: string | null;             // Product Owner
  planned_quarter: string[] | null;      // Planned release
  end_date: string | null;               // Target date
}

// ─── Create form schema (matches CreateBusinessRequestModal) ────────────────

export const createBusinessRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  arabic_title: z.string().optional(),
  description: z.string().max(2000).optional(),
  request_type: z.string().optional(),
  category: z.string().optional(),
  theme: z.string().optional(),
  stakeholders: z.array(z.string()).default([]),
  targeted_feature: z.boolean().default(false),
  urgency: z.enum(URGENCY_OPTIONS).optional(),
  project_manager_user_id: z.string().uuid().nullable().optional(),
  po_user_id: z.string().uuid().nullable().optional(),
  planned_quarter: z.array(z.string()).nullable().optional(),
  end_date: z.string().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
});

export type CreateBusinessRequestFormData = z.infer<typeof createBusinessRequestSchema>;
