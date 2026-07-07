# 04 — Database, Storage, Permissions, Lifecycle

## Source-of-truth answers

| Question | Answer | Evidence |
|---|---|---|
| **What is source of truth for Folio/Docex content?** | `kb_documents.content` (BlockNote JSON as of the 2026-07-05 format migration; legacy Tiptap/ADF for older rows), one row per page, under a `kb_doc_spaces` workspace. | `supabase/migrations/20260516120000_bootstrap_full_schema.sql:31699-31715`; `20260704200100_wiki_pages.sql` |
| **Where are embeddings stored?** | `kb_embeddings.embedding vector(1536)` (pgvector), ivfflat cosine index `idx_kb_embeddings_vector` (lists=30). A separate `kb_training_questions.embedding` exists for the FAQ/training-question set. | `20260516120000_bootstrap_full_schema.sql:31719-31741,61741,61783` |
| **Where are chunks stored?** | Same `kb_embeddings` table — one row per chunk (`content`, `chunk_index`, `chunk_type`, `parent_chunk_id`, `section_title`, `token_count`, `tags`). No separate chunks table. | `20260228122149...sql:64-78`; `20260228222951...sql:12-17` |
| **Where is metadata stored?** | `kb_embeddings.metadata jsonb` (free-form), plus structured columns `source_type`/`source_url`/`language`. Folio page metadata (icon, cover, template, position) lives on `kb_documents` itself, not a side table. | `20260228122149...sql:64-78`; `20260704200100_wiki_pages.sql` |
| **How are permissions enforced (Folio/Docex)?** | Row-level: document owner (`created_by = auth.uid()`) for write; `published_at IS NOT NULL OR created_by = auth.uid()` for read. No workspace-membership check. A "restrictions" table exists but is **not consulted by any RLS policy** — see Gaps. | RLS policy list below |
| **How are documents deleted?** | Plain `DELETE FROM kb_documents WHERE id = ...` from the client (`useDeleteWikiPage`). Postgres FK `ON DELETE CASCADE` removes child rows (attachments, comments, versions, favorites, watchers, labels, links). Child pages are orphaned via `ON DELETE SET NULL`, not deleted. **Storage objects are never cleaned up on a document-level delete** — only a single-attachment delete path removes its own Storage object. | `src/hooks/useWiki.ts:520-531,216-229`; cascade FKs at `bootstrap_full_schema.sql:74942-75034` |
| **How are embeddings refreshed?** | They are not — for Folio/Docex content there is no writer to `kb_embeddings` at all (live). For the ministry/BRD pipeline, refresh would require the parked `kb-ingest`/`kb-sync` functions, which are undeployed. No cron job targets either. | See `03_data_flow.md` |
| **How is indexing triggered?** | Full-text (`search_vector` generated tsvector column on `kb_documents`) updates automatically via Postgres `GENERATED ALWAYS` — this is real and live, and is what Folio's own search (`useDocexSearch`) queries. Vector indexing (`kb_embeddings`) has no trigger — it would need an explicit ingestion call, which doesn't happen in production. | `bootstrap_full_schema.sql:31699-31715` (generated `search_vector`) |

## Extensions enabled

| Extension | Evidence | Purpose |
|---|---|---|
| `vector` (pgvector) | `20260228122149...sql:3`; re-declared `20260516120000_bootstrap_full_schema.sql:42` | `kb_embeddings`/`kb_training_questions` vector columns |
| `pg_trgm` | `20260228222951...sql:9` | trigram search |
| `pg_cron` | `20260402165742...sql:1`, `20260511200000_lifecycle_cron.sql:12` | scheduled jobs |
| `pg_net` / `http` | `20260402165742...sql:2`, `20260511200000_lifecycle_cron.sql:13` | cron → HTTP calls to edge functions |

## Key tables (Folio/Docex/Knowledge Hub — shared)

| Table | Purpose | Notable columns | Evidence |
|---|---|---|---|
| `kb_doc_spaces` | Workspace/space container | `container_type` CHECK(`project\|product\|organization\|personal`), `slug` (frozen on create) | `20260704200000_wiki_workspaces.sql`, `20260706120000_docex_personal_spaces.sql` |
| `kb_documents` | Page content | `content` jsonb, `content_format` (`adf`\|`blocknote`), `slug`, `doc_key` (`DOC-<n>`), `search_vector` generated tsvector, `parent_id` (tree) | `20260704200100_wiki_pages.sql`, `20260706140000_docex_doc_keys.sql` |
| `kb_document_links` | Page ↔ work-item link | `entity_type` CHECK (9 work-item types), `link_origin` (manual\|mention) | `20260704200200_wiki_links.sql:8-20` |
| `kb_page_links` | Page ↔ page backlink | unique `(source_page_id, target_page_id)` | `20260704200200_wiki_links.sql:47-53` |
| `kb_document_attachments` | Uploaded files per page | `file_path`, `mime_type`, `uploaded_by` | bootstrap `31565-31574` |
| `kb_document_versions` | Version history | `version_number`, `content` jsonb snapshot, `change_summary` | bootstrap `31670-31680` |
| `kb_document_comments`/`favorites`/`watchers`/`labels`/`restrictions` | Collaboration metadata | — | bootstrap `31581-31693` |
| `kb_databases`/`kb_database_fields`/`kb_database_rows`/`kb_database_views` | Notion-style structured tables embedded in pages ("Docex databases") | `type` CHECK (text\|number\|select\|multi_select\|date\|person\|checkbox\|url\|relation) | `20260706100000_docex_databases.sql` |

