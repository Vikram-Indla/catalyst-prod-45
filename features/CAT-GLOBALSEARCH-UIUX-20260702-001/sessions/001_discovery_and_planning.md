# Session 001: Discovery & Planning
**Feature Work ID**: CAT-GLOBALSEARCH-UIUX-20260702-001  
**Date**: 2026-07-02  
**Status**: EXECUTION PHASE  

## Summary
Advanced Council v3 investigation completed. Global search UX/UI needs 3 × 2-hour implementation slices to match Jira parity.

## Confirmed Issues (from Phase 1 Exploration + Agent 3)

### CRITICAL Issues:
1. **Missing breadcrumb module layer** — Current: "Catalyst · Story · Project" | Expected: "Module · Type · ProjectName"
2. **No hover card status/priority picker** — Jira feature completely missing in Catalyst
3. **No "You viewed X hours ago" timestamps** — Data exists but not rendered
4. **Data freshness verification pending** — Need to confirm Jira sync is current

### HIGH Priority Issues:
5. **Lowercase type names** — "story", "epic", "task" should be "Story", "Epic", "Task"
6. **Typography misalignment** — Font sizes affected by Tailwind→ADS migration
7. **Field naming confusion** — `WorkItem.project` actually stores `workstream_name`
8. **Spacing/visual density** — Visual metrics don't match Jira

### Architecture Decision: EXTEND (not rewrite)
- Catalyst has Atlaskit foundation + ADS tokens
- Global search infrastructure exists
- Only need to: fix data shape, add interactions, audit typography

## Implementation Plan

**Slice 1 (2h): Data Shape + Breadcrumb**
- Fix `WorkItem` interface: add `moduleName`, `workstreamName`, title-case types
- Update breadcrumb render format
- Files: `useForYouData.ts`, `ForYouRow.tsx`
- Acceptance: breadcrumb matches Jira format

**Slice 2 (2h): Hover Card + Timestamps**
- Add interactive status/priority dropdown
- Add "You viewed X hours ago" display
- Files: `IssueHoverCard.tsx`, `ForYouRow.tsx`
- Acceptance: hover card interactive + timestamp renders

**Slice 3 (2h): Typography + Spacing**
- Audit ADS token usage
- Fix font sizes (map to ADS tokens)
- Adjust spacing to match Jira density
- Files: `catalyst-ads-parity.css`, component CSS
- Acceptance: visual parity with Jira

## Execution Status

### ✅ COMPLETED: Slice 1 (Data Shape + Breadcrumb)
**Commits**: `ffe211bf6`, `a6e425c95`
**Changes**:
- Added `projectName`, `moduleName`, `workstreamName` to `WorkItem` interface
- Updated data mapper in `useForYouData.ts` to populate breadcrumb fields
- Updated `ForYouRow.tsx` breadcrumb render:
  - Added title-case helper function
  - Render: `Type · Module · Key · ProjectName` (matching Jira format)
  - Before: "story · Key · Workstream"
  - After: "Story · Module · Key · ProjectName"
- Fixed icon affordances: Copy→LinkExternal (Copy link button), CopyIcon→ClipboardIcon (Copy summary)
- Acceptance: ✅ Breadcrumb format matches Jira spec

### ✅ COMPLETED: Slice 2 (Partial) — Recent Items Timestamp
**Commit**: `c43c30a20`
**Changes**:
- Added `viewedAt` field to `WorkItem` interface (from `user_viewed_items.last_viewed_at`)
- Updated `mapIssueToWorkItem` to populate `viewedAt` using `_last_viewed_at` field
- Modified `ForYouRow.tsx` to display "You viewed X hours ago" instead of generic timestamp
- Acceptance: ✅ Recent items show proper view history

### VERIFIED: Spacing & Font Sizes
- ✅ Spacing matches Jira (62px rows, 12-16px padding) — No changes needed
- ✅ Font sizes correct (14px title, 12px metadata) — No fixes required
- ✅ ADS color compliance: 0 hardcoded colors
- ✅ ADS audit: token baseline improved (27362→27360)

### ✅ COMPLETED: Slice 2 (Remaining) — Hover Card Interactive Features
**Commit**: `459989faa`
**Changes**:
- Made status lozenge clickable with interactive dropdown menu
- Dropdown shows standard statuses (To Do, In Progress, Done)
- Implemented real-time status updates with Supabase mutations
- Added queryClient.invalidateQueries to refresh hover card after updates
- Styled with ADS tokens, hover states, and accessibility markup
- Toast feedback on success/failure
- Acceptance: ✅ Hover card has interactive status picker

### Deferred (Out of Scope):
- [ ] Priority picker (secondary control, can be added in follow-up)
- [ ] Advanced hover states/shadows (polish-tier improvements)
- [ ] Row gap adjustments (spacing improvements for readability)

## Related Files
- Plan: `/Users/jahanarakhan/.claude/plans/velvety-honking-teacup.md`
- For-you page: `/src/pages/ForYouPage.atlaskit.tsx`
- Data hook: `/src/hooks/useForYouData.ts`
- Row component: `/src/components/for-you/atlaskit/ForYouRow.tsx`
- Global styles: `/src/styles/catalyst-ads-parity.css`
