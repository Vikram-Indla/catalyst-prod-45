# PLAN LOCK — SPRINTS-NATIVE (Phase 3, Slice 1: health FK fix)

**Status:** APPROVED — implemented (see `06_VALIDATION_EVIDENCE.md` VG-002)
**Approved by:** Vikram ("go", 2026-07-03)
**Timebox:** 2 hours from approval
**Slice:** Phase 3 Slice 1 of 6 (slice order agreed with Vikram in `07_HANDOVER.md` "PHASE 3 — PROPOSED SLICE ORDER", not previously Plan-Locked)

---

## OBJECTIVE

`src/features/health/adapters/entity.ts` (`useEntityHealthAdapter`) currently matches sprint work-item membership via `ph_issues.sprint_release` JSONB `.contains()` — a path `SPRINT_CONFIG.matchIssueByFk` in `src/lib/entity-hub/config.ts:154` explicitly documents as dead for sprints since D-002/S0.2b. Any sprint health score computed today is silently wrong (matches by stale JSONB name, not the live `sprint_id` FK). Fix: when the adapter is invoked for a sprint-kind config, query `ph_issues` filtered by `sprint_id` FK instead — mirroring the already-shipped, already-correct pattern in `WorkItemsSection.tsx:239-251`. Release-kind health (`config.kind === 'timeline'`) is unaffected; it keeps the existing JSONB-contains + fallback-scan path, since releases have no FK equivalent.

Done = `useEntityHealthAdapter` branches on `config.matchIssueByFk`; when set, queries `.eq(config.matchIssueByFk, entityId)` against `ph_issues` instead of the JSONB contains/fallback; release path byte-for-byte unchanged; a DB probe on a known sprint confirms the FK-matched row set is correct and differs from (or matches, where FK/JSONB happen to agree) the old JSONB-matched set.

## NON-SCOPE (this slice)

