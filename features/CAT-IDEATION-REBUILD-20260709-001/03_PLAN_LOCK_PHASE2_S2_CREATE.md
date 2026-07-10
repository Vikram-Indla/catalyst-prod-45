# PLAN LOCK — Phase 2 Slice S2: Create/Submit Idea form

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ APPROVED by Vikram 2026-07-10 ("Proceed" — D13–D15 as recommended; session 007) · **Timebox**: 2h
**Supersedes**: nothing. Prior slice `03_PLAN_LOCK_PHASE2_S1_INBOX.md` delivered (commit `9982a52d3`).
**Isolation**: implemented in worktree `ideation-s2-create` (branch `worktree-ideation-s2-create`) per concurrent-sessions rule — origin checkout owned by a parallel session.

## Objective
Ship the first WRITE path over `idn_ideas`: the Create Idea modal (design 04 §C.3 + Mobbin row 3 refinements — title-first, Save-as-draft, "Create more" toggle) reachable via `?create=idea` on ideation routes and a sidebar entry (D6), plus `/ideation/submit` rendering the same form body full-page (kills the placeholder). A submitted idea appears in the S1 Inbox with a trigger-generated IDEA-N key.

## Non-scope
No VoiceMicButton / dictation (Phase 4 AI scope). No attachments / `idn_evidence` wiring (needs CatalystAttachmentsPanel + storage plumbing — own slice). No strategy-element or language pickers (not in C.3 field list; defaults apply). No shell-wide ContextSwitcher entry (D6: P1). No post-submit AI enrichment (Phase 4) — the "✦ Caty will check for similar ideas" note renders as static copy only. No Detail page work. No DB migration — schema untouched.

## Design evidence
- 04 §C.3: single screen, no steps; fields exactly title*, problem* (ADF), value (optional, collapsed), class*, product (optional); save draft / submit; success flag with "View idea" link.
- 05 §C row 3 (Linear New Issue ×3, image-verified): title-first; **Save-as-draft** + **"Create more" toggle** adopted (K-delta 2); text labels on pickers, not icon chips.

## Decisions (✅ approved 2026-07-10 as recommended)

| # | Decision | Approved recommendation | Rationale |
|---|---|---|---|
| D13 | Submit write path | **Insert as `'draft'` (DB default), then a second update to `'submitted'` + an `idn_audit_log` transition row.** Not a single insert born `'submitted'` | RLS permits direct-'submitted' insert but it bypasses the transition record (data-guard risk: `workflow_status_key` has no DB constraint; audit is app discipline). Design C.3 says "Draft→Submitted". Full ph_wf runtime guard evaluation stays Phase 3 — this slice records the transition honestly without enforcing guards |
| D14 | Sidebar entry shape | **Nav item "New idea" → `Routes.ideation.submit()`** in `IDEATION_CONFIG` | `SidebarBase` has no action-button slot; a path item is zero-extension. Query-string nav items break active-state logic. `?create=idea` still works on all ideation routes for deep links |
| D15 | "Create more" behavior | On success with toggle ON: form resets, modal stays open, flag still fires | Linear-verbatim (05 row 3); serves workshop rapid capture |

## Canonical components (per hierarchy — all proven in repo)
- Modal chrome: **PortalFix** composition (`src/components/workhub/create-story/PortalFix.tsx`) — the proven `@atlaskit/modal-dialog` replacement (Vite portal bug); exemplar chain `CreateStoryModal` → `CreateBusinessRequestModal`.
- Fields: `@atlaskit/form` (`Field`/`ErrorMessage`/`HelperMessage`), `@atlaskit/textfield` (title, 1–300 enforced), `@atlaskit/select` (class, product — text labels), `@atlaskit/toggle` (Create more), `@atlaskit/button/new`.
- ADF editors: `RichTextEditor` headless + `tiptapToAdf` (`src/components/catalyst-detail-views/shared/sections/Description/…`) for `problem_statement` (required) and `proposed_value` (optional, collapsed behind a disclosure).
- Success feedback: canonical `flag.success` (`src/components/shared/JiraTable/flags.tsx`; `FlagsHost` already mounted in App.tsx) with "Open" action → `Routes.ideation.idea(slug)`.
- No new non-canonical components required.

## Files to modify
| File | Change |
|---|---|
| `src/modules/ideation/components/CreateIdeaModal.tsx` (new) | Modal host + shared `CreateIdeaForm` body |
| `src/hooks/useCreateIdea.ts` (new) | `useMutation` → `typedQuery('idn_ideas').insert({title, idea_class, problem_statement?, proposed_value?, product_id?}).select('id, idea_key, slug, workflow_status_key').single()`; omit key/slug/submitter_id/status/origin (trigger/default-owned); then `idn_watchers` self-row (`'submitter'`); on Submit path, D13 status update + audit row; invalidate `IDEATION_INBOX_KEY` |
| `src/modules/ideation/hooks/useCreateIdeaParam.ts` (new) | Shared `searchParams.get('create') === 'idea'` → open + delete-param `{replace:true}` (EpicsPage.tsx:107 pattern) |
| `src/modules/ideation/pages/SubmitPage.tsx` | Replace placeholder with full-page `CreateIdeaForm` |
| `src/modules/ideation/pages/InboxPage.tsx`, `ExplorePage.tsx`, `PortfolioPage.tsx` | Mount param hook + modal |
| `src/modules/ideation/types.ts` | `CreateIdeaInput` type |
| `src/components/layout/IdeationSidebar.tsx` | D14 nav item |

**Files forbidden**: `src/services/ideationService.ts`, `src/modules-dormant/**`, any `ph_ideas*` read, any migration file, `SidebarBase.tsx`, anything outside the list above.

## Data rules (from Data/Safety Guard, S1 migration probed)
- Insert contract: `title` (1–300) + `idea_class` (`problem|opportunity|improvement`) required; NEVER send `idea_key`/`slug` (soft trigger guard would honor bogus values), `submitter_id` (auth.uid() default satisfies RLS WITH CHECK), `score_total`, `decision*`, `converted_*`, `owner_id`. FK optionals send real uuid or omit — never `''`.
- Error surfaces handled: unapproved profile → RLS denial (friendly message); expired session → NOT NULL violation on submitter_id (re-auth prompt).
- Zero-assumption rendering; ADS tokens only (follow InboxPage token style); zero legacy carryover.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] DOM/DB proof: submit → new row in `idn_ideas` (staging) with trigger-generated IDEA-N, `submitter_id = auth.uid()`, status `submitted` + audit row; Save-as-draft → row stays `draft` and does NOT appear in Inbox
- [ ] Screenshots (Chrome MCP, isolated dev instance, flag ON): modal empty + filled (light/dark), inline validation error, success flag, new idea visible in S1 Inbox, SubmitPage full-page form, `?create=idea` deep link opening the modal

## Stop conditions
Any schema change needed → stop, re-plan. PortalFix chrome fails for this modal → stop, raise (no hand-rolled fallback). Timebox breach → split (SubmitPage full-page reuse is the amputation candidate).

## Drift / rebaseline
Deviations from the C.3 field list or D13 write path = drift → 08_DRIFT_LOG.md + re-approval.
