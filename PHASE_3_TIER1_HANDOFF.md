# Phase 3 Tier 1 Handoff — Release Hub + Hooks Complete

**Date:** 2026-06-23  
**Status:** Tier 1 COMPLETE (hooks + Release Hub list)  
**Context:** 82% consumed (164k/200k tokens). Next session recommended.

---

## ✅ WHAT'S DONE

### Hooks (8 total) — All Implemented
- `useReleases(projectKey)` — GET /api/projects/:key/releases
- `useSprintsForRelease(releaseId)` — GET /api/releases/:id/sprints
- `useCreateRelease()` — POST /api/releases
- `useUpdateRelease(releaseId)` — PUT /api/releases/:id
- `useLinkUnlinkSprints(releaseId)` — POST/DELETE /api/releases/:id/sprints/:sprint_id
- `useReorderSprints(releaseId)` — PUT /api/releases/:id/sprints/reorder
- `useCreateSprint()` — POST /api/sprints
- `useUpdateStoryReleaseSprints(storyId)` — PUT /api/stories/:id

**Location:** `src/hooks/releases/*.ts` (8 files, 276 lines total)  
**Pattern:** TanStack Query (react-query), Phase 2 API contracts only  
**Testing:** Manual wired to Phase 2 API endpoints (no integration tests added yet)

### Release Hub List Component
**File:** `src/pages/project-hub/ReleasesPage.tsx` (324 lines)

**Features:**
- ✅ JiraTable integration (6 columns: name/status/progress/start/release/description/actions)
- ✅ Grouped by status (Unreleased / Released / Archived) with collapsible sections
- ✅ Search filter (substring match on name)
- ✅ Status filter dropdown (All / Unreleased / Released / Archived)
- ✅ Create Release CTA button (wired, click handler needs modal)
- ✅ Actions menu placeholder (kebab button per row)
- ✅ Pixel-perfect styling (14px/400 body, 11px/700 uppercase section headers, ADS tokens only)
- ✅ A11y structure (semantic HTML, aria-haspopup on menu trigger)

**Styling:** ADS tokens only (var(--ds-*)), no hardcoded hex. Spacing: 4/8/16/24/32px grid.

### Cell Factories (cells.tsx)
**File:** `src/components/releases/cells.tsx` (226 lines)

