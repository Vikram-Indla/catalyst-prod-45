# Catalyst Risk Module - Complete Audit Report
**Generated:** 2025-12-13

---

## 1. All Risk-Related UI Components

### Core Risk Components (`src/components/risks/`)

| Component Name | File Path | Purpose | Used In | Status |
|---------------|-----------|---------|---------|--------|
| `RoamBadge` | `src/components/risks/RoamBadge.tsx` | Displays ROAM status badge (Resolved/Owned/Accepted/Mitigated) | RisksGridPage, RiskDetailPanel, RiskRoamReportPage | ✅ Active |
| `RiskCard` | `src/components/risks/RiskCard.tsx` | Individual risk card in ROAM Kanban board | RoamColumn | ✅ Active |
| `RoamColumn` | `src/components/risks/RoamColumn.tsx` | Single column in ROAM Kanban board with drag-drop | RiskRoamReportPage | ✅ Active |
| `RiskDetailPanel` | `src/components/risks/RiskDetailPanel.tsx` | Slide-out drawer for viewing/editing risks | RisksGridPage, EnterpriseRisks | ✅ Active |
| `CreateEditRiskPanel` | `src/components/risks/CreateEditRiskPanel.tsx` | Slide-out drawer for creating/editing risks | RisksGridPage, EnterpriseRisks | ✅ Active |
| `RiskFiltersDialog` | `src/components/risks/RiskFiltersDialog.tsx` | Modal dialog for filtering risks | RisksGridPage, EnterpriseRisks | ✅ Active |
| `DeleteRiskDialog` | `src/components/risks/DeleteRiskDialog.tsx` | Confirmation dialog for deleting risks | RisksGridPage, EnterpriseRisks | ✅ Active |
| `MassMoveDialog` | `src/components/risks/MassMoveDialog.tsx` | Dialog for bulk moving risks to a Program Increment | RisksGridPage, EnterpriseRisks | ✅ Active |
| `ColumnsDialog` | `src/components/risks/ColumnsDialog.tsx` | Dialog for configuring visible columns in grid | RisksGridPage, EnterpriseRisks | ✅ Active |
| `ResolutionModal` | `src/components/risks/ResolutionModal.tsx` | Modal for updating risk resolution status with reason | RiskRoamReportPage | ✅ Active |
| `ViewSettingsDialog` | `src/components/risks/ViewSettingsDialog.tsx` | Dialog for ROAM report chart visibility settings | RiskRoamReportPage | ✅ Active |
| `RiskDonutChart` | `src/components/risks/RiskDonutChart.tsx` | Donut chart visualization for risk statistics | RiskRoamReportPage | ✅ Active |
| `RisksSidebar` | `src/components/risks/RisksSidebar.tsx` | Left navigation sidebar for Risks module | RisksGridPage, RiskRoamReportPage | ✅ Active |
| `RisksToolbar` | `src/components/risks/RisksToolbar.tsx` | Toolbar with search, filters, actions for risk grid | **UNUSED** - Not imported anywhere | ⚠️ Unused |
| `RiskLinksSection` | `src/components/risks/RiskLinksSection.tsx` | Section for managing external links on a risk | CreateEditRiskPanel | ✅ Active |
| `RiskDiscussionsTab` | `src/components/risks/RiskDiscussionsTab.tsx` | Tab content for risk discussions/comments | RiskDetailPanel | ✅ Active |

### Risk Components in Other Modules

| Component Name | File Path | Purpose | Used In | Status |
|---------------|-----------|---------|---------|--------|
| `RisksViewTab` (Industry) | `src/components/industry/drawer-tabs/RisksViewTab.tsx` | Placeholder "Coming Soon" for risks in Industry drawer | BusinessRequestDrawer (Industry) | ⚠️ Placeholder Only |
| `RisksViewTab` (Business Requests) | `src/components/business-requests/drawer-tabs/RisksViewTab.tsx` | Full-featured inline risks management for Business Requests | BusinessRequestDrawer | ✅ Active - Full Implementation |
| `EpicRisksViewTab` | `src/components/items/epics/drawer-tabs/EpicRisksViewTab.tsx` | Epic-specific risks tab (wrapper - placeholder) | EpicDrawer, EpicDetailsPanel | ⚠️ Incomplete - Shows placeholder only |

---

## 2. All Pages/Screens Containing Risks

