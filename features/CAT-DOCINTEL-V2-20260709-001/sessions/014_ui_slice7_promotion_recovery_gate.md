# Session 014 — UI Slice 7: Promotion governance and durable recovery gate

**Date:** 2026-07-12  
**Feature:** CAT-DOCINTEL-V2-20260709-001  
**Plan Lock:** v2.1 approved; Drift Event 8 persistence rebaseline  
**Outcome:** ACTIVE — durable recovery not yet complete

## Implemented and proven

- Promotion CTA/modal mount only for approved Epic or User Stories artifacts.
- Draft, verified, rejected, promoted and non-promotable artifacts cannot initiate promotion.
- Created work remains visible when artifact marking or provenance linking fails.
- Retry calls only failed mark/link operations; it never creates or deletes work.
- Full success closes only after artifact status and every link persist.
- 19/19 promotion+edge tests and 83/83 full DocIntel tests passed.

## Why Slice 7 is not complete

The current modal state survives only while mounted. Existing persistence stores the first promoted
work id and successful document links, but not all created ids or failed link pairs. Reload recovery
would therefore be an overclaim.

## Locked recovery contract

Add one project-scoped promotion-recovery row per artifact with created work results, create
failures, pending document/work link pairs, artifact-status pending and partial/complete state.
Project-member SELECT/INSERT/UPDATE RLS is mandatory. Retry performs only pending idempotent mark/link
operations; no work create/delete path is allowed.

## Tool gate

The Supabase skill requires migration creation through `supabase migration new`. The CLI attempted
to write its telemetry cache outside the sandbox; the required escalation was rejected because the
Codex tool-usage limit is exhausted until 02:43. Policy forbids a hand-created filename workaround.

## Next exact action

1. Confirm `supabase/.temp/project-ref` = `cyijbdeuehohvhnsywig`.
2. Run `supabase migration new docintel_promotion_recovery` with escalation.
3. Implement and locally validate ledger, RLS, typed domain methods and modal reload recovery.
4. Apply only to staging after re-confirming the project ref; verify member access and non-member
   denial before calling Slice 7 complete.