## Key tables (RAG / ministry-BRD pipeline — separate family)

| Table | Purpose | Evidence |
|---|---|---|
| `kb_sources` | Crawl/source registry (ministry/Jira/BRD/Catalyst/internal) | `20260228122149...sql:6-38` |
| `kb_training_questions` | FAQ Q&A with embeddings | `20260228122149...sql:41-54` |
| `kb_embeddings` | RAG chunk + embedding store | `20260228122149...sql:64-78`, `20260228222951...sql:12-17` |
| `kb_cache` | Query/response cache (24h TTL default) | `20260228122149...sql:88-99` |
| `kb_query_log` | Query telemetry + RAG trace (`retrieved_chunk_ids`, `reranked_scores`, `confidence_score`, `hallucination_flag`) | `20260228122149...sql:108-124`, `20260228222951...sql:24-33` |
| `kb_access_matrix` | Role × module read/write flags | `20260228122149...sql:137-158` |

**Dropped** by `20260628170000_drop_deadwood_empty_tables.sql` (0-row, 0-code-ref sweep): `kb_audit_log`,
`kb_document_jira_issues`, `kb_document_page_properties`, `kb_eval_set`, `kb_eval_results`,
`tm_ai_embeddings`, the `ai_assist_*` family (BRD/OCR ingestion silo). `tm_ai_usage_log` was dropped in
the same sweep then restored 5 days later (`20260703280000_restore_tm_ai_usage_log.sql`) because
`ai-tm-assist` still depended on it. **See `06_gaps.md` for why this conflicts with other evidence
gathered in this audit and needs live-schema verification before being treated as settled.**

## RLS policies (as read from migrations, in commit order)

| Table | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|
| `kb_documents` | `created_by = auth.uid()` | `published_at IS NOT NULL OR created_by = auth.uid()` | `created_by = auth.uid()` (no WITH CHECK) | `created_by = auth.uid()` |
| `kb_doc_spaces` | `true` (any authenticated user) | `true` | `true` | **no policy exists** |
| `kb_document_attachments` | uploader must own parent doc | published or own | *(none found)* | `uploaded_by = auth.uid()` (added 2026-07-06) |
| `kb_document_versions` | `auth.uid() IS NOT NULL` (added 2026-07-05, not scoped to doc ownership) | published or own | *(none)* | *(none — unbounded growth)* |
| `kb_document_restrictions` | `auth.uid() IS NOT NULL` (`FOR ALL`) | `true` | (same FOR ALL) | (same FOR ALL) — **but never referenced by `kb_documents` policies; decorative, non-enforcing** |
| `kb_databases`/`kb_database_fields`/`kb_database_rows`/`kb_database_views` | `auth.uid() IS NOT NULL` (`FOR ALL`, all four tables) | same | same | same — explicitly flagged in the migration's own comment as a placeholder pending a future "D5" tightening batch |
| `kb_embeddings` | **Evidence conflict — see `06_gaps.md`** | **Evidence conflict** | — | — |

## Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `kb_doc_spaces_slug_trigger` / `kb_documents_slug_trigger` / `kb_databases_slug_trigger` | respective tables | frozen-on-create URL slug generation, deduplicated |
| `kb_documents_doc_key_trigger` | `kb_documents` | assigns stable `DOC-<n>` id via sequence |
| ~~`create_kb_document_version_trigger`~~ | `kb_documents` | **Dropped 2026-07-05** — fired on every ~1.5s autosave (version-row explosion) and was silently failing (RLS 42501, no INSERT policy existed yet), rolling back saves. Versioning is now client-driven and throttled (`useSaveVersion`, 10-min cadence + manual/pre-restore snapshots). |

## Storage buckets

| Bucket | Public | Delete policy | Evidence |
|---|---|---|---|
| `wiki-docs` | private | any authenticated user, no ownership check | `20260301034019...sql:3,7-19` |
| `wiki-media` | public | owner-only (`owner = auth.uid()`) | `20260705150000_wiki_media_bucket.sql:6-23` |

Neither bucket has any server-side job that removes objects when their owning `kb_documents` row is
deleted — see `06_gaps.md`.

## Cron jobs (all found in the repo, filtered to relevance)

| Job | Schedule | Target | Docex/KB-relevant? |
|---|---|---|---|
| `catalyst-lifecycle-check` | daily 09:00 UTC | `lifecycle-check` function (user account lifecycle) | No |
| `refresh-release-predictions` | daily 02:00 UTC | release prediction refresh | No |
| `date-pulse-health-refresh` | daily 03:00 UTC | date-pulse health | No |

**No cron job targets `kb_embeddings`, `kb_documents`, or any Folio/Docex/RAG table.** `archive-cleanup`
(a `ph_issues` archival function, unrelated to documents but surfaced during this scan) claims in its own
header comment to be a "monthly cron function," but no `cron.schedule` call registers it anywhere in
`supabase/migrations/` — flagged as an open question, not asserted either way.