| Page Name | Route/URL | File Location | Risk Data Shown | Status |
|-----------|-----------|---------------|-----------------|--------|
| **Risk Grid** | `/risks` | `src/pages/risks/RisksGridPage.tsx` | Tabular list of all risks with filters, search, CRUD | ✅ Active & Reachable |
| **Risk ROAM Report** | `/risk-roam-report` | `src/pages/risks/RiskRoamReportPage.tsx` | Kanban board (ROAM columns) + donut charts | ✅ Active & Reachable |
| **Enterprise Risks** | `/enterprise/risks` | `src/pages/enterprise/EnterpriseRisks.tsx` | Enterprise-level risk grid (duplicate of RisksGridPage) | ✅ Active & Reachable |
| **Business Request Drawer - Risks Tab** | `/industry/*` (drawer) | `src/components/business-requests/drawer-tabs/RisksViewTab.tsx` | Inline risk CRUD linked to Business Request | ✅ Active |
| **Epic Drawer - Risks Tab** | `/program/:programId/epic-backlog` (drawer) | `src/components/items/epics/drawer-tabs/EpicRisksViewTab.tsx` | Placeholder only - no data | ⚠️ Incomplete |

### Navigation Entry Points

| Menu Location | Path Shown | Works? |
|---------------|-----------|--------|
| Items Dropdown (Header) | `/enterprise/risks` | ✅ Yes |
| Items Dropdown (Program Items) | `/programs/:programId/risks` | ❌ Route Not Defined |
| Risk Sidebar → Risk Grid | `/risks` | ✅ Yes |
| Risk Sidebar → Risk ROAM Report | `/risk-roam-report` | ✅ Yes |
| Team Room Sidebar | `/teams/:teamId/risks` | ❌ Route Not Defined |

---

## 3. Database Tables & Models

### Main `risks` Table

**Table:** `public.risks`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key |
| `risk_number` | integer | NO | Auto-incrementing risk identifier |
| `title` | text | NO | Risk title (max 100 chars) |
| `description` | text | NO | Full description |
| `status` | text | NO | 'Open' or 'Closed' |
| `occurrence` | text | YES | Severity: Low/Medium/High/Critical |
| `impact` | text | YES | Severity: Low/Medium/High/Critical |
| `critical_path` | text | YES | 'Yes' or 'No' |
| `program_id` | uuid | YES | FK to programs table |
| `program_increment_id` | uuid | YES | FK to program_increments table |
| `owner_id` | uuid | YES | FK to profiles table |
| `relationship` | text | NO | 'Theme'/'Epic'/'Capability'/'Feature'/'Program Increment' |
| `related_item_id` | uuid | YES | FK to related entity |
| `resolution_method` | text | NO | ROAM: 'Resolved'/'Owned'/'Accepted'/'Mitigated' |
| `target_resolution_date` | date | YES | Target date for resolution |
| `notify` | text | YES | Email notification list |
| `consequence` | text | YES | What happens if risk occurs |
| `contingency` | text | YES | Backup plan |
| `mitigation` | text | YES | Steps to mitigate risk |
| `resolution_status` | text | YES | Current resolution progress |
| `tags` | text | YES | Comma-separated tags |
| `created_by` | uuid | YES | User who created |
| `created_at` | timestamp | NO | Creation timestamp |
| `updated_at` | timestamp | NO | Last update timestamp |
| `deleted_at` | timestamp | YES | Soft delete timestamp |
| `business_request_id` | uuid | YES | FK to business_requests for demand-scoped risks |

### Risks by Entity Level

| Entity Level | Implemented? | How? |
|--------------|--------------|------|
| **Business Request** | ✅ Yes | `business_request_id` column links risk to demand |
| **Epic** | ⚠️ Partial | `relationship='Epic'` + `related_item_id`, but EpicRisksViewTab is placeholder |
| **Feature** | ⚠️ Partial | `relationship='Feature'` + `related_item_id` conceptually supported |
| **Story** | ❌ No | No story-level risk implementation |
| **Objective** | ❌ No | No OKR-level risk implementation |
| **Theme** | ⚠️ Partial | `relationship='Theme'` + `related_item_id` conceptually supported |
| **Program Increment** | ✅ Yes | `program_increment_id` column |

### Enums (Defined in Code)

**File:** `src/types/risks.ts`

```typescript
type RoamStatus = 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';
type RiskStatus = 'Open' | 'Closed';
type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
type YesNo = 'Yes' | 'No';
type RelationshipType = 'Theme' | 'Epic' | 'Capability' | 'Feature' | 'Program Increment';
```

