# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Handover

> State handover for next session.
> See template: docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md

## Feature Work ID
CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001

## Status
P0 Foundation AUTHORED + VALIDATED. Staging apply PENDING (manual). Plan Lock v1 APPROVED.

## Branch
main (working tree: 4 new untracked P0 files; not committed)

## HEAD
0eebc7ba8 (pre-feature; nothing committed for this feature yet)

## Plan Lock status
APPROVED (architecture). Active slice P0 — not yet accepted (apply gate).

## Next exact action
**PO applies** `supabase/migrations/20260628200000_ph_wf_foundation.sql` in Supabase Studio SQL Editor on project `cyijbdeuehohvhnsywig` (catalyst-staging) ONLY. Then paste back verification V1–V5 (table existence, RLS, row counts=0, 3 functions, no-removal). On confirmation: regenerate types (`supabase gen types typescript --project-id cyijbdeuehohvhnsywig`), tsc, accept P0 → start Phase 2 (`/admin/workflows` versioning builder).

## Files in play (uncommitted)
- `supabase/migrations/20260628200000_ph_wf_foundation.sql` (13 ph_wf_* + 3 fns + RLS; unapplied)
- `src/lib/workflow/canonical/contracts.ts`, `advisory.ts`, `adapters/index.ts` (inert)

## Open risks
- P0 migration NOT applied to staging — engine inert until applied + verified.
- No-project-id MCP is PROD-scoped — never use for this feature.
- Do not proceed to Story rollout until P0 accepted.

## Next prompt
`continue feature CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001`
