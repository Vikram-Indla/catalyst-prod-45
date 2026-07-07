# GOAL COLLATERAL — Catalyst Document Intelligence RAG + Agent Studio

> **Purpose of this document**: This is the single collateral you hand to Fable. It is written
> as a goal-oriented prompt to be executed with `/goal` + loop. Every sentence of the original
> intent narrative has been extracted into the Intent Ledger below — nothing from the spoken
> requirement is allowed to drop out of scope silently. If Fable cannot satisfy a ledger item,
> it must say so explicitly in the Plan Lock, not omit it.

Suggested Feature Work ID: `CAT-DOCEX-RAG-AGENTS-20260706-001`
Suggested activation: `activate feature docex-rag-agents` (per CLAUDE.md operating contract)

---

## 1. GOAL STATEMENT (the one paragraph Fable optimizes for)

Build a new Catalyst feature — with its own frontend surface — where a user uploads 2–3
business documents (PDF or Word, ≤10 pages each, typically **Arabic**, containing **images,
tables, and mixed layout**), and Catalyst ingests them end-to-end: OCR + image understanding
via **Gemini 2.5 Flash multimodal**, faithful **Arabic→English translation that preserves the
exact meaning** of the source, structure extraction into typed blocks, chunking, embedding,
and storage as **vectors in Supabase pgvector**. On top of that vectorized knowledge, a
**master orchestrator agent** interprets the user's (possibly vague) request, resolves
**intent**, and routes work to four specialist generation agents — **Epic writer, Story
writer, Summary writer, and full technical BRD writer** — which produce their outputs in
**near real time (streamed)**, grounded ONLY in the retrieved document content, never in
model imagination.

---

## 2. INTENT LEDGER — every requirement from the narrative, numbered

Fable: treat each row as a contract line. Plan Lock must map every ID to a deliverable or an
explicit, justified exclusion. No silent drops.

| ID | Requirement (verbatim intent, normalized) |
|----|-------------------------------------------|
| R1 | Input = PDF **and Word** documents, up to ~10 pages (design ceiling 20), primarily **Arabic** |
| R2 | Documents contain **images**; the system must read images and convert what it understands into text (vision OCR / image captioning), not skip them |
| R3 | The feature has **its own OCR** capability — no dependency on an external OCR SaaS; Gemini multimodal IS the OCR engine |
| R4 | Extracted content must be **structured** (headings, paragraphs, lists, tables, image-derived text — typed blocks), not a raw text dump |
| R5 | Structured content is **embedded and stored as vectors in the database** (Supabase pgvector) |
| R6 | **Meaning fidelity is absolute**: the stored/reproduced data must carry *exactly the same meaning* as the source PDF/Word. Translation may change language, never meaning. Zero-assumption rule applies — unknown content renders as unknown, never guessed |
| R7 | **Arabic → English translation** is a first-class capability of the pipeline |
| R8 | **Reproduction is (near) real time**: ingestion progress is live, and generation outputs **stream** to the UI token-by-token |
| R9 | Upload supports **2–3 documents at once**; retrieval and generation can draw across all uploaded documents in the workspace |
| R10 | **Agent: Epic writer** — writes epic statement(s) from the document knowledge |
| R11 | **Agent: Story writer** — writes user stories from the document knowledge |
| R12 | **Agent: Summary writer** — writes a complete summary of the document(s) |
| R13 | **Agent: BRD writer** — writes a complete Business Requirements Document **with all technical details** |
| R14 | **Master agent** orchestrates: receives the user request, performs **intent resolution** (user may be unclear/ambiguous), and **distributes the task to the right specialist agent(s)** |
| R15 | When intent is ambiguous, the master agent must handle it (clarify or infer with stated confidence) — not guess silently |
| R16 | Model runtime = **Gemini Flash family already available in Catalyst** (GEMINI_API_KEY lane). No new model vendor |
| R17 | This is a **Catalyst-native feature with its own frontend** (own route, own surface) — not a bolt-on to an existing page |
| R18 | Differentiator awareness: market has many RAGs; this one must be **Catalyst-branded and Catalyst-integrated** (outputs can flow toward Catalyst work items — epics/stories are Catalyst domain objects) |
| R19 | Deliverable quality of generation = BRD-grade professional English, structured documents, not chat blobs |

---

## 3. GROUND TRUTH — what already exists in Catalyst (verified in repo 2026-07-06)

**Fable: this section is the reuse mandate. Canonical-first hierarchy applies. Do NOT
greenfield what already exists — extend it.**

