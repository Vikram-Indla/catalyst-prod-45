# LANE 10 — Regression / QA / Test Coverage Audit

**Audit ID range:** CAT-AUDIT-0900…0999
**Date:** 2026-07-03 · **Branch:** main · **Mode:** READ-ONLY (vitest suite NOT executed — broken on Node 20 per project memory; all evidence is static + CI history via `gh`)

Method notes:
- Test inventory via `find src -name "*.test.*" -o -name "*.spec.*"` → **313 test files**.
- Route count via `grep -o '<Route ' src/routes/FullAppRoutes.tsx` → **418** `<Route>` elements (610 across `src/App.tsx` + all `src/routes/*.tsx`, incl. shells/layout routes). The "~415 routes" figure is confirmed.
- CI truth via `.github/workflows/ci.yml` + `gh run list --workflow=ci.yml` (read-only API).
- 10 test files sampled and read in full/head for behavior-vs-trivial classification.

---

## 1. Test inventory — per top-level `src/` directory

| Directory | Test files |
|---|---:|
| `src/components` | 140 |
| `src/hooks` | 45 |
| `src/pages` | 37 |
| `src/modules` | 31 |
| `src/lib` | 28 |
| `src/__tests__` | 10 |
| `src/registry` | 9 |
| `src/features` | 7 |
| `src/test` | 2 |
| `src/store`, `src/routes`, `src/contexts`, `src/context` | 1 each |
| **Total** | **313** |

Module hot-spots: `src/modules/project-work-hub` alone holds 19 of the 31 module tests; `src/modules/tasks` 6; `src/modules/project-hub` 4; `src/modules/product-backlog` 1; `src/modules/workhub` 1. **17 of 22 module directories have zero tests** (backlog, budget, capacity-planner, command-center, epic-balancing, feature-backlog, in-jira, incidents, kanban, objectives, okr-v2, plan, priorities, product-roadmap, program-epics, task10, work-hub).

### Hub coverage map (src unit/component tests matching hub name)

| Hub | Test files | Notes |
|---|---:|---|
| chat | 32 | strongest hub — incl. RLS isolation + presence (but see 0906: skipped in CI) |
| admin | 26 | sidebar parity, guards, dialogs — good behavioral mix |
| project-hub / project-work-hub | ~38 | repo, drag-rank, subtasks, breadcrumbs — best-covered hub |
| kanban | 14 | board adapters incl. incident adapter |
| backlog | 9 | incl. drag/rank write tests |
| release / releasehub | 7 | mostly source-grep wiring guards + pure-fn readiness/confidence |
| workhub | ~10 (hooks) | filter/derived-view hooks |
| incidenthub | **1** | `src/components/kanban/__tests__/incidentHubBoardAdapter.test.ts` only — adapter unit; zero page/hook/RLS tests |
| product-hub / producthub | **1** | `src/pages/product-hub/__tests__/no-category-column.test.ts` — a source-grep ban-enforcement file; zero behavioral tests for either page tree |
| **testhub** | **0** | (2 Playwright specs exist in `tests/test-management/` but run in no workflow — §3) |
| **sprints** | **0** | zero matches despite active sprint feature work (CAT-SPRINTS-NATIVE-20260702-002) |
| **okr** (modules/objectives, okr-v2, components/okr) | **0** | |
| **risks** (`src/pages/risks`) | **0** | only match is `CatyWorkloadRisk.test.tsx` (for-you widget, not risks hub) |
| **capacity** (capacity, capacity-planner, capacity-heatmap) | **0** | |
| **knowledge-hub** (pages/KnowledgeHub*, components/knowledge-hub, kb) | **0** | |

**7 hubs with effectively ZERO tests: testhub, sprints, okr, risks, capacity, knowledge-hub, product-hub(both trees) — plus incidenthub at 1 adapter-only file.**

---

## CAT-AUDIT-0901 — CI has been 100% dead since 2026-05-16: every gate (tests, build, tsc, ratchets) skipped on all recent runs

