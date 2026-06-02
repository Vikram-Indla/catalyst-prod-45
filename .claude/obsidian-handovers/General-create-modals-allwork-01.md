---
branch: main
branch_id: "01"
project: General
menu: create-modals + allwork
component: create-modals, br-sidebar, pagination
status: complete
progress: 100
created: 2026-06-02T04:40:00Z
last_saved: 2026-06-02T04:40:00Z
saved_by: claude-code
handover_for: khan.jahanara@gmail.com
access: read + execute
---

# Session Handover — Create Modals + BR Detail + AllWork Pagination

**For:** khan.jahanara@gmail.com (access & execute)
**Branch:** all work landed directly on `main` (pushed to origin)
**Date:** 2026-06-02

> To resume on any machine: `git pull origin main` then read this file. All
> changes are already committed and pushed — nothing is uncommitted.

---

## What shipped this session (all on `main`, pushed)

### 1. Create modals — ADS compliance rebuild
**Files:** `src/components/business-requests/CreateBusinessRequestModal.tsx`,
`src/components/workhub/create-story/CreateStoryModal.tsx`,
`src/components/workhub/create-story/PortalFix.tsx`,
`src/components/workhub/create-story/create-story.css`

- Replaced hand-rolled `MoreActionsButton` → `@atlaskit/dropdown-menu` (WCAG).
- Replaced raw `<img>` MiniAvatar → `@atlaskit/avatar` (L3 ban).
- Priority upgraded 3-level → canonical 5-level `CATALYST_PRIORITIES`
  (`src/lib/catalyst-priority.ts`) + canonical `PriorityIcon`.
- Deleted hand-rolled `FieldLabel` → `@atlaskit/form` `Field`.
- `TranslateButton` → `@atlaskit/button/new` `IconButton`.
- Removed injected `<style>` font override; imported `CATEGORY_OPTIONS`
  from `@/types/business-request` (dedupe).
- All `--cp-*` non-ADS tokens, off-grid spacing, non-ADS fonts fixed.
- `create-story.css`: purged 503 dead lines → only the ADF-toolbar-hide rule.

### 2. RTL + CATY translate on title fields
**File:** `src/components/shared/title-translate/TitleTranslateWrapper.tsx` (+ css)

- Wrapped the BR title + Story summary fields in `TitleTranslateWrapper`:
  auto-detects Arabic → flips `dir="rtl"`, shows "Translate to English/Arabic"
  CATY action row. Verified: typing Arabic right-aligns + shows the link.
- **Title crunch fix:** added `width: 100%` to `.ttw-root` (it was shrinking
  to content width — title box looked "crunched"). Fixes detail view + modals.

### 3. Faded / missing avatars
- Root cause 1: external `avatar_url` passed to `@atlaskit/avatar` `src` →
  broken CDN links rendered a faded fallback (L3 ban).
- Root cause 2 (over-correction): dropping `src` entirely made every avatar a
  grey silhouette.
- **Final fix:** `src={resolveAvatarUrl(name) ?? undefined}` (bundled-local
  only, never external). Applied in MiniAvatar (both modals) and
  `BrSidebarDetails` PersonOptionLabel.

### 4. BR detail sidebar alignment (tactical — canonical NOT adopted)
**File:** `src/components/catalyst-detail-views/business-request/sections/BrSidebarDetails.tsx`

- Value-column typography parity (14px/20px/`--ds-text`) matching canonical
  `.cv-rail-value`.
- "Assign to me" moved to `AssignToMeLink` sub-row so DM/PO rows stay 32px and
  the 128px label vertically centers against the Select (was floating mid of a
  taller block). Verified via DOM probe: label.midY === value.midY on all rows.
- **DECISION (important):** literal `CatalystSidebarDetails` adoption was
  REJECTED — it's `PhIssue`-typed, gates Jira-scheme fields BR lacks, and
  `EditableAssignee` writes hardwired to `ph_issues`. BR has 7 fields with no
  Jira equivalent (DM, PO, Theme, Stakeholders, Planned release, Category,
  Request type). Tactical in-place fixes only. If a future "full adoption" is
  wanted, the real path is: extract the private `FieldRow` atom into a shared
  export + build a data-source-agnostic `EditablePerson` (like `EditablePriority`).

