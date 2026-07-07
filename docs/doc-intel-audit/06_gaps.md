# 06 — Gaps, Risks, and Unresolved Evidence Conflicts

## Architectural gaps

1. **No unified Doc Intel system.** Seven-plus structurally separate systems share `kb_`/"knowledge"
   naming with no shared pipeline. See `01_system_overview.md`.
2. **A complete RAG pipeline exists but is not deployed.** Chunking, embeddings, pgvector, hybrid search,
   LLM reranking, and citation tagging are all implemented in `supabase/functions-parked/kb-ingest` and
   `kb-query` — but that directory is excluded from Supabase's deploy path. `src/services/knowledgeBase.ts`
   and `src/pages/KBAdminSetup.tsx`/`KBDataAudit.tsx` still call these functions by name and will fail
   (404/invocation error) in production today.
3. **Folio (the current live document product) is not connected to the RAG pipeline at all.**
   `kb_embeddings.source_type` has no `'docex'`/`'wiki'` enum value, and no function writes Folio content
   into `kb_embeddings`. A user cannot semantically search or AI-chat over their own uploaded/authored
   documents — the two systems don't just fail to run together, they can't, without a schema change.
4. **Knowledge Hub is fully orphaned dead code that is still live in the tree.** Routes are unmounted
   (redirected to Folio), but `src/pages/KnowledgeHubPage.tsx`/`KnowledgeHubDocumentPage.tsx`/
   `KnowledgeHubSpacePage.tsx`, `src/components/knowledge-hub/` (17 files, including a genuine
   `@atlaskit/editor-core`-based rich editor), the `ENABLE_KNOWLEDGE_HUB` feature flag, and
   `src/lib/routes.ts` knowledge-hub route builders all still exist, unreferenced. Risk: a future engineer
   (or agent) rediscovers this code and builds on it, unaware it's been superseded — this already almost
   happened once (`features/CAT-DOCS-NOTION-20260704-001/02_CANONICAL_DISCOVERY.md` explicitly had to warn
   "do NOT build on" adjacent dormant systems just three days before this audit).
5. **`kb_document_restrictions` is a non-functional, decorative permission feature.** The UI
   (`DocumentRestrictions.tsx`) lets any authenticated user add/remove restriction rows on any document,
   and its own empty-state copy implies restricted documents are actually gated — but **no RLS policy on
   `kb_documents` (or any other kb_ table) ever consults this table.** A user can set a "restriction" that
   does nothing.
6. **`kb_doc_spaces` RLS is wide open.** INSERT/UPDATE/SELECT all use `USING (true)` — any authenticated
   user can read and modify any workspace, including another user's personal "My Space." The only
   mitigation is client-side filtering (hiding other users' spaces from nav/menus in `useWiki.ts:90-97`),
   which is not a security boundary. There is also **no DELETE policy at all** on this table.
7. **No functioning audit trail for document actions.** `AuditTrailPage.tsx` is a governance/ghost-ticket
   closure log, unrelated to documents. See the evidence conflict below regarding `kb_audit_log` itself.
8. **Unbounded `kb_document_versions` growth.** No UPDATE/DELETE RLS, no retention policy, no pruning job
   — every throttled autosave adds a permanent row.
9. **Storage orphaning on document delete.** FK cascade cleans up DB rows correctly, but no code path
   removes the corresponding `wiki-media` Storage objects when a whole page is deleted (only the
   single-attachment delete path does this, and only for that one attachment).
10. **No re-index/refresh mechanism for embeddings**, which is currently moot (nothing writes to
    `kb_embeddings` live) but would be a real gap the moment any RAG revival work begins.
11. **The team's own self-audit tooling only covers the parked pipeline.** `KBDataAudit.tsx` (6 sections)
    and `RAGAuditPage.tsx` (24 checks across 3 layers) both audit `kb_embeddings`/`kb_cache`/`kb_query_log`/
    `kb_training_questions`/`brd_documents` exclusively. **Zero checks exist for `kb_documents`, Folio
    attachments, versions, or the restrictions feature** — i.e., the system that's actually live in
    production today has no health-check surface at all.
12. **OCR does not exist.** `OcrPanel.tsx` is unmounted dead UI with no backend of any kind.
13. **Stale generated registry.** `src/registry/usage-map.generated.ts` references files that don't exist
    on disk (`src/_graveyard/admin/KBAdminPage.tsx`, `modules-dormant/wiki/*`) — it hasn't been regenerated
    since recent deletions, which is a risk for any future tool or agent that trusts it as ground truth.
14. **`archive-cleanup` claims a monthly cron schedule in its own header comment, but no `cron.schedule`
    call registers it anywhere in `supabase/migrations/`.** Unrelated to documents directly (it targets
    `ph_issues`), but surfaced during this scan and worth a status check.

## Evidence conflicts (must be resolved via live schema inspection before acting on either claim)

These arose because independent discovery passes read different migration snapshots at different points
in the file's evolution. Both are recorded here rather than silently resolved, per the audit's "never
guess" rule.

### Conflict 1 — `kb_embeddings` RLS

- **Claim A** (from the backend-architecture pass): `kb_embeddings` INSERT/UPDATE is gated by
  `kb_is_admin()`; SELECT is `true` (any authenticated user can read all embeddings/chunks).
- **Claim B** (from the permissions/audit pass): no `CREATE POLICY` for `kb_embeddings` was found in the
  searched migrations at all.
- **Why this matters:** if Claim B is correct and RLS is enabled on the table with no policy, the table
  is effectively inaccessible to non-service-role clients — which would mean `KBDataAudit.tsx`'s direct
  reads of `kb_embeddings` (used today, since that page IS routed/live) should be failing, but no failure
  was reported by the UI-layer discovery pass. This internal inconsistency needs a live check
  (`list_tables`/`get_advisors` via an authenticated Supabase MCP connection — unavailable in this
  session) rather than a guess.

### Conflict 2 — Tables dropped vs. tables still cited as live

- **Claim A** (from the backend-architecture pass): `20260628170000_drop_deadwood_empty_tables.sql`
  dropped `kb_audit_log`, `kb_document_jira_issues`, `kb_document_page_properties`, `kb_eval_set`,
  `kb_eval_results`, `tm_ai_embeddings`, and the entire `ai_assist_*` family, as part of a 294-table
  "verified-dead, 0 rows, 0 code refs" sweep.
- **Claim B** (from the permissions/audit pass and the RAG-verification pass): cites live RLS policies
  and column definitions for `kb_audit_log`, `kb_document_jira_issues`, and `kb_document_page_properties`
  sourced from `20260516120000_bootstrap_full_schema.sql` — a snapshot dated *before* the 2026-06-28 drop.
- **Resolution guidance, not a resolution:** the drop migration is chronologically later and should be
  authoritative if migrations are applied strictly in timestamp order — but this audit did not verify the
  live database state (the Supabase MCP connector is unauthenticated in this session). Treat both claims
  as unverified until a `list_tables` call against the actual project confirms which tables currently
  exist. Do not assume the drop happened, and do not assume it didn't.

## What this audit deliberately does not do

Per the mission's own rules, this audit does not propose a new architecture, does not recommend a
specific path forward (revive the parked pipeline vs. rebuild vs. deprecate), and does not modify any
code. See `07_recommendations.md` for the narrow set of verification/decision steps that follow directly
from the gaps above.
