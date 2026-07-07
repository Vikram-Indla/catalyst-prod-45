# 02 — Architecture

> Diagrams show what actually exists and is wired, not a target design. A dashed arrow / "✗" marks a
> link that does not exist in code. File:line citations are in `01_system_overview.md` and the discovery
> reports this audit was built from; only the highest-value citations are repeated here.

## 2.1 The requested universal diagram, applied to what's real

```
UI  →  API  →  Services  →  Database  →  Storage  →  Embeddings  →  Retrieval  →  LLM  →  Response
```

No single system in this repo implements this full chain. Each real system implements a fragment:

| Link | Implemented anywhere? | By whom |
|---|---|---|
| UI → API | Yes | every system below |
| API → Services | Yes | edge functions call Gemini/Anthropic/Groq/OpenAI directly via `fetch` |
| Services → Database | Yes, for reads/writes of `kb_*`/`brd_documents` | `KBDataAudit.tsx`, `RAGAuditPage.tsx`, parked `kb-*` functions |
| Database → Storage | Partial | Folio attachments (`wiki-media` bucket) — see gaps re: orphaning on doc delete |
| Storage → Embeddings | **Only in parked code** | `supabase/functions-parked/kb-ingest/index.ts` |
| Embeddings → Retrieval | **Only in parked code / SQL RPCs with no live caller** | `kb_match_embeddings`, `kb_hybrid_search` (SQL), called only by parked `kb-query` |
| Retrieval → LLM | **Only in parked code** | `supabase/functions-parked/kb-query/index.ts` (rerank + context assembly) |
| LLM → Response (no retrieval) | Yes, live | `caty-chat`, `folio-ai-search`, `ai-search-issues`, `ai-similar-items`, `docex-import` |

**Conclusion: the "Embeddings → Retrieval → LLM" middle of the chain does not run in production anywhere
in this repository.** Every live LLM feature either has no retrieval step, or (for `ai-search-issues`/
`folio-ai-search`) does query→filter translation instead of retrieval.

## 2.2 System #2/#3 — Designed RAG architecture (parked, not deployed)

This is the fully-built pipeline, shown as designed. **None of the arrows below cross into production** —
the whole right-hand column (`supabase/functions-parked/`) is excluded from Supabase's deploy path.

```
┌─────────────────────────┐        ┌──────────────────────────────────────┐
│   KBAdminSetup.tsx      │──────▶│  supabase.functions.invoke("kb-train") │──✗ (function not deployed)
│   KBDataAudit.tsx       │──────▶│  supabase.functions.invoke("kb-query") │──✗ (function not deployed)
│   RAJiraSidePanel.tsx   │──────▶│  supabase.functions.invoke("kb-sync")  │──✗ (function not deployed)
└─────────────────────────┘        └──────────────────────────────────────┘
                                              │  (if it were deployed)
                                              ▼
                      supabase/functions-parked/kb-ingest/index.ts
                         chunkText(text, 500 words, 50 overlap)  ──▶  SHA-256 content_hash dedup
                                              │
                                              ▼
                      OpenAI text-embedding-3-small  ──▶  kb_embeddings.embedding vector(1536)
                                              │
                                              ▼  (ivfflat cosine index, lists=30)
                      kb_match_embeddings() / kb_hybrid_search()  (Postgres RPC, RRF vector+FTS fusion)
                                              │
                                              ▼
                      supabase/functions-parked/kb-query/index.ts
                         rerank() via gpt-4o-mini (LLM judge, top 30→6)
                         [SOURCE-N] citation tagging
                                              │
                                              ▼
                      Response + references[] back to KBDataAudit.tsx / knowledgeBase.ts callers
```

Evidence: `supabase/functions-parked/kb-ingest/index.ts:20-51`, `supabase/functions-parked/kb-query/index.ts:1288-1363`,
`supabase/migrations/20260516120000_bootstrap_full_schema.sql:13109,13306,13332,61741`.

## 2.3 System #7/#8 — `docex-import` → Folio (live, real, not RAG)

