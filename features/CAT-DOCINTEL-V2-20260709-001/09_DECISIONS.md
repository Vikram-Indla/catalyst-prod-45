# Decisions — CAT-DOCINTEL-V2-20260709-001

Permanent record. Do not re-litigate entries here without a new explicit decision.

## Decision 15 — 2026-07-11 — Pull forward query-addressable Findings

### Decision

Add the minimum controlled workspace-tab wiring to Slice 3: stable view keys, `view=findings`
selecting the existing facts-review panel, and a user-facing Findings tab label.

### Rationale

Without this, Start Review visibly lands on Evidence and the Slice 3 contract is false. The change
is neutral: hooks, payloads, panel order and the default Evidence behavior remain unchanged. The
final five-destination workbench is still delivered in Slice 5A.

## Decision 14 — 2026-07-11 — Review Start must replace its pending route

### Decision

Add `DocintelRoutes.tsx` and `DocintelRoutes.test.tsx` to Slice 3 so the delivered Review Start page
replaces the Slice 1 placeholder at `/doc-intelligence/actions/review`.

### Rationale

The approved Slice 3 acceptance criterion is impossible while the route continues mounting a
placeholder. This is a surgical implementation correction, not a scope expansion.

### Version truth constraint

The current Findings contract is document-current. Review Start may display the latest available
version number, but it must not offer historical version selection until version-scoped Findings
exists; doing so would falsely imply the selected historical version controls the review.

## Decision 1 — 2026-07-09

### Question
Should this feature rebuild/replace DocIntel, or extend it?

### Context
User asked to "write a new feature ... with all missing features ... activate docintel" following
a discovery audit that found DocIntel v1 is real and largely working, with specific documented
gaps.

### Options considered
1. Treat as a greenfield rewrite under a new module name.
2. Treat as a delta feature on the existing `src/modules/docintel/` + `ai_*` substrate, scoped to
   the gaps the audit found.

### Decision
Option 2 — delta-only, per repo CLAUDE.md "Simplicity first" and "Surgical changes" rules, and
because the audit found no architectural reason to replace the existing substrate (pgvector RAG,
edge functions, and RLS are all sound).

### Rationale
Rebuilding a working, live, real system to fix ~10 known gaps would violate the repo's own
regression-avoidance and surgical-change rules with no offsetting benefit.

### Impact on Plan Lock
Baseline for Plan Lock v1 — non-scope section explicitly excludes rewrite/replace.

## Decision 2 — 2026-07-09

### Question
Is "Conflict detection ✅" in the prior feature's `06_VALIDATION_EVIDENCE.md` accurate?

### Context
Cross-checking the Knowledge Framework Acceptance Criteria doc against live DB data found
`docintel_match_facts` (the mechanism conflict detection depends on) has zero requirement-fact
embeddings — the dependency can't function, so the ✅ claim is not currently true in live data.

### Options considered
1. Accept the prior ✅ mark at face value.
2. Flag it as an overclaim requiring a fix, not just a residual gap.

### Decision
Option 2 — this feature's Objective §Acceptance Criteria treats it as a P0 fix, not a
nice-to-have.

### Rationale
An acceptance record claiming a capability works when its data dependency is empty is worse than
an honestly-marked residual (🟡) — it misleads anyone relying on the record.

### Impact on Plan Lock
Slice 1 includes root-causing and fixing (or honestly re-labeling) this specific gap.

## Decision 3 — 2026-07-09 — Scope of "100% coverage"

### Question
Does "100%" mean fixing only what is broken/overclaimed, or also building the net-new missing
capabilities (themes, Jira ingestion, git ingestion)?

### Context
Vikram: "take the hardest path and provide me the best recommendation" — explicitly rejected
descoping the difficult net-new items.

### Decision
**Full scope.** V2 fixes broken/overclaimed items AND builds themes + Jira ingestion + git
ingestion. This makes V2 a ~7-slice feature across multiple sessions.

