# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Validation Evidence

> Raw output from validation commands, DOM probes, API responses. Append — never delete.

## Validation command set (exact — from QA Validator agent 2026-07-06)

| Command | Notes | Blocking |
|---|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | no npm typecheck script; ~157 baseline errors, CI warn-only | soft |
| `npx vitest run --passWithNoTests` | no npm test script; CI blocking | hard |
| `npm run lint:colors:testhub` | **zero-baseline strict gate** on src/pages/testhub/** + src/components/testhub/** — extend path list if V2 adds dirs | hard |
| `npm run lint:colors:gate` / `lint:fallback-hex:gate` / `audit:ads:gate` | ratchet gates | hard |
| `npm run lint:cre` | create/link chokepoint gate | hard |
| `npm run build` | vite build 8GB heap | hard |
| Playwright E2E | `PLAYWRIGHT_TEST_BASE_URL=http://localhost:8080 npx playwright test --project=test-management-smoke` (config baseURL stale :5173; vite 8080 strictPort) | evidence |

DB probes: cyij staging only. Assert `cat supabase/.temp/project-ref` = `cyijbdeuehohvhnsywig` before every batch.

## Functional proof matrix (F1–F9) — screenshots don't prove function

| # | Rule | Probe | Pass criterion |
|---|---|---|---|
| F1 | Draft not executable | Cycle-scope picker with known draft case: DOM shows absent/disabled+reason. Client-side insert into scope table referencing draft. SQL: `SELECT count(*) FROM tm_cycle_scope cs JOIN tm_test_cases tc ON tc.id=cs.test_case_id WHERE tc.status='draft';` | Insert rejected; count = 0 |
| F2 | Publish creates immutable version | Publish X, edit, republish. `SELECT version_number FROM tm_test_case_versions WHERE test_case_id='X' ORDER BY version_number;` then edit master again, confirm old version rows unchanged | Row per publish; snapshots not pointers |
| F3 | Execution snapshots version | Execute case at v2, edit master to v3. Scope/run row stores v2 version FK; run player DOM shows v2 text | v2 rendered verbatim |
| F4 | Closed cycle immutable | Close cycle; client UPDATE on tm_test_runs / tm_step_results in it; DOM controls disabled; `max(updated_at) <= closed_at` | Updates rejected; audit intact |
| F5 | Variance banner | Active cycle on v2 + publish v3 → banner with update/clone/keep. Negative: no newer version → no banner | Banner iff version delta; decision writes audit row |
| F6 | Defect lineage | Defect from run-fail → tm_defect_links has run/step id. Test-origin defect without link rejected. Non-test-origin flag path allowed. Sweep query = 0 orphans | Sweep 0 |
| F7 | Gate pass/warn/block | 3 cyij fixtures (all-green / low pass% / open critical defect). `tm_gate_evaluation_history` latest status per fixture + DOM pill match + signoff on blocker actually blocked without waiver | DB=UI, block enforced |
| F8 | Run audit immutable | Complete run; post-completion UPDATE rejected; audit rows 1:1 with status changes | rejected + 1:1 |
| F9 | AI drafts only | Trigger generation: all created rows status='draft', origin='ai'; tm_ai_usage_log row present (governance lesson: verify not silently failing) | all draft + logged |

Evidence rule: paste raw SQL + output verbatim; network-tab 4xx screenshot for rejection cases (silent `{data}` destructure has hidden 400s as "empty" before).

---

## Validation entries

[Entries appended during implementation]
