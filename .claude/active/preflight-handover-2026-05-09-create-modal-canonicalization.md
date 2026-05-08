# Preflight handover — Create modal canonicalization — 2026-05-09

## Context
- Surface: Create modal (CreateStoryModal + CreateBusinessRequestModal)
- Tier: high-stake
- Started: 2026-05-09
- Council ran: no (Phase 1 skipped — hierarchy matrix required user confirmation first)

## Confirmed Hierarchy Rules
Epic → parent: Business Request
Feature → parent: Epic, Business Request
Story → parent: Feature, Epic
Business Gap → parent: Business Request, Epic
Change Request → parent: Epic, Business Request, Feature
Production Incident → parent: Business Request, Story, Feature, Epic
QA Bug → parent: Feature, Story
API Requirement → DEPRECATED (remove from WORK_TYPES)
Task → DEPRECATED from project hub (belongs to task module)

## Confirmed Q1-Q7
Q1: Status = read-only Lozenge of initial status only (not editable Select)
Q2: Initial status from /admin/workflows DB exclusively — no hardcoded fallbacks
Q3: Work type icons from /admin/icons admin-configured when available
Q4: Project dropdown pre-selects last project visited in project-hub
Q5: Business Request modal = @atlaskit/* only
Q6-Q7: See hierarchy rules above

## Root Causes (from code inspection)
B1: Project icons — useIconOverrides() may return empty; avatar_url may be null
B2: Status shown as editable Select — should be read-only Lozenge
B3: Feature/API Req scheme mappings wrong ('best-fit' strings)
B4: Work type icons not wired to admin-configured icons
B5: Parent field hardcoded to Epic only (line 895 CreateStoryModal)
B6: No last-accessed project logic
B7: Business Request modal not ADS audited

## Key files
- `src/components/workhub/create-story/CreateStoryModal.tsx` — main create modal
- `src/components/workhub/create-story/useCreateStory.ts` — hooks incl. useWorkflowStatuses
- `src/components/ja/CreateDropdown.tsx` — global create button
- `src/components/shared/ProjectIcon.tsx` — project icon component
- `src/components/icons/useIconOverrides.ts` — admin icon overrides hook
- `src/lib/jira-issue-type-icons.tsx` — work type icon registry (needs admin override wire)
- `src/components/business-requests/CreateBusinessRequestModal.tsx` — BR create modal (needs ADS audit)

## Plan
See Phase 2 table in preflight response (Buckets A–I, 28 rows)

## Progress
- [ ] A1-A3: Remove deprecated types
- [ ] B1-B5: Status canonicalization
- [ ] C1-C3: Work type icons
- [ ] D1-D4: Project pre-selection
- [ ] E1-E5: Parent hierarchy
- [ ] F1-F3: Project icons in dropdown
- [ ] G1-G3: Business Request ADS audit
- [ ] H1-H4: CRUD sweep (7 types)
- [ ] I1-I3: Final gates

## Open items
- Confirm `Business Request` records live in `catalyst_issues` vs `ph_issues` (E4)
- Confirm whether `useWorkflowStatuses` scheme keys match admin-configured scheme names exactly
- `catalyst_icon_overrides` table: verify issueType rows exist for all 7 active types
