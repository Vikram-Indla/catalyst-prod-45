# Plan Lock — CAT-STRATA-SC-GOVAPPROVAL-20260718-001

Authorized for execution by the user's implementation contract (autonomous loop mandated; non-interactive session).

## Objective
See 01_OBJECTIVE.md. Semantics of the contract mapped to repo conventions:
- Lifecycle: `draft → pending_approval → {draft (withdraw), changes_requested, rejected, approved}`; `changes_requested → pending_approval (resubmit, same version)`; `approved` == ACTIVE (existing repo convention; effective_from set at approval; predecessor superseded atomically in the same RPC); `superseded`, `retired` unchanged.
- No separate ACTIVE/SCHEDULED status is introduced — 4 snapshot call-sites + instance generation depend on `status='approved'` as the live state. Documented as a deliberate naming adaptation permitted by the contract ("Adapt names to established repository conventions, but preserve these semantics").

## Non-scope
- No email/chat delivery (platform is in-app-only via `strata_notifications`; that IS the established notification framework).
- No group approval / claiming (no group concept exists in strata_role_assignments; assignment is to a person resolved from role holders — SELECTED source; policy default = all strategy_office holders remains for the generic engine only).
- No delegation/reassignment UI beyond strata_admin reassign RPC.
- No changes to scorecard instances/calc/locking.
- No prod DB. Staging only (`cyijbdeuehohvhnsywig`).

## Files to modify
1. `supabase/migrations/20260718200000_strata_scorecard_governed_approval.sql` (NEW) — states, columns, approval task table, validation fn, transition RPCs, RLS, notifications seeding, sod registry update.
2. `src/modules/strata/domain/index.ts` — api wrappers for new RPCs.
3. `src/modules/strata/hooks/useStrata.tsx` — hooks if needed (approval task, candidates).
4. `src/modules/strata/lib/modelIntegrity.ts` — checklist shape (blockers/warnings/passed) extension.
5. `src/modules/strata/pages/StrataAdminConfigPage.tsx` — ScorecardModelsSection, GovActions, ModelIntegrityBand, submit dialog with approver chooser, pending/changes_requested/rejected states, StrataAuditHistory mount.
6. `src/modules/strata/components/StrataNotificationBell.tsx` — `strata_scorecard_models` routing case.
7. `src/modules/strata/types.ts` — status unions + new fields.
8. `src/modules/strata/__tests__/scgov-*.test.ts(x)` (NEW) — migration guards + component tests.

## Files forbidden
- The 6 dirty files from the other session (`ProjectPageHeader.tsx`, 5 strata pages other than AdminConfig — note: StrataAdminConfigPage.tsx IS dirty (1-line change); preserve that hunk verbatim, never revert it).
- `supabase/migrations/*` existing files (append-only).
- Calc/provenance/lock functions.

## Canonical components
- `StrataDecisionModal` (shared.tsx) for approve/request-changes/reject verbs.
- Existing `GovActions` inline Modal pattern for submit dialog (extended with approver Select from `@atlaskit/select` — already used in page).
- `StrataAuditHistory` for governance history.
- `GovStatusLozenge` extended for new states. ADS tokens only.

## Validation commands
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run --config vitest.config.ts src/modules/strata` (module scope) then full `npm test`.
- `npm run lint:colors:changed` + `node scripts/ads-audit-gate.cjs`.
- `npm run build`.
- Supabase MCP (staging): apply migration, DO-block SoD/concurrency proofs.
- Chrome MCP on localhost:8080: full role/state journeys; console/network clean; 1024×768.

## Stop conditions
- Any regression signal on p0-approved-model-immutable, phase5-governed-logic, ac6-*, cfgdef-006 tests → stop and fix root cause, never weaken tests.
- DB project-ref mismatch → stop.

## Slices (each ≤2h)
S1 migration + DB proofs; S2 domain/api + types; S3 UI states + dialogs; S4 tests; S5 browser verification loop ×2; S6 docs/report.
