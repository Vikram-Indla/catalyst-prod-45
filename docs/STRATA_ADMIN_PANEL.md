# STRATA Admin Panel Configuration

**Status:** ✅ Fully Implemented  
**Feature Work:** CAT-STRATA-20260705-001  
**Updated:** 2026-07-07

---

## Overview

The STRATA Admin Panel provides comprehensive configuration and governance controls for the STRATA strategic execution platform. It mirrors the frontend STRATA structure and coexists in the same `strata-standalone` branch.

**Location:** `/strata/admin` and `/strata/admin/:section`

---

## Implementation Status

### ✅ Routes

Both admin routes are fully registered:

```typescript
// src/modules/strata/StrataRoutes.tsx
<Route path="admin" element={<S><AdminConfigPage /></S>} />
<Route path="admin/:section" element={<S><AdminConfigPage /></S>} />
```

**Access Points:**
- `/strata/admin` — Main configuration dashboard
- `/strata/admin/:section` — Specific configuration section (e.g., `/strata/admin/perspectives`)

### ✅ Component

**File:** `src/modules/strata/pages/StrataAdminConfigPage.tsx` (48.4 KB)

Comprehensive admin interface with:
- Tabbed configuration sections
- Governance envelope display (version, status, approval, dates)
- Lifecycle management (draft → pending approval → approved → retired)
- RPC-based actions (database-enforced)
- Change request management
- Role-based access control (strata_admin)

### ✅ Navigation

Sidebar footer navigation item:
```
📋 Configuration → /strata/admin
```

Located in `src/components/layout/EnterpriseSidebar.tsx`

---

## Configuration Sections

The admin panel provides governance controls for:

### 1. **Perspectives** (Strategy Framework)
- Define strategic perspectives (financial, customer, internal, learning)
- Set weights and relationships
- Manage hierarchies and KPI alignment
- Governance: draft/pending/approved/retired status

### 2. **Threshold Schemes** (Scoring Bands)
- Define performance bands (e.g., 0-20: red, 80-100: green)
- Set visual appearance (lozenges, colors)
- Manage effective dates and versions
- Approval workflow

### 3. **KPI Types**
- Define KPI categories (financial, operational, strategic)
- Set measurement directionality (higher/lower better, band, manual)
- Manage calculation formulas
- Set actuals collection rules

### 4. **Scorecard Models**
- Create reusable scorecard templates
- Define model perspectives and weightings
- Set calculation engines
- Manage model versions and lifecycle

### 5. **Value Categories** (Portfolio Management)
- Define benefit categories (cost, revenue, risk, strategic)
- Set portfolio value compositions
- Manage financial impact weightings

### 6. **Gate Models** (Governance Gates)
- Define stage-gate workflow
- Set approval criteria and checkpoints
- Create governance rules
- Manage transition workflows

### 7. **Workflows** (Process Definitions)
- Define execution workflows
- Set action sequences and dependencies
- Manage role-based stages
- Create approval chains

### 8. **Upload Templates** (Data Ingestion)
- Create templates for data upload
- Define field mappings and validation
- Set required fields and formats
- Manage versioning

### 9. **Project Card Fields** (Custom Fields)
- Create project card field definitions
- Set field types and validation
- Manage picklists and options
- Control visibility and permissions

### 10. **Role Assignments** (Access Control)
- Assign STRATA roles to users
- Manage role inheritance
- Set scope (enterprise, portfolio, team)
- Control permissions by role

### 11. **Change Requests** (Governance Log)
- View all configuration changes
- Track approval workflows
- See change history and reasons
- Manage supersession and retirement

### 12. **Audit Trail** (Compliance)
- View all system changes
- Track user actions
- Review approval decisions
- Generate compliance reports

---

## Role-Based Access

Access to admin panel requires:
- **Primary Role:** `strata_admin`
- **Alternative:** Platform admin or system owner
- **Fallback:** Strategy office with delegation

### Allowed Actions

- **Draft** → View and edit (always available)
- **Pending Approval** → View, add comments, cannot edit
- **Approved** → View only, can supersede
- **Retired** → View history, cannot edit

### Segregation of Duties

- **Drafting:** Strategy office, configuration owners
- **Approving:** Governance committee, compliance officer
- **Retiring:** Governance committee only
- **Auditing:** Compliance officer, audit team

---

## Governance Envelope

Every governed configuration record shows:

```
v3 | Approved | Effective 2026-06-15 | Approved 2026-06-14
    "Added Q3 financial KPI alignment per board request"
```

**Elements:**
- **Version (v3):** Increment on each approval
- **Status:** draft | pending_approval | approved | retired | superseded
- **Effective From:** When the configuration becomes active
- **Approved Date:** When governance approved it
- **Change Reason:** Why this change was made
- **Approved By:** User who approved
- **Supersedes:** Previous version ID (if applicable)

---

## API Integration

Admin panel uses governed RPC endpoints:

```typescript
// Configuration operations
configApi.createPerspective(data)
configApi.updatePerspective(id, data)
configApi.retirePerspective(id, reason)

// Governance operations
governanceApi.submitForApproval(table, id)
governanceApi.approvePendingChange(table, id)
governanceApi.rejectChange(table, id, reason)

// Change tracking
governanceApi.getAuditTrail(table, id)
governanceApi.getChangeRequests(status)
```

**Key Feature:** All mutations are RPC-only. Database enforces:
- Role-based access control
- Workflow state transitions
- Audit logging (implicit on every change)
- RLS policies (table-level)

