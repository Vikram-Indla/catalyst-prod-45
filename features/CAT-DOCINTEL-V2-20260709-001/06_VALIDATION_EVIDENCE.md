# Validation Evidence — CAT-DOCINTEL-V2-20260709-001

## UI revamp Slice 4A — Source Overview (2026-07-11) ✅ COMPLETE

- Overview is selected for missing/unknown view keys; all existing panels remain reachable.
- Live Audio Test source rendered one real unreviewed finding and zero deliverables.
- No uncited summary, readiness score or invented next action is rendered.
- Header title/status, version menu, upload and themes remained intact.
- Workspace tests 7/7, TypeScript, ADS/color gates and full pre-commit passed.

## UI revamp Slice 3 — Review Start → Findings (2026-07-11) ✅ COMPLETE

- 43/43 combined tests passed; TypeScript and complete pre-commit passed.
- Live page rendered exactly three decisions with Audio Test — Revenue Target and latest v1.
- Historical version selection and Compare versions are absent by design.
- Start navigated to `/source/audio-test-revenue-target?project=BAU&view=findings`.
- Workspace selected Findings (`aria-selected=true`) and deselected Evidence.
- Back/Forward restored both scoped URLs and Findings selection.
- No review/analysis row, UUID or version claim was created.

## UI revamp Slice 2 — intent-first Home (2026-07-11) ✅ COMPLETE

- 33/33 route/composer/citation tests passed; TypeScript and full pre-commit passed.
- Authenticated staging rendered Senaei BAU scope and eight real recent items: four sources plus
  Test Cases, Epic, Document Summary and Epic deliverables.
- Selecting Audio Test — Revenue Target updated the visible scope before action.
- Review routed with explicit project/source parameters; the verified Test Cases deliverable opened
  in the existing evidence-backed ArtifactView.
- Light, dark and 1280×720 passed; exactly one H1 and no page-level horizontal overflow.
- Design critique: 28/30, no P0/P1 blockers.

## UI revamp Slice 1 — navigation and collision-safe routes (2026-07-11) ✅ COMPLETE

- 12/12 route tests passed; TypeScript passed; color and ADS ratchet gates passed.
- Home `/doc-intelligence` and Library `/doc-intelligence/views/library` loaded in the logged-in
  staging session with URL-derived selected tabs and exactly one H1.
- Library preserved the real staging-backed dataset: 31 items were visible, including the existing
  Audio Test and README sources.
- Canonical `/doc-intelligence/source/audio-test-revenue-target` and legacy
  `/doc-intelligence/audio-test-revenue-target` both resolve the same source workspace.
- Light, dark and 1280×720 Home states plus Library and legacy-source evidence are stored under
  `evidence/slice1-*.png`.
- No backend, schema, RLS or staging-data mutation was made by this UI slice.

## Baseline (pre-fix), carried from discovery audit

- `ai_document_embeddings`: 378 rows, all `vector(1536)`, spot-checked non-null (staging `cyij`).
- `ai_requirement_facts`: 0 rows with embeddings — confirms `docintel_match_facts` has nothing to
  match against.
- Citation confidence display: self-documented as ~0.01 vs actual grounding ~1.0
  (`features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/02_CANONICAL_DISCOVERY.md:134-138`).

---

## SLICE 2 — MarkItDown ingestion-fidelity spike (RUN 2026-07-09) ✅ COMPLETE

**Setup:** Microsoft `markitdown` v0.1.6 (+ pdf/docx/xlsx/pptx extras) in an isolated Python 3.14
venv in scratchpad. No repo dependency added. No Supabase write. Pure local measurement.

**Fixtures:** 2 real repo files (`IR-Platform-Milestones.pptx`, `STRATA_implementation_audit.pdf`)
+ 2 generated structured files (multi-heading .docx with a table, multi-sheet .xlsx). Scanned-Arabic
PDF not tested locally (fixture lives only in Supabase storage) — reasoned separately below.

### Results — structure/citation-anchor fidelity per media type

| Type | Chars | Headings kept | Tables → MD | Page/slide anchor | Verdict |
|---|---|---|---|---|---|
| **.docx** | 294 | ✅ 3 (`#`/`##` nesting exact) | ✅ markdown table | n/a (flow doc) | **ADOPT — strictly better** |
| **.xlsx** | 181 | ✅ each sheet → `## Sheet` | ✅ per-sheet MD tables | ✅ sheet name = anchor | **ADOPT — strictly better** |
| **.pptx** | 928 | ✅ | n/a | ✅ `<!-- Slide number: N -->` per slide | **ADOPT — slide# = citation anchor** |
| **.pdf** | 27,789 | ❌ 0 (structure flattened) | 🟡 partial (grid→MD but noisy) | ❌ **0 page markers** | **REJECT — keep current path** |

### The decisive finding

- **docx**: MarkItDown preserves heading hierarchy (`# Section 1`, `## Section 2.1 — Security`) and
  the embedded table as a markdown table. This **directly fixes the current 1-page-collapse bug**
  (current mammoth path flattens .docx to one logical page). Feeds `heading_section` chunker cleanly.