- **Category:** Regression / CI integrity
- **Severity:** P0 — the entire regression safety net is offline while commits land on main daily
- **Surface:** all · **Route:** n/a · **Component:** n/a · **Mode:** n/a · **CRE:** n/a (CRE gate also dead) · **ADS:** ADS color+audit ratchets also dead · **Typography:** n/a · **Performance:** n/a · **Accessibility:** n/a
- **File Path:** `.github/workflows/ci.yml`
- **Evidence:** `gh run list --workflow=ci.yml --limit 30` → **30/30 conclusion=failure**. Latest run step breakdown: `Install dependencies: failure` → Type check, Lint, ADS color ratchet, ADS audit ratchet, CRE gate, Build, **Run tests: all `skipped`**. Last successful run: **2026-05-16T16:46:33Z** ("fix(tests): resolve all 4 failing test suites — 1018/1018 green") — ~7 weeks ago. Recent commits (8c4ee056c, b8a9a87f9, 948124941…) merged to main with red CI.
- **Why:** `npm install` fails in CI (the ci.yml comments document a fragile install chain: no lockfile, legacy-peer-deps, rollup re-hoist, sync-deps pre-warm). Once install broke, every downstream gate silently became decorative. Nothing has been type-checked, built, color-gated, or tested by CI since mid-May.
- **Recommended Fix:** (1) Fix the install step (commit a lockfile or pin the failing dep — root-cause via `gh run view <id> --log-failed`); (2) enable branch protection requiring the `build` job on main; (3) add a CI-health alert (badge in README / scheduled check) so a red streak >2 runs is impossible to miss.
- **Regression Risk:** None from fixing; the risk is the status quo.
- **Validation Required:** One green run on `gh run list`; then confirm the "Run tests" step actually executes and reports a non-zero test count.
- **Suggested PR:** `fix(ci): restore npm install so type-check/build/ratchets/tests execute again` (overlaps LANE-11 git-ci — coordinate)

## CAT-AUDIT-0902 — CI green ≠ tested: `--passWithNoTests` + `continue-on-error` on tsc and lint

- **Category:** Regression / CI gate weakness
- **Severity:** High
- **Surface:** all · **Route:** n/a · **Component:** n/a · **Mode/CRE/ADS/Typography/Performance/Accessibility:** n/a
- **File Path:** `.github/workflows/ci.yml` (steps "Type check", "Lint", "Run tests")
- **Evidence:** `Run tests: npx vitest run --passWithNoTests` — if include-glob collection ever returns 0 files (config move, glob typo, vitest startup regression that collects nothing), the step is green with zero tests executed. `Type check … continue-on-error: true` (~157 baseline errors) and `Lint … continue-on-error: true` — both are informational, not gates. Even when CI was green (pre-05-16), the only truly blocking checks were the two ADS ratchets, the CRE gate, and `vite build`.
- **Why:** A green checkmark on a PR currently proves at most "it builds and didn't add hex colors". Type errors, lint errors, and (under a collection failure) all 313 unit tests can regress without turning CI red.
- **Recommended Fix:** (1) Drop `--passWithNoTests`; (2) better: assert a minimum collected-test floor (`vitest run --reporter=json` + jq check `numTotalTests > 250`); (3) replace tsc `continue-on-error` with a baseline ratchet identical in spirit to `scripts/ads-color-gate.cjs` (fail if error count > 157 committed baseline, ratchet down); same for lint warnings.
- **Regression Risk:** May surface currently-hidden failures on first strict run — that is the point; use ratchets to avoid blocking on pre-existing debt.
- **Validation Required:** Deliberately break one test on a branch → CI red. Delete the include glob on a branch → CI red (not green).
- **Suggested PR:** `ci(gates): remove passWithNoTests, add test-count floor + tsc/lint baseline ratchets`

## CAT-AUDIT-0903 — Seven hubs ship with zero automated tests (sprints, okr, risks, capacity, knowledge-hub, testhub, product-hub)

