# Plan Lock — CAT-TESTHUB-CERT-20260708-001

**Status**: PARTIAL — Slice 1 (harness hardening) executed and locked. Slices 2+ (persona journeys) BLOCKED, cannot start.

## Objective
Certify `/testhub/*` as production-shippable for a real Senaei BAU QA persona via headless Playwright, GREEN/AMBER/RED verdict with evidence.

## Non-scope
- No rebuild of Test Hub features (CAT-TESTHUB-V2-SPRINT-RELEASE already merged, 28/30 accepted).
- No "fix" of `/testhub/sets` → `/testhub/plans` redirect — confirmed intentional (D-004).
- No rewrite of `TestHubSection.tsx` legacy `th_test_executions` read unless it actively breaks a mandatory journey (non-blocking per V2 handover).
- No Supabase schema/migration changes.

## Blocker — HARD STOP
**No valid authentication credential exists.** `test@example.com` / `testpassword123` (used by every existing spec: `smoke.spec.ts`, `golden-path.spec.ts`, `e2e/forecast.spec.ts`) returns "email or password you entered is incorrect" against the live app at `localhost:8080` (staging Supabase project `cyijbdeuehohvhnsywig`). No service-role key in any repo `.env*` file, no self-service signup route found in `src/routes`/`src/pages`. Supabase MCP connector unauthenticated this session.

**Every one of the 12 mandatory journeys requires an authenticated session.** Per the run's own stop condition ("stop only for destructive production risk or missing credentials — document blocker and continue non-auth tests"), this is that condition. Logged as `DEF-001` in `DEFECT_REGISTER.md`.

**Unblock options** (need one from Vikram/user):
1. Real tester credentials for the staging Supabase project, or
2. Supabase MCP authorized so a disposable `E2E-SENAEI-BAU-<timestamp>` user can be created.

## Slice 1 — Harness hardening (COMPLETE, timeboxed <2h)
Files touched:
- `playwright.config.ts` — fixed `baseURL`/`webServer.url` from `5173` → `8080` (matches `vite.config.ts:381` `strictPort: true`). This bug silently broke **every** Playwright project in the repo, not just Test Hub — confirmed via a real run (`Process from config.webServer was not able to start`). Also registered a new `testhub-certification` project (`testMatch: '**/testhub-certification/**/*.spec.ts'`).
- `tests/testhub-certification/00-harness-probe.spec.ts` (new) — auth probe, confirmed harness reaches the live app and captured the login-failure screenshot proving the credential blocker.

Validation run: `npx playwright test tests/testhub-certification/00-harness-probe.spec.ts --project=testhub-certification` → passes (harness works); screenshot at `test-results/testhub-certification/screenshots/00-auth-probe.png` shows the real "incorrect email or password" state.

Static checks completed (no auth required):
- `npm run lint:colors:testhub` → 0 violations across 122 files (ADS token compliance clean).
- Grep sweep of `src/pages/testhub/**`, `src/components/testhub/**` for `coming soon|placeholder|not yet implemented|stub` → 0 matches.
- Confirmed via grep: **zero `data-testid` attributes** across all `src/pages/testhub/**/*.tsx` files (RepositoryPage, TestPlansPage, ExecutionsPage, DefectDetailPage, TraceabilityPage, reports/lab/*, etc. all 0). This is a real, pre-existing gap (matches cert pack item 5) — queued as Slice 2 prerequisite, NOT fixed blind without an authenticated screenshot to verify against (screenshot-signoff rule).

## Slice 2+ — Persona journeys (BLOCKED, not started)
Phases B–J from the certification pack (nav sweep, repository authoring, plans, executions/cycles, runner, defects/traceability, reports, non-functional) all require login. Spec skeletons will be authored once credentials are confirmed working, using `data-testid`-based selectors added incrementally per screen as each journey is actually exercised (never added blind).

## Validation commands
```
npx playwright test --project=testhub-certification
npm run lint:colors:testhub
npm run audit:ads:gate
```

## Stop conditions
- Missing/invalid credentials → STOP (current state).
- Any destructive production DB action → STOP, ask first.
- Any slice exceeding 2h → split, do not continue past timebox without re-lock.

## Drift/rebaseline rule
If credentials arrive, re-open this Plan Lock as v2 with the confirmed working account and the concrete Slice 2 file/journey list before writing any more specs.
