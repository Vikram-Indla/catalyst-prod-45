# Phase 3 Tier 2 Session 1 Handoff — Modal Build Sprint

**Date:** 2026-06-23  
**Session:** Phase 3 Tier 2 (Modals) — Session 1 of 2  
**Status:** 3 of 6 modals complete. Ready for Session 2.  
**Commits:** dd1f207, baaf3db, e7edbe0

---

## WHAT WAS BUILT

### 1. ReleaseCreateModal.tsx (330 lines) ✅

**File:** `src/components/releases/ReleaseCreateModal.tsx`  
**Commit:** dd1f207 (`feat(releases): ReleaseCreateModal — form validation, name uniqueness check`)

**Features:**
- Form fields: name (required, 255 char max), description, start_date, release_date (optional)
- Validation per PART 4 handoff (PHASE_3_COMPLETE_HANDOFF.md)
  - Name required: "You must specify a version name"
  - Name max 255: "The version name must not exceed 255 characters"
  - Name unique (per project): "A version with this name already exists in this project."
  - Date range: "The release date must be after the start date."
  - Date format: ISO 8601 validation
- Auto-focus name field
- Real-time error clearing on field change
- POST /api/releases mutation (useCreateRelease hook)
- Success/error flags
- A11y: focus trap, ARIA labels, live regions, role="alert"
- ADS compliance: 0 violations

**Wired to:** ReleasesPage (button opens modal, onSuccess updates flag + refreshes list)

---

### 2. ReleaseEditModal.tsx (329 lines) ✅

**File:** `src/components/releases/ReleaseEditModal.tsx`  
**Commit:** baaf3db (`feat(releases): ReleaseEditModal — pre-filled form, update flow`)

**Differences from Create:**
- Pre-fill all fields with current release data on modal open
- Uniqueness check excludes self: `r.id !== release.id`
- Button label: "Update release"
- PUT /api/releases/:id mutation (useUpdateRelease hook)
- Form reset on close
- Same validation as Create (minus self in uniqueness)

**Not yet wired to ReleasesPage.** Need to add:
- State: `const [editingRelease, setEditingRelease] = useState<Release | null>(null);`
- Actions menu handler: `if (action === 'edit') setEditingRelease(release);`
- Modal render: `{editingRelease && <ReleaseEditModal isOpen={!!editingRelease} release={editingRelease} ... />}`

---

### 3. ReleaseArchiveDialog.tsx (114 lines) ✅

**File:** `src/components/releases/ReleaseArchiveDialog.tsx`  
**Commit:** e7edbe0 (`feat(releases): ReleaseArchiveDialog — confirmation dialog, soft-delete`)

**Features:**
- Simple confirmation: "Archive release?"
- Message: "Archived versions are hidden from most views..."
- Danger button (red): "Archive"
- DELETE /api/releases/:id (soft-delete, backend sets archived_at)
- Inline mutation (no hook used — delete is rare, no re-fetch pattern needed)
- Success flag: "Version {name} has been archived."
- queryClient.invalidateQueries for releases list refresh

**Not yet wired.** Need to add state + handlers in ReleasesPage (same pattern as Edit).

---

## WHAT'S LEFT (Tier 2, Session 2)

### 4. ReleaseConfirmationModal.tsx (~400 lines)

**When:** User clicks "Release" action on an unreleased version  
**Job:** Complex modal with unresolved items gate + multiple options

**Structure (PART 2 spec 2.4):**
```
Header: "Release {name}?"

Body:
  Section 1: Unresolved items gate
    - "This release contains X unresolved work items." (if count > 0)
    - Hidden if count === 0
  
  Section 2: Action options (radio group)
    - "Move open items to next version" + version dropdown (filtered to unreleased)
    - "Ignore unresolved items"
  
  Section 3: Release date picker
    - Pre-fill with today or release.release_date from DB
  
  Section 4: Checkbox (optional)
    - "Create release notes" (would trigger POST /api/releases/:id/release-notes if checked)
    - For now: optional, not required for Tier 2

Footer:
  - Cancel button
  - "Release" button (primary)

Submit action:
  - (Conditional) If "move" selected: POST to move issues before release
  - PUT /api/releases/:id { status: 'released', release_date: selectedDate }
  - On success: flag "Release {name} published"
```

