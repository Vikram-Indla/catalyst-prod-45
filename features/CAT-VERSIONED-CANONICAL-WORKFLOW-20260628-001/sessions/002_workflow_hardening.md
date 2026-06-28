# Session 002 — Workflow Hardening

**Date:** 2026-06-29
**Feature Work ID:** CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001
**Purpose:** Harden and operationalize the versioned canonical workflow system per PO directive.

## What was done

### useWorkflowFoundation.ts — 3 new hooks added

1. **`useWfVersionRolesAndGuards(versionId)`** — loads `ph_wf_transition_roles` + `ph_wf_transition_guards` for all transitions in a version. Powers the enhanced Transitions admin view.

2. **`useWfAuditFiltered(filters)`** — filtered audit query with: `entityKey`, `sourceSurface`, `mode`, `roleDecision`, `wouldBlock`, `limit`. Powers the Audit tab filter UI.

3. **`useWfHealthSummary()`** — aggregate health data: version count, published version ID, scheme entry count, project assignment count, blocking config count, recent audit event count (last 200 rows). Powers the Health tab.

### WorkflowVersioningPage.tsx — rebuilt with hardening

**New: Health/Coverage tab (first tab)**
- Entity × runtime wiring matrix for 9 entities: Story, Epic, Feature, Sub-task, Defect, Incident, Release, Business Request, Product Milestone
- Each row: version exists, scheme entry, project assignment, runtime read wired, runtime write wired, reason modal wired, audit writing confirmed, blocking enabled
- Honest gaps banner: lists entities where write is NOT wired or no published version
- Guard evidence section: per guard type, shows `evidence exists` vs `advisory / missing source`; qa_signoff, uat_signoff, deployment_evidence, smoke_evidence, approval, brd_attached all marked as advisory/missing (no fake passes)
- Hover tooltips with detail on every cell

**Enhanced: Transitions tab**
- Now loads roles + guards via `useWfVersionRolesAndGuards`
- Shows allowed roles (Lozenge per role group, "any role" when open)
- Shows guards with evidence status (color-coded: green = evidence exists + blocking, yellow = evidence exists non-blocking, grey = advisory/missing source; ⛔ on blocking guards)
- Guard hover tooltip shows evidence note

**Enhanced: Statuses tab**
- Added `color_token` column showing the ADS token stored in the DB

**Enhanced: Audit tab — with filters**
- Filter bar: entity, source surface, mode, decision, would_block
- Shows: when, entity, from→to (monospace), surface (code), role decision, would_block, mode, reason
- Clear button resets all filters
- Uses `useWfAuditFiltered` (server-side filtered, limit 100)

**Other improvements**
- Versions tab: immutability notice ("Published versions are immutable")
- Statuses tab: color_token column added

## Runtime gap closure (honest assessment)

| Entity | Runtime read | Runtime write | Gap status |
|---|---|---|---|
| Story | yes | yes (gateTransition) | Complete |
| Epic | partial (CatalystStatusPill) | no explicit write | Gap: no published version → gateTransition noop |
| Feature | partial (CatalystStatusPill) | no explicit write | Gap: no published version → gateTransition noop |
| Sub-task | no | no | Gap: no version seeded |
| Defect | yes | yes (advisory) | Wired. Reason modal: not surfaced |
| Incident | partial | yes (advisory) | Wired |
| Release | yes | yes (advisory) | Wired (releasesDataSource + release-hub.service) |
| Business Request | no | no | Gap: process_step used instead; no canonical version |
| Product Milestone | no | no | Gap: no status mutation surface identified |

These gaps are now VISIBLE in the Health tab. Not claimed as complete.

## Validation
- `npx tsc --noEmit` → TypeScript: No errors found
- `npm run lint:colors:gate` → ✅ 624 = baseline 624. No new hard-coded colors.
- No banned patterns, no hand-rolled UI, no bare hex values

## Files changed
- `src/hooks/workflow-v2/useWorkflowFoundation.ts` — +3 hooks
- `src/pages/admin/workflows/WorkflowVersioningPage.tsx` — rebuilt (10 tabs, Health + enhanced Transitions + filtered Audit)

## Safety
- Production untouched
- No fields removed, no tables dropped, no enums widened
- Non-target entities unchanged
- Published version immutability enforced (UI notice; only draft create allowed via CRUD)