```
User uploads PDF in Folio import UI
        │
        ▼
supabase/functions/docex-import/index.ts
   base64 PDF  ──▶  Gemini native generateContent (gemini-2.5-flash, multimodal)
   ──▶ translates non-English content, returns {title, sourceLang, blocks:[{type,text}]}
        │
        ▼
Frontend writes blocks into kb_documents.content (BlockNote JSON) — client-side, no DB write inside the function itself
        │
        ▼
kb_documents row now exists under the user's kb_doc_spaces workspace, visible at /folio/:workspaceSlug/:pageSlug
```

This path **never touches `kb_embeddings`**. A document imported this way is not searchable by anything
other than Folio's own full-text search (`useDocexSearch`, §2.5) — it is invisible to the RAG stack in §2.2
even in principle, because `kb_embeddings.source_type` CHECK constraint doesn't include a `'docex'`/`'wiki'`
value and no writer function targets it from Folio.

Evidence: `supabase/functions/docex-import/index.ts:1-139` (no Supabase client instantiated at all);
`supabase/migrations/20260228122149_bacfd32e...sql` (source_type CHECK enum: `ministry|jira|catalyst|brd|internal`).

## 2.4 System #5/#6 — Live LLM features with no retrieval

```
User types in CatyPanel chat dock
        │
        ▼
supabase/functions/caty-chat/index.ts
   persona system prompt (general/epic/story/business-request/defect/incident/release)
   + history.slice(-10)
        │
        ▼
Gemini gemini-2.5-flash (OpenAI-compat endpoint)
        │
        ▼
Plain text response — no document/DB context ever assembled or injected
```

```
User types a query in Folio search bar or Issue Navigator
        │
        ▼
supabase/functions/folio-ai-search  or  ai-search-issues
   NL query  ──▶  Gemini  ──▶  structured filter JSON (status, assignee, type, dates, text...)
        │
        ▼
Filter is applied to an ALREADY CLIENT-LOADED list via plain JS predicate matching
   (no server-side query re-run, no embeddings, no ranking beyond the filter)
```

Evidence: `supabase/functions/caty-chat/index.ts:1-126` (dead `createClient` import, confirmed never called);
`supabase/functions/ai-search-issues/index.ts:1-11,261-374`.

## 2.5 System #8 — Folio's actual search (keyword, not semantic)

```
DocexSearchPage.tsx
        │
        ▼
useDocexSearch()  (src/hooks/useWiki.ts:634)
        │
        ▼
Postgres tsvector (search_vector on kb_documents, websearch_to_tsquery)  +  title/body ILIKE
        │
        ▼
Merged, ranked client-side — plain full-text/keyword search, confirmed not semantic by code comment
```

Evidence: `src/pages/wiki/DocexSearchPage.tsx:1-6` header comment; `src/hooks/useWiki.ts:634`.

## 2.6 System #1 — Knowledge Hub (orphaned; shown for completeness)

```
KnowledgeHubPage.tsx / KnowledgeHubDocumentPage.tsx / KnowledgeHubSpacePage.tsx
        │
        ▼ (queries directly, no service layer)
kb_doc_spaces / kb_documents  (SAME tables Folio now uses)
        │
        ✗ NOT MOUNTED — no route in FullAppRoutes.tsx points here
```

The only live entry points into this code are two legacy-redirect components that resolve an old UUID
to a Folio slug and immediately navigate away — the Knowledge Hub UI itself never renders.

Evidence: `src/routes/FullAppRoutes.tsx:979-981`; `src/pages/wiki/LegacyKnowledgeHubRedirect.tsx:36-49,62-82`.

## 2.7 Dependency map — shared tables across unrelated systems

This is the root cause of the naming confusion: **two structurally unrelated systems share the same
`kb_documents`/`kb_doc_spaces` tables**, while a third, entirely separate `kb_embeddings`/`kb_sources`/etc.
family shares only a naming prefix, not a foreign key relationship, with the first two.

```
kb_documents ──┬── consumed by: Knowledge Hub (orphaned, #1)
               └── consumed by: Folio (live, #8)

kb_embeddings ─┬── consumed by: parked kb-query/kb-ingest (RAG chatbot, #2)
               └── consumed by: brd_documents / Req Assist pipeline (#3), via kb_hybrid_search()

               (no foreign key or join path exists between kb_documents and kb_embeddings)
```