**Data needed:**
- Fetch issue count for release (WHERE release_id = id AND status NOT IN done statuses)
- Fetch unreleased versions (for "move to" dropdown)
- Use hook: `useUpdateRelease(releaseId)` (PUT)
- New hook or direct API for issue move (if needed)

**Validation:**
- Must select an action (move or ignore)
- Release date must be >= today (or >= start_date if set)

---

### 5. ReleaseDeleteDialog.tsx (~300 lines)

**When:** User clicks "Delete" action on a released/archived version  
**Job:** Reassign issues' fix_version / affected_version to another release

**Structure (PART 2 spec 2.5):**
```
Header: "Delete version: {name}"

Body:
  Message: "Any issues with a fix version or affected version of {name} will be updated."
  
  Radio group 1: "Fix version"
    - "Move to:" + dropdown (excludes: self, archived)
    - "Remove from all issues"
  
  Radio group 2: "Affects version" (identical structure)
  
  Warning: "This action cannot be undone."

Footer:
  - Cancel
  - "Delete" button (danger)

Submit action:
  - DELETE /api/releases/:id {
      fix_version_action: "move" | "remove",
      affected_version_action: "move" | "remove",
      move_to_fix_version_id?: string,
      move_to_affected_version_id?: string
    }
  - On success: flag "Version {name} has been deleted."
```

**Validation:**
- Must select action for both fix_version AND affected_version
- If "move" selected, must choose target version

---

### 6. ActionsMenu.tsx (~150 lines)

**When:** User clicks "•••" kebab on release row  
**Job:** Dropdown menu with conditional items

**Items (PART 4 spec 4.2):**
- Group 1:
  - "Release" (if status === 'unreleased' → open ReleaseConfirmationModal)
  - "Edit" (always → open ReleaseEditModal)
  - "Merge" (future, not Tier 2, disable or hide)
  - "Delete" (if status !== 'unreleased' → open ReleaseDeleteDialog)
- Separator
- Group 2:
  - "Unrelease" (if status === 'released' → future, not Tier 2)
  - "Archive" (always → open ReleaseArchiveDialog)

**Pattern:** Use `@atlaskit/dropdown-menu` + DropdownMenu, DropdownItem, DropdownItemGroup

**Wiring to ReleasesPage:**
- Pass action handlers to `makeActionsCell(handleAction)`
- handleAction cases: 'release', 'edit', 'archive', 'delete', 'unrelease'
- Each case sets relevant state + opens corresponding modal

---

## RELEASESPAGE INTEGRATION REMAINING

Current state:
- ReleaseCreateModal wired (button opens, onSuccess updates flag)
- EditModal + ArchiveDialog NOT wired
- ActionsMenu NOT wired
- ReleaseConfirmationModal + ReleaseDeleteDialog NOT wired

**Next session must add to ReleasesPage.tsx:**
```typescript
// New state
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingRelease, setEditingRelease] = useState<Release | null>(null);
const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
const [archivingRelease, setArchivingRelease] = useState<Release | null>(null);
const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
const [confirmingRelease, setConfirmingRelease] = useState<Release | null>(null);
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [deletingRelease, setDeleteRelease] = useState<Release | null>(null);

// Handler for actions menu
const handleAction = (action: string, release: Release) => {
  if (action === 'edit') {
    setEditingRelease(release);
    setIsEditModalOpen(true);
  }
  if (action === 'archive') {
    setArchivingRelease(release);
    setIsArchiveDialogOpen(true);
  }
  if (action === 'release') {
    setConfirmingRelease(release);
    setIsConfirmModalOpen(true);
  }
  if (action === 'delete') {
    setDeleteRelease(release);
    setIsDeleteDialogOpen(true);
  }
};

// Modal renders at end of return
<ReleaseEditModal isOpen={isEditModalOpen} release={editingRelease!} ... />
<ReleaseArchiveDialog isOpen={isArchiveDialogOpen} release={archivingRelease!} ... />
<ReleaseConfirmationModal isOpen={isConfirmModalOpen} release={confirmingRelease!} ... />
<ReleaseDeleteDialog isOpen={isDeleteDialogOpen} release={deletingRelease!} ... />
```

