# PLAN LOCK — Phase 6 Slice S1: Notification dispatch (comment + decision)

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive) 2026-07-11 · **Timebox**: 1.5h

## Objective
`notification_trigger_config` has 11 IdeationHub events seeded (S3), but nothing actually creates a `notifications` row when any of them happen — the config table is admin-visible catalog only, never consulted by dispatch code anywhere in the app (checked: `notification_trigger_config`/`recipients_config` is read only by the admin-configuration hook, never by any mutation). This slice wires the two events fully backed by mutations already built and verified this session: `idea_comment_added` and `idea_decision`.

## Non-scope — and why
- **idea_submitted, idea_triage_assigned, idea_status_changed** — no submit/triage-assignment mutation exists in this session's scope (S2 Create/Submit was another concurrent session's slice).
- **idea_mentioned** — needs ADF @mention parsing (the real pattern, `useInteractionRecorder.ts`, does this for `ph_issues`) — not built for idn_comments this slice, would need its own parse step.
- **idea_vote_milestone** (10/25/50 thresholds) — needs count-crossing detection logic, own slice.
- **idea_merged, idea_converted** — the mutations exist and are correct, but their actual DB write is currently blocked by the confirmed RLS bug (see `06_VALIDATION_EVIDENCE.md`). Wiring notification dispatch for a mutation that can't complete would be dead code with no way to verify it fires. Revisit once the migration lands.
- **idea_delivered, idea_ai_suggestions_ready** — no BR-terminal trigger or AI infra exists yet.

## Real dispatch pattern (found, not invented)
`src/hooks/useInteractionRecorder.ts`'s `createMentionNotifications` — direct insert into `notifications` (RLS disabled on this table, confirmed via `pg_class.relrowsecurity`), matching the LIVE schema (`recipient_user_id`, `actor_user_id`, `notification_type`, `entity_type`, `entity_id`, `entity_title`, `entity_key`, `entity_icon_type`, `hub_source`, `status`, `status_type`, `tab`, `metadata`). This is the real, current shape — an earlier migration's `notifications` table shape (`user_id`/`title`/`message`) is superseded; `workItemRepo.ts`'s `softDelete` still inserts against the OLD shape and would fail at runtime — not this slice's bug to fix, noted for awareness only.

## Files to modify
- `src/hooks/useIdeationNotifications.ts` (new) — `notifyIdeaComment` and `notifyIdeaDecision` dispatch helpers, recipients = submitter + `idn_watchers` rows (excluding the actor), matching the pattern above.
- `src/hooks/useIdeationDetail.ts` — call `notifyIdeaComment` from `useAddIdeationComment`'s `onSuccess`.
- `src/hooks/useIdeationDetail.ts` — call `notifyIdeaDecision` from `useDecideIdeaTransition`'s `onSuccess`.

**Files forbidden**: any migration (notifications table/RLS unchanged), `workItemRepo.ts` (not this feature's file).

## Data rules
- Zero-assumption: if a watcher/submitter lookup returns nothing, notify nobody — don't fabricate a recipient.
- Never notify the actor about their own action.
- `hub_source: 'IdeationHub'` matching the S3-seeded `notification_trigger_config.hub_source` value exactly.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits
- [ ] Real DB proof: post a comment as one user while another user watches the idea → a real `notifications` row appears for the watcher with the correct `entity_key`/`notification_type`; same for a Decision (Approve/Decline/Park)

## Stop conditions
Any DB schema change needed → stop, re-plan.
