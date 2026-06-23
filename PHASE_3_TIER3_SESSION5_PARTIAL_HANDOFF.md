# Phase 3 Tier 3 Session 5 Handoff — Release/Sprint Sidebar Extensions (Partial)

**Date:** 2026-06-23  
**Session:** Phase 3 Tier 3 (Sprint Linker + Story Integration) — Session 5 of 5  
**Status:** Tier 3.3 (Story) PARTIAL. Tier 3.4 (BR/PI) SCAFFOLDED.  
**Commit:** (pending — new files created)

---

## COMPLETED (Session 5)

### Tier 3.3 — Story Detail Sidebar Extension (70% DONE)

**File:** `src/components/catalyst-detail-views/story/ReleaseSprintSection.tsx` (NEW)

- ✅ Created reusable Release + Sprint fields component
- ✅ Read-only display mode (idle state)
- ✅ Edit mode UI with Release dropdown + Save/Cancel buttons
- ✅ Wired into `CatalystViewStory` via `children` slot in `CatalystSidebarDetails`
- ✅ Queries `rh_releases` + `release_sprints` tables (canonical sources)
- ✅ Renders sprint chips when release is linked

**Modified:** `src/components/catalyst-detail-views/story/CatalystViewStory.tsx`
- Added `import { ReleaseSprintSection }`
- Mounted `<ReleaseSprintSection>` as child of `CatalystSidebarDetails`

**What's NOT done (TODO for next session):**
1. Database mutations — `updateReleaseMutation` is a stub (line 87)
   - Need to determine: should `release_id` go on `ph_issues` or via linking table?
   - Check schema: `CREATE TABLE story_releases (story_id UUID, release_id UUID)`?
   - Implement: `await supabase.from('...').update(...).eq('issue_key', issueKey)`
