# PLAN LOCK — SPRINTS-NATIVE (Phase 3, Slice 3: AI summary + cache)

**Status:** APPROVED — implemented and live-verified (see `06_VALIDATION_EVIDENCE.md` VG-004, `09_DECISIONS.md` D-022)
**Timebox:** 2 hours from approval
**Slice:** Phase 3 Slice 3 of 6 (renumbered — see `09_DECISIONS.md` D-021; former Slice 2 closed with no build)
**Scope decisions made with the user before drafting this lock (2026-07-03):**
1. Fold the sprint-side FK bug fix in `summarize-release` into this slice (not deferred) — same bug class as D-020, discovered during discovery for this slice.
2. `sprint_insight_cache` is a **shared** cache (no `user_id` column) — one hit benefits every viewer of the sprint, not just the original requester. This deliberately diverges from `board_insight_cache`'s per-user RLS model; rationale below.

---

## OBJECTIVE

Two related fixes, both scoped to the **sprint** entity-kind path only (release path stays byte-for-byte unchanged, mirroring Slice 1's precedent):

**(A) FK bug fix (new finding, not in the original Slice 3 scope).** `supabase/functions/summarize-release/index.ts:96,113-136` (`fetchReleaseContext`) still matches sprint work items via `ph_issues.sprint_release` JSONB `.contains()` (+ client-side fallback scan of the same dead field) — the same `sprint_release` name-match that D-002 declared dead for sprints and that D-020/Slice 1 already fixed in the health adapter. Every sprint AI summary generated today is computed over a stale/wrong item set. Fix: when `entityKind === "sprint"`, query `ph_issues.eq('sprint_id', releaseId)` directly (exact FK match, no contains, no fallback scan needed) — mirrors `WorkItemsSection.tsx:239-251` and this session's own `entity.ts` fix. Release branch (`entityTable === 'ph_releases'`, JSONB contains) is untouched.

**(B) Structural-hash cache.** Port the `hashBoardState` → `board_insight_cache` pattern (`src/components/for-you/atlaskit/CatyBoardInsight.tsx:48-57`, `supabase/migrations/20260616000000_board_insight_cache.sql`) onto sprint summaries: before `useReleaseSummaryStream` invokes the edge function for a sprint, compute a SHA-256 hash over every field the prompt actually consumes (sprint row + linked items — see HASH INPUTS below); check `sprint_insight_cache` for a `(sprint_id, data_hash)` match. On hit, call the store's existing `complete(cachedText)` directly — no network call, no edge-function invocation. On miss, stream as today, then upsert the cache row when the stream reaches `type: 'done'`. Release-kind summaries are completely unaffected (no cache check, no code path change) — caching only fires when `payload.entityKind === 'sprint'`.

Done = (1) a sprint AI summary reflects the true FK-matched item set; (2) opening the same sprint's summary twice with no underlying data change fires the edge function exactly once (network-probed); (3) editing a sprint work item's status/summary/assignee (or adding/removing an item) busts the cache and re-streams a fresh summary (probed); (4) release summaries are provably unchanged (same network/behavior as before this slice).

## HASH INPUTS (exact field list — must be a superset of everything `buildPrompt` consumes, per `index.ts:177-211`)

- Sprint row (`ph_jira_sprints`): `name`, `title`, `description`, `status`, `start_date`, `target_date`, `release_date`.
- Per linked item (`ph_issues`, `sprint_id`-matched, sorted by `issue_key` for determinism): `issue_key`, `issue_type`, `status`, `status_category` (drives the done/in-progress/to-do counts in the prompt — missed in first pass, added after re-reading `countProgress`, `index.ts:144-155`), `priority`, `assignee_display_name`, `parent_key`, `summary`, `jira_created_at`.
- Signature string: one line per item joined `\n`, prefixed by the sprint-row line; hashed with `crypto.subtle.digest('SHA-256', ...)` → lowercase hex, same algorithm as `hashBoardState`. New helper, not a shared/refactored import of `hashBoardState` itself (see FILES FORBIDDEN — avoids coupling the board-insight feature to this one for a ~15-line pure function).

## RLS MODEL RATIONALE (shared vs. per-user)

`board_insight_cache` is per-user because a board's *visible* content differs by viewer (filters, assignee scoping). A sprint AI summary has no such per-viewer variance — the same sprint + same underlying data always produces the same deterministic prompt, so a per-user cache would make N teammates opening the same sprint pay N edge-function calls for an identical output. `sprint_insight_cache` therefore has no `user_id` column; RLS: `SELECT`/`INSERT`/`UPDATE` for any `authenticated` role (matches the existing pattern of `ph_issues`/`ph_jira_sprints` being team-readable/writable within a project, not owner-scoped). No `DELETE` policy — stale rows are superseded by new hash rows, not deleted (unbounded growth is acceptable at this data volume; not addressed this slice).

## NON-SCOPE (this slice)

- Release-side caching — out of scope per the objective's own acceptance criterion ("AI **sprint** summary cached"); `ph_releases` gets no cache table, no hash check, no behavior change.
- Any change to the typewriter/streaming UX, the "Auto" toggle, or prompt wording in `summarize-release`.
- Any change to `catyReleaseSummarizeStore.ts` — its existing `complete()`/`start()`/`setStreaming()` API is sufficient for both the streamed and cache-hit paths; no new state needed.
- Time-in-status/efficiency (Slice 4), scope-change history (Slice 5), dependencies (Slice 6).
- Cache eviction/TTL/pruning strategy — not needed yet at this data volume.
- Migration-ledger drift, prod strategy — both explicitly deferred per Vikram (D-013, memory `feedback-functionality-over-migrations`).

## CANONICAL COMPONENTS SELECTED

None new. `ReleaseSummaryCard.tsx` already has the `entityLabel` prop wired (`ReleaseDetailPage.tsx:474-485`, `entityLabel={config.label.singular}`) and needs zero changes — it is a pure presentational component driven by store `status`/`streamingText`, agnostic to whether that text came from cache or a live stream.

## CANONICAL SCREENS SELECTED

None new. Existing mount: `ReleaseDetailPage.tsx` (shared by both `/release-hub/releases-management/:id` and `/project-hub/:key/sprints/:sprintSlug`), already entity-kind-aware via `config.kind` (`src/lib/entity-hub/config.ts`). No route changes.

## FILES TO MODIFY

| File | Change | Summary |
|---|---|---|
| `supabase/functions/summarize-release/index.ts` | edit | `fetchReleaseContext`'s sprint branch (lines 96, 111-136): replace `.contains('sprint_release', ...)` + fallback scan with `.eq('sprint_id', releaseId)` against `ph_issues`. Release branch byte-for-byte unchanged. Requires edge-function redeploy after merge. |
| `supabase/migrations/20260703280000_sprint_insight_cache.sql` | add | New table `sprint_insight_cache(id uuid PK, sprint_id uuid NOT NULL REFERENCES ph_jira_sprints(id) ON DELETE CASCADE, data_hash text NOT NULL, summary_text text NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(sprint_id, data_hash))`. RLS enabled; `SELECT`/`INSERT`/`UPDATE` policies for `authenticated`, no per-user scoping (see RLS MODEL RATIONALE). Index on `(sprint_id, data_hash)` doubles as the unique constraint's index. |
| `src/components/releases/detail/summarize/sprintInsightHash.ts` | add (new file) | Pure hash function (SHA-256, mirrors `hashBoardState`'s algorithm but with the sprint-specific field list above) + two thin Supabase helpers: `readSprintInsightCache(sprintId, hash)` and `writeSprintInsightCache(sprintId, hash, text)`. Sprint-scoped only — does not touch or import from `CatyBoardInsight.tsx`. |
| `src/components/releases/detail/summarize/useReleaseSummaryStream.ts` | edit | Inside the effect, when `payload.entityKind === 'sprint'`: before the `fetchFunction('summarize-release', ...)` call, fetch the current sprint row + `sprint_id`-matched items client-side, compute the hash via the new helper, check the cache. On hit: call `useCatyReleaseSummarize.getState().complete(cachedText)` and return — no network call. On miss: proceed with the existing stream logic unchanged; when `evt.type === 'done'` fires (after `complete(fullText)`), also call `writeSprintInsightCache(...)`. For `entityKind !== 'sprint'` (release/undefined), the effect body executes exactly as it does today — zero behavior change, verified by diff review. |

## FILES FORBIDDEN

- `src/components/releases/detail/summarize/ReleaseSummaryCard.tsx` — already correctly wired (`entityLabel` prop exists); no change needed, purely presentational.
- `src/components/releases/detail/summarize/catyReleaseSummarizeStore.ts` — existing action set (`complete`, `start`, `setStreaming`, `appendDelta`, `error`, `dismiss`, `setAuto`) is sufficient; no new state.
- `src/pages/release-hub/ReleaseDetailPage.tsx` — `config.kind`/`entityKind` wiring already correct (D-021 confirmed this page needs no sprint-awareness changes); not touched.
- `src/components/for-you/atlaskit/CatyBoardInsight.tsx`, `supabase/migrations/20260616000000_board_insight_cache.sql` — reference pattern only, read for inspiration, never edited or imported from.
- `supabase/functions/summarize-release/index.ts`'s **release** branch (`entityTable === 'ph_releases'`) and `buildPrompt`/`buildItemsBlock`/`countProgress` — prompt logic and release-side item fetch are untouched; only the sprint item-fetch query changes.
- `src/lib/entity-hub/config.ts`, `src/features/health/adapters/entity.ts` — Slice 1 territory, already correct, not touched.
- `src/pages/Sprints.tsx`, `SprintBoard.tsx`, `src/lib/statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts`, `rh_*` release-ops — standing forbidden list, unchanged reasons.
- Anything prod-targeting (`lmqwtldpfacrrlvdnmld`) — explicitly deferred (D-013).

## UI/UX RULES

No new UI. `ReleaseSummaryCard` renders identically whether `streamingText` arrived via typewriter or a single `complete()` call — a cache hit will render the full summary immediately with no animation, which is expected and desirable (instant vs. streamed), not a regression. No ADS/token concerns — no styled code touched.

## DATA/BACKEND RULES

- `ph_issues.sprint_id` (FK, added `20260703170000_sprint_fk_backfill.sql`) is the live, correct membership path — same column Slice 1 already validated live on two real sprints.
- New table has no RLS per-user scoping — see RLS MODEL RATIONALE above; this is a deliberate, user-approved divergence from `board_insight_cache`, not an oversight.
- snake_case raw rows; zero-assumption — if the client-side hash computation can't reach `ph_issues`/`ph_jira_sprints` (RLS denial, network error), fail open to the existing streaming path (never block the summary feature on a cache-layer failure).
- Cache write is best-effort: if the upsert errors, log and continue — never blocks or corrupts the already-completed summary display (mirrors `CatyBoardInsight.tsx`'s "never poison cache on AI failure" discipline, inverted: never let cache-write failure poison the UI).

## INTEGRATION/WIRING RULES

- Edge function redeploy required after the `index.ts` fix merges (`mcp__supabase__deploy_edge_function` or `supabase functions deploy summarize-release`, staging project `cyijbdeuehohvhnsywig`).
- No new hooks beyond the two helper functions in `sprintInsightHash.ts` (not full hooks — plain async functions called from within the existing effect in `useReleaseSummaryStream.ts`).
- Contract: cache key is `(sprint_id, data_hash)`; `sprint_id` here is `payload.releaseId` when `payload.entityKind === 'sprint'` (the store's field is named `releaseId` generically for both entity kinds — confirmed in `catyReleaseSummarizeStore.ts:34-42`, not renamed this slice).

## PARALLEL EXECUTION PLAN

Single-thread implement → verify; the discovery phase (this Plan Lock's research) already traced every consuming call site, so no further discovery agents are needed before implementation. QA/network-probe verification runs after implementation, single-threaded.

## SCREENSHOT CHECKLIST

Screenshots do not prove cache behavior (per CLAUDE.md, "screenshots do not prove functionality") — functional proof is a network probe. One screenshot pair for visual regression only:
- [ ] Sprint summary card renders identically after this change (light + dark) — visual regression check only, not functional proof.
- [ ] Network probe (Chrome MCP `read_network_requests`): open a sprint's summary once (miss, streams, network call to `summarize-release` fires), dismiss, reopen the same sprint (hit, no network call to `summarize-release`).
- [ ] Network probe: edit a work item in that sprint (status/summary/assignee change), reopen the summary — confirm the edge function fires again (cache correctly busted).
- [ ] Adjacent regression: open a **release** summary before/after this diff — confirm identical network behavior (one call per open, no caching applied).

## VALIDATION COMMANDS

```bash
npx tsc -p tsconfig.app.json --noEmit   # compare error count to 183 baseline (07_HANDOVER.md)
npm run lint:colors:gate
npm run audit:ads:gate
# DB probe (PostgREST, staging cyijbdeuehohvhnsywig): confirm sprint_insight_cache row appears after first generation, and (sprint_id, data_hash) uniqueness holds
# DOM + network probe (Chrome MCP, localhost:8080): the four screenshot-checklist items above
```

## STOP CONDITIONS

- Any file outside FILES TO MODIFY needs changes → RED FLAG.
- Release-kind summary behavior changes at all (network call count, prompt content, UI) → regression, stop.
- Hash omits a field `buildPrompt` actually consumes (verify against the exact `buildPrompt`/`fetchReleaseContext` select list at implementation time, re-reading `index.ts:98-142,177-211` — the list above is current as of this Plan Lock's drafting but must be re-confirmed if the edge function has changed since) → stale-cache risk, stop and fix hash before proceeding.
- `ph_issues.sprint_id` column missing/renamed (re-verify via `information_schema` before editing if any doubt) → stop, inspect.
- tsc error count rises above baseline; either ratchet gate fails; slice exceeds 2h.

## DRIFT/REBASELINE RULES

Per template: stop → `08_DRIFT_LOG.md` → rebaseline approval → mark SUPERSEDED → new Plan Lock.

---
---

# SUPERSEDED — Phase 3 Slice 1 lock (health FK fix, shipped)

> Archived below for history. Slice 1 shipped and was verified (`06_VALIDATION_EVIDENCE.md` VG-002/VG-003, `09_DECISIONS.md` D-020). Content kept verbatim, not deleted, per append-only discipline.

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
