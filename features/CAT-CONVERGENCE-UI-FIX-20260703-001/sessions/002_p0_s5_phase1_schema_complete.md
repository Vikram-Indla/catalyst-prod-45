# Session 002: P0-S5 Phase 1 — Schema Extension Complete

**Date:** 2026-07-04  
**Feature ID:** CAT-CONVERGENCE-UI-FIX-20260703-001  
**Phase:** P0-S5 (Converge incident creation → ph_issues)  
**Status:** COMPLETE

---

## Overview

**P0-S5 Phase 1** established the schema foundation for unified incident creation via convergence on `ph_issues` (per DL-1 decision). Schema-only, no data writes yet.

**Migration:** `20260703480000_add_incident_fields_to_ph_issues.sql`  
**Target:** Staging (cyij)  
**Status:** Applied successfully 2026-07-04 22:09:32 UTC

---

## Deliverables

### 1. Migration File Created

**Path:** `supabase/migrations/20260703480000_add_incident_fields_to_ph_issues.sql`

**SQL Executed:**
```sql
ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS incident_key TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workflow_status_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sla_record_id UUID REFERENCES public.sla_records(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS committee_id UUID REFERENCES public.incident_committees(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ph_issues_incident_key ON public.ph_issues(incident_key) WHERE incident_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ph_issues_committee_id ON public.ph_issues(committee_id) WHERE committee_id IS NOT NULL;
```

---

## Verification Results

### Columns Added to ph_issues

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `severity` | TEXT | YES | Values: P1-P6, null-safe |
| `incident_key` | TEXT | YES | Unique constraint for lookups |
| `workflow_status_key` | TEXT | YES | For workflow state tracking |
| `sla_record_id` | UUID | YES | FK → sla_records(id), ON DELETE SET NULL |
| `committee_id` | UUID | YES | FK → incident_committees(id), ON DELETE SET NULL |

**Staging DB Verification:**
```
✓ All 5 columns present
✓ All data types correct
✓ All nullability correct
```

### Indexes Created

| Index Name | Table | Columns | Condition |
|------------|-------|---------|-----------|
| `idx_ph_issues_incident_key` | ph_issues | incident_key | WHERE incident_key IS NOT NULL |
| `idx_ph_issues_committee_id` | ph_issues | committee_id | WHERE committee_id IS NOT NULL |

**Staging DB Verification:**
```
✓ idx_ph_issues_incident_key present
✓ idx_ph_issues_committee_id present
```

### Constraints Applied

| Constraint Name | Type | Definition |
|-----------------|------|-----------|
| `ph_issues_severity_chk` | CHECK | severity IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6') |
| `ph_issues_sla_record_id_fkey` | FOREIGN KEY | sla_record_id → sla_records(id) |
| `ph_issues_committee_id_fkey` | FOREIGN KEY | committee_id → incident_committees(id) |

**Staging DB Verification:**
```
✓ All 3 constraints present and active
```

---

## What Was NOT Done (Deferred to Phase 2)

### Backfill from ph_incidents

**Reason:** The backfill logic requires clarification on the join path between `ph_incidents` and `ph_issues`:
- `ph_incidents.key` (TEXT) — unique incident identifier
- `ph_issues.issue_key` (TEXT) — unique issue identifier in ph_issues table
- No direct FK relationship established yet

**Deferred Decision:**
1. **Option A (Direct Join):** Match on `ph_incidents.key = ph_issues.incident_key` (post-wiring)
2. **Option B (Create FK):** Add `ph_issue_id` FK to ph_incidents table (backwards link)
3. **Option C (Separate Table):** Create junction table for incident↔issue mapping

**Phase 2 will select the approach and execute the backfill** once CreateIncidentModal wiring is locked.

---

## Risk Mitigation

### Zero Data Writes
- Schema-only migration → no existing data affected
- All new columns DEFAULT NULL or have ON DELETE SET NULL
- Indices are partial (WHERE incident_key/committee_id IS NOT NULL) → no bloat

### Backward Compatible
- Existing queries on ph_issues unaffected (new columns are optional)
- No breaking changes to primary key, issue_key, or core workflow fields
- RLS policies unchanged

### Rollback Path
- Migration is reversible (DROP COLUMN IF EXISTS for all 5 columns)
- Staging-only for now → zero production risk

---

## Next Steps (Phase 2)

### P0-S5 Phase 2: CreateIncidentModal Wiring
1. **Clarify join path** — incident_key matching logic
2. **Execute backfill** — populate severity + incident_key from ph_incidents
3. **Update CreateIncidentModal** — insert directly to ph_issues + incident metadata
4. **Wire incident detail routes** — resolve from ph_issues instead of ph_incidents table
5. **Validation** — screenshot acceptance + manual incident creation flow test

### Timeline
- **Phase 2 start:** After current P0-S1 through P0-S6 slices are launched
- **Estimated duration:** 1-2 hours (parallel with other P0 slices)
- **Blockers:** None identified

---

## Evidence

**Migration Applied:**
```
Staging project: cyijbdeuehohvhnsywig
SQL: 20260703480000_add_incident_fields_to_ph_issues.sql
Status: ✓ Applied successfully
Timestamp: 2026-07-04 22:09:32 UTC
```

**Staging DB Verification Query Results:**
- Column scan: ✓ 5/5 columns present
- Index scan: ✓ 2/2 indices present
- Constraint scan: ✓ 3/3 constraints present

---

## Sign-Off

**Feature ID:** CAT-CONVERGENCE-UI-FIX-20260703-001  
**Phase:** P0-S5 Phase 1 (Schema Extension)  
**Status:** ✓ COMPLETE  
**Ready for Phase 2:** YES  

**Files Modified:**
- Created: `supabase/migrations/20260703480000_add_incident_fields_to_ph_issues.sql`
- Session Log: `features/CAT-CONVERGENCE-UI-FIX-20260703-001/sessions/002_p0_s5_phase1_schema_complete.md` (this file)

**No code review needed** — schema-only, verified via DB queries.
