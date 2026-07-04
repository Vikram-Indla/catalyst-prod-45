# HANDOVER — CAT-SPRINTS-NATIVE-20260702-002

**Written:** 2026-07-03, end of session 004
**Session ended at:** user requested a handover to close out the conversation
**Git HEAD:** `b8a9a87f9d0d2c11c21ffa0f0a1e626a68b08efe`
**Branch:** `main` (pushed — `main` and `origin/main` match at time of writing; this repo has seen repeated concurrent-session activity across sessions 003 and 004 — `git fetch` before trusting "0 behind", per the standing `CLAUDE.md` "CONCURRENT SESSIONS & DB TARGETING" hard-stop)

---

## OBJECTIVE (brief)

Replace dead Jira-synced sprint data with Catalyst-native sprints: FK-only membership, auto/custom naming, DoD → awaiting_approval → approval lifecycle, optional release link, and Phase-3 insights (AI summary, health, analytics) gated on real transition data. Full detail: `01_OBJECTIVE.md`.

---

## ACTIVE PLAN LOCK

File: `03_PLAN_LOCK.md`
Status: **APPROVED — implemented** (Phase 3 Slice 1 only; this is a per-slice lock, not a feature-wide one)

Key constraints from the Slice 1 lock (still in force as historical record, slice itself is done):
- Files to modify: `src/features/health/adapters/entity.ts` only — done.
- Files forbidden: `WorkItemsSection.tsx`, `config.ts`, `ReleaseSidePanel.tsx`, `useHealthSignals.ts`, legacy `Sprints.tsx`/`SprintBoard.tsx`, `statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts`, `rh_*` release-ops, anything prod-targeting.
- Timebox: was 2h, slice completed within budget.
- **No Plan Lock exists yet for the next slice** (former Slice 3, AI summary + cache — see below). Write one before touching code, per the standing "no code before Plan Lock" rule. The old S0.1a lock is archived below a SUPERSEDED marker in the same file (see `08_DRIFT_LOG.md` DRIFT-003) — don't confuse it with the active Slice 1 content at the top of the file.

---

## CURRENT STATE

### What is working (verified live this session, not just claimed)
- **Phase 0/1/2 sprint lifecycle** — unchanged from prior sessions, still verified per `06_VALIDATION_EVIDENCE.md` VG-001.
- **Phase 3 Slice 1 — sprint health FK fix, shipped and live-verified.** `useEntityHealthAdapter` (`src/features/health/adapters/entity.ts`) now branches on `config.matchIssueByFk`: sprint configs query `ph_issues.eq('sprint_id', entityId)` directly (mirrors the proven `WorkItemsSection.tsx:239-251` pattern); release path (JSONB `contains` + fallback scan) is byte-for-byte unchanged. Verified via an authenticated Chrome MCP session against `localhost:8080` on two real staging sprints: an empty sprint (`bau-sprint-71-06-jul-26-2`) showed "0 Analysed / Looks healthy"; a 7-item sprint (`sprint28-03-jul-2025`) showed "7 Analysed", exact match to the visible work-items list. See `06_VALIDATION_EVIDENCE.md` VG-002 (static/code proof) and VG-003 (live DOM proof). Decision record: `09_DECISIONS.md` D-020.
- **Sprint health UI already exists — Slice 2 (as originally scoped) is unnecessary.** The handover going into this session proposed Slice 2 as "wire a health card into `ReleaseSidePanel.tsx`" on the premise that no UI exists. That premise was wrong: `ReleaseDetailPage.tsx` (the shared page both release and sprint detail routes mount) already has a header toggle button (`ReleaseDetailPage.tsx:414-431`, gated on `config.kind !== 'milestone'` — already true for sprints) that swaps the whole right rail from `ReleaseSidePanel` to `HealthPanel` (`ReleaseDetailPage.tsx:558-577`), already wired with `scope: { moduleKey: 'sprint', sprintId: release.id }` for sprints. This was caught **before** writing a Plan Lock for redundant work, by tracing the actual UI live rather than trusting the prior session's narrative. See `09_DECISIONS.md` D-021 for the full correction. **No code needed for this item — it's closed.**