### Foreign Key Relationships

Currently **NO explicit foreign key constraints** are defined on the `risks` table (verified via query). Relationships are enforced at application level only.

### Related Tables

| Table | Relationship |
|-------|--------------|
| `risk_discussions` | ❌ Does NOT exist - discussions stored via comments table |
| `epic_risks` | ❌ Does NOT exist - uses relationship/related_item_id pattern |
| `feature_risks` | ❌ Does NOT exist |

---

## 4. Risk API / Data Layer

### Hooks (`src/hooks/risks/`)

| Hook | File | Purpose | Used In |
|------|------|---------|---------|
| `useRisks` | `src/hooks/risks/useRisks.ts` | Fetch, create, update, delete risks | RisksGridPage, RiskRoamReportPage, EnterpriseRisks |

### React Query Keys

```typescript
['risks'] // All risks
['risks', programId] // Filtered by program
['risks', programId, programIncrementId] // Filtered by program and PI
['demand-risks', requestId] // Risks linked to a business request
```

### API Operations (via Supabase Client)

| Operation | Method | Table | Used By |
|-----------|--------|-------|---------|
| List Risks | SELECT | `risks` | useRisks.queryFn |
| Create Risk | INSERT | `risks` | useRisks.createRiskMutation |
| Update Risk | UPDATE | `risks` | useRisks.updateRiskMutation |
| Soft Delete | UPDATE (deleted_at) | `risks` | useRisks.deleteRiskMutation |
| List Business Request Risks | SELECT | `risks` | RisksViewTab (business-requests) |

### No Dedicated Edge Functions

There are **NO dedicated Edge Functions** for risks. All operations go through direct Supabase client calls.

---

## 5. Hooks, Contexts, and Queries

### Risk-Specific Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useRisks` | `src/hooks/risks/useRisks.ts` | Complete CRUD operations for program-level risks |

### Inline Queries (Not Hook-Based)

| Location | Query Key | Purpose |
|----------|-----------|---------|
| `RisksViewTab.tsx` (business-requests) | `['demand-risks', requestId]` | Risks linked to specific business request |
| `EpicDetailsTab.tsx` | `['epic-risks', epicId]` | Risks linked to specific epic (link/unlink logic) |
| `RiskDiscussionsTab.tsx` | `['risk-discussions', riskId]` | Comments on a risk |

### Caching Strategy

- Standard React Query caching
- Invalidation on mutations via `queryClient.invalidateQueries`
- No optimistic updates implemented

---

## 6. Navigation & Menu Items

### Sidebar Entries

| Sidebar | Menu Item | Path | Active? |
|---------|-----------|------|---------|
| RisksSidebar | Risk Grid | `/risks` | ✅ Yes |
| RisksSidebar | Risk ROAM Report | `/risk-roam-report` | ✅ Yes |
| TeamRoomSidebar | Risks | `/teams/:teamId/risks` | ❌ Route Missing |

### Header Dropdown Entries

| Dropdown | Entry | Path | Active? |
|----------|-------|------|---------|
| Items Dropdown (JA) | Risks | `/enterprise/risks` | ✅ Yes |
| Items Dropdown (Layout) | Risks | `/programs/:programId/risks` | ❌ Route Missing |

### Room-Level Risk Visibility

| Room | Risks Visible? | How? |
|------|----------------|------|
| Strategy Room | ❌ No | Not implemented |
| Product Room | ❌ No | Not implemented |
| Program Room | ❌ No | No sidebar entry |
| Project Room | ❌ No | Not implemented |
| Team Room | ❌ No | Route missing |

---

## 7. Risk Workflow Rules

### Status Workflow

```
Open → Closed (when resolution_method = 'Resolved')
Closed → Open (when resolution_method changes from 'Resolved' to anything else)
```

**Database Trigger:** `auto_update_risk_status()` handles automatic status transitions.

### ROAM Resolution Methods

| Method | Meaning | Status Behavior |
|--------|---------|-----------------|
| Resolved | Risk eliminated | Status → Closed |
| Owned | Assigned to owner for action | Status remains Open |
| Accepted | Risk accepted with no action | Status remains Open |
| Mitigated | Risk reduced but not eliminated | Status remains Open |

### Severity Scoring