| Existing asset | Location | What it already does | Gap vs this goal |
|---|---|---|---|
| `docex-import` edge function | `supabase/functions/docex-import/` | PDF (base64) → Gemini **native** `generateContent` with inline PDF parts → typed blocks `{heading1..3, paragraph, bullet, numbered, quote}` + **Arabic→English professional translation**, JSON response schema | No Word (.docx) input; no `table`/`image_text` block types; no persistence to vector store; single doc at a time |
| pgvector KB schema | migration `20260228122149` | `CREATE EXTENSION vector`; `kb_sources`, `kb_embeddings vector(1536)`, `kb_match_embeddings()` similarity RPC, `kb_cache`, `kb_query_log`, `kb_access_matrix` | Built for a KB use case — decide: reuse `kb_*` tables vs new `docex_*` family. Must check what currently consumes `kb_*` before repurposing (blast-radius check mandatory) |
| `ai-generate-epics` / `ai-generate-stories` / `ai-generate-story-test-cases` | `supabase/functions/` | Existing Gemini-backed epic/story generation prompts + output contracts | Not RAG-grounded; need retrieval-context injection variant, not a rewrite |
| `ai-translate-field`, `ai-translate-title` | `supabase/functions/` | Gemini 2.5 Flash translation lane, established prompt patterns | Reuse prompt/guardrail patterns |
| `folio-ai-search` | `supabase/functions/` | NL → structured filter pattern (AI translates query to JSON spec only) | Same pattern is the template for the **intent-resolver** stage of the master agent |
| Folio BRD template | Folio `template_keys: "brd"` | A BRD document shape already exists in Catalyst | BRD writer should emit into/compatible with this template, not invent a new shape |
| Docex co-edit surface | `useDocexDatabase.ts`, wiki-hub editor, routes in `src/lib/routes.ts` | Live document editing surface fed by docex-import | Candidate host or sibling for the new frontend |
| Gemini lane conventions | all `ai-*` functions | `gemini-2.5-flash` default via OpenAI-compat endpoint; **native endpoint only where inline files are needed** (docex-import comment documents this); `gemini-2.5-flash-lite` for cheap passes; `ai_usage_log` governance logging | Follow both conventions; log all calls to `ai_usage_log` |
| Embeddings | — | `kb_embeddings` is dimension **1536** | Gemini `gemini-embedding-001` supports 1536-dim output — matches existing column. Use it (single-vendor, R16) |

Net: this feature is **an extension of Docex + kb_* infra**, not a new subsystem from zero.

---

## 4. REQUIRED ARCHITECTURE (shape, not implementation dictation)

### 4.1 Ingestion pipeline (per document, async job with live progress)

```
Upload (2–3 files, pdf/docx, ≤10pp, Supabase Storage bucket)
  → Extract: Gemini 2.5 Flash multimodal, native endpoint, inline file parts
      - OCR of scanned/text pages (R3)
      - image → descriptive text blocks (R2)   [new block type: image_text]
      - tables → structured table blocks (R4)  [new block type: table]
      - dual-language capture: store BOTH source Arabic text AND English translation
        per block (R6, R7) — translation must be meaning-preserving; keep source for audit
  → Structure: typed block tree with page anchors + reading order
  → Chunk: semantic chunks (heading-scoped, ~400–800 tokens, overlap), each chunk carries
      {doc_id, page, block_ids, lang_source, text_ar, text_en}
  → Embed: gemini-embedding-001 @ 1536 dims on English text (query lane is English)
  → Store: pgvector rows + full structured document JSON (the "faithful reproduction" record)
  → Status events streamed to UI per stage (R8): uploaded → extracting → structuring
      → embedding → ready, with per-page progress
```

Fidelity gate (R6): after extraction, run a cheap verification pass (flash-lite) that
back-checks a sample of translated blocks against source blocks for meaning drift; store a
fidelity score per document; surface it in UI. Unknowns render as dash/empty per
ZERO-ASSUMPTION rule — never a fabricated default.

### 4.2 Retrieval

- `kb_match_embeddings`-style RPC scoped to the upload workspace (the 2–3 docs), top-k with
  similarity threshold; return chunks WITH page/block citations.
- Every generated artifact must carry **citations back to doc+page** — this is the
  anti-hallucination contract and the market differentiator hook (R18, R19).

### 4.3 Agent layer (R10–R15)

```
User request (free text, possibly vague)
  → MASTER AGENT
      1. Intent resolution (folio-ai-search pattern: model outputs strict JSON
         {intent: epic|story|summary|brd|multi|unclear, confidence, scope, missing_info[]})
      2. If unclear/low-confidence → ask ONE clarifying question in UI (R15);
         if moderately confident → proceed and state the assumption visibly
      3. Task distribution: fan out to the selected specialist agent(s), each with its own
         retrieval pass tuned to its needs (BRD retrieves broadly; epic retrieves goals/scope)
  → SPECIALIST AGENTS (each = edge function + prompt contract + output schema)
      • Epic Writer     → Catalyst epic statement format (reuse ai-generate-epics contract)
      • Story Writer    → user stories w/ acceptance criteria (reuse ai-generate-stories)
      • Summary Writer  → executive summary of the corpus
      • BRD Writer      → full BRD w/ technical details, emitted against the Folio "brd"
                          template shape; sectioned; every section cites sources
  → All outputs STREAM to the frontend (SSE from edge functions) (R8)
  → Outputs are actionable: "Create as Epic in Catalyst" / "Save to Folio" actions
     (must go through canonical create-modal / CRE-gated flows — no bypass) (R18)
```