### 5. Targeted feature — checkbox only
**Files:** `BrCenterDetails.tsx`, `CreateBusinessRequestModal.tsx`

- Removed the DetailRow double-label; now just `[ ] Targeted feature`
  (was "Targeted feature" label + "Priority feature for the current cycle").

### 6. BR update 2-second lag — optimistic update
**File:** `src/hooks/useBusinessRequests.ts` (landed via parallel
`Products-detail-performance-01` branch, merged)

- `useUpdateBusinessRequest` now has `onMutate` (cancel + snapshot + optimistic
  cache write `{...prev, ...data}`), `onError` rollback, and `onSuccess`
  invalidates only `['business-request', id]` instead of the old 4-key blanket.
  UI updates instantly on selection.

### 7. AllWork pagination redesign (the big one)
**Files:** `src/hooks/useProjectListItems.ts`,
`src/pages/project-hub/jira-list/ProjectAllWorkView.tsx`,
`src/pages/project-hub/jira-list/components/WorkListPanel.tsx`

- **Root cause of "can't page through":** the keyset cursor added a SECOND
  `.or()` on top of the 2026-gate `.or()`. PostgREST collapses two top-level
  `or=` params → the cursor boundary was silently dropped → Next never advanced
  (confirmed: zero `ph_issues` request on click, identical rows).
- **Fix:** replaced keyset with **offset/range** pagination
  (`.range(start, end)`), 1-indexed `page` state, `pageCount =
  ceil(totalCount/rowsPerPage)`, exposed `page/setPage/pageCount`.
- **UI:** `@atlaskit/pagination` numbered pages (truncated `1 2 3 4 5 … 27`) +
  Jira-style range label "1–25 of 656". Dropped dead Previous/Next buttons.
- **Footer dedupe:** added `hideFooter` prop to `WorkListPanel`; AllWork sets
  it so the panel's "23 of 23" no longer competes.
- **Verified live:** page 1 (BAU-5967…) → page 2 (BAU-5907…), range "26–50 of
  656". Test `useProjectAllWorkItems.test` 6/6 pass.

---

## AllWork vs Backlog count — 656 vs 847 (BY DESIGN, not a bug)

DB truth (BAU): **1,411 total** issues. Breakdown:
QA Bug 644 · Story 300 · Backend 139 · Frontend 123 · Production Incident 93 ·
Sub-task 76 · Epic 18 · Task 8 · Change Request 6 · Business Gap 3 · API Req 1.

- **AllWork = 656** — restricted to 6 types via `ALLOWED_ISSUE_TYPES`
  (`Story, Backend, Frontend, Sub-task, Epic, Feature`) + 2026 gate +
  `jira_removed_at IS NULL` + `archived_at IS NULL`.
  (`src/hooks/useProjectListItems.ts:217`)
- **Backlog = 847** — different surface (`useBacklogData.ts`), its own wider
  type scope. NOTE: commit `74e411191` ("Align All Work and Backlog to same
  issue types") attempted to reconcile these — verify whether the user still
  expects them identical. If so, the remaining gap is the `ALLOWED_ISSUE_TYPES`
  filter on AllWork excluding QA Bug/PI/CR/etc.

They will not match while AllWork's type scope ⊂ Backlog's. Each count is
internally correct for its surface.

---

## Open / follow-up items

1. **Decide AllWork scope:** keep 656 (6 types) or widen `ALLOWED_ISSUE_TYPES`
   to all types so it matches Backlog. Product decision — ask Vikram.
2. **Full `CatalystSidebarDetails` adoption for BR** (if ever wanted): extract
   shared `FieldRow` + build `EditablePerson`. Large, isolate on a branch.
3. **Linter/parallel-agent collisions:** this session repeatedly saw a
   format-on-save linter revert uncommitted edits AND a parallel agent
   force-moving `main` history (orphaned commit `99612b3f4` once). Rule:
   commit IMMEDIATELY after editing, stage explicit paths only, never `-A`.

## How to verify
```
git pull origin main
bun run dev --port 8080
# /project-hub/BAU/allwork → footer "1–25 of 656", click page 2 → rows change
# Create modal → type Arabic in title → RTL + "Translate to English"
# BR detail right rail → DM/PO labels centered, face avatars render
```

---
*Saved by /obsidian save for khan.jahanara@gmail.com — 2026-06-02*