| Level | Occurrence | Impact |
|-------|------------|--------|
| Critical | Highest likelihood | Highest business impact |
| High | Likely | Major impact |
| Medium | Moderate | Moderate impact |
| Low | Unlikely | Minor impact |

### Risk Roll-up

**NOT IMPLEMENTED.** There is no automatic roll-up of:
- Feature risks → Epic
- Epic risks → Theme/Strategy
- Program risks → Portfolio

### Grouping/Categorization

Risks can be categorized by:
- `relationship` field (Theme/Epic/Capability/Feature/PI)
- `program_id` (Program scope)
- `program_increment_id` (PI scope)
- `business_request_id` (Demand scope)

---

## 8. Duplicate, Unused, or Deprecated Code

### Unused Components

| File | Issue |
|------|-------|
| `src/components/risks/RisksToolbar.tsx` | Defined but never imported/used anywhere |

### Duplicate Implementations

| Issue | Files | Description |
|-------|-------|-------------|
| Duplicate Risk Grid | `RisksGridPage.tsx` vs `EnterpriseRisks.tsx` | Nearly identical pages, one at `/risks`, one at `/enterprise/risks` |
| Duplicate RisksViewTab | `industry/drawer-tabs/RisksViewTab.tsx` vs `business-requests/drawer-tabs/RisksViewTab.tsx` | Industry version is placeholder, BR version is full implementation |

### Incomplete Implementations

| File | Issue |
|------|-------|
| `EpicRisksViewTab.tsx` | Shows placeholder only - never integrates with actual risk data |
| `RiskLinksSection.tsx` | Links state managed but never persisted to database |

### Missing Routes

| Expected Route | Status |
|----------------|--------|
| `/programs/:programId/risks` | ❌ Not defined in App.tsx |
| `/teams/:teamId/risks` | ❌ Not defined in App.tsx |
| `/projects/:projectId/risks` | ❌ Not defined in App.tsx |

---

## 9. Summary Table: What Exists vs. What's Missing

| Category | What Exists Today | What Is Missing | Priority |
|----------|-------------------|-----------------|----------|
| **Standalone Pages** | RisksGridPage, RiskRoamReportPage, EnterpriseRisks | Program-scoped Risk page, Team-scoped Risk page | High |
| **Business Request Risks** | Full CRUD in drawer tab | - | ✅ Complete |
| **Epic Risks** | Placeholder tab in drawer | Actual integration with risks table | High |
| **Feature Risks** | Not implemented | Feature drawer risks tab | Medium |
| **Story Risks** | Not implemented | Entire feature | Low |
| **Objective/OKR Risks** | Not implemented | Entire feature | Medium |
| **Risk Roll-up** | Not implemented | Feature → Epic → Theme → Strategy | High |
| **Room Integration** | Not in any Room page | Strategy/Product/Program/Project Room risk sections | High |
| **Database FK Constraints** | None defined | Foreign keys for program_id, owner_id, etc. | Low |
| **Risk Discussions** | Works for standalone risks | Consistent across all risk contexts | Low |
| **Navigation Routes** | `/risks`, `/risk-roam-report`, `/enterprise/risks` | `/programs/:id/risks`, `/teams/:id/risks` | Medium |
| **Import/Export** | CSV export exists | Import from CSV | Low |
| **RLS Policies** | Not audited | Need security review | Medium |

---

## 10. Current Database State

- **Total Active Risks:** 3 records (not deleted)
- **Foreign Key Constraints:** None enforced at DB level

---

## 11. Recommendations

### Immediate Fixes
1. **Remove duplicate** - Consolidate `RisksGridPage` and `EnterpriseRisks` into one reusable component
2. **Fix EpicRisksViewTab** - Implement actual risk CRUD for epics using `relationship='Epic'`
3. **Add missing routes** - `/programs/:programId/risks` and `/teams/:teamId/risks`
4. **Delete unused** - `RisksToolbar.tsx`

### Medium-Term
1. **Room Integration** - Add risk sections to Strategy/Program/Project Rooms
2. **Risk Roll-up** - Implement roll-up logic from Feature → Epic → Theme
3. **Feature Risks** - Create FeatureRisksViewTab mirroring BusinessRequest pattern

### Long-Term
1. **Objective/OKR Risks** - Extend risk model to OKR hierarchy
2. **Risk Scoring Formula** - Implement calculated risk score (Impact × Occurrence)
3. **Risk Dashboard** - Aggregated risk analytics across portfolio/program

---

*End of Audit Report*