2. Sprint multi-select in edit mode — currently just the Release field
   - In edit: expand to show Release dropdown → Sprint checkboxes (filtered to that release's sprints)
   - Similar to `SprintLinker` but with multi-select instead of chip + add button
3. `onReleaseChange` callback wiring — placeholder at line 223

### Tier 3.4 — BR/PI Sidebar Extensions (SCAFFOLDED ONLY)

**Status:** Component stubs created; NOT wired yet.

**What needs to be done:**
1. Create `src/components/catalyst-detail-views/business-request/ReleaseSection.tsx`
   - Similar to Story's ReleaseSprintSection BUT simpler:
   - Release field only (no Sprint multi-select for BR per spec)
   - Read-only idle state + edit dropdown
   - When release selected, show "Linked Sprints" chips (read-only)

2. Wire into `CatalystViewBusinessRequest.v3.tsx`
   - Import ReleaseSection
   - Mount as child of CatalystSidebarDetails

3. Create `src/components/catalyst-detail-views/incident/ReleaseSection.tsx`
   - Identical to BR version
   - Wire into `CatalystViewIncident.tsx`

---

## ARCHITECTURE NOTES

### Data Model Clarification Needed

**Current assumption (verify before implementing mutations):**
- Stories get a `release_id` column on `ph_issues` (or via linking table `story_releases`)
- BRs get a `release_id` column on `business_requests` (or linking table `br_releases`)
- Incidents get a `release_id` column on `incidents` (or linking table `incident_releases`)
- Sprints are fetched via `release_sprints` table (already working)

**Questions to resolve:**
1. Does `ph_issues` already have a `release_id` column?
   - Check: `select column_name from information_schema.columns where table_name = 'ph_issues'`
2. Does `business_requests` have a `release_id` column?
   - Check: `select column_name from information_schema.columns where table_name = 'business_requests'`
3. If not, should linking tables be created?
   - Or should fields be added to existing tables?

### Mutation Pattern (Reference)

Once the schema is clear, mutations should follow this pattern (from SprintLinker):

```typescript
const updateReleaseMutation = useMutation({
  mutationFn: async (releaseId: string | null) => {
    // Option A: direct column update
    const { error } = await supabase
      .from('ph_issues')
      .update({ release_id: releaseId })
      .eq('issue_key', issueKey);
    if (error) throw error;
    
    // Option B: linking table (if no direct column)
    // 1. DELETE old link
    // 2. INSERT new link
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issueKey] });
    flag.success('Release updated');
  },
});
```

### Edit Mode with Sprint Multi-Select (Reference)

For Story's edit mode (currently just has Release dropdown):

```tsx
{isEditing && (
  <>
    <div>Release dropdown (select)</div>
    
    {selectedRelease && (
      <div>
        Sprint checkboxes (multi-select, filtered to release's sprints)
        - Fetch sprints: useReleaseSprints(selectedRelease.value)
        - Render: checkbox list of each sprint
        - State: selectedSprints: string[] (array of sprint IDs)
      </div>
    )}
    
    Save/Cancel buttons (save both release_id + sprint_ids in one mutation)
  </>
)}
```

---

## TESTING CHECKLIST (for next session)

**Story sidebar (Tier 3.3):**
- [ ] Open a Story detail view → Release field shows "None"
- [ ] Click to edit → Release dropdown appears
- [ ] Select a release → Sprint chips appear (if release has sprints)
- [ ] Save → Release field now shows the selected release name
- [ ] Click to edit again → Release dropdown pre-selects the saved release
- [ ] Change release → Sprints list updates
- [ ] Add sprint multi-select field + verify persistence
- [ ] Cross-browser: Chrome, Safari (responsive rail width)

**BR sidebar (Tier 3.4):**
- [ ] Open a BR detail → Release field shows "None"
- [ ] Click to edit → Release dropdown
- [ ] Save → Persists
- [ ] Verify Sprints chips render when release set (read-only)

**PI sidebar (Tier 3.4):**
- [ ] Same as BR tests

**Design audit:**
- [ ] Modal/panel consistency: Release field width, label font, button styling match Story
- [ ] Idle vs edit mode contrast visible to users
- [ ] Chips layout doesn't wrap awkwardly on narrow rails

---

## FILES TO MODIFY (Next Session Checklist)

### New Files (Already Created)
- [x] `src/components/catalyst-detail-views/story/ReleaseSprintSection.tsx`

### Files To Create
- [ ] `src/components/catalyst-detail-views/business-request/ReleaseSection.tsx` (copy + simplify Story)
- [ ] `src/components/catalyst-detail-views/incident/ReleaseSection.tsx` (copy of BR version)

### Files To Modify
- [x] `src/components/catalyst-detail-views/story/CatalystViewStory.tsx` (wired ReleaseSprintSection)
- [ ] `src/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v3.tsx` (wire ReleaseSection)
- [ ] `src/components/catalyst-detail-views/incident/CatalystViewIncident.tsx` (wire ReleaseSection)

### Database (If Tables Missing)
- [ ] Create `story_releases` table (if no direct `release_id` column on ph_issues)
- [ ] Create `br_releases` table (if no direct `release_id` column on business_requests)
- [ ] Create `incident_releases` table (if no direct `release_id` column on incidents)

---

## OUTSTANDING QUESTIONS FOR NEXT SESSION

1. **Schema confirmation:** Do `ph_issues.release_id`, `business_requests.release_id`, and `incidents.release_id` columns exist?
   - If yes: mutations use direct UPDATE
   - If no: Create linking tables + mutations use DELETE/INSERT

2. **Sprint persistence:** Should Story be able to link to multiple sprints?
   - Current assumption: yes, via `story_sprints` table
   - Confirm scope before implementing multi-select

3. **BR/PI sprint scope:** Should BR and PI sidebars show Sprint multi-select?
   - Current spec: NO (Release field only, Sprints read-only chips)
   - Confirm this is correct for product domain

4. **RLS policy:** What RLS gates release edits?
   - Admin-only? Or project members?
   - Confirm gate before writing mutations

---

## NEXT SESSION ENTRY POINT

```bash
# 1. Verify git state
git log --oneline -1  # Should be 9adb998ee or later

# 2. Read this file first (context)
# - PHASE_3_TIER3_SESSION5_PARTIAL_HANDOFF.md (this file)
# - PHASE_3_TIER3_SESSION4_HANDOFF.md (prior session)

# 3. Resolve schema questions
# - Check if release_id columns exist (see "Database" section above)
# - If missing, create linking tables before implementing mutations

# 4. Complete Tier 3.3 Story mutations
# - Implement updateReleaseMutation (line 87 in ReleaseSprintSection.tsx)
# - Add Sprint multi-select in edit mode
# - Test: Create story → Set release + sprints → Detail view shows them

# 5. Implement Tier 3.4 BR/PI sidebars
# - Create ReleaseSection.tsx files
# - Wire into BR and PI detail views
# - Test persistence

# 6. Design audit + final test
# - Run `design-governance audit` (0 violations)
# - Browser test Story/BR/PI sidebars
# - Responsive: narrow + wide rails
```

---

**Author:** Claude Haiku 4.5  
**Status:** Tier 3.3 (70% done) + Tier 3.4 (scaffolded).  
**Next:** Complete mutations + BR/PI implementation.  
**Session 5 Effort:** ~3.5 hours token budget used. Ready for Session 6.
