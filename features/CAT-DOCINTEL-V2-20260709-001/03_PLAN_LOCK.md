# PLAN LOCK — CAT-DOCINTEL-V2-20260709-001

**Status:** DRAFT — awaiting Vikram approval
**Approved by:** (pending)
**Timebox:** 2 hours from approval (per slice)
**Slice:** 1 of 7 (full-scope roadmap below; only Slice 1 is locked in detail this session)

---

## FULL-SCOPE ROADMAP (7 slices — Decisions 3-9)

| Slice | Theme | Closes | Key artifacts |
|---|---|---|---|
| **1** | Correctness bugs | confidence mis-scale, section_path NULL, fact-embedding→conflict detection | `confidence.ts`, `embed_stage.ts`, `docintel-analyze` |
| **2** | **MarkItDown spike (GATE)** | measures citation/page-fidelity of markdown conversion; verdict gates Slice 3 | scratch spike, fidelity diff report in `06_VALIDATION_EVIDENCE.md` |
| **3** | Universal ingestion | Word (fix 1-page collapse), Excel, PPT, image, audio — via MarkItDown per Slice 2 verdict | new `docintel-convert` service wiring, `docintel-ingest` |
| **4** | Prompt registry | hardcoded prompts → `ai_agent_prompts` (truthful provenance, tunable = fine-tuning enabler) | new migration, `docintel-analyze`/`docintel-generate` |
| **5** | Themes | `docintel_themes` create+tag+cluster-suggest+retrieval filter | new migration, new UI surface, `docintel_hybrid_search` theme param |
| **6** | Source adapters | Jira (`ph_issues`) + git/markdown into same RAG via `source_type` | additive `source_type` column, adapter edge fns, citation-anchor extension |
| **7** | Ops + proof + cleanup | Health failure banner, manual re-index button, promote-to-workitem e2e proof, link proof, `kb_*` deletion | `DocintelHealthPage`, `PromoteArtifactModal` proof, kb_* removal |

Each slice gets its own 2-hour timebox and its own detailed Plan Lock section appended here before
that slice starts. Slices 3-7 detail is deliberately deferred — Slice 2's spike verdict and
Slice 1's discovery answers reshape them.

---

## SLICE 1 — SUPERSEDED 2026-07-09 (drift: bugs already fixed + deployed)

> All three Slice 1 bugs were found already fixed in source (2026-07-07) and deployed live
> (generate v7 / analyze v7 / sync v6). Verified via live DB query 2026-07-09. Slice 1 became
> verify-only — no code changed. See `08_DRIFT_LOG.md` Drift Event 1. The detailed Slice 1 plan
> below is retained as the historical record; its "FILES TO MODIFY" were NOT modified.

## SLICE 1 (original plan — retained for record, NOT executed as code)

---

## OBJECTIVE

Slice 1 fixes the two self-documented correctness bugs (citation confidence mis-scale,
`docintel_match_facts` dead RPC) and resolves the three open discovery questions in
`02_CANONICAL_DISCOVERY.md` (theme-cache role, RAJiraSidePanel liveness, fact-embedding gap root
cause). "Done" = both bugs fixed and proven with a live re-query/re-probe, plus a written answer
to each open question that unblocks Slice 2 planning (themes UI, kb_* cleanup scope).

---

## NON-SCOPE

- Theme/collection browsing UI build-out (Slice 2, pending Q1 answer)
- Jira/git ingestion into the RAG pipeline (Slice 3)
- Manual re-index control, alerting, promote-to-work-item proof (Slice 3/4)
- `kb_*` deletion (Slice 4, pending Q2 answer)
- Any change to `ai_agent_prompts` registry wiring (separate slice — larger scope, touches every
  prompt call site)

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| `confidence.ts` helpers | `src/modules/docintel/components/confidence.ts` | Existing confidence-mapping logic; bug is in the mapping/scale, not a missing component — extend, don't replace |
| `embed_stage.ts` | `supabase/functions/_shared/embed_stage.ts` | Existing shared embedding helper; fact-embedding fix belongs here if root cause is a missing call, not new infra |

No new canonical components required for Slice 1 — this is a bug-fix slice.

---

## CANONICAL SCREENS SELECTED

