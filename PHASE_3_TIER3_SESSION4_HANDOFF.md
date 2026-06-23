# Phase 3 Tier 3 Session 4 Handoff — SprintLinker + Story Modal Complete

**Date:** 2026-06-23  
**Session:** Phase 3 Tier 3 (Sprint Linker + Story Integration) — Session 4 of 4  
**Status:** TIER 3.1-3.2 COMPLETE. TIER 3.3-3.4 (Story/BR/PI Sidebar) READY.  
**Commit:** 9adb998ee

---

## WHAT WAS DONE (Session 4)

### Phase 1: SprintLinker Component (200 lines)

**File:** `src/components/releases/SprintLinker.tsx`

Reusable multi-select component for linking sprints to releases. Displays current linked sprints as removable chips with "Add sprint" button opening a dropdown.

**Features:**
- Query `release_sprints` table to fetch linked sprints
- Query `sprints` table filtered to project + status='active'
- Auto-exclude already-linked sprints from dropdown options
- Remove button on each chip triggers DELETE mutation
- "Add sprint" button + Select dropdown + Link/Cancel buttons
- Optimistic UI updates via React Query cache invalidation
- Graceful handling when `releaseId` null (shows "Select a release first")

**Props:**
```typescript
interface SprintLinkerProps {
  releaseId: string | null | undefined;
  projectKey?: string;
  onSprintsChange?: (sprintIds: string[]) => void;
}
```

**Used in:** `ReleaseEditModal` (after description field)

---

### Phase 2: ReleaseEditModal Wired with SprintLinker

**File:** `src/components/releases/ReleaseEditModal.tsx`

Integrated SprintLinker component into the edit modal (not create modal — sprints require release ID).

**Changes:**
- Import `SprintLinker`
- Add labeled section after Description field
- Pass `release.id` + `projectKey` props

**Live URL:** `http://localhost:8080/release-hub/releases-management`  
Click any release → "Edit" → scroll to "Sprints" section

---

### Phase 3: Story Create Modal Extension (150 lines JSX)

**File:** `src/components/workhub/create-story/CreateStoryModal.tsx`

Extended with Release dropdown + Sprint multi-select fields.

**Changes:**
1. Renamed "Sprint/Iteration" label to "Release" (clearer)
2. Added `useReleaseSprints` hook call to fetch sprints for selected release
3. Built `sprintOptions` from sprints data
4. Added Spring multi-select field (conditional render if release selected)
5. Reset `sprintReleases` array when release changes
6. Graceful empty state ("No sprints available")

**Form State:**
- `releaseId`: Release selection (already existed)
- `sprintReleases`: Sprint IDs array (already scaffolded in form)

**Flow:**
1. User selects Release
2. Sprint field appears
3. User selects N sprints (multi-select)
4. Form submission includes both release + sprint IDs

---

### Phase 4: useCreateStory.ts Hook Addition

**File:** `src/components/workhub/create-story/useCreateStory.ts`

Added `useReleaseSprints` hook to fetch sprints linked to a release.

**Hook:**
```typescript
export function useReleaseSprints(releaseId: string | null) {
  return useQuery({
    queryKey: ['release-sprints', releaseId],
    queryFn: async () => {
      // Fetch release_sprints join sprints
      // Return [{ id, name }, ...]
    },
    enabled: !!releaseId,
    staleTime: 1 * 60 * 1000,
  });
}
```

---

## TIER 3 PROGRESS (4/4 PHASES TRACKED)

| Phase | Feature | Session | Status |
|-------|---------|---------|--------|
| 3.1 | SprintLinker.tsx | S4 | ✅ DONE |
| 3.2 | Story Create Modal extension | S4 | ✅ DONE |
| 3.3 | Story Detail sidebar extension | S5 | ⏳ PENDING |
| 3.4 | BR/PI sidebar extension | S5 | ⏳ PENDING |

---

## CURRENT STATE

**Branch:** main  
**Commit:** 9adb998ee (feat: SprintLinker + Story modal Sprint multi-select)

**Working:**
- ✅ Release edit modal shows SprintLinker UI
- ✅ Sprints link/unlink with optimistic UI
- ✅ Story create modal has Release + Sprint fields
- ✅ Sprint options auto-filter when release changes
- ✅ Dev server running on localhost:8080
- ✅ TypeScript: No errors

**Not yet:**
- ⏳ Story detail view sidebar doesn't show Release/Sprint fields
- ⏳ Business Request sidebar doesn't show Release field
- ⏳ Production Incident sidebar doesn't show Release field

---

## NEXT: TIER 3.3-3.4 (SESSION 5)

### Session 5: Story Detail + BR/PI Sidebar Extensions (~450 lines, 1 session estimated)