- **xlsx**: Every sheet becomes a `## <SheetName>` heading + a proper markdown table. Multi-sheet
  structure survives (current path unproven). Sheet name is a natural citation anchor.
- **pptx**: MarkItDown emits `<!-- Slide number: 1 -->` HTML comments per slide — a **real,
  per-slide citation anchor** the current pipeline doesn't have at all. New media type, for free,
  WITH grounding.
- **pdf**: MarkItDown uses `pdfminer.six` — it dumps a **flat text stream with zero page boundaries
  and zero heading structure** (headings=0, pagemarkers=0 on a 27k-char audit PDF that visually has
  clear sections and pages). This would **destroy Catalyst's per-claim page/block citation model**
  — the crown-jewel differentiator. Catalyst's existing PDF path (native extract + Gemini vision,
  page-aware, block-hashed) is materially superior for citations.
- **scanned-Arabic (reasoned, not run)**: `pdfminer.six` cannot OCR image-only PDFs at all — it
  would return empty/garbage. MarkItDown's `ImageConverter` needs an LLM client configured to OCR.
  Catalyst's Gemini-vision path already does Arabic OCR well. **Gemini stays for scanned-Arabic.**

### Verdict (gates Slice 3) — PARTIAL adoption

MarkItDown is adopted as the ingestion front-door for **.docx / .xlsx / .pptx (+ future audio,
html, csv, epub, msg)** — where it is strictly better than today AND preserves a citation anchor
(heading / sheet / slide). It is **rejected for PDF** (loses pages) and **not used for
scanned-Arabic** (no OCR). PDF and scanned-Arabic keep the current native+Gemini-vision path.

This is the "adopt for the media types where fidelity survives, keep current path where it doesn't"
outcome — not blind adoption, not rejection. Recorded as Decision 10 in `09_DECISIONS.md`.

**Raw outputs:** scratchpad `markitdown-spike/out/{docx,xlsx,pptx,pdf}.md` (session-local, not
committed).

---

## SLICE 1 — live verification (2026-07-09, staging `cyij`, read-only)

Outcome: all three bugs already fixed in source (2026-07-07) AND deployed (generate v7, analyze v7,
sync v6). Slice 1 became verify-only (see `08_DRIFT_LOG.md` Drift Event 1). Live query results:

| Bug | Metric | Result | Verdict |
|---|---|---|---|
| #3 match_facts dead | requirement_facts / fact chunks / fact embeddings | 5 / 5 / 5 (1:1:1) | ✅ FIXED + LIVE |
| #2 section_path NULL | heading chunks total / NULL | 350 / 2 (0.6%) | ✅ FIXED + LIVE (2 title-line edges) |
| #1 confidence mis-scale | citations pre-fix (2026-07-06) | 78 rows @0.0088–0.0098 | ❌ stale rows (write-once) |
| #1 confidence mis-scale | citations post-fix (2026-07-09) | 46 rows @0.73–1.0 | ✅ FIXED + LIVE |

Per-artifact proof (confirms date split): BRD (07-06) 54 cites max 0.0098 · Epic (07-06) 24 cites
max 0.0098 · Document Summary (07-09) 25 cites 0.73–1.0 · Epic (07-09) 21 cites 0.80–0.90.

**Residual (decision pending Vikram):** 78 stale citation rows on 2 historical pre-fix demo
artifacts. Recommended: leave as historical (Option 1, `08_DRIFT_LOG.md`). Not silently deleted.

---

## SLICE 4a — prompt registry (docintel-ask) — COMPLETE + LIVE-VERIFIED (2026-07-11)

Migration `20260711011626_docintel_prompt_registry` applied to staging cyij. `docintel-ask`
deployed via Supabase CLI with the local access token (CI/GitHub token is expired — Drift Event 2).
Byte-faithful bundle (index.ts + _shared/{llm,prompts,docintel}.ts uploaded from disk).

**End-to-end proof (live Ask on localhost:8080 → staging cyij, 2026-07-11 01:31):**
- Live Ask "What are the raw material requirements?" → grounded answer, page citations
  (P.24/P.19/P.15), 4 sources, confidence 50%. Answer quality unchanged (no behaviour drift).
- Registry self-seeded on that first call: `ai_agent_prompts` slug `docintel.ask.answer` v1,
  is_active, id `31483425-9bbb-430f-8708-da404b9ba138`, prompt text = byte-faithful
  `ASK_PROMPT_TEMPLATE` ("You are a document Q&A assistant.\nAnswer the user'…").
- The run was stamped truthfully: `ai_agent_runs` latest agent='ask' row (2026-07-11 01:31:34)
  carries `prompt_id=31483425-…` (exact match to the seeded row), `prompt_version=1`, status ok.
- Contrast: the two prior ask runs (2026-07-09, pre-deploy) have `prompt_id=NULL` — provenance is
  truthful only from the deployed version onward, exactly as designed.

**Fine-tuning enabler is now live for the Q&A prompt:** tune = `UPDATE ai_agent_prompts SET prompt=…,
version=version+1` (+ deactivate old / activate new) — no edge-function redeploy.

Pattern proven. Next: propagate to `docintel-analyze` (2 prompts) and `docintel-generate`
(per-type base + facts; NUL-safe via CLI/git deploy).