- **Category:** Test coverage gap
- **Severity:** High
- **Surface:** sprints, OKR, risks, capacity, knowledge-hub, testhub, product-hub, incidenthub (near-zero) · **Route:** all routes under `/sprints`, okr/objectives, `/risks`, capacity, knowledge-hub, testhub, product-hub trees · **Component:** entire hub trees · **Mode/CRE/ADS/Typography/Performance/Accessibility:** n/a
- **File Path:** `src/pages/risks/`, `src/pages/testhub/`, `src/pages/producthub/`, `src/pages/product-hub/`, `src/pages/KnowledgeHub*.tsx`, `src/modules/okr-v2/`, `src/modules/objectives/`, `src/modules/capacity-planner/`, `src/components/capacity*/`, `src/components/okr/`, `src/components/knowledge-hub/`
- **Evidence:** grep of the 313-file test inventory: `sprint`→0, `okr`→0, `capacity`→0, `knowledge`→0, `testhub`→0, `producthub`→0; `risk`→1 false positive (`CatyWorkloadRisk` in for-you); `product-hub`→1 (source-grep ban file, no behavior); `incidenthub`→1 (adapter unit only). Contrast: chat 32, admin 26, project-work-hub 19.
- **Why:** Coverage tracks where incidents already happened (project-work-hub, admin, chat), not where users navigate. Sprints is under **active development right now** (CAT-SPRINTS-NATIVE-20260702-002, sprint-health FK fix 948124941 shipped without a test) with zero regression protection.
- **Recommended Fix:** Minimum-viable per hub: 1 adapter/repo unit test (pure functions — cheapest, matches the `incidentHubBoardAdapter.test.ts` pattern) + 1 route-smoke Playwright spec (see 0904 gate set). Start with sprints (active work) and testhub (has Playwright specs already written — just wire them, §0907).
- **Regression Risk:** None (additive).
- **Validation Required:** New tests fail when the covered behavior is deliberately broken.
- **Suggested PR:** `test(hubs): seed adapter+smoke coverage for sprints, okr, risks, capacity, knowledge-hub`

## CAT-AUDIT-0904 — Zero route-level smoke tests for 418 routes; Playwright coverage = 31 Storybook stories from ~6 components

- **Category:** Test coverage gap / E2E
- **Severity:** High
- **Surface:** all routed surfaces · **Route:** 418 `<Route>` elements in `src/routes/FullAppRoutes.tsx` (610 incl. App.tsx + shells) · **Component:** n/a · **Mode:** light+dark both untested at route level · **CRE:** n/a · **ADS:** visual regression exists only for Storybook atoms · **Typography:** n/a · **Performance:** n/a · **Accessibility:** axe runs only against Storybook stories, never against a real route
- **File Path:** `tests/` (9 spec files total), `playwright.config.ts`, `playwright.ads.config.ts`
- **Evidence:** `tests/ads/visual/stories.visual.spec.ts-snapshots/` = **62 PNGs = 31 stories × light/dark**, spanning only ads-button, ads-breadcrumbs, ads-lozenge, ads-statuslozenge, ads-inlineedit (`fetchStories()` auto-discovers from Storybook `index.json`, so coverage = published stories, and ~6 component families are published). Remaining specs: `tests/test-management/` 2 specs (smoke + golden-path — the ONLY route-navigating specs in the repo, scoped to the tests module of one project), `tests/in-jira/parity/` 5 specs. Ratio: **418 routes : 1 route-family smoke spec**. No workflow runs any of them (grep `playwright` across `.github/workflows/` → only `design-compliance.yml`, which uses raw playwright for its own screenshot audit, not these suites; `test:visual`/`test:a11y` npm scripts appear in no workflow).
- **Why:** A refactor can 404, blank-screen, or error-boundary any of ~400 routes and nothing automated notices. This is precisely the class of regression the operating contract bans.
- **Recommended Fix:** Route smoke matrix — see "Proposed per-PR regression gate set" below.
- **Regression Risk:** None (additive).
- **Validation Required:** New smoke suite red when a hub route is deliberately broken (e.g. rename a lazy import).
- **Suggested PR:** `test(smoke): per-hub route smoke matrix (light+dark, error-boundary + console assertions)`

## CAT-AUDIT-0905 — Weak tests: assertion-swallowing `.catch(() => {})`, tautological asserts, self-referential placeholder

