# BUSINESS REQUEST (DEMAND) — COMPLETE SPECIFICATION
## For Claude Rebuild · All Tabs, Fields, Scoring Logic, Dependencies

---

## TABLE OF CONTENTS

1. [Overview & Architecture](#1-overview--architecture)
2. [Database Schema (business_requests)](#2-database-schema)
3. [Tab 1: Demand Details](#3-tab-1-demand-details)
4. [Tab 2: Business Score](#4-tab-2-business-score)
5. [Tab 3: EA Review](#5-tab-3-ea-review)
6. [Tab 4: Budget](#6-tab-4-budget)
7. [Tab 5: Risks](#7-tab-5-risks)
8. [Tab 6: Milestones](#8-tab-6-milestones)
9. [Tab 7: Links](#9-tab-7-links)
10. [Tab 8: Audit History](#10-tab-8-audit-history)
11. [Scoring Engine — Complete Logic](#11-scoring-engine)
12. [Create Business Request Modal](#12-create-modal)
13. [File Manifest](#13-file-manifest)
14. [Dependencies & Hooks](#14-dependencies--hooks)

---

## 1. OVERVIEW & ARCHITECTURE

### What It Is
A **Business Request** (also called "Demand") is the core work-intake entity in the Product Backlog module. It represents a business need submitted for review, scoring, prioritization, budget allocation, and implementation tracking.

### Key Behaviors
- **Auto-save**: Fields auto-save with 800ms debounce on change
- **Audit trail**: Every field change is logged to `business_request_audit_logs`
- **Scoring-driven priority**: Priority tier is computed from 4 weighted criteria, NOT manually set
- **Role-based tabs**: Visible tabs can vary based on user role (admin, program_manager, etc.)
- **Drawer UI**: Opens as a right-side Sheet (drawer) with tab navigation

### Component Hierarchy
```
BusinessRequestDrawer.tsx (orchestrator)
├── Header: Title (editable inline), Status badge, Metadata chips, Actions menu
├── Tabs:
│   ├── DemandDetailsViewTab.tsx      — Core fields
│   ├── BusinessScoreViewTab.tsx       — Scoring engine + rank override
│   ├── EAReviewTab.tsx               — Enterprise Architecture governance
│   ├── BudgetViewTab.tsx             — Financial planning
│   ├── RisksViewTab.tsx              — Risk management (shared component)
│   ├── MilestonesViewTab.tsx         — Milestone tracking (shared component)
│   ├── LinksViewTab.tsx              — Links, attachments, work items
│   └── AuditHistoryTab.tsx           — Change history
└── Footer: Workflow actions (status transitions)
```

---

## 2. DATABASE SCHEMA

### Primary Table: `business_requests`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| request_key | TEXT | YES | Auto-generated (MIM-001) | Human-readable ID |
| title | TEXT | NO | — | Request title/summary |
| description | TEXT | YES | — | Detailed description |
| process_step | TEXT | NO | 'new_demand' | Current workflow status |
| health | TEXT | NO | 'green' | Health indicator (green/amber/red) |
| department | TEXT | YES | — | Department name (legacy text) |
| department_id | TEXT | YES | — | Department UUID |
| business_owner | TEXT | YES | — | Owner name (legacy text) |
| business_owner_id | TEXT | YES | — | Owner UUID |
| requestor | TEXT | YES | — | Reporter/requestor name |
| assignee | TEXT | YES | — | Assignee name |
| delivery_platform | TEXT | YES | — | Platform for delivery |
| delivery_track | TEXT | YES | — | Delivery track |
| planned_quarter | TEXT[] | YES | — | Target quarters (array) |
| start_date | TEXT | YES | — | Business ask date |
| end_date | TEXT | YES | — | Target completion date |
| end_date_locked | BOOL | YES | false | Lock target date |
| impl_start_date | TEXT | YES | — | Kickoff date |
| impl_target_end_date | TEXT | YES | — | Implementation target end |
| ea_review_required | BOOL | YES | true | Whether EA review is needed |
| urgency | TEXT | YES | — | Legacy urgency field |
| complexity | TEXT | YES | — | Legacy complexity field |
| risk_rating | TEXT | YES | — | Risk rating |
| estimated_effort | TEXT | YES | — | Effort estimate |
| estimated_cost | NUMERIC | YES | — | Cost estimate |
| estimated_cost_sar | NUMERIC | YES | — | Cost in SAR |
| **SCORING FIELDS** | | | | |
| executive_urgency | NUMERIC | YES | — | Legacy scoring (deprecated) |
| business_value | NUMERIC | YES | — | **Repurposed as score_business_impact (1-5)** |
| complexity_score | NUMERIC | YES | — | Legacy scoring (deprecated) |
| business_score | NUMERIC | YES | — | **Calculated priority score × 100** (stored as 0-500) |
| priority_tier | TEXT | YES | — | Computed tier: high/medium/low/rejected/unscored |
| rank | NUMERIC | YES | — | Manual rank override (1-12) |
| is_force_ranked | BOOL | NO | false | Whether rank is manually overridden |
| rank_override_justification | TEXT | YES | — | Required when force-ranked |
| **BUDGET FIELDS** | | | | |
| funding_status | TEXT | YES | — | Funding status |
| budget_year | TEXT | YES | — | Fiscal year |
| budget_type | TEXT[] | YES | — | CAPEX/OPEX (array) |
| approved_budget_sar | NUMERIC | YES | — | Approved budget in SAR |
| current_year_budget_sar | NUMERIC | YES | — | Current year allocation |
| budget_owner_name | TEXT | YES | — | Budget owner name |
| project_manager_user_id | UUID | YES | — | PM user ID |
| planned_external_spend_sar | NUMERIC | YES | — | External spend |
| internal_effort_cost_sar | NUMERIC | YES | — | Internal effort cost |
| contract_type | TEXT | YES | — | In-source/Co-source/Outsource |
| primary_vendor_name | TEXT | YES | — | Vendor name |
| po_numbers | TEXT[] | YES | — | PO numbers (array) |
| contract_start_date | TEXT | YES | — | Contract start |
| contract_end_date | TEXT | YES | — | Contract end |
| delivery_model | TEXT | YES | — | Delivery model |
| capacity_status | TEXT | YES | — | Capacity status |
| internal_effort_pct | NUMERIC | YES | — | Internal effort % |
| vendor_effort_pct | NUMERIC | YES | — | Vendor effort % |
| funding_assumptions | TEXT | YES | — | Funding notes |
| capacity_risks | TEXT | YES | — | Capacity risk notes |
| **OTHER FIELDS** | | | | |
| progress | NUMERIC | NO | 0 | Progress 0-100 |
| product_id | UUID | YES | — | Linked product |
| created_by | UUID | YES | — | Creator user ID |
| created_at | TIMESTAMPTZ | NO | now() | Created timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Updated timestamp |
| deleted_at | TIMESTAMPTZ | YES | — | Soft delete |

### Additional Scoring Columns (not in types.ts but used in code)
These are stored via direct Supabase queries:
- `score_strategic_alignment` (INTEGER 1-5)
- `score_time_urgency` (INTEGER 1-5)
- `score_resource_feasibility` (INTEGER 1-5)
- `force_ranked_by` (UUID)
- `force_ranked_at` (TIMESTAMPTZ)

### Related Tables
- `business_request_audit_logs` — Field change audit trail
- `business_request_links` — Links to epics, features, stories, documents, external URLs
- `prioritization_config` — Scoring weights and tier thresholds (admin-configurable)
- `business_owners` — Business owner lookup
- `capacity_departments` — Department lookup
- `milestones` — Linked milestones
- `profiles` — User profiles for assignee/reporter resolution

---

## 3. TAB 1: DEMAND DETAILS

### Fields (in order)

| # | Field | Type | Required | DB Column | Options/Values |
|---|-------|------|----------|-----------|---------------|
| 1 | Status | Select | YES | process_step | Dynamic from `demand_process_steps` table. Defaults: new_request, new_demand, in_review, ea_review, analyse, approved, ready_to_implement, implement, closed, rejected, on_hold |
| 2 | EA Review Required? | Toggle | NO | ea_review_required | true/false (default: true) |
| 3 | Priority | Read-only | — | priority_tier | Auto-calculated. Shows: High (red dot), Medium (amber dot), Low (green dot), Unscored (gray dot). Clicking shows toast "Priority is auto-calculated from the Scoring tab" |
| 4 | Reporter | Read-only | NO | requestor | Shows user avatar + name. Populated from profiles |
| 5 | Assignee | Select (UserPicker) | NO | assignee | Dropdown of approved profiles |
| 6 | Department | Select | NO | department_id → department | Dynamic from admin-configured departments (`useDepartments()` hook) |
| 7 | Business Owner | Read-only | NO | business_owner_id → business_owner | Auto-set when department changes (via department-owner mappings) |
| 8 | Business Ask Date | DatePicker | NO | start_date | Format: dd MMM yyyy |
| 9 | Kickoff Date | DatePicker | NO | impl_start_date | Format: dd MMM yyyy |
| 10 | Target Complete | DatePicker | NO | end_date | Format: dd MMM yyyy. Can be locked (end_date_locked) |
| 11 | Summary | Text Input | YES | title | Min 5 chars |
| 12 | Description | Textarea | NO | description | Max 2000 words |

### Dependencies
- **Department → Business Owner**: When department changes, business_owner is auto-set via `useDepartmentOwnerMappings()`. The mapping table links department IDs to owner IDs.
- **Process Steps**: Loaded dynamically from `demand_process_steps` table via `useActiveDemandProcessSteps()` hook. Admins can add/rename/reorder steps.

### Status Color Mapping
```
new_request:        var(--process-new-demand)     — Gray
new_demand:         var(--process-new-demand)     — Gray
in_review:          var(--process-in-review)      — Blue
ea_review:          var(--process-ea-review)      — Blue
analyse:            var(--process-analyse)        — Blue
approved:           var(--process-approved)       — Teal
ready_to_implement: var(--process-ready-to-implement) — Teal
implement:          var(--process-implement)      — Green
closed:             var(--process-closed)         — Gray
rejected:           var(--process-rejected)       — Red
on_hold:            var(--process-on-hold)        — Amber
```

---

## 4. TAB 2: BUSINESS SCORE

### Layout: Two-column card layout

#### Left Card: "Scoring Criteria (1–5 Scale)"

| # | Criterion | DB Field | Weight (default) | Helper Text |
|---|-----------|----------|------------------|-------------|
| 1 | Strategic Alignment | score_strategic_alignment | 30% | "How well does this align with organizational strategy?" |
| 2 | Business Impact | business_value (repurposed) | 30% | "Expected impact on business outcomes" |
| 3 | Time & Urgency | score_time_urgency | 20% | "Time sensitivity and deadline requirements" |
| 4 | Resource & Feasibility | score_resource_feasibility | 20% | "Resource availability and technical feasibility" |

**Each criterion**: Select dropdown with options: — (unset), 1, 2, 3, 4, 5.
Each value shows a colored badge: 1=Red, 2=Orange, 3=Gray, 4=Blue, 5=Green.

**Save Score button**: Only enabled when ALL 4 criteria are filled. Saves to DB and computes business_score + priority_tier.

#### Right Card: "Business Score"

Shows:
- **Big number**: business_score / 100, displayed as X.XX out of 5.00
- **Priority tier badge**: HIGH (green), MEDIUM (blue), LOW (orange), REJECTED (red, hidden from pills), UNSCORED (gray)
- **Rank position**: "Rank #X of Y" — position among all scored items, sorted by business_score descending

**Collapsible sections**:
1. **Score Summary**: Score value, tier, "Calculated from 4 weighted criteria"
2. **Why this priority?**: Auto-generated deterministic bullets explaining top drivers, blockers, and tier classification
3. **Override Rank** (admin/program_manager only): Manual rank 1-12 with required justification

### Rescoring
- If already scored, shows amber banner: "This request has been previously scored. You can rescore it."
- If on_hold, shows: "This request is currently On Hold. If circumstances changed, you can rescore it."
- Entering rescoring mode allows modifying scores → Save → exits rescoring mode
- Cancel reverts to saved scores

### Auto-Hold on Rejected
When priority_tier computes to 'rejected' (score < 2.0), process_step is automatically set to 'on_hold'.

---

## 5. TAB 3: EA REVIEW

### Section 1: EA Decision

| # | Field | Type | Required | DB Field | Options |
|---|-------|------|----------|----------|---------|
| 1 | EA Status | Select | YES* | ea_status | Not Reviewed (Clock icon), In Review (Clock), Approved (CheckCircle), Approved with Notes (AlertCircle), Rejected (XCircle) |
| 2 | EA Reviewer | UserPicker | YES* | ea_reviewer | All approved profiles |
| 3 | Review Date | DatePicker | YES* | ea_review_date | Format: yyyy-MM-dd |
| 4 | EA Summary | Textarea | YES* | ea_summary | Placeholder: "Enter EA review summary..." |
| 5 | Constraints/Conditions | Textarea | Conditional* | ea_constraints | **Only shows when EA Status = 'approved_with_notes' or 'rejected'** |

### Section 2: Architectural Alignment

| # | Field | Type | Required | DB Field | Options |
|---|-------|------|----------|----------|---------|
| 1 | Arch Alignment | Select | NO | ea_arch_alignment | Aligned, Partially Aligned, Not Aligned |
| 2 | Primary Impact Area | Select | NO | ea_primary_impact_area | Application, Integration, Data, Security, Infrastructure, Mixed |
| 3 | Business Capability Impact | Textarea | NO | ea_business_capability_impact | Freeform |

### Section 3: Risk & Complexity

| # | Field | Type | Required | DB Field | Options |
|---|-------|------|----------|----------|---------|
| 1 | EA Complexity | Select | NO | ea_complexity | Low, Medium, High |
| 2 | EA Risk Level | Select | NO | ea_risk_level | Low, Medium, High |
| 3 | Risk Notes | Textarea | Conditional | ea_risk_notes | **Only shows when EA Risk Level = 'high'** |

### Conditional Logic
- **Constraints field**: Appears only when `ea_status` is `approved_with_notes` or `rejected`
- **Risk Notes field**: Appears only when `ea_risk_level` is `high`

---

## 6. TAB 4: BUDGET

### Summary Cards (read-only, computed)
1. **Funding Status Card**: Shows funding_status + budget_type
2. **Approved Budget Card**: Shows approved_budget_sar formatted as "SAR X,XXX" + budget_year

### Section 1: Funding & Budget

| # | Field | Type | DB Field | Options |
|---|-------|------|----------|---------|
| 1 | Funding Status | Select | funding_status | Not Budgeted, Budget Requested, Budget Approved, Partially Budgeted, Funded from Existing Contract |
| 2 | Budget Year | Select | budget_year | FY 2024, FY 2025, FY 2026, FY 2027 |
| 3 | Budget Type | Toggle (multi) | budget_type | CAPEX, OPEX (can select both) |
| 4 | Approved Budget (SAR) | Currency Input | approved_budget_sar | Formatted with commas, SAR suffix |
| 5 | Current Year Budget (SAR) | Currency Input | current_year_budget_sar | Same format |
| 6 | Budget Owner | UserPicker | budget_owner_user_id | Approved profiles |
| 7 | Project Manager | UserPicker | project_manager_user_id | Approved profiles |
| 8 | Planned External Spend (SAR) | Currency Input | planned_external_spend_sar | |
| 9 | Internal Effort Cost (SAR) | Currency Input | internal_effort_cost_sar | |

### Section 2: Contract & Commercials

| # | Field | Type | DB Field | Options |
|---|-------|------|----------|---------|
| 1 | Contract Type | Select | contract_type | In-source, Co-source, Outsource |
| 2 | Primary Vendor | Text Input | primary_vendor_name | Freeform |
| 3 | PO Number(s) | Tag Input | po_numbers | Enter + press Enter to add, X to remove |
| 4 | Contract Start Date | DatePicker | contract_start_date | |
| 5 | Contract End Date | DatePicker | contract_end_date | |
| 6 | Delivery Model | Select | delivery_model | Vendor Owns Build, Vendor Build Internal Support, Internal Build Vendor Advisory |

### Section 3: Capacity & Funding Notes

| # | Field | Type | DB Field |
|---|-------|------|----------|
| 1 | Capacity Status | Text Input | capacity_status |
| 2 | Internal Effort % | Number Input | internal_effort_pct |
| 3 | Vendor Effort % | Number Input | vendor_effort_pct |
| 4 | Funding Assumptions | Textarea | funding_assumptions |
| 5 | Capacity Risks | Textarea | capacity_risks |

---

## 7. TAB 5: RISKS

Uses shared `EntityRisksTab` component:
```tsx
<EntityRisksTab entityType="business_request" entityId={requestId} />
```
This is a generic risk management component that links risks to any entity type.

---

## 8. TAB 6: MILESTONES

Uses shared `MilestonesTab` component:
```tsx
<MilestonesTab entityId={requestId} entityType="demand" hideCategory={true} />
```
Linked via `milestones.business_request_id`.

---

## 9. TAB 7: LINKS

### Link Types
| Type | Kind | Description |
|------|------|-------------|
| Implementation | `implementation` | Links to Epics, Features, Stories |
| Document | `document` | File uploads (max 5 files, 20MB total) |
| Knowledge Hub | `knowledge-hub` | Links to KB documents |
| External | `external` | External URLs with title |

### Features
- Search/filter by type and status
- Sort: Newest, Oldest, A→Z, Z→A, By Type
- Drag-drop file upload
- Status indicators for implementation links (Not Started, In Progress, Blocked, Done)
- Click implementation links to open inline detail panels (Epic/Feature/Story)

### Storage
- Files uploaded to Supabase storage bucket `attachments`
- Links stored in `business_request_links` table

---

## 10. TAB 8: AUDIT HISTORY

### Data Source
`business_request_audit_logs` table:

| Column | Description |
|--------|-------------|
| business_request_id | FK to business_requests |
| actor_id | User UUID |
| actor_name | Human-readable name |
| action | UPDATE, SCORE_SAVED, RANK_OVERRIDE, STATUS_AUTO_CHANGED |
| field_changed | Human-readable field name |
| old_value | Previous value |
| new_value | New value |
| created_at | Timestamp |

---

## 11. SCORING ENGINE — COMPLETE LOGIC

### Configuration Table: `prioritization_config`

| Field | Default | Description |
|-------|---------|-------------|
| weight_strategic_alignment | 30 | Weight for Strategic Alignment (%) |
| weight_business_impact | 30 | Weight for Business Impact (%) |
| weight_time_urgency | 20 | Weight for Time & Urgency (%) |
| weight_resource_feasibility | 20 | Weight for Resource & Feasibility (%) |
| threshold_rejected_min | 1.0 | Min score for Rejected tier |
| threshold_rejected_max | 2.0 | Max score for Rejected tier |
| threshold_low_min | 2.0 | Min score for Low tier |
| threshold_low_max | 3.0 | Max score for Low tier |
| threshold_medium_min | 3.0 | Min score for Medium tier |
| threshold_medium_max | 4.0 | Max score for Medium tier |
| threshold_high_min | 4.0 | Min score for High tier |
| threshold_high_max | 5.0 | Max score for High tier |

### Calculation Formula

```
Score = (weight_strategic_alignment × strategic_alignment_rating +
         weight_business_impact × business_impact_rating +
         weight_time_urgency × time_urgency_rating +
         weight_resource_feasibility × resource_feasibility_rating) / 100
```

Where each rating is 1–5 (integer), and weights sum to 100.

**Example** (default weights):
- Strategic Alignment: 4 → contribution = 30 × 4 = 120
- Business Impact: 5 → contribution = 30 × 5 = 150
- Time & Urgency: 3 → contribution = 20 × 3 = 60
- Resource & Feasibility: 4 → contribution = 20 × 4 = 80
- **Total**: (120 + 150 + 60 + 80) / 100 = **4.10**

### Priority Tier Determination

```
Score ≥ 4.0 → HIGH     (green badge)
Score ≥ 3.0 → MEDIUM   (blue badge)
Score ≥ 2.0 → LOW      (orange badge)
Score < 2.0 → REJECTED (red badge, auto-sets status to on_hold)
No scores  → UNSCORED  (gray badge)
```

### Storage
- `business_score`: Score × 100 (e.g., 4.10 stored as 410). This preserves precision as an integer.
- `priority_tier`: String tier name
- Individual scores stored in respective columns

### Rank Override (Admin/Program Manager only)
- Manual rank 1–12
- Requires written justification (`rank_override_justification`)
- Sets `is_force_ranked = true`
- Locks scoring inputs while force-ranked
- "Auto" option removes override

### "Why This Priority?" Bullets (deterministic, no AI)
Generated from saved scores:
1. "Strongest drivers: [Top 2 criteria by contribution]"
2. For each criterion rated ≤ 2: "Key blocker: [Criterion] rated X/5."
3. Tier-specific closing:
   - High: "Total score is 4.0 or above, so it is classified as High Priority."
   - Medium: "Total score is between 3.0 and 4.0, so it is classified as Medium Priority."
   - Low: "Total score is between 2.0 and 3.0, so it is classified as Low Priority."
   - Rejected: "Total score is below 2.0, so it is classified as Rejected Priority."

---

## 12. CREATE MODAL

### Fields

| # | Field | Type | Required | DB Column |
|---|-------|------|----------|-----------|
| 1 | Title | Text Input | YES | title |
| 2 | Description | Rich Text (TipTap) | YES | description |
| 3 | Business Ask Date | DatePicker | NO | start_date |
| 4 | Kickoff Date | DatePicker | NO | impl_start_date |
| 5 | Target Completion | DatePicker | NO | end_date |
| 6 | Attachments | File Upload | NO | → attachments bucket |
| 7 | Reporter | UserPicker | NO | requestor |
| 8 | Assignee | UserPicker | YES | assignee |
| 9 | Department | Select | YES | department_id |
| 10 | Business Owner | Select | YES | business_owner_id |
| 11 | Delivery Platform | Select | NO | delivery_platform |
| 12 | Target Quarter | Select | NO | planned_quarter |

### Delivery Platform Options
| Value | English | Arabic |
|-------|---------|--------|
| Senaei Platform | Senaei Platform | منصة صناعي |
| Innovation Platform | Innovation Platform | منصة الابتكار |
| Tahommena | Tahommena | طموحنا |
| Compass | Compass | البوصلة |
| Mini Apps | Mini Apps | التطبيقات المصغرة |
| Website | Website | الموقع الإلكتروني |
| Investor Journey | Investor Journey | رحلة المستثمر |
| Catalyst | Catalyst | كاتاليست |
| RHQ Services | RHQ Services | خدمات المقر الإقليمي |
| Other | Other | أخرى |

### Quarter Options
Q1-Q4 for years 2024, 2025, 2026, 2027 (format: "Q1 2024")

### Keyboard Shortcuts
- `Tab` — Navigate fields
- `⌘S` — Save
- `Esc` — Cancel

---

## 13. FILE MANIFEST

### Files to Copy for Rebuild

#### Core Components
```
src/components/business-requests/BusinessRequestDrawer.tsx     — Main orchestrator (904 lines)
src/components/business-requests/CreateBusinessRequestModal.tsx — Create form
```

#### Tab Components
```
src/components/business-requests/drawer-tabs/DemandDetailsViewTab.tsx  — Tab 1
src/components/business-requests/drawer-tabs/BusinessScoreViewTab.tsx  — Tab 2 (945 lines)
src/components/business-requests/drawer-tabs/EAReviewTab.tsx           — Tab 3
src/components/business-requests/drawer-tabs/BudgetViewTab.tsx         — Tab 4 (526 lines)
src/components/business-requests/drawer-tabs/RisksViewTab.tsx          — Tab 5 (wrapper)
src/components/business-requests/drawer-tabs/MilestonesViewTab.tsx     — Tab 6 (wrapper)
src/components/business-requests/drawer-tabs/LinksViewTab.tsx          — Tab 7 (1266 lines)
src/components/business-requests/drawer-tabs/AuditHistoryTab.tsx       — Tab 8
```

#### Scoring Engine
```
src/hooks/usePrioritizationConfig.ts  — Config, calculation, tier logic (165 lines)
```

#### Types & Constants
```
src/types/business-request.ts          — TypeScript interfaces + all option arrays (245 lines)
```

#### Data Hooks
```
src/hooks/useBusinessRequests.ts       — CRUD hooks (fetch, create, update, delete, duplicate)
src/hooks/useDepartmentsAndOwners.ts   — Department/owner data + auto-mapping
src/hooks/useDemandProcessSteps.ts     — Dynamic process step loading
src/hooks/useBusinessDrawerRoleTabs.ts — Role-based tab visibility
```

#### Shared Components Used
```
src/components/ui/user-picker.tsx       — User selection dropdown
src/components/ui/catalyst-date-picker.tsx — Styled date picker
src/components/business-requests/DepartmentSelect.tsx — Department dropdown
src/components/business-requests/BusinessOwnerSelect.tsx — Owner dropdown
src/components/business-requests/PriorityPill.tsx — Priority badge display
src/components/risks/shared/EntityRisksTab.tsx — Generic risk management
src/components/milestones/MilestonesTab.tsx — Generic milestone management
src/components/shared/UnifiedAuditHistoryTab.tsx — Audit history display
```

---

## 14. DEPENDENCIES & HOOKS

### Key Hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useBusinessRequest(id)` | useBusinessRequests.ts | Fetch single request |
| `useUpdateBusinessRequest()` | useBusinessRequests.ts | Update mutation |
| `useDeleteBusinessRequest()` | useBusinessRequests.ts | Soft delete |
| `useDuplicateBusinessRequest()` | useBusinessRequests.ts | Clone request |
| `useCreateBusinessRequest()` | useBusinessRequests.ts | Create new |
| `usePrioritizationConfig()` | usePrioritizationConfig.ts | Scoring weights/thresholds |
| `calculatePriorityScore()` | usePrioritizationConfig.ts | Compute weighted score |
| `getPriorityTier()` | usePrioritizationConfig.ts | Score → tier mapping |
| `getTierDisplayInfo()` | usePrioritizationConfig.ts | Tier → UI (label, color) |
| `useDepartments()` | useDepartmentsAndOwners.ts | Admin-configured departments |
| `useBusinessOwners()` | useDepartmentsAndOwners.ts | Admin-configured owners |
| `useDepartmentOwnerMappings()` | useDepartmentsAndOwners.ts | Dept → Owner auto-mapping |
| `useActiveDemandProcessSteps()` | useDemandProcessSteps.ts | Dynamic workflow steps |
| `useBusinessDrawerRoleTabs()` | useBusinessDrawerRoleTabs.ts | Role-based tab config |
| `useVisibleDrawerTabs()` | useDrawerTabConfigs.ts | Tab visibility config |

### External Libraries Used
- `@tanstack/react-query` — Data fetching/caching
- `@radix-ui/*` — UI primitives (Select, Tabs, Dialog, Popover, etc.)
- `sonner` — Toast notifications
- `date-fns` — Date formatting
- `zod` — Form validation
- `lucide-react` — Icons