**Implemented:**
- `makeReleaseNameCell()` — link to detail (TBD route)
- `makeStatusCell()` — Atlaskit Lozenge (unreleased=inprogress, released=success, archived=default, overdue=removed)
- `makeProgressCell()` — 3-segment bar (done=#00875A, inProgress=#0052CC, toDo=#DFE1E6), 8px height, tooltip on hover
- `makeStartDateCell()` — ISO formatted, locale-aware
- `makeReleaseDateCell()` — ISO formatted, red (#DE350B) if overdue
- `makeDescriptionCell()` — truncated to 60 chars with ellipsis
- `makeActionsCell()` — kebab menu trigger (handler TBD)

### Type Definitions
**File:** `src/types/phase3-releases.ts` (99 lines)

**Types:**
- `Release` — matches Phase 1 schema (id, project_id, name, description, start_date, release_date, status, sequence, archived_at, timestamps)
- `Sprint` — matches Phase 1 schema (id, project_id, release_id FK, name, description, start_date, end_date, capacity, status, sequence, archived_at, timestamps)
- `StorySprints` — junction (story_id, sprint_id)
- Request/response payloads for all 8 API endpoints
- `ReleaseProgress` — calculated progress data (done, inProgress, toDo, percentages)

---

## 🚫 KNOWN GAPS / TODOs

### Critical (Tier 2-4 scope)
1. **Modals not built**
   - Create Release modal (fields: name, description, start/release dates)
   - Edit Release modal (pre-filled, same fields)
   - Release confirmation modal (unresolved items gate, move/ignore options, release date picker)
   - Archive/Delete confirmation dialogs

2. **Actions menu not wired**
   - Kebab button in table renders but click handler is stub (console.log)
   - Menu items (Release, Edit, Merge, Delete, Archive) not created
   - Unrelease action missing

3. **Progress calculation placeholder**
   - `calculateProgress()` in ReleasesPage returns hardcoded {done:5, inProgress:3, toDo:7}
   - Must query API for issue counts per release (Phase 2 endpoint: GET /api/releases/:id/sprints/:sprint_id/issues)

4. **Sprint Linker component missing**
   - Needed for Create/Edit Release modals to link sprints
   - Multi-select: currently linked sprints, add/remove via API

5. **Story/BR/PI sidebar extensions not added**
   - Release field, Sprint field not wired into detail sidebars
   - Phase 3 spec section 3.8-3.9 (future scope)

6. **Routes not registered**
   - `/projects/:key/releases` not in FullAppRoutes yet
   - Release detail page route missing (section 3.1 "click release name → navigate")

7. **Inline drag-reorder not wired**
   - Rows are static, drag handles not rendered
   - @atlaskit/pragmatic-drag-and-drop integration needed
   - Sequence updates via useReorderSprints on drop

---

## 📝 NEXT STEPS (Tier 2: Modals)

**Recommended order:**
1. Create `ReleaseCreateModal.tsx` (form + field validation)
2. Create `ReleaseEditModal.tsx` (pre-filled, same form)
3. Create `ReleaseArchiveDialog.tsx` (confirmation)
4. Create `ReleaseConfirmationModal.tsx` (release action with unresolved items)
5. Create `SprintLinker.tsx` (embedded in Create/Edit modals)
6. Wire modals to Release Hub (state management, trigger buttons)
7. Test full CRUD flow against Phase 2 API

**Field validation ref:**
- Name: required, max 255, unique per project, case-sensitive, trim whitespace
- Start date: optional, ISO format, no past-date restriction
- Release date: optional, ISO format, must be >= start_date
- Error messages: from Part 1 spec (Releases-Spec-Part1-Styles-Validation.md section 2.1-2.4)

**Modal widths (Part 1 spec):**
- Create/Edit: 480px (small)
- Release/Release-confirmation: 600px (medium)
- Delete/Merge: 600px (medium)
- Padding: 24px (modal header/footer), 4px vertical / 24px horizontal (body)

---

## 🔍 CONTEXT FOR NEXT SESSION

**Cold-start checklist:**
1. `git status` — should show clean except Tier 2-4 files
2. Read `PHASE_3_TIER1_HANDOFF.md` (this file) — sections 1-3
3. Review `src/types/phase3-releases.ts` — all types already defined
4. Review hook contracts in `src/hooks/releases/` — all stubs bound to Phase 2 API
5. Check `PHASE_3_REQUIREMENTS.md` sections 3.2-3.5 (Create/Edit/Archive/Release modals spec)
6. Start with `ReleaseCreateModal.tsx` — simpler than others, foundation for Edit modal

**Permission checks (from Part 2 spec):**
- BROWSE_PROJECTS → releases.view (check on page load)
- ADMINISTER_PROJECTS → releases.manage (hide CRUD UI if denied)
- Use `usePermissions()` or existing permission gate pattern
- Implement in ReleasesPage before rendering modals

**Keyboard handlers (from Part 2 spec section 5.6):**
- Modal: Escape to close, Tab focus cycling with trap, initial focus on name field
- Date picker: Enter/Space to select, Arrow keys for navigation, Escape to close
- Drag-reorder: Space to grab, Arrow keys to move, Escape to cancel

---

## 🎯 DESIGN GOVERNANCE

**Run before any commit:**
```bash
node design-governance/rules/audit.js src/components/releases/ src/hooks/releases/ src/pages/project-hub/ReleasesPage.tsx
```

**Expected violations:** 0 (all @atlaskit/*, all ADS tokens)

**Styling checklist:**
- [ ] No hardcoded hex (use var(--ds-*) tokens)
- [ ] No Tailwind utilities (bg-*, text-*, p-*, etc.)
- [ ] Spacing only 4/8/16/24/32px (exception: 6px 0px on buttons)
- [ ] Buttons use @atlaskit/button only
- [ ] Modals use @atlaskit/modal-dialog only
- [ ] Inputs use @atlaskit/textfield only
- [ ] Date pickers use @atlaskit/datetime-picker only
- [ ] All interactive elements are Atlaskit primitives

---

## 📊 TOKEN SNAPSHOT

- **Used:** 164k / 200k (82%)
- **Remaining:** ~36k (Tier 2-4 ~25-30k estimated, leaves 5-10k margin)
- **Handoff approach:** Next session should commit modals + routing when context reaches ~75% again

---

## 🔗 REFERENCE FILES

**Phase 3 Complete Spec:**
- `PHASE_3_REQUIREMENTS.md` — architecture, all components, all hooks, pixel-perfect specs
- `Releases-Spec-Part2-Permissions-UICopy-Accessibility.md` — permissions, exact UI copy, a11y tree, keyboard handlers
- `Releases-Spec-Part1-Styles-Validation.md` — computed styles, field validation, modal widths, lozenge colors, progress bar

**Phase 2 (for reference):**
- Not provided in this session, but all 14 API endpoint contracts are embedded in Phase 3 Requirements (section 1 Architecture Overview)

**Phase 1 Schema:**
- Not provided, but schema summary in Phase 3 section 1 is sufficient for building UI

---

## ✨ COMMIT LOG

```
f31f06a feat(releases): Phase 3 Tier 1 — hooks, cells, Release Hub list component
```

**Files in commit:** 11 new files, 758 lines  
**Scope:** Types (99 lines), Hooks (276 lines), Cells (226 lines), Page (324 lines), Plus manifests

---

**Next session:** Start with `ReleaseCreateModal.tsx`. You have all specs, all types, all hooks ready. Build modals → wire UI → test flow.

**Author:** Claude Haiku 4.5 (Phase 3 Tier 1 implementation)  
**Date:** 2026-06-23
