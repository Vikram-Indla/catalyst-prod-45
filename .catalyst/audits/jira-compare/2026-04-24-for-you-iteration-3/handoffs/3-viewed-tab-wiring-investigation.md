📋 CC TASK BRIEF — For You / Viewed tab wiring investigation
════════════════════════════════════

CONTEXT
─────────
The Viewed tab shows the "Nothing viewed yet" empty state on Catalyst, while Jira (ground truth via T2 DOM probe 2026-04-24) populates Viewed with recency-grouped items. The empty state itself is correct — `@atlaskit/empty-state` primitive in use — but the backing collection is empty.

Three possible root causes (in order of likelihood):

 (a) `trackView` fires but the Viewed-tab query filters the rows out (entity_type/entity_id shape drift between write and read).
 (b) `trackView` fires but an RLS policy or join is excluding the row.
 (c) `trackView` does not fire at all on row-click.

This is an INVESTIGATION brief, not a fix brief. Step 1 is diagnosis; step 2 is a single surgical fix determined by the diagnosis outcome.

TASK
────
STEP 1 — DIAGNOSE (do not write code yet)

A. In Catalyst dev server at `/` (the For You page), open DevTools Network tab, filter for `user_viewed_items`. Click any row on the Assigned tab. Record:
   - Did a POST/INSERT fire? (yes/no)
   - If yes: what is the body payload? (specifically `entity_type`, `entity_id`)
   - If yes: what is the HTTP status? (200/201 = OK; 4xx = policy or column)

B. In Supabase SQL editor (or via MCP if available), run:
     select user_id, entity_type, entity_id, viewed_at
     from public.user_viewed_items
     where user_id = (select id from public.profiles where email = 'vikramataol@gmail.com')
     order by viewed_at desc
     limit 10;
   Record: how many rows, and what `entity_type` values are present.

C. Read the Viewed branch in `src/hooks/useForYouData.ts` — find the block that builds the Viewed tab collection. Record:
   - Does it query `user_viewed_items` at all, or does it filter an in-memory list?
   - What `entity_type` values does it expect?
   - Does it join to `ph_issues` / `planner_tasks` to reconstruct WorkItems?

STEP 2 — FIX (after STEP 1 — pick ONE of the three)

 (a) If `entity_type` written does not match `entity_type` read → fix the filter in the Viewed query (single-line edit).
 (b) If RLS or join excludes → fix the join / policy. If policy: WRITE MIGRATION (do not edit policies from the app). If join: fix the hook.
 (c) If `trackView` doesn't fire → fix the handler in `ForYouPage.atlaskit.tsx:89-92`.

FILES TO TOUCH
──────────────
  - One (or two) of the following, depending on diagnosis:
      - src/hooks/useForYouData.ts  (branches a and b-join)
      - src/pages/ForYouPage.atlaskit.tsx  (branch c)
      - supabase/migrations/<YYYYMMDDHHMMSS>_*.sql  (branch b-policy, only if needed)

DO NOT TOUCH
────────────
  - The Viewed tab's rendering code (`ViewedPanel.tsx`) — the empty state is correct when no rows exist.
  - The `@atlaskit/empty-state` primitive or the `ForYouEmptyState` helper.
  - Any other tab's query or data path.
  - §11 icons.

GUARDRAILS
──────────
  - L39 (UUID guard) — `user_viewed_items.entity_id` is likely text (to store both uuids and issue keys); do not cast to uuid in the filter.
  - If branch (b) requires a policy migration, DO NOT skip: policies are the #1 cause of silent-empty queries (L39 adjacent).
  - Do NOT create a new table for view tracking. `user_viewed_items` exists.
  - Do NOT add a new Edge Function. Use the existing write path.

ACCEPTANCE CRITERIA
───────────────────
  - [ ] STEP 1 findings are reported as a 1-paragraph summary BEFORE any code change (paste into this brief as a comment when handing back).
  - [ ] The chosen branch (a/b/c) matches what STEP 1 revealed.
  - [ ] After the fix: clicking a row on any tab adds a row to `public.user_viewed_items` (verified in Supabase), and the Viewed tab renders that row within 60 seconds (TanStack Query staleTime).
  - [ ] Empty state still renders when `user_viewed_items` has no rows for the current user.
  - [ ] `npm run typecheck` passes.

VERIFICATION (after fix)
─────────────────────────
  1. Open `/` on a fresh account with no viewed items — confirm Viewed shows the empty state.
  2. Click three rows on the Assigned tab.
  3. Switch to Viewed — confirm three rows appear, grouped under "TODAY".
  4. Re-click one of them from the Viewed tab — confirm it moves to the top (updatedAt refresh).
  5. Log in as a different user — confirm their Viewed tab shows only their rows (RLS scoping).

Send to Vikram with a screen-recording and a fresh Supabase query result showing both branches (empty → populated).
