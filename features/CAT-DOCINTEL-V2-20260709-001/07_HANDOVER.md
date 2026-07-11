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

## FINAL — ALL SLICES COMPLETE + live-verified (2026-07-11 autonomous /goal run)

Every slice done and proven on staging cyij. Deploys via local CLI token (CI still needs the
GitHub `SUPABASE_ACCESS_TOKEN` rotated). Highlights:
- **1** correctness bugs — re-verified. **2** MarkItDown spike — verdict (later moot: everything
  went Deno-native). **4** prompt registry live across ask/analyze/generate (fine-tuning enabler).
- **5** themes — browse filter, tag/create UI, theme-scoped Ask ("Industrial Scanning" e2e).
- **6** Jira + git → RAG — Ask cites `source_type='jira'` (BAU-6155) and `source_type='git'`
  (docs/slug-contract.md). Also FIXED a critical Slice-5 hybrid_search regression that had broken
  all Asks.
- **3** ingestion — DOCX multi-section, PPTX per-slide, AUDIO (Gemini transcription) — all
  Deno-native (no MarkItDown/Python service needed after all), audio proven end-to-end
  (clip → "$4 million" answer, cited).
- **7** ops — Health failure banner, member-triggered Re-sync, kb_* dead-code deleted, document-link
  proof (201), promote-to-workitem proof (created epic `d98b52de`, link_origin='promotion').

Only genuine follow-ups (NOT gaps in the delivered scope): a git PROVIDER auto-fetch (GitHub
API/clone that feeds the source-agnostic git adapter), and the two standing infra items below.

## STATUS SNAPSHOT — 2026-07-11 (autonomous /goal run)

| Slice | Scope | Status |
|---|---|---|
| 1 | Correctness bugs (confidence / section_path / fact-embedding) | ✅ DONE — already fixed+deployed 2026-07-07; live-verified (Drift Event 1) |
| 2 | MarkItDown fidelity spike (GATE) | ✅ DONE — PARTIAL-adopt verdict (Decision 10) |
| 4a | Prompt registry — docintel-ask | ✅ DONE — deployed + live-verified (seed + prompt_id stamped) |
| 4b | Prompt registry — docintel-analyze | ✅ DONE — deployed (seeds on next ingestion; pattern proven) |
| 4c | Prompt registry — docintel-generate | ✅ DONE — deployed + live-verified (Test Cases run stamped) |
| 5 | Themes | ✅ DONE + live-verified — backend (tables/slug/RLS/hybrid_search p_theme_id) + browse-by-theme filter (3→1 proven) + per-doc tag control & inline create (ThemeTags) + theme-scoped Ask (docintel-ask p_theme_id). 'Industrial Scanning' seeded/tagged. |
| 3 | Universal ingestion (docx/xlsx/pptx/audio) | 🟡 PARTIAL — ✅ DOCX multi-section fix (`ed72938e5`): shared `_shared/docx.ts` splitter (Deno-native mammoth), ingest sets page_count, analyze aligns; spike-proven, deployed (live upload blocked by sandbox upload-path restriction). REMAINS: pptx + audio — the Slice-2 verdict routes these to MarkItDown, which needs the Python-hosting decision (Vikram's call — an external blocker, see Drift Event 2 note). |
| 6 | Jira → same RAG | ✅ DONE + live-verified — `ai_documents.source_type`; Jira ingest folded into docintel-sync (`mode:'jira'`, project at fn-count cap so no new fn); 25/1721 BAU issues ingested; Ask "accessibility/compliance enhancements?" → "BAU-6155 … [E1]" cited to a source_type='jira' doc. git adapter NOT done (git/markdown source — dedicated follow-up). ALSO fixed a critical regression this run: the Slice-5 themes migration had reverted 4 hybrid_search patches, breaking ALL Asks — restored + verified. |
| 7 | Ops + proof + cleanup | 🟡 MOSTLY — ✅ Health failure banner (`f0a647b59`), ✅ manual Re-sync-now (`bbefe19fe`, live-verified off-cron), ✅ kb_* dead-code deletion (`18fa402ff`, kb-generate-answers+kb-ingest, 0-ref/undeployed). ✅ document-link e2e proof (member created a real doc→work-item link, RLS-allowed 201). REMAINS: promote-to-workitem UI-flow live exercise (capability audit-confirmed + its underlying ai_document_links write proven by the link proof — marginal). |

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