### 4.4 Frontend (R17)

Own route + surface (slug-based route per SLUG CONTRACT — no `:id` params). Three zones:
1. **Corpus panel** — upload dropzone (2–3 docs), per-doc ingestion progress, fidelity score,
   structured preview (EN/AR toggle).
2. **Ask panel** — single input to the master agent; intent chip shows what the master
   resolved ("Detected intent: BRD — proceeding") with override control.
3. **Output panel** — streamed artifact rendering with citations; per-artifact actions
   (create epic/story, save to Folio, export).

All UI: Catalyst canonical components first, ADS tokens only (no bare colors — HARD STOP),
JiraTable rule for any list, screenshot sign-off applies.

---

## 5. NON-GOALS (explicit, so scope cannot creep)

- No documents >20 pages; no OCR of handwriting; no video/audio.
- No new model vendor, no self-hosted embedding model, no external OCR API (Tesseract etc.).
- No cross-workspace/global knowledge base in v1 — retrieval scope = the uploaded corpus.
- No fine-tuning. No agent framework dependency (LangChain etc.) — agents are edge functions
  + prompt contracts + JSON schemas, per existing Catalyst `ai-*` conventions.
- No editing of generated BRD inside this surface in v1 (hand off to Folio/Docex editor).

---

## 6. BINARY ACCEPTANCE CRITERIA

| # | Test | Pass condition |
|---|------|---------------|
| A1 | Upload a 10-page Arabic PDF containing ≥2 images and ≥1 table | Ingestion completes; structured preview shows headings/paragraphs/lists/table blocks AND text derived from each image; both AR source and EN translation stored |
| A2 | Meaning fidelity | Bilingual reviewer (or fidelity-check pass) confirms sampled EN blocks carry same meaning as AR source; fidelity score displayed; zero fabricated content in blocks |
| A3 | Vectorization | pgvector rows exist for every chunk; `kb_match`-style RPC returns relevant chunks for an English query about Arabic-source content |
| A4 | Upload 3 documents | All three ingested; a query spanning two docs retrieves from both |
| A5 | Vague request: user types "I need something for my dev team from this" | Master agent resolves intent (or asks one clarifying question), routes correctly, states its interpretation visibly |
| A6 | "Write the BRD" | Full sectioned BRD with technical details streams into UI; every section carries doc+page citations; conforms to Folio BRD template shape |
| A7 | Epic + stories | Epic statement and ≥5 stories with acceptance criteria generated, grounded (citations), creatable as real Catalyst work items via canonical flows |
| A8 | Real-time | Ingestion shows live stage progress; generation streams (first token < ~3s, no blank-wait-then-blob) |
| A9 | Governance | Every model call logged to `ai_usage_log`; ADS color/audit gates pass; no hand-rolled UI; slug route |
| A10 | Zero-assumption | A corrupt/unreadable page yields an explicit "unreadable" block, never invented text |

---

## 7. EXECUTION PROTOCOL FOR FABLE (how to run this collateral)

1. **Activate**: `activate feature docex-rag-agents` → create Feature Work ID + folder per
   CLAUDE.md. This document seeds `01_OBJECTIVE.md`.
2. **Discovery before Plan Lock** (parallel agents, mandatory): confirm every row of §3
   against current main (especially: who consumes `kb_*` today — reuse vs new `docex_rag_*`
   tables is a Plan Lock decision, not an assumption); probe docex-import limits (docx?, page
   cap, token cap); verify `gemini-embedding-001` availability on the current API key.
3. **Plan Lock**: map every Intent Ledger ID (R1–R19) to a slice; 2-hour slice rule; stop for
   Vikram review before code.
4. **Loop application**: run as goal-oriented loop — each iteration = one slice
   (ingest-extract → persist+embed → retrieve → master agent → specialist agents → frontend
   → acceptance sweep A1–A10), Karpathy loop logged, screenshot evidence per UI slice.
5. **All DB work on staging cyij first.** Prod only on explicit instruction.
6. **Done** = all A1–A10 pass with raw evidence + screenshots, gates green, handover written.

---

## 8. OPEN DECISIONS FOR VIKRAM (surface at Plan Lock, not before)

1. Reuse `kb_*` tables vs new `docex_rag_*` family (depends on current `kb_*` consumers).
2. Where the frontend lives: inside Docex/Wiki hub vs new top-level hub entry.
3. v1 output language: English-only artifacts, or Arabic artifact option too?
4. Should generated epics/stories auto-link to a selected Catalyst project, or stay unlinked
   drafts until user assigns?