---

## LOCAL TESTING CHECKLIST (Session 2)

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Release Hub
# http://localhost:8080/projects/BAU/releases

# 3. Test Create (already wired)
- [ ] Click "Create release" button
- [ ] Form opens with auto-focus on name
- [ ] Fill name (required), description (optional), dates (optional)
- [ ] Click "Create" → success flag + modal closes + new row appears in UNRELEASED

# 4. Test Edit (wire in Session 2)
- [ ] Click "•••" on unreleased row → actions menu
- [ ] Click "Edit" → modal opens with pre-filled values
- [ ] Change name, click "Update" → success flag + row updates

# 5. Test Archive
- [ ] Click "•••" → "Archive"
- [ ] Confirmation modal: "Archive {name}?"
- [ ] Click "Archive" → success flag + row moves to ARCHIVED section

# 6. Test Release Confirmation (Session 2)
- [ ] Click "•••" → "Release"
- [ ] Modal shows unresolved items (if any) + date picker
- [ ] Select action (move/ignore) + release date
- [ ] Click "Release" → success flag + status changes to released

# 7. Test Delete (Session 2)
- [ ] On released release, click "•••" → "Delete"
- [ ] Modal: choose fix_version and affected_version actions
- [ ] Click "Delete" → success flag + row removed

# 8. TypeScript check
npm run tsc -- --noEmit

