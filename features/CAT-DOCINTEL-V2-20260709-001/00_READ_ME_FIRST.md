# CAT-DOCINTEL-V2-20260709-001 — READ ME FIRST

**Status:** Plan v2.1 APPROVED; UI Slices 1–4A complete; Slice 4B active
**Slice 1 result:** 3 correctness bugs already fixed+deployed 2026-07-07; verified live (no code). Residual: 78 stale citation rows on 2 pre-fix demo artifacts (accepted historical, Decision 11).
**Slice 4a result (2026-07-11):** prompt registry live for `docintel-ask` — self-seeds byte-faithfully, stamps truthful `prompt_id`; proven end-to-end (seeded row 31483425… stamped on a live Ask run). Fine-tuning enabler live (tune = UPDATE + version bump, no redeploy). Deployed via local CLI token (CI deploy still broken — expired GitHub secret, Drift Event 2).
**Deploy note:** repo-wide CI edge-fn deploy is DOWN (expired `SUPABASE_ACCESS_TOKEN` GitHub secret). Deploy via local `~/.config/supabase/access-token` + `supabase functions deploy` until rotated.
**Last updated:** 2026-07-11
**Active Plan Lock:** 03_PLAN_LOCK.md (v2.1 complete BRD Review Workbench journey, 15 work units, APPROVED 2026-07-11)
**Last session:** sessions/008_ui_slice4a_source_overview.md

## UI journey rebaseline — 2026-07-11

The active user request is now an outcome-led revamp, not another backend capability slice. The
study in `13_DOCINTEL_UI_REVAMP_STUDY.md` proves that the current seven-tab workspace exposes the
internal processing model and defaults to extracted page evidence. The proposed product contract
is: **Review a BRD and turn accepted findings into traceable work.** The Advanced Council verdict
is recorded in `14_ADVANCED_COUNCIL_UI_REVAMP.md`; the exact screen contract is
`15_SCREEN_BLUEPRINT_AND_LOCK_DECISIONS.md`. Requirement-by-requirement status is in
`16_GOAL_COMPLETION_AUDIT.md`.

## Current state

DocIntel v1 (`CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001`) is live and real — pgvector RAG,
bilingual Ask, citations, artifact generation, Health dashboard — proven live on staging `cyij`
via `docs/audits/doc-intel-current-state-discovery.md` (2026-07-09 discovery audit). This new
feature (`CAT-DOCINTEL-V2`) exists to close the gaps that audit found: dead `docintel_match_facts`
RPC, mis-scaled citation confidence, hardcoded prompt registry, missing theme/collection browsing,
no Jira/git ingestion into the RAG pipeline, no manual re-index control, no automated
rollback/alerting, unproven promote-to-work-item flow, and `kb_*` legacy cleanup.

## Most important constraint right now

Plan v2.1 is approved. Implementation proceeds one active two-hour work unit at a time, beginning
with Slice 1 only; every UI slice still requires tests and screenshot acceptance.

## Scope (locked by Vikram 2026-07-09: "take the hardest path")

Full scope — 7 slices. Fix broken/overclaimed items AND build net-new (MarkItDown universal
ingestion, themes, Jira+git source adapters, prompt registry). See `09_DECISIONS.md` Decisions 3-9
and `03_PLAN_LOCK.md` roadmap table. MarkItDown adoption is gated behind a Slice-2 citation-fidelity
spike (mandatory — Vikram: "you must try").

## Next action

Execute Slice 4B — contextual readable source and exact evidence drawer. The approved Admin
boundary remains legacy `admin` OR product `super_admin`.
