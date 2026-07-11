# PLAN LOCK — Phase 3 Slice S1: Workflow guards — real evidence + Decision UI

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved by Vikram in chat (picked "Workflow guards" via AskUserQuestion) 2026-07-11 · **Timebox**: 2h
**Supersedes**: nothing. First Phase 3 slice — Phase 2's core CRUD (S1/S2/S3/S4/S5) is done.

## Objective
Close a real gap found during investigation: `GUARD_EVIDENCE_REGISTRY` in `src/lib/workflow/canonical/runtime.ts` already documents `strategy_link_present`, `scores_complete`, `duplicate_review_complete` as `evidence: 'real'`, but `evaluateGuardsReal`'s switch statement has no case for any of the three — they silently fall through to `default: passed: null, 'no evidence source'`. Wire the real evaluators the registry already promises, then give the Detail page a real Approve/Decline/Park action that surfaces them.

## Non-scope
- **Blocking enforcement** — `ph_wf_enforcement_config` has no row for `ideation`, so `getEnforcementMode` returns `'advisory'` and `gateTransition` always returns `blocked: false` regardless of guard/role outcome (confirmed by reading the function: `blocked: enforce && wouldBlock`). This slice surfaces guard results as an inline advisory warning, never a hard block — flipping to blocking mode is a governance decision, not this slice's call.
- **Merge flow** (`screening → merged`) — its own C.6 surface, own guard (`reason_required` only, already real).
- **Role-gating the buttons by `ph_wf_transition_roles`** — those role groups (`approver`/`reviewer`) aren't mapped to `product_roles.code` anywhere in the existing runtime for ANY entity (checked `getActorContext` — resolves `user_product_roles`→`product_roles.code`, a completely different vocabulary). This is a pre-existing gap across the whole canonical workflow system, not an ideation-specific one — out of scope to fix here. RLS (`idn_ideas_update`, real and already enforced) is the actual access control; the UI shows the buttons to any signed-in approved user and lets RLS be the backstop, same posture as every other guard already in the registry as advisory-only.
- **AI Copilot duplicate-suggestion generation** — `duplicate_review_complete` evaluates existing `idn_ai_suggestions` rows; nothing generates them yet (Phase 4). With zero suggestion rows the guard correctly passes (nothing to review).

## What's real vs. was fake
`strategy_link_present`: direct check on `idn_ideas.strategy_element_id`, no injection needed (already selected wherever `issueRow` is built for ideation). `scores_complete`: needs an injected count (mirrors the existing `test_coverage`/`child_completion` injection pattern in `gateTransition`) — counts distinct scored drivers vs. the active model's driver count. `duplicate_review_complete`: injected count of `idn_ai_suggestions` rows where `kind='duplicate' AND status='proposed'` for the idea — zero such rows passes.

## Files to modify
- `src/lib/workflow/canonical/runtime.ts` — 3 new `evaluateGuardsReal` cases; matching injection blocks in `gateTransition`; add `guardResults: GuardEvaluation[]` to the `GateResult` interface (additive — existing callers destructure specific fields, nothing breaks) so callers can render the inline explain.
- `src/hooks/useIdeationDetail.ts` — add a decide-transition mutation (calls `gateTransition` then updates `idn_ideas.workflow_status_key` + `decision`/`decision_reason`/`decided_by`/`decided_at`).
- `src/modules/ideation/pages/DetailPage.tsx` — Decision action area (Approve/Decline/Park), visible only when `workflow_status_key === 'evaluation'`; inline `SectionMessage` showing any failing guards before/after the action (advisory, not blocking); reason prompt for Decline/Park (`reason_required`, already real).

**Files forbidden**: any file already claimed by another concurrent session (check `git status` before editing), any migration file (schema unchanged — `ph_wf_transition_guards`/`idn_ai_suggestions`/`idn_idea_scores` all already exist), `InboxPage.tsx`/`ExplorePage.tsx`/`PortfolioPage.tsx` (unaffected by this slice), `CreateIdeaModal.tsx`/`useCreateIdea*.ts` (S2's).

## Data rules
- Zero legacy carryover.
- Zero-assumption: a guard with no evidence (e.g., unrelated entity types) still returns `passed: null` — only the 3 ideation guards get real evaluation, nothing else in the registry is touched.
- ADS tokens only; guard explain UI uses `SectionMessage` (canonical Atlaskit component), not a hand-rolled banner.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] DB/DOM proof: an idea with `strategy_element_id IS NULL` and no scores shows both guards failing inline; approving it anyway (advisory, not blocked) still transitions `workflow_status_key` to `approved` — proves advisory-not-blocking is real, not just claimed
- [ ] A fully-qualified idea (strategy linked + both scores present) shows both guards passing inline
- [ ] Screenshots (Chrome MCP, isolated dev instance): failing-guards state, passing-guards state, decline with reason, light + dark

## Stop conditions
Any DB schema change needed → stop, re-plan. Any request to flip `ph_wf_enforcement_config` to blocking → stop, ask (governance call, not this slice's).

## Drift / rebaseline
None anticipated.