# 9. Design governance audit
node design-governance/rules/audit.js src/components/releases/ src/pages/project-hub/ReleasesPage.tsx
```

---

## FILE LOCATIONS

| File | Status | Location |
|------|--------|----------|
| ReleaseCreateModal.tsx | ✅ Built | `src/components/releases/ReleaseCreateModal.tsx` |
| ReleaseEditModal.tsx | ✅ Built | `src/components/releases/ReleaseEditModal.tsx` |
| ReleaseArchiveDialog.tsx | ✅ Built | `src/components/releases/ReleaseArchiveDialog.tsx` |
| ReleaseConfirmationModal.tsx | — To build | `src/components/releases/ReleaseConfirmationModal.tsx` |
| ReleaseDeleteDialog.tsx | — To build | `src/components/releases/ReleaseDeleteDialog.tsx` |
| ActionsMenu.tsx | — To build | `src/components/releases/ActionsMenu.tsx` |
| ReleasesPage.tsx | ⚠️ Partial | `src/pages/project-hub/ReleasesPage.tsx` (Create wired, others TBD) |

---

## REFERENCE: SPEC DOCUMENTS

Keep handy for Session 2:

1. **PHASE_3_COMPLETE_HANDOFF.md**
   - PART 2: Tier 2-4 scope (detailed requirements for all 6 components)
   - PART 4: Field validation reference (copy validation logic)
   - PART 5: Styling reference (tokens, spacing, typography)
   - PART 6: A11y reference (focus, keyboard, live regions)
   - PART 8: Common patterns (mutation pattern, form pattern, modal pattern)

2. **PHASE_3_REQUIREMENTS.md**
   - Sections 3.2-3.6 for modal specs (detailed in Tier 2 requirements)

---

## COMMIT LOG (This Session)

```
dd1f207 feat(releases): ReleaseCreateModal — form validation, name uniqueness check
baaf3db feat(releases): ReleaseEditModal — pre-filled form, update flow
e7edbe0 feat(releases): ReleaseArchiveDialog — confirmation dialog, soft-delete
```

---

## KEY PATTERNS ESTABLISHED

**Validation:** All modals use same pattern as Create
```typescript
const validate = (): boolean => {
  const newErrors = {};
  // Check each field, set error message
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Mutation:** All mutations follow TanStack Query pattern
```typescript
mutationFn: async (payload) => {
  const res = await fetch('/api/...', { method, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(...);
  return res.json();
},
onSuccess: (result) => {
  queryClient.invalidateQueries(...);
}
```

**Modal structure:** All use @atlaskit/modal-dialog
```typescript
<Modal isOpen={isOpen} onClose={handleClose} width={480|600}>
  <ModalHeader><ModalTitle>...</ModalTitle></ModalHeader>
  <ModalBody>...</ModalBody>
  <ModalFooter>
    <Button>Cancel</Button>
    <Button appearance="primary|danger">Action</Button>
  </ModalFooter>
</Modal>
```

**Styling:** All ADS tokens, no hardcoded colors/sizes
- Colors: `var(--ds-text)`, `var(--ds-text-danger)`, `var(--ds-text-subtle)`
- Spacing: 4/8/16/24/32px grid only
- Typography: inherit (no inline fontSize)

---

## TOKEN BUDGET STATUS

Session 1 (Tier 1): 164k / 200k  
Session 1.5 (3 modals): ~15-20k  
**Cumulative:** ~180k / 200k  
**Remaining:** ~20k (sufficient for Tier 2 completion)

Next session estimate: ReleaseConfirmationModal (400L) + ReleaseDeleteDialog (300L) + ActionsMenu (150L) + ReleasesPage wiring (~100L) ≈ 950 lines ≈ 20-25k tokens. **Plan to hand off after Tier 2 complete to reserve budget for Tier 3-4.**

---

## DECISION POINTS FOR SESSION 2

**Q1: Issue count fetch for ReleaseConfirmationModal**  
Need to add a hook or use direct API to fetch issue count for a release (issues where `release_id = id AND status NOT IN (done statuses)`). Recommend: new hook `useReleaseIssueCount(releaseId)` via GET /api/releases/:id/issues/count.

**Q2: Release notes creation**  
Section 4 in ReleaseConfirmationModal has optional "Create release notes" checkbox. For Tier 2 scope, **leave as optional, don't implement POST /api/releases/:id/release-notes yet.** Can be Tier 3 scope if needed.

**Q3: Merge action**  
ActionsMenu spec lists "Merge" action. Not in current scope. **Hide/disable in Tier 2, mark for Tier 3.**

**Q4: Unrelease action**  
ActionsMenu spec lists "Unrelease" (status: released → unreleased). Not in current scope. **Hide/disable in Tier 2, mark for Tier 3.**

---

## NEXT SESSION ENTRY POINT

```bash
# 1. Verify state
git log --oneline -3  # Should show dd1f207, baaf3db, e7edbe0
git status           # Should be clean

# 2. Read context
# Read this file (PHASE_3_TIER2_SESSION1_HANDOFF.md)
# Re-read PHASE_3_COMPLETE_HANDOFF.md PART 2 (scope) + PART 4-6 (validation/styling/a11y)

# 3. Build next modal
# Start with ReleaseConfirmationModal (400L, most complex)
# Then ReleaseDeleteDialog (300L)
# Then ActionsMenu wiring (150L)

# 4. Wire modals to ReleasesPage
# Add state + handlers for each modal
# Test each action end-to-end (create → edit → release → archive → delete)

# 5. Final audit + commit
npm run tsc -- --noEmit
node design-governance/rules/audit.js src/components/releases/ src/pages/project-hub/ReleasesPage.tsx
git commit -m "feat(releases): wire modals, ActionsMenu — Tier 2 complete"
```

---

**Author:** Claude Haiku 4.5  
**Status:** Ready for Session 2  
**Next:** Build ReleaseConfirmationModal + ReleaseDeleteDialog + ActionsMenu wiring
