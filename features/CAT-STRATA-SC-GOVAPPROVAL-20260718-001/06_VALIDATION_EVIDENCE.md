# Validation evidence — CAT-STRATA-SC-GOVAPPROVAL-20260718-001

## Automated (three consecutive full strata-module runs)
- Run 1: 507/513 · Run 2: 507/513 · Run 3: 507/513 — identical result sets. The 6 failures (ac6-keyboard-decision-verbs ×2, rd-cycle4-fixes ×4) reproduce on a pristine main checkout with all feature changes stashed → pre-existing, unrelated (StrataFormModal label queries).
- New suites: scgov-approval-migration.guard.test.ts 26/26 · scgov-lifecycle-ui.test.tsx 17/17.
- Regression-sensitive suites green: p0-approved-model-immutable 8/8, phase5-governed-logic 15/15, ac6-keyboard-weight-change 2/2, r3-data-source-lifecycle-ui 9/9 (one flaky timeout under full-suite load; green in isolation both times), cfgdef-006 green.
- `npm run build` ×2: exit 0 (4m43s, 5m00s).
- Color gates: ads-color-changed-gate (since origin/main) ✅ 0 issues · ads-color-gate ✅ 0=baseline · ads-fallback-hex-gate ✅ 839=baseline.
- ads-audit-gate ❌ +9 tokens and ads-color-strict-gate ❌ +1 named: both fail identically on pristine main (verified by stashing everything incl. untracked) — inherited main debt, spawned as a separate task.

## DB-level (staging cyijbdeuehohvhnsywig, DO-block proofs, rollback via RAISE)
PROOF-1/2/3 transcripts in 04_EXECUTION_LOG.md — 31/31 assertions PASS covering: transition matrix, maker-checker both-sided, assigned-approver-only decisions, admin-non-authority, validation rerun at approve, one-open-task, stale-token refusal at submit+approve, duplicate-decision refusal, atomic activate+supersede, terminal rejection, withdraw semantics, version-number monotonicity, generic-verb bypass closure, trigger guard vs superuser UPDATE, candidate scoping, legacy-pending remediation path.

## Migration ledger
`supabase_migrations.schema_migrations` head: `20260718200000 · strata_scorecard_governed_approval` — 1:1 with the committed file. Historical rows: approved/active definitions and calc provenance untouched (calc functions not modified; instances remain pinned to their model rows; snapshot `status='approved'` filters unaffected — new states never satisfy them spuriously).

## Final staging state (intentional, post-journey)
| Model | v | Status |
|---|---|---|
| B2B Sector Scorecard | 1 | superseded |
| B2B Sector Scorecard | 2 | **approved (active)** — attempt 2, assignment selected |
| CEO Enterprise Scorecard | 1 | approved (active) |
| CEO Enterprise Scorecard | 2 | rejected (terminal, reason recorded) |
| J Scorecard Closure Model | 1 | draft (submit blocked by integrity — unchanged) |
| SC GovApproval E2E | 1 | retired (test model, full journey then cleaned up) |

---

# Session 002 — integrity states + incomplete-draft save

- Unit/guard/component (quiet, ×2 consecutive, identical): `npx vitest run src/modules/strata`
  → **520 passed / 6 failed** both runs; the 6 = documented pre-existing baseline
  (ac6-keyboard-decision-verbs ×2, rd-cycle4-fixes ×4 — untouched surfaces).
  New/changed suites green both runs: cfgdef-006 (9), scgov-approval-migration.guard (27),
  scgov-live-integrity (7, NEW), scgov-lifecycle-ui (17), phase5 (15), ac6-keyboard-weight-change (2).
- `npm run build` → exit 0. `npm run lint:colors:changed` → 0 hard-coded colours in changed files.
- Migration `20260718210000` applied to staging `cyijbdeuehohvhnsywig`; ledger 1:1 with file.
- DB proofs (rolled back): 4-state validator matrix; live model submit refusal with
  "…total 50 — assign the remaining 50" ×2 (client wording byte-identical).
- Browser ×2 (fresh reload second pass): live band flips per keystroke, labeled
  "△ Live — includes unsaved measure edits"; incomplete draft SAVES; persisted band shows
  underweight 50-remaining (never "no measures assigned"); submit blocked with stated reason;
  overweight "remove 50" probed live then cancelled; console = pre-existing Atlaskit warning only.