- **Category:** Test quality
- **Severity:** Medium (High for the two named files — they create false confidence)
- **Surface:** backlog, hub icons · **Route:** n/a · **Component:** BacklogPage, hub icon registry · **Mode/CRE/ADS/Typography/Performance/Accessibility:** n/a
- **File Path:** `src/pages/BacklogPage.test.tsx`; `src/__tests__/hub-icon-parity.test.ts`; pattern grep: 3 files use `.catch(() => {})`, 1 uses `toBeGreaterThanOrEqual(0)`
- **Evidence (10-file sample, behavior vs trivial):**
  | File | Verdict |
  |---|---|
  | `src/pages/BacklogPage.test.tsx` | **WEAK** — every `waitFor(...).catch(() => {})` swallows assertion failures (lines 55-58, 63-67, 87-91); `expect(buttons.length).toBeGreaterThanOrEqual(0)` is tautological; `expect(container.firstChild).toBeInTheDocument()` passes for any render incl. an error boundary. 5 tests, ~0 real assertions. |
  | `src/__tests__/hub-icon-parity.test.ts` | **WEAK** — self-admitted "placeholder" (line 28-30): asserts its own fixture constants are defined; never reads an SVG. 11 green tests proving nothing. |
  | `src/components/admin/__tests__/admin-sidebar-parity.test.ts` | GOOD — real registry parity, actionable failure message |
  | `src/components/kanban/__tests__/incidentHubBoardAdapter.test.ts` | GOOD — pure-function behavior with fixture builder |
  | `src/modules/project-work-hub/lib/__tests__/workItemRepo.move.test.ts` | GOOD — TDD contract + mock-interaction assertions |
  | `src/components/__tests__/RouteRoleGuard.test.tsx` | GOOD — behavioral guard contract (allow/deny/loading) |
  | `src/hooks/workhub/__tests__/useLinkedEntities.test.ts` | GOOD — pure mapper incl. zero-assumption fallback case |
  | `src/__tests__/chat/chat-rls-isolation.test.ts` | GOOD but `describe.skipIf(!creds)` → never runs in CI (0906) |
  | `src/pages/product-hub/__tests__/no-category-column.test.ts` | source-grep guard (intentional ban enforcement, not behavior) |
  | `src/pages/releasehub/__tests__/release-filters-wiring.test.ts` | mostly source-grep + 1 real assertion |
  Broader pattern: **85 of 313 test files (27%) use `readFileSync`** — source-grep regex tests. Legitimate as ban/wiring ratchets, but they assert source text, not behavior, and shatter on benign refactors (e.g. `release-filters-wiring` regexes on route-attribute ordering in `FullAppRoutes.tsx`).
- **Why:** Green test counts overstate real protection; the two weak files are pure noise.
- **Recommended Fix:** Delete or rewrite `BacklogPage.test.tsx` (remove `.catch()`, assert on mocked-data rows actually rendering) and `hub-icon-parity.test.ts` (parse the real SVG registry or delete). Add an ESLint rule / grep gate banning `.catch(() => {})` inside `*.test.*`.
- **Regression Risk:** None — these tests currently cannot fail.
- **Validation Required:** Rewritten BacklogPage test fails when the supabase mock returns an error.
- **Suggested PR:** `test(quality): remove assertion-swallowing catches + placeholder parity test`

## CAT-AUDIT-0906 — Chat RLS/security tests silently skipped in CI (no Supabase creds provided)

