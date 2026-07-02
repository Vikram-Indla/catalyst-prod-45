# PLAN LOCK — SPRINTS-NATIVE (slice S0.1a)

**Status:** DRAFT
**Approved by:** — (awaiting Vikram/JK)
**Timebox:** 2 hours from approval
**Slice:** S0.1a of 22 (master slice plan: agents/A6_implementation_plan.md; blueprint: 13_COUNCIL_VERDICT.md + 05_UI_UX_REVIEW.md)

---

## OBJECTIVE

Make `ph_jira_sprints` structurally sound for native sprints: codify the out-of-band `slug` column + generation trigger in a checked-in migration; add the native-sprint columns (`deleted_at`, `created_by`, `name_mode`, `length_weeks`, `approval_policy`, `end_date`, `UNIQUE(project_id,name)`); fix `useSprintBySlug` (today it queries a nonexistent `deleted_at`); replace SPRINT_CONFIG's hand-concatenated URLs with `Routes.projectHub.*` builders. Done = a sprint detail page resolves by slug with zero UUID URLs generated, and the new columns are live and probed.

## NON-SCOPE (this slice)

- No FK backfill, no read repoint (S0.2a/b), no status vocabulary change (S0.3), no purge (S0.4), no UI redesign (Phase 1), no DoD/approvals (Phase 2), no analytics (Phase 3).
- No touching Jira sync, statusPalette, kanban, release surfaces.

## CANONICAL COMPONENTS SELECTED

None rendered in this slice (schema + hook + routing only). Feature-wide selections: 02_CANONICAL_DISCOVERY.md.

## CANONICAL SCREENS SELECTED

| Screen | Route | Adapter |
|---|---|---|
| Sprint detail (existing) | /project-hub/:key/sprints/:sprintSlug | none — resolution fix only |
| Sprint list (existing) | /project-hub/:key/sprints | none — navigation fix only |

## FILES TO MODIFY

| File | Change | Summary |
|---|---|---|
| supabase/migrations/20260703090000_sprint_native_columns.sql | add | codify slug + trigger (catalyst_slugify, frozen, -2/-3 dedupe); ADD deleted_at timestamptz, created_by uuid, name_mode text CHECK(auto,custom) DEFAULT 'auto', length_weeks int CHECK(1,2), approval_policy text CHECK(any,all,quorum) DEFAULT 'all', end_date date; UNIQUE(project_id,name). Idempotent (IF NOT EXISTS) — staging already has slug (prod-drift option (a), pending Vikram) |
| src/hooks/useSprintBySlug.ts | edit | keep deleted_at filter (column now real); project-scoped resolution (drop global-slug fallback); extend select with new columns |
| src/lib/entity-hub/config.ts | edit | SPRINT_CONFIG buildDetailHref/buildWorkHref (lines ~144–147): use Routes.projectHub.sprint/sprintWork; remove `?? 'BAU'` fallback |
| src/pages/project-hub/SprintsPage.tsx | edit | handleOpenDetail (~line 218): remove raw-UUID fallback; navigate by slug only |

## FILES FORBIDDEN

Full 14-entry list with reasons: agents/A6_implementation_plan.md §Forbidden. Headline: src/pages/Sprints.tsx + SprintBoard.tsx (legacy iterations), statusPalette.ts, defectWorkflow.ts, kanban columnConfig.ts, rh_* release-ops, Jira sync engine files, summarize-release edge fn, SprintLinker.tsx, ReleasesTable.tsx (this slice), WorkItemsSection.tsx (this slice).

## UI/UX RULES

No visual changes this slice. Feature-wide: ADS tokens only; JiraTable for the list rebuild; Lozenge not ribbon; SUBTLE status tier; sentence case; **"Owner" never "Driver" (D-001)**; 4/8 spacing grid — see 05_UI_UX_REVIEW.md.

## DATA/BACKEND RULES

- Verified live (PostgREST probe 2026-07-02): staging HAS slug, LACKS deleted_at; 26 rows (25 released/1 archived). Migration must be idempotent for slug.
- **RED FLAG standing item: prod (lmqwtldpfacrrlvdnmld) has NO ph_jira_sprints. A5 options: (a) staging-canonical + idempotent migrations (recommended), (b) prod catch-up first, (c) retire prod. DECISION NEEDED before this migration is applied anywhere but staging.**
- snake_case raw rows; no assumption defaults (zero-assumption rule).
- RLS: table policies unchanged this slice; A5 flags anon-writable transitions/approvers policies for the Phase-2/3 slices.

## INTEGRATION/WIRING RULES

- Hooks: useSprintBySlug (edit); useEntities/useEntityProgress untouched.
- No edge functions. No new hooks.
- Contract: slug is the only route param for sprint detail (slug contract); config builders import from src/lib/routes.ts (builders already exist, lines 35–39).

## PARALLEL EXECUTION PLAN

Discovery COMPLETE (A1–A7 in agents/). This slice: single-threaded implement → verify. Next slices re-use the standing agent reports; QA validator re-runs per A7.

## SCREENSHOT CHECKLIST

- [ ] Sprint detail via slug URL — light + dark (reload-into-dark)
- [ ] Sprint list navigation click → URL bar shows slug (no UUID)
- [ ] Adjacent regression: release detail page unaffected (same shared components)
(Full feature checklist: agents/A7_qa_validation.md §1)

## VALIDATION COMMANDS

```bash
npx tsc -p tsconfig.app.json --noEmit   # compare error count to ~157 baseline
npm run lint:colors:gate
npm run audit:ads:gate
# DB probe (PostgREST): confirm new columns + slug trigger fires on INSERT
# DOM probe (Chrome MCP, localhost:8080): /project-hub/BAU/sprints/<slug> resolves
```

## STOP CONDITIONS

- Any file outside FILES TO MODIFY needs changes → RED FLAG.
- Live column set differs from probe (re-run information_schema first — P.1 item 2).
- Prod-drift decision unmade at apply time → apply to staging only, RED FLAG for prod.
- Slug trigger collides with existing out-of-band trigger → stop, inspect pg_trigger.
- tsc error count rises; either ratchet gate fails; slice exceeds 2h.

## DRIFT/REBASELINE RULES

Per template: stop → 08_DRIFT_LOG.md → rebaseline approval → mark SUPERSEDED → new Plan Lock.

---

## MASTER FEATURE LIST (context — subsequent Plan Locks will be cut per slice)

Phase 0 foundations: S0.1a (this) → S0.1b native-transition trigger → S0.2a FK backfill + progress-view repoint → S0.2b UI repoint + sync neuter + changelog instrumentation → S0.3 status vocabulary → S0.4 soft purge.
Phase 1 list+create: S1.1a JiraTable list, S1.1b toolbar/group-by, S1.2 progress, S1.3a autoName util+SQL, S1.3b modal rebuild (Owner, RadioGroup length, DoD editor), S1.4 release link (ph_release_sprints).
Phase 2 lifecycle: S2.1a DoD schema, S2.1b DoD card, S2.2a awaiting_approval DB flow, S2.2b approval actions UI, S2.3 decisions + timestamps.
Phase 3 (gated by D-007 proofs): S3.1a summary cache, S3.1b UI, S3.2 dependencies, S3.3 scope history, S3.4 health, S3.5 time-in-status + efficiency.
Open decisions for approval: prod-drift option; sync-discriminator for native sprints (created_by IS NOT NULL vs jira_sprint_id IS NULL); keep `draft` status?; ENTERPRISE (business request) exclusion from sprints (JK brief says yes).

## Plan Lock status
DRAFT — awaiting Vikram/JK review. **No code until APPROVED.**
