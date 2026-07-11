# Objective — CAT-DOCINTEL-V2-20260709-001

## Active UI journey rebaseline — 2026-07-11

Reframe the delivered Doc Intel substrate as a BRD Review Workbench: users understand a source,
ask grounded questions, review findings, create cited deliverables, approve them and convert only
approved outputs into traceable work. Extraction mechanics and operational diagnostics move to a
backend-authorized Admin experience; exact citations remain part of the user trust contract.

Active UI acceptance criteria:

- [ ] Home communicates the job and offers scoped Ask/upload/task starters before the library.
- [ ] A source opens on Overview, not raw page extraction.
- [ ] Findings remains a primary destination; readable source/exact evidence stay contextual; Links
      and Traceability remain reachable under Work items.
- [ ] All 12 existing deliverable types remain available, grouped by user outcome.
- [ ] Only approved artifacts can be promoted; provenance-link failure is reported honestly.
- [ ] Document, Jira and git sources are visibly distinct without invented metadata.
- [ ] Operational re-sync and diagnostics require proven backend Admin authority.
- [ ] English/Arabic, dark mode, keyboard access, citations and existing backend payloads survive.

The original backend objective below is retained as completed historical scope.

## What we're building

Close every gap identified in the 2026-07-09 discovery audit
(`docs/audits/doc-intel-current-state-discovery.md`) and the Knowledge Framework Acceptance
Criteria cross-check, so DocIntel moves from "real working document-RAG subsystem" to the
originally-contracted Catalyst Knowledge Platform bar. This is a **delta-only** feature on top
of the existing `src/modules/docintel/` module and `ai_*` schema — no rewrite, no new parallel
system, no `kb_*` revival.

## Why

The 2026-07-07 build (`CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001`) shipped a genuinely working
RAG system but self-documented several correctness bugs and explicitly descoped enterprise-OKF
breadth. Two independent audits since (`docs/doc-intel-audit/reservoir-acceptance-audit/` and
this session's `docs/audits/doc-intel-current-state-discovery.md`) confirm the same residual gaps
are still open. One finding is worse than "residual": `06_VALIDATION_EVIDENCE.md` marks
**§5 Conflict detection as ✅**, but its dependency (`docintel_match_facts` RPC) has zero
requirement-fact embeddings in live data — the acceptance record overclaims a capability that
does not function. This must be fixed or the claim corrected.

## Acceptance criteria

- [ ] `docintel_match_facts` RPC has real embeddings to match against (requirement facts get
      embedded), OR fact-conflict detection is re-scoped/re-labeled honestly if that's not feasible
      in this slice.
- [ ] Citation confidence display uses the actual grounding score (fix the ~0.01-vs-1.0 mis-scale
      bug in `02_CANONICAL_DISCOVERY.md:134-138` of the prior feature).
- [ ] `ai_agent_prompts` registry is wired so prompt provenance shown to users is truthful (or the
      hardcoded-prompt reality is surfaced honestly instead of falsely implying registry-driven).
- [ ] `chunk.section_path` is verified non-NULL on freshly-ingested documents (prior fix claimed
      in S2 — independently re-verify against live data, don't just trust the commit message).
- [ ] A theme/collection browsing concept exists — content can be grouped and browsed by a
      user-defined theme (e.g. "Industrial Scanning"), not just by workspace/project.
- [ ] At least one non-PDF external knowledge source (Jira issue content or a git repo/markdown
      file) is provably retrievable through the same `docintel-ask` Q&A + citation pipeline as
      PDF documents — not just ingested into a separate, disconnected table.
- [ ] A manual re-index/refresh trigger exists in the UI (admin-scoped), not just the 15-min cron.
- [ ] "Promote artifact → work item" is exercised end-to-end at least once with real data and the
      resulting work item traced back to its source citation.
- [ ] Basic alerting exists for sync/ingestion failures (even a minimal Slack/email/log-based
      alert — the current state is "no alerting" per prior handover).
- [ ] `kb_*` legacy tables/edge functions/admin pages (`kb-ingest`, `kb-generate-answers`,
      `/kb-admin-setup`, `/kb-data-audit`) are either deleted or explicitly re-justified as kept.

## Scope decision (2026-07-09, Vikram: "take the hardest path")

100% = fix-what's-broken AND build the net-new missing capabilities. Themes, Jira ingestion, and
git ingestion are **IN** scope (Decisions 3-9 in `09_DECISIONS.md`). This makes V2 a ~7-slice
feature. Additional acceptance criteria beyond the original list above:

- [ ] Universal media ingestion via Microsoft MarkItDown (Word/Excel/PPT/image/audio → markdown →
      existing pipeline), gated by a citation-fidelity spike; Gemini vision retained for
      scanned-Arabic.
- [ ] `docintel_themes` — user-created + auto-suggested themes, document tagging, theme-filtered
      retrieval ("Industrial Scanning" browsable).
- [ ] Jira issue content (`ph_issues`) queryable through the same `docintel-ask` pipeline via a
      `source_type='jira'` adapter.
- [ ] Git/markdown repo content queryable through the same pipeline via `source_type='git'`.
- [ ] `ai_agent_prompts` registry wired — truthful prompt provenance + tunable without redeploy.

## Non-scope

- Full OKF projection of ALL 21 Catalyst object families (releases, workflows, rules, APIs, DB
  schema, users/roles) — V2 covers documents + Jira + git only; the rest gets its own feature.
- Knowledge graph explorer / cross-document entity graph beyond facts+links+themes.
- Qwen provider activation (dormant by design).
- Rewriting or replacing the existing `ai_*` schema, edge functions, or frontend module structure
  (all changes are additive — `source_type` column, `docintel_themes` table, etc.).
- Automated rollback as application code — stays CI/process-scope (Decision 9).
- External alerting infra (Slack/PagerDuty) — in-app Health banner only (Decision 9).
