# CAT-DOCINTEL-V2-20260709-001 — READ ME FIRST

**Status:** In Progress — Slice 1 done (verify-only), Slice 2 spike done, **Slice 4a DONE + live-verified**; Slices 4b/4c/3/5/6/7 pending
**Slice 1 result:** 3 correctness bugs already fixed+deployed 2026-07-07; verified live (no code). Residual: 78 stale citation rows on 2 pre-fix demo artifacts (accepted historical, Decision 11).
**Slice 4a result (2026-07-11):** prompt registry live for `docintel-ask` — self-seeds byte-faithfully, stamps truthful `prompt_id`; proven end-to-end (seeded row 31483425… stamped on a live Ask run). Fine-tuning enabler live (tune = UPDATE + version bump, no redeploy). Deployed via local CLI token (CI deploy still broken — expired GitHub secret, Drift Event 2).
**Deploy note:** repo-wide CI edge-fn deploy is DOWN (expired `SUPABASE_ACCESS_TOKEN` GitHub secret). Deploy via local `~/.config/supabase/access-token` + `supabase functions deploy` until rotated.
**Last updated:** 2026-07-09
**Active Plan Lock:** 03_PLAN_LOCK.md (v1, DRAFT)
**Last session:** sessions/001_activation-and-plan-lock.md

## Current state

DocIntel v1 (`CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001`) is live and real — pgvector RAG,
bilingual Ask, citations, artifact generation, Health dashboard — proven live on staging `cyij`
via `docs/audits/doc-intel-current-state-discovery.md` (2026-07-09 discovery audit). This new
feature (`CAT-DOCINTEL-V2`) exists to close the gaps that audit found: dead `docintel_match_facts`
RPC, mis-scaled citation confidence, hardcoded prompt registry, missing theme/collection browsing,
no Jira/git ingestion into the RAG pipeline, no manual re-index control, no automated
rollback/alerting, unproven promote-to-work-item flow, and `kb_*` legacy cleanup.

## Most important constraint right now

**No code yet.** This session produced discovery + Plan Lock only, per CLAUDE.md
"activate feature" contract — Plan Lock must be reviewed by Vikram before implementation starts.

## Scope (locked by Vikram 2026-07-09: "take the hardest path")

Full scope — 7 slices. Fix broken/overclaimed items AND build net-new (MarkItDown universal
ingestion, themes, Jira+git source adapters, prompt registry). See `09_DECISIONS.md` Decisions 3-9
and `03_PLAN_LOCK.md` roadmap table. MarkItDown adoption is gated behind a Slice-2 citation-fidelity
spike (mandatory — Vikram: "you must try").

## Next action

Vikram reviews `03_PLAN_LOCK.md` (Slice 1 locked detail + Slice 2 spike detail + 7-slice roadmap)
and approves, then `continue feature CAT-DOCINTEL-V2-20260709-001` begins Slice 1 (correctness bugs).
Slice 2 (MarkItDown spike) can run in parallel with Slice 1 since it's pure local measurement with
no shared files.
