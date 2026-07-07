# 07 — Recommendations

> Per the mission's rules, these are **verification steps and decision points**, not a new architecture
> proposal. No implementation is recommended here beyond "go check" or "go decide." Ranked by how much
> they block trusting the rest of this audit.

## Do first — resolve the evidence conflicts (blocks everything else)

1. **Get authenticated Supabase MCP access** (currently unauthenticated in this session — `catalyst-storybook`
   and `supabase` connectors both need authorization via `claude mcp`/`/mcp` before their tools work) and run
   `list_tables` + `get_advisors` against the real project to settle:
   - Does `kb_embeddings` have any RLS policy at all? (Conflict 1 in `06_gaps.md`)
   - Do `kb_audit_log`, `kb_document_jira_issues`, `kb_document_page_properties`, `kb_eval_set`,
     `kb_eval_results` currently exist, or were they dropped by the 2026-06-28 sweep? (Conflict 2)
2. Confirm live deployment state of `supabase/functions-parked/*` directly against the Supabase project
   (`list_edge_functions`) — static analysis can only confirm the source tree's structure, not whether an
   older deployed version still responds at those function names.

## Product/architecture decisions this audit surfaces but does not make

3. **Decide the fate of the RAG pipeline.** Three options exist, all with real cost, and this audit takes
   no position: (a) redeploy `kb-ingest`/`kb-query`/`kb-sync`/etc. as-is and wire Folio content into it,
   (b) treat it as superseded and formally delete the parked functions + the frontend calls that still
   reference them (`src/services/knowledgeBase.ts`, `KBAdminSetup.tsx`, `KBDataAudit.tsx`), or (c) design a
   fresh ingestion path scoped to Folio specifically. This is a stakeholder decision, not an engineering
   default.
4. **Decide the fate of Knowledge Hub's orphaned code.** Either mark it explicitly deprecated/scheduled
   for removal (comment headers, a tracked deletion ticket) so it stops looking like available surface
   area, or confirm it's still needed for a migration path and document why it must stay.

## Lower-risk, narrowly-scoped fixes worth flagging to whoever owns this area

5. `kb_document_restrictions` currently implies access control it doesn't provide. Either wire it into the
   `kb_documents` RLS policies, or remove/relabel the UI so it stops promising something false.
6. `kb_doc_spaces` has no DELETE policy and `true`-gated INSERT/UPDATE/SELECT — confirm whether the
   referenced "D5 tightening batch" (mentioned in `20260706100000_docex_databases.sql` and
   `useWiki.ts:90-91`) is actually scheduled, and whether it covers this table.
7. `kb_document_versions` has no retention policy — decide whether unbounded growth is an accepted
   tradeoff or needs a pruning job/UPDATE-DELETE policy.
8. Document-level delete never cleans up `wiki-media` Storage objects (only single-attachment delete
   does). Worth deciding whether this is acceptable now or needs a cleanup path later.
9. Regenerate `src/registry/usage-map.generated.ts` — it currently points at files that don't exist on
   disk, which will mislead the next audit or tool that trusts it.
10. Confirm whether `archive-cleanup`'s claimed monthly cron actually exists (dashboard-configured?) or
    should be added to migrations — or removed from the comment if it was never implemented.

## Scope note

Everything above is deliberately phrased as "confirm/decide," not "build." This audit's mandate stops at
discovery; the next step is a stakeholder review of `01_system_overview.md` through `06_gaps.md` before
any implementation work is scoped.
