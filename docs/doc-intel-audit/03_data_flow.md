# 03 — Data Flow: Tracing One Uploaded PDF

The mission asks to trace one uploaded PDF end to end:

```
Upload → Storage → Parser → OCR → Chunking → Embedding → Database → Retrieval → Prompt → LLM → Answer
```

There is no single path that completes this chain. Two real, independent paths exist. Both are traced
below, stage by stage, with an explicit "✗ does not happen" at every stage that isn't real.

## Path A — What actually happens today when a user imports a PDF into Folio (LIVE)

| Stage | What happens | Evidence |
|---|---|---|
| **Upload** | User picks a PDF in the Folio import UI. | (frontend import flow, not deep-audited beyond the function it calls) |
| **Storage** | ✗ Not found — `docex-import` takes the PDF as an inline base64 payload in the request body; it never writes to a Storage bucket itself. | `supabase/functions/docex-import/index.ts:1-139` (no Storage client calls) |
| **Parser** | Gemini's native `generateContent` endpoint reads the PDF directly (multimodal), extracting a title, source language, and an array of typed content blocks. | `supabase/functions/docex-import/index.ts:27-63,83-90` |
| **OCR** | ✗ No separate OCR step — Gemini's native document understanding serves as a de facto OCR/vision step for scanned content, but there is no discrete OCR stage, model, or library in this path. | Confirmed by RAG-layer discovery: "Not found in repository" for any standalone OCR function |
| **Chunking** | ✗ Not found — the whole document is sent in one request; output blocks map 1:1 to Folio content blocks, not retrieval chunks. | `supabase/functions/docex-import/index.ts` (no chunking logic present) |
| **Embedding** | ✗ Not found — nothing in this path calls an embedding model. | Confirmed: no embedding call in `docex-import` |
| **Database** | The returned `blocks[]` are written into `kb_documents.content` (BlockNote/ADF JSON) by the frontend, under a `kb_doc_spaces` workspace. The write happens client-side, not inside the edge function. | `src/hooks/useWiki.ts` (page create/update hooks); `supabase/migrations/20260706140000_docex_doc_keys.sql` (doc_key assignment on insert) |
| **Retrieval** | ✗ Not found — this document is now only reachable via Folio's own keyword/FTS search (`useDocexSearch`), never via vector/semantic retrieval. `kb_embeddings.source_type` has no value for Folio/Docex content at all. | `src/hooks/useWiki.ts:634`; `kb_embeddings` CHECK constraint enum (`ministry|jira|catalyst|brd|internal`) |
| **Prompt** | N/A — no retrieval means no context is ever assembled into an LLM prompt about this document's content. | — |
| **LLM** | N/A for retrieval purposes. (Gemini was already used once, at import time, for translation/structuring — not for answering questions about the doc later.) | — |
| **Answer** | ✗ There is no "ask a question about this PDF" capability anywhere downstream of Folio import. | — |

**Bottom line for Path A: Upload → Parse → Store. That's the entire chain that exists.** Everything from
Chunking onward is absent.

## Path B — What the RAG pipeline was designed to do (PARKED, not deployed, not reachable in production)

| Stage | What the code does | Evidence |
|---|---|---|
| **Upload** | Admin/content pipeline calls the (parked) ingestion action — no evidence this was ever wired to a Folio/Docex upload; it targets `kb_sources` (ministry/Jira/BRD/Catalyst/internal), not user-authored Folio pages. | `supabase/functions-parked/kb-ingest/index.ts` |
| **Storage** | ✗ Not applicable — this pipeline ingests text content (crawled or pasted), not files in Storage. | — |
| **Parser** | Plain text in, no document-format parsing found in this function. | `supabase/functions-parked/kb-ingest/index.ts` |
| **OCR** | ✗ Not found — no OCR anywhere in this path either. | — |
| **Chunking** | `chunkText(text, maxWords=500, overlapWords=50)` — word-based chunking with overlap; SHA-256 `content_hash` computed per chunk for dedup. | `supabase/functions-parked/kb-ingest/index.ts:33-51` |
| **Embedding** | OpenAI `text-embedding-3-small`, batched, via `getEmbeddings()`. | `supabase/functions-parked/kb-ingest/index.ts:20-30` |
| **Database** | Chunk + embedding written to `kb_embeddings` (`content`, `content_hash`, `source_type`, `source_url`, `metadata`, `embedding vector(1536)`, `chunk_index`, plus semantic-chunk columns `chunk_type`/`parent_chunk_id`/`section_title`/`token_count`/`tags`). | `supabase/migrations/20260228122149...sql:64-78`, `20260228222951...sql:12-17` |
| **Retrieval** | Query time: embed the query, call `kb_hybrid_search()` (vector cosine + `websearch_to_tsquery` FTS, fused by Reciprocal Rank Fusion) or `kb_match_embeddings()` (pure cosine). Then LLM-based rerank (`gpt-4o-mini`, top 30 → top 6, floor 0.3). | `supabase/functions-parked/kb-query/index.ts:1288-1339`; SQL RPCs at `bootstrap_full_schema.sql:13109,13306` |
| **Prompt** | Reranked chunks assembled into context with inline `[SOURCE-N]` tags mapped to `source_url`/`source_type`/score. | `supabase/functions-parked/kb-query/index.ts:1347-1363` |
| **LLM** | Generation model call (query log default `generation_model = 'gpt-4o-mini'`). | `supabase/migrations/20260228222951...sql:24-33` (column default) |
| **Answer** | Returned with a `references[]` array (`KBReference` type: `similarity`, `metadata`) to the caller. | `src/services/knowledgeBase.ts:31-36` |

**This entire path is unreachable in production** — every function above lives in
`supabase/functions-parked/`, which Supabase does not deploy. `src/pages/KBDataAudit.tsx` and
`src/services/knowledgeBase.ts` still call it by name (`supabase.functions.invoke("kb-query", ...)`
etc.), so those calls fail (404 or invocation error) against the live backend today.

## Why the two paths never meet

- Path A writes to `kb_documents` (Folio content). Path B writes to `kb_embeddings` (ingested/scraped
  reference content). There is no foreign key, trigger, or code path connecting the two tables.
- Even if Path B's edge functions were redeployed as-is, `kb_embeddings.source_type`'s CHECK constraint
  (`ministry|jira|catalyst|brd|internal`) would reject a `'docex'`/`'wiki'` source value without a schema
  migration first.
- No trigger or scheduled job exists that would fire "on Folio page publish/update" to push its content
  into the embedding pipeline (searched: no `cron.schedule` targets kb_documents/kb_embeddings; see
  `04_database.md`).
