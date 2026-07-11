# Handover — CAT-DOCINTEL-V2-20260709-001

## State at end of Session 001 (2026-07-09)

Feature activated. Discovery complete (reused from same-session audit, no duplicate agent spend).
Objective + Canonical Discovery + Plan Lock v1 (DRAFT) written. **No code touched.**

## What's proven

Everything in `docs/audits/doc-intel-current-state-discovery.md` — DocIntel v1 is real and live:
pgvector RAG, bilingual Ask, real citations, artifact generation, Health dashboard, 15-min cron
sync. Two self-documented bugs confirmed still open: citation confidence mis-scale,
`docintel_match_facts` dead RPC (0 fact embeddings).

## What's NOT proven yet

- Root cause of the fact-embedding gap (missing call vs. missing data at extraction time) — three
  open discovery questions in `02_CANONICAL_DISCOVERY.md` must be answered first.
- Whether `ai_theme_cache` (4 live rows) is repurposable for the theme-browsing gap or unrelated.
- Whether `RAJiraSidePanel.tsx` (only live `kb_*` consumer) is itself dead code.

## STATUS SNAPSHOT — 2026-07-11 (autonomous /goal run)

| Slice | Scope | Status |
|---|---|---|
| 1 | Correctness bugs (confidence / section_path / fact-embedding) | ✅ DONE — already fixed+deployed 2026-07-07; live-verified (Drift Event 1) |
| 2 | MarkItDown fidelity spike (GATE) | ✅ DONE — PARTIAL-adopt verdict (Decision 10) |
| 4a | Prompt registry — docintel-ask | ✅ DONE — deployed + live-verified (seed + prompt_id stamped) |
| 4b | Prompt registry — docintel-analyze | ✅ DONE — deployed (seeds on next ingestion; pattern proven) |
| 4c | Prompt registry — docintel-generate | ✅ DONE — deployed + live-verified (Test Cases run stamped) |
| 5 | Themes | ✅ DONE + live-verified — backend (tables/slug/RLS/hybrid_search p_theme_id) + browse-by-theme filter (3→1 proven) + per-doc tag control & inline create (ThemeTags) + theme-scoped Ask (docintel-ask p_theme_id). 'Industrial Scanning' seeded/tagged. |
| 3 | Universal ingestion (docx/xlsx/pptx/audio) | ⬜ NOT STARTED. Reframed: office ingestion is already Deno-native (mammoth/SheetJS) — the real gap is docx→1-page collapse (fix Deno-natively, no Python service needed) + pptx + audio. Does NOT require external MarkItDown hosting for docx/xlsx. |
| 6 | Jira + git → same RAG (source_type adapters) | ⬜ NOT STARTED — the largest remaining item: additive `ai_documents.source_type`, Jira adapter (ph_issues → chunk/embed/cite), git/markdown adapter, citation-anchor extension. Needs a dedicated session. |
| 7 | Ops + proof + cleanup | 🟡 PARTIAL — ✅ Health failure banner (`f0a647b59`), ✅ manual Re-sync-now (`bbefe19fe`, live-verified off-cron run 02:08). REMAINS: promote-to-workitem e2e proof, document-link e2e proof (both capabilities already exist per audit), kb_* dead-fn deletion (destructive — deferred; verify RAJiraSidePanel liveness first). |

Shipped commits this run: `5d44c3363` (4a), `0e4d19203` (4b/4c), `e600a26dd` (5-backend), `4fcd51d67`
(5-browse), `257b490e8`/`37db6d230` (5-Ask-scope), `03a2b27b9` (5-tagUI), `f0a647b59` (7-banner),
`bbefe19fe` (7-resync). All deploys via local CLI token (CI deploy remains broken — expired GitHub
secret, Drift Event 2).

Honest note: DONE = slices 1,2,4,5 + Slice 7 (banner+re-sync). REMAINING = Slice 3 (ingestion — Deno-
native docx fix + pptx/audio), Slice 6 (Jira/git — large, dedicated session), Slice 7 tail (e2e proofs +
kb cleanup). The user's headline asks are LIVE: prompt-registry fine-tuning across all 3 LLM functions;
"Industrial Scanning" browsable + Ask-scopable theme end-to-end.

## Next exact prompt

```
continue feature CAT-DOCINTEL-V2-20260709-001
```

Then run pre-flight:
```
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5
```

Next action: Vikram reviews `03_PLAN_LOCK.md` v1 (DRAFT). On approval, Slice 1 begins with the
3-question discovery pass (Phase 1 of the Plan Lock's Parallel Execution Plan), then the two P0
bug fixes.