**Tier 3.3 — Story Detail Sidebar Extension (150 lines)**

File: `src/components/catalyst-detail-views/story/StorySidebarDetails.tsx` (or wherever Story sidebar is wired)

1. Add "Release" field (optional link, read-only in idle state)
2. Add "Sprints" section showing linked sprint chips
3. Edit mode: Release dropdown → Sprint multi-select (filtered to release's sprints)
4. Mutations: POST/DELETE for sprint linkage

**Tier 3.4 — BR/PI Sidebar Extension (300 lines)**

Files:
- `src/components/catalyst-detail-views/business-request/BRSidebarDetails.tsx`
- `src/components/catalyst-detail-views/incident/IncidentSidebarDetails.tsx`

1. Business Request: Add Release field (nullable, optional)
2. Production Incident: Add Release field (nullable, optional)
3. Both show "Linked Sprints" section when Release selected (read-only chip list)
4. Edit mode: Release dropdown only (no sprint multi-select for BR/PI)

---

## ARCHITECTURE NOTES

**Tier 3 Design Pattern (Established S4):**

All Sprint linking uses the same pattern:
1. `SprintLinker` component for multi-link UI in modals
2. `useReleaseSprints` hook for fetching sprints by release
3. `release_sprints` table as single source of truth
4. POST/DELETE mutations for link/unlink
5. React Query cache invalidation for optimistic UI

For detail view sidebars (S5):
- Read-only "Linked Sprints" chips by default
- Edit mode unlocks Release dropdown + Sprint multi-select
- Same hook + mutations as modals

**Release vs Releases naming:**
- Tier 2 used "Sprint/Iteration" label for the Release field (ambiguous)
- Tier 3 renamed to "Release" (explicit)
- S5 should maintain "Release" across all sidebars

---

## TESTING CHECKLIST

**Manual (in browser):**
1. ✅ Create story → select Release → Sprint field appears
2. ✅ Sprint options match release's linked sprints
3. ✅ Change Release → Sprints reset
4. ✅ Edit release → SprintLinker UI shows
5. ✅ Add sprint → chip appears, "Add sprint" disabled if all linked
6. ✅ Remove sprint → chip removed, "Add sprint" enabled again

**S5 Testing (add to checklist):**
- [ ] Story detail: Release field shows linked sprints
- [ ] Story detail edit: Release → Sprint multi-select works
- [ ] BR/PI detail: Release field optional, shows "None" if unset
- [ ] BR/PI detail edit: Release dropdown only (no Sprint multi-select)
- [ ] Cross-modal consistency: Release field label matches all surfaces

---

## OUTSTANDING TASKS (PHASE 3)

### Tier 3.3-3.4 (Session 5 — next)
- [ ] Story detail sidebar: Release field + Sprints section
- [ ] Story detail edit mode: Release → Sprint multi-select
- [ ] BR sidebar: Release field (nullable)
- [ ] PI sidebar: Release field (nullable)
- [ ] All: "Linked Sprints" read-only chips

### Tier 4 (After Tier 3)
- [ ] SprintAdminPage.tsx + route `/project-hub/:key/sprints`
- [ ] ProjectHubSidebar nav entry for Sprint/Iteration
- [ ] Actions Menu polish (Release/Unrelease/Edit/Archive/Delete visibility)
- [ ] Drag-reorder via @atlaskit/pragmatic-drag-and-drop
- [ ] Design audit + A11y + error handling

---

## ENTRY POINT FOR SESSION 5

```bash
# 1. Verify current state
git log --oneline -1  # Should be 9adb998ee

# 2. Read context
# - PHASE_3_COMPLETE_HANDOFF.md (lines 290-314 for Tier 3 specs)
# - PHASE_3_TIER3_SESSION4_HANDOFF.md (this file)

# 3. Start Tier 3.3: Story Detail Sidebar
# File: src/components/catalyst-detail-views/story/StorySidebarDetails.tsx (or path varies)
# Spec: Add Release field + Sprints chips
#       Edit mode: Release dropdown → Sprint multi-select (filter to release's sprints)

# 4. Start Tier 3.4: BR/PI Sidebar
# Files: BRSidebarDetails.tsx, IncidentSidebarDetails.tsx
# Spec: Add Release field (optional)
#       Show "Linked Sprints" chips when release set
#       Edit mode: Release dropdown only (no sprint multi-select)

# 5. Dev server already running
# Verify: http://localhost:8080/release-hub/releases-management (SprintLinker live)
# Verify: Create story modal has Release + Sprint fields
```

---

**Author:** Claude Haiku 4.5  
**Status:** Tier 3.1-3.2 DONE. Tier 3.3-3.4 READY.  
**Next:** Tier 3 Session 5 — Story/BR/PI sidebar extensions.
