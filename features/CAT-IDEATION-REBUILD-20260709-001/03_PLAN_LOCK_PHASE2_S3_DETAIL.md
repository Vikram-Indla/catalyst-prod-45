# PLAN LOCK — Phase 2 Slice S3: Idea Detail — read + comments

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved by Vikram in chat ("detail page") 2026-07-10 · **Timebox**: 2h
**Supersedes**: nothing. Sibling slices: `03_PLAN_LOCK_PHASE2_S1_INBOX.md` (delivered, `9982a52d3`), `03_PLAN_LOCK_PHASE2_S2_CREATE.md` (another concurrent session, draft/unapproved — this slice deliberately avoids every file S2 claims).

## Objective
Replace the `DetailPage.tsx` placeholder with a real `/ideation/ideas/:slug` page: problem statement + proposed value (real ADF render), a read-only property rail, and working comments (read existing + post new) — the P0 zones from design 04 §C.4 that don't require AI, voting, evidence, or scoring infrastructure.

## Non-scope (explicitly deferred, own slices)
- **AI Copilot rail tab** (05 §C row 5) — Phase 4 AI scope, needs the suggestion-ledger + gateway wiring.
- **Vote + importance control** (D3) — non-canonical component (D9), needs its own design/build pass.
- **Evidence panel** (snippets/docs/links/voice) — needs `idn_evidence` + attachments panel plumbing.
- **Scoring display/edit** — needs `idn_scoring_*` join + GovernedEnvelope read.
- **Watchers list, linked-BR block, owner/sponsor assignment editing** — read-only rail shows Stage/Class/Submitted/Submitter/Product only; no assignment UI.
- **Mentions in comments** — `mentionableUsers` passed empty; @mention suggestions are a follow-up.
- No DB migration — schema untouched (`idn_ideas`, `idn_comments` already exist from S1).

## Design evidence
- 05 §C row 4 (Linear issue detail ×2, image-verified): "Structural 1:1 with C.4 (CatalystViewBase + ActivityPanel + rail) — confirmed." Title+description center, activity feed below, right rail.
- 04 §C.4 mock: problem (ADF) → proposed value (ADF) → discussion (ActivityPanel, comments|history tabs) in the main column; Stage/Owner/Sponsor/Strategy/Product/Score/Community/Linked in the rail. This slice builds the main column's ADF blocks + comments tab, and the rail fields that are plain reads (Stage, Class, Submitted, Submitter, Product) — the rest of the rail is explicitly out of scope above.

## Canonical components (per hierarchy — all proven in repo)
- `DisplayView` (`src/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView.tsx`) — read-only ADF renderer, exactly the "ADF editors" reference in 04 §C.4's evidence column. Used standalone (not the full editable `Description` wrapper — no save path needed for a read-only field).
- `ActivityPanel` (`src/components/catalyst-ds/activity/ActivityPanel.tsx`) + `CommentEditor` — canonical comments UI, cited directly in 04 §C.4. `hiddenTabs={['history','worklog']}` since `idn_ideas` has no history/worklog model.
- `StatusLozenge`, `HubPageHeader`, `EmptyState` — already proven in S1.

## Files to modify
- `src/hooks/useIdeationDetail.ts` (new) — fetch idea by slug, fetch comments (+ author profiles), post-comment mutation.
- `src/modules/ideation/pages/DetailPage.tsx` — rebuild (main column + rail).
- `src/modules/ideation/types.ts` — add `IdeaDetailRow` type.

**Files forbidden**: everything on S2's file list (`CreateIdeaModal.tsx`, `useCreateIdea.ts`, `useCreateIdeaParam.ts`, `SubmitPage.tsx`, `InboxPage.tsx`, `ExplorePage.tsx`, `PortfolioPage.tsx`, `IdeationSidebar.tsx`) — S2 is another session's unapproved draft; touching those files risks a collision. `src/services/ideationService.ts` (legacy `ph_ideas*`), `src/modules-dormant/**`, any migration file.

## Data rules
- Zero legacy carryover: `idn_ideas` + `idn_comments` only, never `ph_ideas*`/`ph_idea_comments`.
- Comment content is ADF (`idn_comments.content jsonb`); `CommentEditor.onSubmit` already hands back an ADF JSON string — insert `JSON.parse(adfJson)` directly, no transform needed.
- Zero-assumption rendering: missing `proposed_value` → the ADF block doesn't render at all (not a fabricated placeholder). Missing `product_id` → rail row omitted, not "—" unless explicitly a table lookup miss.
- ADS tokens only; no new color logic — status/class rendering reuses S1's `StatusLozenge`/`ClassBadge` pattern.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] DOM/DB proof: open `/ideation/ideas/<seeded-slug>` → real title/problem/rail render; post a comment → row appears in `idn_comments` with `user_id = auth.uid()`, visible immediately without reload
- [ ] Screenshots (Chrome MCP, isolated dev instance, flag ON): detail page light + dark, comment posted live

## Stop conditions
Any DB schema change needed → stop, re-plan. Any edit required to a file on S2's list → stop, ask (don't silently touch a concurrent session's scope).

## Drift / rebaseline
Deviations from the C.4 field list = drift → 08_DRIFT_LOG.md + re-approval.
