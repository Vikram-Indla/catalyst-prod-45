# Session 001 — 2026-07-09 — Ideation discovery research

**Scope**: Research-only /goal task: define how Ideation should exist in Catalyst. No code written.

**Method**: 6 parallel discovery agents —
1. Existing Ideation module deep-dive (routes, pages, ph_ideas schema, hooks/services, maturity verdict)
2. Work-item hierarchy + business_requests + STRATA (type registry, MIM-N keys, conversion precedents, link tables)
3. Platform conventions (layering, react-query, ModuleGuard/permissions, ph_wf_* workflow runtime, admin, audit, slugs, i18n, dark mode, ForYou)
4. AI/chat/voice/notifications (llm.ts gateway, 26 AI edge functions, Caty personas, voice-transcribe, docintel, kb-query, ai_usage_log, 198 notification events)
5. Canonical UI inventory (JiraTable, PragmaticBoard, CatalystViewIdea, WSJFScoringModal, LinkSimilarItemsDialog, gaps)
6. External benchmark (Jira Product Discovery, Aha! Ideas, Productboard, Planview, ServiceNow SPM, ClickUp — official docs)

**Output**: `02_CANONICAL_DISCOVERY.md` (dossier A–L). Advisory: **Revamp Existing**.

**Key verification performed inline**: `grep` confirmed `ideasRoadmapService.ts:95` converts ideas into `ph_requests` while the hierarchy registry roots at `business_requests` — the mis-seated conversion seam.

**Open items**: JPD/Aha! per-product citation appendix pending from research lane; Astryx wrap decision (recommend pure-ADS) to be recorded in 09_DECISIONS.md when implementation activates.