| Screen | Route | Adapter needed |
|---|---|---|
| Ask panel / Artifact view | `/doc-intelligence/:slug` (Ask tab, Artifacts tab) | No — confidence display fix is in-place |
| Facts review | `/doc-intelligence/:slug` (Facts tab) | No |

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/modules/docintel/components/confidence.ts` | edit | Fix confidence-to-display scale so citation confidence matches actual grounding score |
| `supabase/functions/_shared/embed_stage.ts` | edit (pending root-cause read) | Add missing embedding call for `ai_requirement_facts`, if that's the root cause |
| `supabase/functions/docintel-analyze/index.ts` | edit (pending root-cause read) | Wire fact extraction → embedding if currently skipped |
| `docs/audits/doc-intel-current-state-discovery.md` | edit | Update §7 P0 items to reflect fixed status once proven live |

Exact file list for the fact-embedding fix is **pending** the Slice 1 discovery-question pass
(see `02_CANONICAL_DISCOVERY.md` open questions) — do not start coding until that read is done and
this table is updated to reflect the actual root cause.

---

## FILES FORBIDDEN

- `src/services/knowledgeBase.ts`, `src/pages/KBAdminSetup.tsx`, `src/pages/KBDataAudit.tsx`,
  `supabase/functions/kb-*` — legacy `kb_*` track, out of scope until Slice 4
- `src/modules/docintel/domain/index.ts` structural changes beyond what the two bug fixes require
- Any `ai_*` migration that isn't additive (no destructive schema changes)
- Any file in `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/` (historical record, don't edit)

---

## UI/UX RULES

- All colors: ADS tokens only (`var(--ds-*)`)
- No hand-rolled UI
- ADS spacing grid: 4/8/16/24/32px only
- Sentence-case labels
- Dark mode: verify by reload-into-dark
- Run color-law grep before commit (per repo CLAUDE.md)

---

## DATA/BACKEND RULES

- DB columns verified to exist: `ai_requirement_facts` columns to be confirmed via
  `mcp__supabase__list_tables` before editing embedding logic (staging `cyij` only — never prod)
- Field access: snake_case raw DB rows, camelCase mapped objects
- No assumption defaults
- RLS impact: none expected (read/embed existing rows, no new access patterns)
- Migration required: possibly, if `ai_requirement_facts` lacks an embedding column — verify first,
  do not assume

---

## INTEGRATION/WIRING RULES

- React Query hooks to use: `useRequirementFacts`, `useUpdateFactReview` (existing, in
  `useDocintel.tsx`) — no new hooks expected for the confidence fix
- New hooks required: none for Slice 1
- Edge functions involved: `docintel-analyze` (possible edit), `_shared/embed_stage.ts` (possible edit)
- Props/interface contracts: `confidence.ts` exports (`confidenceAppearance`, `groundingAppearance`,
  `pctLabel`) are covered by `confidence.test.ts` — any signature change must keep that test green
  or update it deliberately, not incidentally

---

## PARALLEL EXECUTION PLAN

**Phase 1 — Discovery (parallel, Slice 1 kickoff):**
- Agent: read `ai_theme_cache` schema + all code references (answers Q1)
- Agent: trace `RAJiraSidePanel.tsx` live usage / reachability (answers Q2)
- Agent: read `docintel-analyze/index.ts` + `embed_stage.ts` fact-extraction path (answers Q3)

**Phase 2 — Fix:**
- Fix confidence scale bug (isolated, no dependency on Phase 1 answers)
- Fix fact-embedding gap per Q3 answer

**Phase 3 — Validation:**
- Re-run live DB spot-check on `ai_document_embeddings`/new fact embeddings (staging `cyij`)
- Re-probe Ask/Artifact citation confidence display live at `localhost:8080`
- Re-run `confidence.test.ts` and any new/updated vitest

**Phase 4 — Documentation:**
- Update `06_VALIDATION_EVIDENCE.md` with proof
- Update `docs/audits/doc-intel-current-state-discovery.md` P0 section

---

## SCREENSHOT CHECKLIST

- [ ] Before: citation confidence showing mis-scaled value
- [ ] After: citation confidence showing corrected value
- [ ] Before: Facts tab / requirement facts semantic search non-functional (or docintel_match_facts
      empty result)
- [ ] After: fact match returning results
- [ ] Dark mode check on both

---

## VALIDATION COMMANDS

```bash
# Run before commit
npx tsc --noEmit
npx vitest run src/modules/docintel/components/__tests__/confidence.test.ts
npx vitest run src/test/edge/docintel-contracts.test.ts
npm run lint:colors:gate
```

Plus a live Supabase read-only spot-check (staging `cyij` only) confirming
`ai_requirement_facts` embeddings are non-null post-fix, and a live browser re-probe of the
Ask/Artifact citation confidence display.

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Root cause of the fact-embedding gap turns out to require a schema migration touching RLS
  (bigger than a 2-hour slice)
- `confidence.ts` signature change would break more than the one known test file
- Any live query touches prod (`lmqwtldpfacrrlvdnmld`) instead of staging (`cyijbdeuehohvhnsywig`)
- Slice exceeds 2 hours

---

## DRIFT/REBASELINE RULES

If this Plan Lock is superseded mid-slice:
1. Stop
2. Document drift in `08_DRIFT_LOG.md`
3. Get rebaseline approval from Vikram
4. Update this file status to SUPERSEDED
5. Create a new Plan Lock for the rebaselined scope

---

## SLICE 4 — Prompt registry (DRAFT, next code slice — awaiting go-ahead)

**Status:** DRAFT — awaiting Vikram go-ahead. First slice that changes code + schema + requires deploy.
**Timebox:** 2 hours (may split if deploy/verify overruns).

### Discovery findings (live `cyij`, 2026-07-09)
- `ai_agent_prompts` exists, 10 rows, ALL `"PLACEHOLDER — set in slice 10"` (never filled).
- Real prompts hardcoded inline: `docintel-analyze` (`SYSTEM_PROMPT`, `TRANSLATE_SYSTEM_PROMPT`),
  `docintel-generate` (`systemPrompt(type)`, `FACTS_SYSTEM_PROMPT`), `docintel-ask` (`systemPrompt(arabic)`).
- `ai_agent_runs` (24 rows) stamps `agent`/`provider`/`model` but NO `prompt_id` — no run→prompt link.

### OBJECTIVE
Make the prompt registry the runtime source of truth AND make provenance truthful. "Done" =
(1) `ai_agent_prompts` holds the ACTUAL prompts (backfilled from the current inline constants,
versioned, is_active); (2) all 3 edge functions load the active prompt from the registry at runtime,
falling back to an inline default only if the row is missing; (3) every `ai_agent_runs` row stamps
the `prompt_id` + version actually used; (4) deployed + verified live that a run references a real
(non-placeholder) prompt row. This also delivers the fine-tuning enabler — prompt edits become an
`UPDATE` + version bump, no redeploy.

### NON-SCOPE
- Changing prompt *content/wording* (behaviour must stay identical — backfill = byte-faithful copy
  of the current inline prompts, so extraction/generation quality does not drift). Actual tuning is
  a later, separate act once the mechanism is live.
- A prompt-editing admin UI (future slice — DB-level tuning is enough to unblock fine-tuning now).
- Any change to `docintel-sync`/`docintel-ingest` (no LLM prompts there).

### FILES TO MODIFY
| File | Change |
|---|---|
| `supabase/migrations/<new>_docintel_prompt_registry.sql` | additive: backfill `ai_agent_prompts` with real prompts (byte-faithful from edge fns, version 2, is_active, deactivate placeholders); add `prompt_id uuid` + `prompt_version int` to `ai_agent_runs` if absent |
| `supabase/functions/_shared/docintel.ts` (or new `_shared/prompts.ts`) | add `loadActivePrompt(admin, agent)` helper: reads active row, returns `{id, version, prompt}` or inline fallback |
| `supabase/functions/docintel-analyze/index.ts` | replace `SYSTEM_PROMPT`/`TRANSLATE_SYSTEM_PROMPT` inline use with registry load; stamp prompt_id on its `ai_agent_runs` inserts |
| `supabase/functions/docintel-generate/index.ts` | same for `systemPrompt(type)` + `FACTS_SYSTEM_PROMPT` |
| `supabase/functions/docintel-ask/index.ts` | same for `systemPrompt(arabic)` |

### FILES FORBIDDEN
- Anything under `src/` (this slice is edge-fn + schema only; no frontend change)
- `docintel-sync`, `docintel-ingest`, `kb_*`
- The intentional NUL-byte `dedupeKey` region in `docintel-generate` (deploy byte-faithfully)

### DATA/BACKEND RULES
- Migration is ADDITIVE only (backfill rows + nullable columns). No destructive change.
- Backfill prompts must be byte-faithful copies of the current inline constants — diff before/after.
- Verify `ai_agent_runs` lacks `prompt_id` before adding (idempotent `ADD COLUMN IF NOT EXISTS`).
- Staging `cyij` only. Never prod `lmqw`.

### INTEGRATION/WIRING RULES
- Registry load is best-effort with inline fallback → an empty/failed registry NEVER breaks
  ingestion or Q&A (resilience first).
- `loadActivePrompt` keyed by the existing `agent` values already used in `ai_agent_runs`
  (`structuring`, `translation`, `epic`, `story`, `brd`, `summary`, `ask`/`retrieval`, etc.) — map
  each inline prompt to its registry `agent` key.

### VALIDATION COMMANDS
```bash
npx tsc --noEmit
# deno lint on touched edge fns if available
```
Plus live proof (staging `cyij`): after redeploy + one Ask + one Generate, query that the new
`ai_agent_runs` rows carry a `prompt_id` pointing at a non-placeholder `ai_agent_prompts` row, and
that answer/artifact quality is unchanged vs pre-slice (regression guard).

### STOP CONDITIONS
- Backfilled prompt differs byte-wise from the inline constant (would change behaviour) → stop, re-diff.
- Edge-function deploy hits the quota/payment blocker again → stop, report (same blocker as prior feature).
- Any registry-load path that could throw and break ingestion/Q&A → stop, add fallback first.

### DEPLOY NOTE
Requires deploying 3 docintel edge functions + applying 1 migration to staging `cyij`. Deploy +
prod-DB targeting rules (CLAUDE.md) apply. Await explicit go-ahead before code.

---

## SLICE 2 (SPIKE — GATE, detailed now because it decides Slice 3)

**Objective:** Determine whether Microsoft MarkItDown can serve as Catalyst's universal ingestion
front-door WITHOUT regressing per-claim page/block citation fidelity — DocIntel's crown-jewel
differentiator. Spike only. No production wiring. Verdict = go/no-go for Slice 3 adoption breadth.

**Method (measure, don't adopt):**
1. Stand up `markitdown` locally (Python, isolated venv in scratchpad — NOT added to repo deps).
2. Convert a representative set through BOTH paths and diff:
   - one native-text PDF (has real pages) — current path vs MarkItDown
   - one .docx (the 1-page-collapse failure case) — current mammoth path vs MarkItDown
   - one .xlsx, one .pptx, one image, one short audio clip (MarkItDown only — current path can't)
   - one scanned-Arabic PDF (current Gemini-vision path vs MarkItDown OCR) — expect MarkItDown loses
3. For each, score: (a) does output retain page boundaries? (b) heading/section structure? (c) table
   fidelity? (d) can a citation still resolve to a locatable anchor in the source?

**Acceptance gate for Slice 3 adoption:**
- PASS (adopt as universal front-door for non-scanned-Arabic): MarkItDown output preserves enough
  page/heading anchoring that citations can still resolve. Gemini kept for scanned-Arabic.
- PARTIAL (adopt for non-cited media only): grounding degrades; use MarkItDown for pptx/audio/image
  where page-citation matters less, keep current path for PDF/docx.
- FAIL (reject): no fidelity path survives — close the gap in-house instead (better docx parser).

**Deliverable:** fidelity diff table written to `06_VALIDATION_EVIDENCE.md` + a one-line verdict in
`09_DECISIONS.md` (new decision entry) that rewrites Slice 3's Plan Lock detail.

**Non-scope for the spike:** any change to production edge functions, any repo dependency addition,
any Supabase write. Pure local measurement.

**Stop condition:** if standing up MarkItDown needs system-level installs that touch the user's
machine beyond a scratchpad venv → stop and ask before proceeding.