- Wiring a health card into `ReleaseSidePanel.tsx` for sprints (Phase 3 Slice 2 — health engine has zero UI references there today; this slice only fixes the adapter's query, it is not yet rendered for sprints anywhere).
- AI summary + cache (Slice 3), time-in-status/efficiency (Slice 4), scope-change history (Slice 5), dependencies (Slice 6).
- Any change to `WorkItemsSection.tsx` (already correct — the reference implementation, untouched).
- Any change to `SPRINT_CONFIG`/`RELEASE_CONFIG` in `config.ts` (the `matchIssueByFk`/`matchIssueByField` fields already exist and are already correct; this slice only makes the health adapter *read* them).
- Migration-ledger drift, prod strategy — both explicitly deferred per Vikram (D-013, memory `feedback-functionality-over-migrations`).

## CANONICAL COMPONENTS SELECTED

None — this is a data-fetching bug fix inside an existing hook (`useEntityHealthAdapter`). No new UI is rendered; the health panel is not yet wired into any sprint-facing surface (confirmed via `grep` — zero references to `useHealthSignals`/`HealthPanel` in `ReleaseSidePanel.tsx`). No component discovery needed.

## CANONICAL SCREENS SELECTED

None rendered this slice. Consumers of the fixed adapter (`useHealthSignals` → `useEntityHealthAdapter`) today: `ReleaseDetailPage.tsx` (`healthOpen` panel, release-kind only in practice — sprint kind wires the scope but no UI toggle surfaces it yet per Slice-2 scope). No route changes.

## FILES TO MODIFY

| File | Change | Summary |
|---|---|---|
| `src/features/health/adapters/entity.ts` | edit | In `useEntityHealthAdapter`'s `queryFn` (lines 61-87): branch on `config.matchIssueByFk`. If set, query `ph_issues.select(INSIGHTS_SELECT columns).eq(config.matchIssueByFk, entityId).limit(2000)` — no JSONB contains, no fallback scan (FK is exact, unlike the JSONB name-match). If not set (release path), keep the existing `contains('sprint_release', ...)` + fallback-scan logic byte-for-byte. |

## FILES FORBIDDEN

- `src/components/releases/detail/WorkItemsSection.tsx` — already correct (D-002 reference implementation), not touched this slice.
- `src/lib/entity-hub/config.ts` — `matchIssueByFk`/`matchIssueByField` already correctly declared; read-only for this slice.
- `src/components/releases/detail/ReleaseSidePanel.tsx` — health-card wiring is Slice 2, out of scope here.
- `src/features/health/hooks/useHealthSignals.ts` — facade already passes the correct `entityId` (`scope.sprintId` = the sprint UUID, confirmed via `ReleaseDetailPage.tsx:563` `{ moduleKey: 'sprint', sprintId: release.id }`); no change needed.
- `src/pages/Sprints.tsx`, `SprintBoard.tsx` — legacy SAFe `iterations` stack, untouched.
- `src/lib/statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts` — global regression surface (D-006).
- `rh_*` release-ops tables/pages — untouched.
- Anything prod-targeting (`lmqwtldpfacrrlvdnmld`) — explicitly deferred (D-013).

## UI/UX RULES

No visual changes this slice (no UI currently renders sprint health — see NON-SCOPE). N/A for ADS tokens/spacing/JiraTable rules; nothing styled is touched.

## DATA/BACKEND RULES

- `ph_issues.sprint_id` column already exists and is already the live FK write-path (used by `WorkItemsSection.tsx`'s move/remove mutations and by the DoD/approval trigger stack shipped in Phase 2). No migration needed.
- Query is read-only (`.select().eq().limit()`), no RLS impact.
- snake_case raw rows preserved; no assumption defaults introduced.
- Zero-assumption: if `entityId` is null for a sprint-kind config, the query stays gated by the existing `enabled: !!entityId && !!entityName` — unchanged.

## INTEGRATION/WIRING RULES

- Hook touched: `useEntityHealthAdapter` (edit). `useHealthSignals` (facade) and `useBoardInsights`'s `computeInsights`/`INSIGHTS_SELECT` are consumed unchanged.
- No edge functions. No new hooks. No new query keys (the existing `['entity-health', config.kind, entityId]` key is unaffected — same shape, different row-source).
- Contract: `config.matchIssueByFk` (typed `'sprint_id'` in `EntityConfig`) is the discriminator — mirrors the discriminator already used in `WorkItemsSection.tsx` (`config.kind === 'sprint'`), but keyed off the config field directly so any future FK-matched entity kind gets the fix for free without another `kind === 'sprint'` special-case.

## PARALLEL EXECUTION PLAN

Single-file, single-branch fix — no parallel discovery agents needed (canonical pattern, reference implementation, and consuming call sites are already fully traced above). Single-threaded implement → verify.

## SCREENSHOT CHECKLIST

No screenshots this slice — there is no UI surface today that renders sprint health (confirmed: zero references in `ReleaseSidePanel.tsx`; Slice 2 adds the UI). Per CLAUDE.md, "screenshots do not prove functionality" — functional proof here is a DB/API probe instead:
- [ ] DB probe: for one sprint with known members (e.g. a sprint used in `VG-001`'s evidence trail), compare row count/IDs from `.eq('sprint_id', <id>)` against the old `.contains('sprint_release', ...)` result for the same sprint name — confirm the FK path returns the true live membership.
- [ ] Adjacent regression: release-kind health query (JSONB path) returns identical results before/after the diff (byte-for-byte unchanged branch).

## VALIDATION COMMANDS

```bash
npx tsc -p tsconfig.app.json --noEmit   # compare error count to ~183 baseline (07_HANDOVER.md)
npm run lint:colors:gate
npm run audit:ads:gate
# DB probe (PostgREST, staging cyijbdeuehohvhnsywig): compare sprint_id-FK row set
# vs sprint_release-JSONB row set for one known sprint
```

## STOP CONDITIONS

- Any file outside `entity.ts` needs changes → RED FLAG.
- Release-kind (JSONB) path produces different results after the edit → regression, stop.
- `ph_issues.sprint_id` column missing/renamed (re-verify via `information_schema` before editing if any doubt) → stop, inspect.
- tsc error count rises above baseline; either ratchet gate fails; slice exceeds 2h.

## DRIFT/REBASELINE RULES

Per template: stop → `08_DRIFT_LOG.md` → rebaseline approval → mark SUPERSEDED → new Plan Lock.

## Plan Lock status

DRAFT — awaiting Vikram/JK review. **No code until APPROVED.**

---
---

# SUPERSEDED — original S0.1a lock (see `08_DRIFT_LOG.md` DRIFT-003)

> Archived below for history. This slice shipped long ago (Phase 0/1/2 all shipped — DRIFT-001/002). Content kept verbatim, not deleted, per append-only discipline.

# PLAN LOCK — SPRINTS-NATIVE (slice S0.1a)

**Status:** DRAFT (historical — slice shipped without formal re-lock, see DRIFT-001)
**Approved by:** — (awaiting Vikram/JK)
**Timebox:** 2 hours from approval
**Slice:** S0.1a of 22 (master slice plan: agents/A6_implementation_plan.md; blueprint: 13_COUNCIL_VERDICT.md + 05_UI_UX_REVIEW.md)

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

## Plan Lock status (historical)

Superseded per DRIFT-003 — Phase 0/1/2 shipped without a matching re-lock. See top of this file for the active Phase 3 Slice 1 lock.
