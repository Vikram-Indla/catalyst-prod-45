# CAT-TESTHUB-CERT-20260708-001 — Read Me First

**Objective**: E2E production-readiness certification of Test Hub (`/testhub/*`) as a real Senaei BAU QA persona, headless Playwright, with a GREEN/AMBER/RED verdict backed by evidence.

**Context this builds on**: CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 (merged 2026-07-06, 28/30 acceptance) is the current baseline. This is a *certification* pass, not a rebuild — fixes here are minimal/reversible only, scoped to what blocks a real tester from completing the journeys below.

**Known-good facts from discovery (do not re-litigate)**:
- `/testhub/sets` → redirect to `/testhub/plans` is an **intentional decision** (D-004, CAT-TESTHUB-ENGINE). Sidebar "Test Sets" landing on Plans is by design, not a defect. Certify it as designed; do not "fix" the redirect.
- All 16 route families and 28 report slugs are live in code (`src/routes/FullAppRoutes.tsx:676-722`, `src/components/testhub/reports/report-registry.ts:38-334`).
- `TestHubSection.tsx` (story detail modal) reads legacy `th_test_executions` — known non-blocking drift, log but do not attempt a rewrite of that extension in this pass unless it actively breaks a mandatory journey.

**Hard blocker accepted going in**: Supabase MCP unauthenticated this session → all `expectedDb` assertions in the ledger are recorded as `UNVERIFIED-NO-DB-ACCESS`, not pass/fail. This is the top P0 gap in the final verdict, not a silent gap.

Read next: `01_OBJECTIVE.md`, `03_PLAN_LOCK.md`.
