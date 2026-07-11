# PLAN LOCK — CAT-BR-HEALTH-LINKAGE-20260704-001

**Feature:** BR delivery-health — fix disconnected linked-work source
**Status:** DONE — pushed to origin/main 2026-07-04 (8b49b4fd4 linkage + 9d86cf4f4 engine-test repair). Landed via detached worktree from origin/main (session branch was pre-casing-fix; re-applied onto main's post-casing hooks). All husky gates green. Decisions 1-3 confirmed. cyij seed retained (BR-HEALTH-DEMO on MDT-00081).
**Timebox:** 2h
**Branch:** catalyst/practical-cannon-53eb50 (worktree)

---

## OBJECTIVE

BR delivery-health engine reads a non-existent FK (`ph_issues.business_request_id`), so
health is always `Uncommitted` (single-BR hook silently swallows the 400) and the product
all-work Health facet errors out (batch hook throws). Rewire both mappers to read the app's
REAL link model. Engine + normalization logic are correct and out of scope (casing fixed in
f034b2b88).

**Decision (Vikram, 2026-07-04):** Canonical source = **`business_request_links` →
`epics`/`features`/`stories`** (option a). No schema change to `ph_issues`.

---

## NON-SCOPE

- No changes to DatePulseEngine / HealthStatusEngine logic.
- No `ph_issues.business_request_id` column. No Jira-issue linking path.
- No new UI. No changes to UnifiedLinksTab picker.
- No prod (lmqw) writes. Seed + verify on staging cyij only.

---

## SOURCE MODEL (verified)

`business_request_links` (polymorphic):
`business_request_id`, `linked_item_id`, `linked_item_type`, `linked_item_source`,
`kind`, `link_type`. Implementation links written by UnifiedLinksTab point at
`epics`/`features`/`stories` by uuid.

Per-table normalization into `WorkItem` (engine vocab: status ∈ done/blocked/backlog/todo/
other=in-progress; `due_date`; severity P0/P1/SEV1):

| src | issue_key | status source | → canonical | due_date | severity |
|---|---|---|---|---|---|
| epics | `epic_key` | `epic_status` (proposed/analyzing/approved/in_progress/done/cancelled) | done→done; proposed/analyzing→backlog; approved/in_progress→(in-progress); cancelled→**OPEN** | `end_date` | null |
| features | `display_id` | `feature_status` (funnel/analyzing/backlog/implementing/done) + `blocked` bool | `blocked`→blocked; done→done; funnel/analyzing/backlog→backlog; implementing→(in-progress) | `planned_end_date` | null |
| stories | `story_key` | `story_status` (todo/in_progress/done) + `blocked` bool | `blocked`→blocked; done→done; todo→todo; in_progress→(in-progress) | **none → null** | null |

Normalization lives in a NEW shared helper (memory's `date-pulse/normalize.ts` is stale — no
such file; normalizers currently only in `CatalystSidebarDetails.tsx`). Create
`src/lib/date-pulse/normalizeLinkedWork.ts` — single boundary both hooks import.

---

## OPEN DECISIONS (need Vikram before/at code)

1. **Epic exclusion.** Memory names "epic exclusion" as expected behavior. Epics are grouping
   containers, not leaf deliverables. **Proposed default: exclude linked epics from
   `linkedWork`** (don't count in done/in-progress/blocker buckets). Confirm, or count them.
2. **Cancelled epics.** `epic_status='cancelled'` → exclude from counts (proposed) vs treat as
   done. Proposed: exclude (unscorable).
3. **Stories carry no due_date.** A BR linking only stories can never reach `Committed`
   (engine needs ≥1 dated item). Accept (render Uncommitted honestly) vs derive due from
   `sprint_id`→sprint end (out-of-scope, defer). Proposed: accept, null due_date.

---

## FILES TO MODIFY

- `src/hooks/useBusinessRequestHealth.ts` — replace step-2 `ph_issues` query; surface errors
  (drop `{data}`-only destructure → throw like batch hook).
- `src/hooks/useBatchBusinessRequestHealth.ts` — replace `ph_issues.in(business_request_id)`
  query with links→E/F/S fetch, grouped per BR.
- **NEW** `src/lib/date-pulse/normalizeLinkedWork.ts` — shared fetch+normalize (one query for
  links, batched per-table fetch, per-table→WorkItem mapper). Both hooks call it.

## FILES FORBIDDEN

`DatePulseEngine.ts`, `HealthStatusEngine.ts`, `types/date-pulse.ts` (unless WorkItem needs a
new optional field), UnifiedLinksTab, any UI component, any migration.

---

## DATA / SEED (staging cyij only)

- Verify `get_project_url` = cyijbdeuehohvhnsywig before any write.
- Pick 1 existing BR, insert `business_request_links` rows (kind='implementation') to real
  epics/features/stories with mixed status + dates.
- Acceptance probe: hook returns `linked_work_count`>0, `done_count` correct, epic excluded,
  health transitions off `Uncommitted`.

## VALIDATION

- `npx tsc --noEmit` clean.
- Unit test for `normalizeLinkedWork` per-table mapping (add to `date-pulse/__tests__`).
- Live probe on cyij seeded BR (single + batch hook).
- Color audit grep (no styled files touched → expected clean).

## STOP CONDITIONS

- Any of the 3 OPEN decisions unresolved at code time → stop, ask.
- links query needs RLS/policy change → stop, raise.
- Requires touching engine logic → stop (means scope was wrong).