### What is NOT working / incomplete
- **No AI summary caching exists for sprints or releases** — unchanged from before this session. `summarize-release` edge function has zero caching; the cached-by-hash pattern (D-007/S3.1) exists only in a different feature (For You board insights: `hashBoardState` + `board_insight_cache`) and needs porting, not assuming-exists.
- **No formula exists for D-008's efficiency score** — unchanged, must be built fresh.
- **No reusable timeline/chart component for scope-change history** — unchanged, genuinely new UI work.
- **Prod strategy (D-013)** — still explicitly deferred. Prod (`lmqwtldpfacrrlvdnmld`) still has no `ph_jira_sprints` table; confirmed again this session via the Supabase MCP's `list_projects` (it returned exactly one project — prod — meaning the MCP available this session cannot reach staging directly; staging access this session was via anon-key PostgREST + an authenticated browser session, not the Supabase MCP tools).
- **Migration-ledger drift** — unchanged, still explicitly deprioritized by Vikram in favor of functionality work.
- **`D-018` gap** — `WorkItemsSection.tsx` code comments reference a `D-018` decision (about the sprint membership changelog trigger) that was never actually written into `09_DECISIONS.md`. Noticed this session while picking the next decision number; left as-is (pre-existing gap, not this session's scope) — flagging here so the next session doesn't accidentally reuse or misassign that number. New entries this session are D-020 and D-021.

### What was last touched
File: `features/CAT-SPRINTS-NATIVE-20260702-002/09_DECISIONS.md`, `06_VALIDATION_EVIDENCE.md`, `sessions/004_continue_feature.md` (docs-only, commit `b8a9a87f9`)
State: complete, committed, pushed. No code changes pending; working tree clean at handover time.

---

## PHASE 3 — SLICE ORDER (renumbered per D-021; former Slice 2 closed with no build)

1. ~~Health FK fix~~ — **DONE** (Slice 1, this session, D-020).
2. ~~Wire sprint health into the side panel~~ — **CLOSED, no code needed** (was Slice 2, D-021 — already live via `ReleaseDetailPage.tsx`'s existing toggle).
3. **AI summary + cache (was Slice 3, now next)** — port `hashBoardState`'s SHA-256 hash-cache pattern (currently only in `CatyBoardInsight.tsx` + `board_insight_cache` table) into a new sprint-scoped cache table; wire the existing `ReleaseSummaryCard` component (`src/components/releases/detail/summarize/ReleaseSummaryCard.tsx` — already has an `entityLabel?: string` prop specifically for this, defaults to `'Release'`) with `entityLabel="Sprint"`; needs a sprint branch in `summarize-release` edge function or a new one, plus a sprint-scoped store/hook (current `catyReleaseSummarizeStore.ts` / `useReleaseSummaryStream.ts` are keyed on `releaseId`).
4. **Time-in-status / efficiency (was Slice 4)** — build D-008's formula fresh. Real transition data confirmed available (as of last check): `work_item_transitions` had 2,095 rows staging-wide with real non-null dwell times on 1,278 of them — re-verify counts before building, this is from a prior session's snapshot, not re-checked this session.
5. **Scope-change history (was Slice 5)** — genuinely new UI, no reusable chart/timeline component exists. Budget more time.
6. **Dependencies (was Slice 6)** — least specified in the original objective; lowest priority.

**None of these are Plan-Locked yet. The next session should write a Plan Lock for slice 3 (AI summary + cache) before touching code**, per the standing "no code before Plan Lock" rule.

---

## CHANGED FILES (this session, all committed + pushed)

| File | Status | Notes |
|---|---|---|
| `src/features/health/adapters/entity.ts` | complete | Phase 3 Slice 1 — FK-match branch for sprint configs |
| `features/CAT-SPRINTS-NATIVE-20260702-002/03_PLAN_LOCK.md` | complete | rewritten for Phase 3 Slice 1; old S0.1a lock archived below a SUPERSEDED marker in the same file |
| `features/CAT-SPRINTS-NATIVE-20260702-002/06_VALIDATION_EVIDENCE.md` | complete | VG-002 (static/code proof), VG-003 (live DOM proof, both sprint kinds) |
| `features/CAT-SPRINTS-NATIVE-20260702-002/08_DRIFT_LOG.md` | complete | DRIFT-003 (Plan Lock supersession record) |
| `features/CAT-SPRINTS-NATIVE-20260702-002/09_DECISIONS.md` | complete | D-020 (Slice 1 fix), D-021 (Slice 2 closed, no build) |
| `features/CAT-SPRINTS-NATIVE-20260702-002/sessions/004_continue_feature.md` | complete | full session narrative |

Commits: `9481249` (Slice 1 fix + docs), `b8a9a87f9` (D-020/D-021 + VG-003 docs). Both pushed to `origin/main`.

---

## FORBIDDEN FILES

Do not touch these in the next session without a fresh Plan Lock decision:
- `src/pages/Sprints.tsx`, `SprintBoard.tsx` — legacy SAFe `iterations` stack, explicitly untouched
- `src/lib/statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts` — global regression surface (D-006)
- `rh_*` release-ops tables/pages — untouched
- Anything prod-targeting (`lmqwtldpfacrrlvdnmld`) — explicitly deferred per Vikram (D-013)
- `src/components/releases/detail/WorkItemsSection.tsx` — reference implementation for the FK match pattern, correct as-is, don't touch without reason
- `src/pages/release-hub/ReleaseDetailPage.tsx` — the health toggle + `HealthPanel` wiring here is already correct for sprints (D-021); don't "fix" or duplicate it

---

## SCREENSHOTS

No screenshots saved to the feature folder this session — the Slice 1 fix is backend-only (no visual change), and the Slice 2 live-verification was done via ephemeral Chrome MCP browser actions (not saved to disk), reproducible via:
- `http://localhost:8080/project-hub/BAU/sprints/bau-sprint-71-06-jul-26-2` → click "View sprint health" → expect "0 Analysed"
- `http://localhost:8080/project-hub/BAU/sprints/sprint28-03-jul-2025` → click "View sprint health" → expect "7 Analysed"

---

## VALIDATION EVIDENCE

```bash
npx tsc -p tsconfig.app.json --noEmit
# 183 errors — matches the pre-existing baseline exactly (07_HANDOVER.md prior version), zero new errors

npm run lint:colors:gate
# ✅ 0 = baseline 0

npm run audit:ads:gate
# ✅ no category above baseline (tokens/typography actually dropped slightly — unrelated to this session, not ratcheted down)
```

Full evidence: `06_VALIDATION_EVIDENCE.md` VG-002 (static), VG-003 (live DOM, two real sprints).

Outstanding validations needed:
- None for Slice 1/2 — both are closed with live proof.
- Before Slice 3 (AI summary + cache): re-verify `work_item_transitions` row counts (D-007 gate data) since the last snapshot is from a prior session.

---

## DRIFT LOG SUMMARY

See `08_DRIFT_LOG.md` for full log.

Active drift events: 3 (DRIFT-001, DRIFT-002, DRIFT-003 — all are process-debt/supersession records, not currently-open incidents).
Most recent: DRIFT-003 — `03_PLAN_LOCK.md` only ever formally covered slice S0.1a (long shipped); rewritten this session for Phase 3 Slice 1, old content archived below a SUPERSEDED marker in the same file rather than deleted.

**New this session (not yet its own DRIFT entry, noting here instead):** `origin/main` had accumulated ~30 unrelated commits from other concurrent sessions between session 003 and session 004 (Reports Hub, Workflow Studio, CRE work, etc.). Checked for file-level conflicts before merging (`git log origin/main -- <changed files>`) — found exactly one hit, the original creation commit of `entity.ts`, already an ancestor, not a real conflict. Fast-forward merge was safe and clean. No incident, but a reminder that this checkout is genuinely shared across multiple concurrent sessions — always `git fetch` + check for file-level overlap before merging/pushing, per the standing hard-stop rule.

---

## STANDING DIRECTIVES FROM VIKRAM (carried forward, still in force)

1. **Prod is deferred** — don't work on prod strategy (D-013). (Memory: `staging-first-prod-deferred`.)
2. **Functionality over migration/infra hygiene** — don't self-select into drift/ledger cleanup work unless explicitly asked. (Memory: `feedback-functionality-over-migrations`.)

Both remain durable across sessions on this repo.

---

## NEXT EXACT PROMPT

Paste this as your first message in the next session:

```
continue feature CAT-SPRINTS-NATIVE-20260702-002

Read (in order):
  features/CAT-SPRINTS-NATIVE-20260702-002/00_READ_ME_FIRST.md
  features/CAT-SPRINTS-NATIVE-20260702-002/01_OBJECTIVE.md
  features/CAT-SPRINTS-NATIVE-20260702-002/03_PLAN_LOCK.md   <- Slice 1 lock is at the TOP; old S0.1a lock is archived below a SUPERSEDED marker further down in the same file, don't confuse the two
  features/CAT-SPRINTS-NATIVE-20260702-002/07_HANDOVER.md    <- this file, read fully, has the renumbered Phase 3 slice order
  features/CAT-SPRINTS-NATIVE-20260702-002/08_DRIFT_LOG.md
  features/CAT-SPRINTS-NATIVE-20260702-002/09_DECISIONS.md   <- D-020/D-021 especially (Slice 1 done, Slice 2 closed with no build)
  features/CAT-SPRINTS-NATIVE-20260702-002/06_VALIDATION_EVIDENCE.md  <- VG-002/VG-003

Also read CLAUDE.md's "CONCURRENT SESSIONS & DB TARGETING — HARD STOP" section before any
git or supabase command — this checkout has had real concurrent-session activity across
multiple sessions now (30+ unrelated commits landed on origin/main during session 004 alone).
Always `git fetch origin main` and check `git log --oneline main..origin/main` before trusting
local state, and check for file-level overlap (`git log origin/main -- <your files>`) before
merging if there's any drift.

Then run pre-flight:
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5
git fetch origin main && git log --oneline main..origin/main

Next action: write a Plan Lock for Phase 3 Slice 3 (AI summary + cache for sprints — port
hashBoardState's SHA-256 hash-cache pattern from board_insight_cache into a new sprint-scoped
cache table; wire ReleaseSummaryCard with entityLabel="Sprint"; add a sprint branch to
summarize-release or a new edge function; new sprint-scoped store/hook since the current
catyReleaseSummarizeStore.ts/useReleaseSummaryStream.ts are keyed on releaseId).
Get the Plan Lock approved before writing code.
Standing directives: prod is deferred (D-013), prioritize functionality over migration/infra
hygiene work unless explicitly asked.
```
