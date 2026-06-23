# Phase 3 Tier 3 Session 7 Handoff — Release/Sprint Sidebar Deferred Work

**Date:** 2026-06-23  
**Session:** Phase 3 Tier 3 (Sprint Linker + Story Integration) — Session 7 (Deferred scope from Session 6)  
**Status:** Entry points documented. Blocking decision on `story_sprints` table. Ready to begin.  
**Blocked by:** Schema decision + design validation

---

## OUTSTANDING DEFERRED WORK (From Session 6)

### Tier 3.3 Deferred — Story Sprint Multi-Select (BLOCKED)

**File:** `src/components/catalyst-detail-views/story/ReleaseSprintSection.tsx` (line 7 comment flags deferral)

**Current state:**
- Release field ✅ fully functional (dropdown + save/cancel)
- Sprint chips display ✅ linked sprints in read-only mode
- Sprint multi-select ❌ NOT IMPLEMENTED

**What's needed:**
1. Verify `story_sprints` table exists (schema check below)
2. If exists: add Sprint multi-select to edit mode
   - Checkbox list of sprints filtered by selected release
   - Persist via mutation (same transaction as release update)
3. If NOT exists: decide (a) create table or (b) omit Sprint multi-select permanently

**Schema decision:**

```bash
# Run this query in Supabase MCP
SELECT table_name FROM information_schema.tables
WHERE table_name = 'story_sprints';

# Expected result: 1 row if table exists, 0 if not
```

**If table EXISTS:**
- Column check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'story_sprints'`
- Expected columns: `id`, `story_id`, `sprint_id`, `created_at`
- Implementation: edit mode Sprint checkbox list (pattern similar to SprintLinker but multi-select)
- Mutation: UPDATE `story_sprints` alongside release_story_links update
- Estimated effort: 1.5–2 hours (edit UI + mutation + cache invalidation)

**If table DOES NOT EXIST:**
- Decision point: Ask Vikram
  - Option A: Create `story_sprints` table + implement multi-select
  - Option B: Omit Sprint editing from Story sidebar (read-only chips only, current state)
  - Option C: Defer to later phase (document as future work)

---

### Tier 3.4 Validation — BR/PI Sidebars in Other Contexts

**Current verification:** Components tested only in their canonical detail views (CatalystViewStory, CatalystViewBusinessRequest.v3, CatalystViewIncident).

**Outstanding validation scope:**
1. **Product Hub BR detail cards** — `ProductHubDetailCard` / BR detail modal
   - ReleaseSection mounted?
   - Data flow (release_id prop passed correctly)?
   - Mutation success triggers cache invalidation?

2. **Kanban board BR/PI cards** — `KanbanCard` detail modal (all entity types)
   - Release field renders without errors?
   - Click-to-edit works?
   - Save persists?

3. **Kanban board PI cards** — `KanbanCard` + `CatalystViewIncident` panelMode
   - release_version_id mapped correctly?
   - Version label format renders?

4. **Search / Global nav detail surfaces** — any other BR/PI detail mounts

**Grep to find all BR/PI detail surfaces:**

```bash
cd ~/catalyst

# All BR detail renders
grep -r "CatalystViewBusinessRequest\|business_request.*detail\|BrDetailModal" src/ \
  --include="*.tsx" --include="*.ts" | grep -v node_modules | cut -d: -f1 | sort -u

# All PI detail renders
grep -r "CatalystViewIncident\|incident.*detail\|IncidentDetailModal" src/ \
  --include="*.tsx" --include="*.ts" | grep -v node_modules | cut -d: -f1 | sort -u
```

**Test plan per surface:**
1. Open BR/PI detail in that surface
2. Verify Release field renders (idle state shows release name or "None")
3. Click Release → dropdown appears + releases load
4. Select a release → Save → success toast
5. Reload detail view → release persists
6. Repeat for BR + PI in each surface

**Expected findings:** Possible data-mapping issues (UUID vs key, missing projectId prop, cache key mismatches)

---

## OUTSTANDING DESIGN QUESTIONS

### 1. Release Deletion Cascade

**Current behavior:** Deleting a release from `rh_releases` leaves orphaned `release_story_links` rows.

**Question:** Should cascade be automatic (ON DELETE CASCADE) or manual (app logic checks + warns user)?

**Impact:**
- If auto-cascade: Stories lose release link silently
- If manual: Need UI confirmation dialog before deleting release
- If deferred: Acceptable risk (low-frequency operation)

**Decision needed from Vikram:**
- [ ] Auto-cascade (schema change required)
- [ ] Manual cascade (confirmation UI required)
- [ ] Defer (no change, documented as known behavior)

### 2. Orphaned Sprints on Release Unlink

**Current behavior:** When user clears release_id/release_version_id, any previously linked sprints remain orphaned (no `story_sprints` row, no `incidents.sprint_id` column).

**Question:** Should clearing release also clear any linked sprints?

**Impact:**
- Current: Sprints persist in DB even if orphaned (confusing state)
- With cascade: Clean state, but user loses sprint data if they re-link to different release

**Decision needed:**
- [ ] Clear sprints when release unlinked (mutation includes sprint delete)
- [ ] Keep orphaned sprints (current, acceptable state)
- [ ] Warn user before unlinking release (UI confirmation)

---

## NEXT SESSION ENTRY POINTS

### Start Here (Priority Order)

**1. Schema check (5 min)**
```bash
# In Supabase MCP (execute_sql)
SELECT table_name FROM information_schema.tables
WHERE table_name = 'story_sprints';
```
- If `story_sprints` exists → proceed to Sprint multi-select implementation
- If NOT → raise decision question to Vikram before coding

**2. BR/PI validation sweep (1–2 hours)**
```bash
# Find all BR/PI detail surfaces
grep -r "CatalystViewBusinessRequest\|CatalystViewIncident" src/ \
  --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "^Binary"