---

## UI Patterns

### Configuration Table
- JiraTable with governed records
- Inline governance envelope display
- Status lozenges (approved/draft/retired)
- Change reason and effective date columns
- Action buttons (edit, submit, approve, retire)

### Modal Forms
- StrataFormModal for editing
- Validates against RLS policies
- Shows governance history
- Requires change reason on submit

### Error Handling
- Surfaces database errors verbatim
- Shows RPC failure reasons
- Helps identify permission or state issues
- Provides actionable error messages

### Search & Filter
- Search by name/description
- Filter by status (draft/approved/retired)
- Filter by effective date
- Filter by approver or author

---

## Workflow Examples

### Approving a Configuration

1. Configuration owner drafts change in admin panel
2. Submits for approval (change reason required)
3. Status becomes `pending_approval`
4. Governance committee member reviews
5. Committee member approves (or rejects with reason)
6. Status becomes `approved`, effective date set
7. Configuration takes effect system-wide

### Retiring Old Configuration

1. Configuration owner navigates to approved record
2. Clicks "Retire" button
3. Provides retirement reason
4. Status becomes `retired`, end date set
5. System stops using retired configuration
6. Audit trail preserved forever

### Superseding (Versioning)

1. Existing approved configuration in use
2. Configuration owner creates new draft
3. Drafts minor changes (e.g., threshold adjustment)
4. Submits for approval with "Supersedes v2" reference
5. New version approved
6. On approval, old version marked `superseded`
7. New version becomes active
8. Both versions visible in audit trail

---

## Frontend & Backend Coexistence

### Same Branch
Both STRATA frontend and admin panel exist on `strata-standalone`:
- `/strata/*` — User-facing UI (execution, reporting, evidence)
- `/strata/admin` — Configuration & governance UI (admin only)

### Shared Infrastructure
- Single `StrataProvider` context
- Shared hooks (`useStrata`, `usePerspectives`, etc.)
- Shared types and domain models
- Unified Supabase client

### Role-Based Visibility
- Frontend routes: require `enterprise` role + `strategy_hub` feature flag
- Admin panel: requires `strata_admin` role OR platform admin
- Both use same RLS policies (enforced at database level)

---

## Access Restrictions

### Cannot Access Admin

- ❌ Regular users (no strata_admin role)
- ❌ Strategy office staff (unless explicitly assigned)
- ❌ Team leads (unless elevated)
- ❌ API calls without strata_admin service role

### Can Access Admin

- ✅ STRATA configuration owners
- ✅ Governance committee members
- ✅ Platform admins
- ✅ System owners
- ✅ Compliance officers

### What They Can Do

- ✅ View all configurations
- ✅ Draft new configurations
- ✅ Submit for approval
- ✅ Review pending changes
- ✅ Approve/reject changes (if authorized)
- ✅ View audit trail
- ✅ Generate compliance reports

---

## Testing the Admin Panel

### Quick Test

```bash
# Start STRATA dev server
npm run dev:strata

# Navigate to admin panel
http://localhost:5173/strata/admin

# Expected: Admin panel loads with all configuration sections
# OR: Access denied (if not assigned strata_admin role)
```

### With Test Data

1. Ensure test user has `strata_admin` role in `role_assignments`
2. Load test seed data: `supabase/migrations/20260705100600_strata_seed_salam_demo.sql`
3. Navigate to `/strata/admin`
4. Should see pre-populated perspectives, thresholds, KPIs, etc.

### Admin Actions

1. **Create:** Draft new threshold scheme
2. **Edit:** Change existing perspective weights
3. **Submit:** Request approval with change reason
4. **Approve:** If authorized, approve pending change
5. **Retire:** Mark old configuration as retired
6. **View History:** See all versions in audit trail

---

## Troubleshooting

### Admin Panel Not Accessible

**Problem:** 404 or empty page

**Solution:**
- Verify user has `strata_admin` role
- Check `role_assignments` table
- Confirm `strata-standalone` branch is checked out
- Verify `.env.local` has `APP_PRODUCT=STRATA`

### Cannot Submit Change for Approval

**Problem:** Submit button disabled or fails

**Solution:**
- Verify configuration is in `draft` status
- Check for required fields (must be filled)
- Ensure change reason is provided
- Check database logs for RLS violations

### Approval Not Visible

**Problem:** Only see submit, not approve option

**Solution:**
- Verify user has approval role (governance committee)
- Check if change is truly in `pending_approval` status
- Verify no pending approvals for this record already exist

---

## Next Steps

### Enhancements
- [ ] Bulk configuration import/export
- [ ] Configuration templates library
- [ ] Version comparison UI
- [ ] Approval workflow dashboard
- [ ] Change impact analysis
- [ ] Compliance audit reports
- [ ] Configuration snapshots
- [ ] Rollback capability

### Integrations
- [ ] Slack notifications on approval
- [ ] Email notifications for pending approvals
- [ ] Jira integration for change tracking
- [ ] Data lineage visualization

---

**For Integration Instructions:** See [STRATA_SWITCHER_INTEGRATION.md](STRATA_SWITCHER_INTEGRATION.md)  
**For Isolation Details:** See [../README_STRATA_ISOLATION.md](../README_STRATA_ISOLATION.md)  
**For Feature Work:** CAT-STRATA-20260705-001

---

**Status:** ✅ Fully implemented and ready to use  
**Last Updated:** 2026-07-07