### Rationale
The Knowledge Framework Acceptance Criteria contract names themes, Jira, and git. Descoping them
declares victory on a lower bar than the contract. Hard path keeps them in.

### Impact on Plan Lock
Plan Lock expands from ~4 to 7 slices (see 03_PLAN_LOCK.md slice table).

## Decision 4 — 2026-07-09 — Fact-conflict detection: fix, not re-label

### Decision
Make `docintel_match_facts` real by adding a fact-embedding step so `ai_requirement_facts` rows
carry vectors. Do NOT re-label conflict detection as "not delivered."

### Rationale
The mechanism is ~90% built; only the embedding call is missing. Re-labeling would abandon a
nearly-complete capability. Slice 1.

## Decision 5 — 2026-07-09 — Prompt registry: wire for real

### Decision
Move inline prompt constants from `docintel-analyze`/`docintel-generate` into a real
`ai_agent_prompts` table, versioned, with truthful `prompt_id` stamped on each `ai_agent_run`.

### Rationale
Hardcoded prompts with a fabricated provenance trail is a lie surfaced in an audit-critical tool.
Also: a tunable prompt registry is exactly what "fine-tuning DocIntel" requires — prompts change
without edge-fn redeploy. Slice 4.

## Decision 6 — 2026-07-09 — Themes: user-created + auto-suggested hybrid

### Decision
New `docintel_themes` table. Users create a theme (e.g. "Industrial Scanning"); documents are
tagged manually OR via embedding-cluster suggestion the user confirms; retrieval gains a theme
filter.

### Rationale
Pure-manual themes die of neglect; pure-auto themes are opaque and uncontrollable. Hybrid gives
user control with machine assist. Slice 5. Largest net-new build.

### Impact on Plan Lock
New additive migration (`docintel_themes` + join table), new UI surface, `docintel_hybrid_search`
gains an optional theme filter param.

## Decision 7 — 2026-07-09 — Jira + git into the SAME RAG pipeline (source-adapter pattern)

### Decision
Generalize `ai_documents` with a `source_type` (pdf | jira | git | markdown). Build adapters that
normalize Jira issues (`ph_issues`) and git/markdown files into the same chunk→embed→cite flow, so
one Ask surface answers across PDF + Jira + code.

### Rationale
This is the OKF direction scoped sanely — documents + Jira + git only, not all 21 Catalyst object
families. Delivers "query Catalyst/Jira/git knowledge" from the AC contract without boiling the
ocean. Slice 6.

### Impact on Plan Lock
Additive `source_type` column + two adapter edge functions (or extend `docex-import`/`jira-ingest`
to write into `ai_*`). Citation model must carry a source-appropriate anchor (Jira issue key +
field; git path + line range) alongside the existing page/block anchor.

## Decision 8 — 2026-07-09 — MarkItDown universal front-door, Gemini retained for scanned-Arabic

### Decision
Adopt Microsoft MarkItDown as the universal ingestion converter (any media → markdown → existing
pipeline), BUT keep the Gemini-vision path for scanned-Arabic OCR. Slice 2 is a GATE spike that
must prove citation/page-fidelity survives markdown conversion before Slice 3 adopts it.

### Rationale
MarkItDown collapses N brittle per-type extractors into one and adds pptx/audio for free. The one
real risk is losing page/block grounding — Catalyst's crown-jewel differentiator (per-claim
page-cited answers). So the spike measures citation-fidelity delta first; if grounding degrades,
MarkItDown is relegated to non-cited media types only.

### Impact on Plan Lock
Slice 2 = spike (measure, decide). Slice 3 = adopt per verdict. MarkItDown runs as an external
service (Python) called by an edge function, not imported into Deno.

## Decision 9 — 2026-07-09 — Alerting in-app, rollback stays process-scope

### Decision
Failure alerting = persistent Health-dashboard banner + queryable `ai_extraction_issues` row off
the existing `ai_sync_runs` data. No new external alerting dependency (Slack/PagerDuty). Automated
rollback stays CI/process-scope (redeploy prior edge-fn version), NOT app code.