- **Category:** Test coverage gap / security regression
- **Severity:** Medium
- **Surface:** chat · **Route:** n/a · **Component:** `chat_is_member()` RLS · **Mode/CRE/ADS/Typography/Performance:** n/a · **Accessibility:** n/a
- **File Path:** `src/__tests__/chat/chat-rls-isolation.test.ts` (also `presence.test.ts`)
- **Evidence:** `describe.skipIf(!hasSupabaseCreds)` where creds = `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; `.github/workflows/ci.yml` sets no env/secrets on the "Run tests" step → these cross-user isolation tests have never executed in CI, and (0901) CI hasn't run tests at all since 05-16 anyway.
- **Why:** The one suite guarding cross-user data isolation is permanently skipped where it matters. RLS regressions ship invisibly.
- **Recommended Fix:** Provide staging-project secrets to CI (staging ref `cyijbdeuehohvhnsywig`, per CLAUDE.md never prod) as repo secrets, or split into a scheduled `rls-tests.yml` job; at minimum make the skip loud (report "SKIPPED: N security tests" in the job summary).
- **Regression Risk:** Low — test-only; use dedicated staging fixtures (the file already uses deterministic UUIDs + cleanup).
- **Validation Required:** CI log shows the describe block executed, not skipped.
- **Suggested PR:** `ci(security): run chat RLS isolation tests against staging in CI`

## CAT-AUDIT-0907 — Playwright suites orphaned: 9 spec files, 0 workflows, no `npm test` entry point

- **Category:** Test infrastructure
- **Severity:** Medium
- **Surface:** testhub, ADS Storybook, in-jira parity · **Route:** n/a · **Component:** n/a · **Mode:** visual suite is the only light/dark check in the repo and it never runs · **CRE:** n/a · **ADS:** `test:visual` (0.01 threshold) + `test:a11y` (axe WCAG 2.1 AA, "CG-12") both unwired · **Typography/Performance:** n/a · **Accessibility:** a11y gate exists but never enforced
- **File Path:** `playwright.config.ts`, `playwright.ads.config.ts`, `tests/**`, `package.json`
- **Evidence:** `package.json` scripts contain `test:visual`, `test:visual:webkit`, `test:a11y` — but **no `test` script at all** (`npm test` errors). No workflow references playwright configs or these scripts. `tests/test-management/smoke.spec.ts` (255 lines, real tab-navigation + CTA assertions for the testhub module) and `golden-path.spec.ts` are complete but unreachable except by hand. Baseline snapshots (62 PNGs) are `-darwin` suffixed — CI (ubuntu) would need linux baselines generated once.
- **Why:** Working, already-written regression suites (incl. the ONLY testhub coverage and the ONLY dark-mode visual check) rot unexecuted; snapshot baselines drift from reality.
- **Recommended Fix:** Add `"test": "vitest run"` and `"test:e2e": "playwright test"`; add a CI job (after 0901 is fixed) running `npm run test:visual` + `npm run test:a11y` against built Storybook (`build-storybook` + static serve, as the config header itself recommends), and the test-management smoke spec against `vite preview`. Generate linux snapshot baselines in that job's first run.
- **Regression Risk:** Visual suite may be flaky cross-OS — the 0.01/0.001 thresholds are documented as tuned for this; keep `retries: 1`.
- **Validation Required:** Both jobs green on an unchanged branch; visual job red when a story's token is deliberately changed.
- **Suggested PR:** `ci(e2e): wire playwright ads + test-management suites into CI`

## CAT-AUDIT-0908 — No coverage measurement anywhere: no thresholds, no reports, no visibility

- **Category:** Test infrastructure
- **Severity:** Low
- **Surface:** all · **Route/Component/Mode/CRE/ADS/Typography/Performance/Accessibility:** n/a
- **File Path:** `vitest.config.ts` (no `coverage` block), `package.json` (no coverage script), `.github/workflows/ci.yml` (no coverage step/artifact)
- **Evidence:** grep `coverage` in vitest.config.ts/package.json/ci.yml → nothing. 313 test files but no way to know what fraction of ~453 page files / 418 routes / hubs they exercise except manual audits like this one.
- **Why:** The zero-test-hub blind spot (0903) persisted invisibly because nothing reports it.
- **Recommended Fix:** `vitest run --coverage` (add `@vitest/coverage-v8`), publish the summary as a CI artifact/job-summary. Do NOT add a global threshold yet (would block on debt); add per-directory floors for the zero hubs once seeded.
- **Regression Risk:** None.
- **Validation Required:** Coverage summary visible in CI job output.
- **Suggested PR:** `test(coverage): add v8 coverage reporting to vitest CI step`

---

## 5. Proposed per-PR regression gate set

Prerequisite: **CAT-AUDIT-0901 (fix `npm install` in CI) — nothing below matters until install is green.**

**Tier 1 — every PR, blocking (target <10 min):**
```bash
npx tsc -p tsconfig.app.json --noEmit        # ratchet vs 157-error baseline (0902), then hard gate
npm run lint                                  # promote from continue-on-error via warning-count ratchet
npm run lint:colors:gate                      # existing, keep
npm run audit:ads:gate                        # existing, keep
npm run lint:cre                              # existing, keep
npx vitest run                                # NO --passWithNoTests; add collected-count floor (>250)
npm run build                                 # existing vite build step, keep
```

**Tier 2 — every PR touching `src/**`, blocking (Playwright, needs `vite preview` server):**
- **Route smoke matrix** (new `tests/smoke/routes.smoke.spec.ts`, driven by a route-list fixture): minimum 16 representative routes — one per hub: `/` (for-you), project-hub backlog, project-hub board (kanban), product-hub, work-hub, release-hub (`/release-hub`), incidenthub, testhub (tests module route from `tests/test-management/smoke.spec.ts:11`), sprints, okr/objectives, risks, capacity, chat, knowledge-hub, admin (`/admin/...` from `REGISTERED_ADMIN_ROUTES`), reports. Per route assert: HTTP-mounted (no NotFound), no React error boundary text, `main`/app shell non-empty, zero console errors.
- **Light/dark screenshot checks:** run the same matrix twice with theme forced (the mechanism `tests/ads/visual` already uses for `--dark`); `toHaveScreenshot` with the established `threshold: 0.01, maxDiffPixelRatio: 0.001` from `playwright.ads.config.ts`.
- **Dialog interaction checks:** per hub with a create CTA — open create dialog, assert focus trapped + Escape closes (pattern already written in `tests/test-management/smoke.spec.ts` CTA checks).
- **A11y:** run axe (reuse `tests/ads/a11y/stories.a11y.spec.ts` harness, WCAG 2.1 AA) against each smoke route, not just Storybook.
- **Storybook gates:** `npm run test:visual` + `npm run test:a11y` against static `build-storybook` output (0907).

**Tier 3 — scheduled/nightly (not per-PR):**
- `tests/in-jira/parity/*` five parity projects (`playwright.config.ts`) — need live Jira, keep out of PR path.
- Chat RLS suite with staging creds (0906).
- `npm run test:visual:webkit`.

Branch protection on `main` requires Tier 1 + Tier 2 jobs. All new ratchets follow the existing `scripts/ads-color-gate.cjs` baseline-file pattern so pre-existing debt never blocks, only regressions do.

---

## Lane Summary

- **313 unit/component test files** in `src/`, but coverage is inverted vs risk: chat (32), admin (26), project-work-hub (19+) are rich while **7 hubs have zero tests** — sprints (under active development), okr, risks, capacity, knowledge-hub, testhub, product-hub — and incidenthub has one adapter file.
- **CI is fully dead (P0):** all 30 most recent runs fail at `npm install`; every downstream gate — tsc, lint, ADS ratchets, CRE gate, build, **and the test step — has been skipped on every run since 2026-05-16**. Commits merge to main with red CI. This supersedes the "CI green ≠ tested" concern: currently there is no CI at all.
- Even when restored, the test step is soft: `--passWithNoTests`, tsc and lint `continue-on-error` (0902).
- **E2E is 31 Storybook stories vs 418 routes:** the only route-navigating specs (test-management smoke/golden-path) plus the ADS visual/a11y suites run in **zero workflows**; there is not even an `npm test` script (0904, 0907).
- Quality: 8/10 sampled files assert real behavior; 2 are noise (`BacklogPage.test.tsx` swallows every assertion via `.catch(() => {})`; `hub-icon-parity.test.ts` is a placeholder asserting its own fixtures). 27% of the suite (85 files) are source-grep ratchets, not behavior tests (0905). Security-critical chat RLS tests are permanently skipped in CI (0906). No coverage measurement exists (0908).
- Findings: CAT-AUDIT-0901 (P0), 0902–0904 (High), 0905–0907 (Medium), 0908 (Low). Gate-set proposal in §5 reuses existing scripts (`lint:colors:gate`, `audit:ads:gate`, `lint:cre`, `test:visual`, `test:a11y`) plus a 16-route smoke matrix.