# For each unique file, open in browser and test Release field
# - Render without errors ✅
# - Edit + Save works ✅
# - Sprints chips display if release linked ✅
```

**3. Outstanding decisions (before coding)**
- [ ] Ask Vikram: sprint_sprints table decision (create/omit/defer)
- [ ] Ask Vikram: release deletion cascade policy
- [ ] Ask Vikram: orphaned sprint handling on unlink

---

## FILES TO MODIFY (If Proceeding)

### If story_sprints Table Exists

**`src/components/catalyst-detail-views/story/ReleaseSprintSection.tsx`**
- Add Sprint checkbox state (`selectedSprints: string[]`)
- In edit mode: render Sprint checkbox list (filtered by selectedRelease)
- Update mutation: also INSERT/DELETE from `story_sprints` in same transaction
- Update mutation success: invalidate `release-sprints-sidebar` cache
- Estimated diff: +80–120 lines (edit UI + mutation logic)

### If Validation Finds Issues

- `ProductHubDetailCard.tsx` — pass `projectId` prop to ReleaseSection if missing
- `KanbanCard.tsx` — verify BR/PI ReleaseSection mount + data flow
- Any other detail modal: add ReleaseSection if missing, wire data correctly

---

## CODE QUALITY CHECKLIST (Session 7)

- [ ] Schema changes (if any) via `apply_migration` MCP
- [ ] Sprint multi-select follows same pattern as SprintLinker (checkboxes, multi-select)
- [ ] Mutations include proper cache invalidation (story-detail, release-sprints-sidebar)
- [ ] Toast success/error on all mutations
- [ ] TypeScript: `tsc --noEmit` clean
- [ ] All UI surfaces validated (BR/PI in all detail contexts)
- [ ] Accessibility: checkboxes have aria-label, buttons keyboard-accessible

---

## COPY-PASTE ENTRY PROMPT (Next Session)

```
Executing Phase 3 Tier 3 Session 7 — Release/Sprint sidebar deferred work.

**Scope:**
1. Schema check: does story_sprints table exist?
2. If yes: implement Story sprint multi-select in ReleaseSprintSection edit mode
3. If no: raise decision with Vikram (create/omit/defer)
4. Validation sweep: test BR/PI ReleaseSection in all detail surfaces (ProductHub, Kanban, etc.)

**Blocking decisions needed:**
- story_sprints table existence + policy (create if missing or omit?)
- Release deletion cascade (auto/manual/defer?)
- Orphaned sprint handling (clear on unlink / keep / warn user?)

**Files to check:**
- ReleaseSprintSection.tsx (lines 7, 136 mark deferral)
- ReleaseSection.tsx (BR + PI, validate in other surfaces)
- ProductHubDetailCard / KanbanCard (BR/PI renders)

**Handoff from Session 6 ready — all components production-ready pending deferred work completion.**
```

---

## SESSION 6 COMPLETION SUMMARY (For Reference)

✅ All three Release/Sprint sidebar extensions COMPLETE:
- Story ReleaseSprintSection (linking table mutation, sprints read-only)
- BR ReleaseSection (direct column mutation)
- PI ReleaseSection (release_version_id, version label format "Name (v1.0)")

✅ Schema verified:
- `release_story_links` exists ✅
- `business_requests.release_id` exists ✅
- `incidents.release_version_id` exists ✅
- `story_sprints` DOES NOT EXIST ❌ (blocking deferred work)

✅ Code quality:
- TypeScript clean
- All parent views wired
- React Query patterns correct
- ADS token compliance
- Toast error handling

---

**Author:** Claude Haiku 4.5  
**Status:** Ready for Session 7 — schema check + BR/PI validation + optional sprint multi-select  
**Effort (Session 7):** 2–4 hours (depends on story_sprints existence + validation findings)