### Rationale
Hard path here is making the EXISTING surface honest, not bolting on new infra. Rollback-as-app-code
would be the wrong boundary — deploy tooling owns that. Slice 7.

## Decision 10 — 2026-07-09 — MarkItDown: PARTIAL adoption (spike verdict)

### Question
After the Slice 2 fidelity spike, for which media types does MarkItDown become the ingestion
front-door?

### Context
Spike run 2026-07-09 (markitdown 0.1.6, real + generated fixtures). Full evidence in
`06_VALIDATION_EVIDENCE.md` Slice 2 section.

### Decision
**Adopt MarkItDown for .docx / .xlsx / .pptx (+ audio/html/csv/epub/msg).** **Reject for PDF**
(pdfminer flattens to zero page boundaries → would destroy per-claim page citations). **Do not use
for scanned-Arabic** (no OCR). PDF and scanned-Arabic keep the current native-extract + Gemini-vision
page-aware path.

### Rationale
Measured, not assumed. docx/xlsx/pptx: MarkItDown preserves heading/sheet/slide anchors AND fixes
the current 1-page-collapse docx bug — strictly better. PDF: 0 headings / 0 page markers on a 27k
audit PDF — citation model would regress. The spike did exactly its job as a gate: it split the
adoption instead of forcing all-or-nothing.

### Impact on Plan Lock
Slice 3 scope narrows: MarkItDown wired ONLY for office/media formats via a `docintel-convert`
service; PDF/scanned-Arabic ingestion code paths are untouched. pptx gains a slide-number citation
anchor the pipeline didn't previously have.

## Decision 11 — 2026-07-09 — 78 stale pre-fix citation rows: leave as historical

### Question
What to do with the 78 mis-scaled citation rows on 2 pre-fix (2026-07-06) demo artifacts?

### Context
Slice 1 verification confirmed the citation-confidence fix is live for all post-2026-07-07
artifacts. The 78 stale rows are write-once and belong to 2 old demo artifacts (BRD + Epic, 07-06).

### Decision
Vikram chose Option 1 — **leave as historical**. No deletion, no backfill.

### Rationale
Old demo artifacts, harmless, will age out. Deleting artifacts not created this session would be
destructive with no real benefit; recompute isn't cleanly feasible (retrieval set not persisted).

### Impact on Plan Lock
None. Slice 1 closes as complete-by-verification with this residual formally accepted.

## Decision 12 — 2026-07-09 — Next code slice = Slice 4 (prompt registry)

### Question
Which slice executes next as the first genuine code slice: 3 (MarkItDown ingestion), 4 (prompt
registry), or 5 (themes)?

### Decision
**Slice 4 — prompt registry** (`ai_agent_prompts` wired for truthful provenance + tunable prompts),
selected under Vikram's standing "make the best decision / hardest path" instruction (b was left to
my call).

### Rationale
Slice 4 is a P0 truthfulness fix AND the direct enabler of the original ask ("activate docintel
fine-tuning") — prompts become tunable without an edge-function redeploy, which is what fine-tuning
the RAG behaviour requires. Higher leverage than themes/ingestion as the immediate next move.

### Impact on Plan Lock
Slice 4 gets a detailed Plan Lock section written before any code; execution stops for go-ahead on
that slice specifically.

## Decision 13 — 2026-07-11 — Resume UI journey with collision-safe routes

### Decision
Resume the approved v2.1 UI implementation. Use `views/*` for peer pages, `actions/*` for review,
and `source/:slug` for canonical document URLs. Retain the existing one-segment source route for
compatibility. Dedicated later-slice destinations render truthful pending states until completed.

### Rationale
This permanently prevents new user routes from shadowing frozen document slugs, preserves every
existing deep link, and removes the final external decision dependency after visual approval.

### Approval
Vikram: “Why is the goal blocked? And it has to be unblocked. You got to know what you have to.”
