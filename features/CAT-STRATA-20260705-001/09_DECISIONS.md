# CAT-STRATA-20260705-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### D-001 (2026-07-05) — Greenfield replace, no residue patching
Old StrategyHub/Astryx code (modules-dormant/strategy*, es_* model) is prototype residue. STRATA is built new; only the scoped-RBAC pattern and selected widget concepts are reused. Basis: blueprint Appendix E + LOOP-001 evidence. Status: per user mandate (activating prompt).

### D-002 (2026-07-05) — `strata_` DB namespace
All STRATA tables use the `strata_` prefix to guarantee zero collision with es_*/ph_*/injira_* and make lineage greppable. Status: PROPOSED (ratifies at Phase 3 Plan Lock).

### D-003 (2026-07-05) — Calc engine = versioned RPCs, UI never computes
Formula/rollup/RAG/YTD/variance/benefit/value-at-risk logic centralizes in DB RPCs + versioned formula metadata with provenance on every result. Client-side score math is banned in STRATA. Basis: blueprint §20 + LOOP-006 evidence of client-drift anti-pattern. Status: PROPOSED (Q5).

### D-004 (2026-07-05) — Security bar above repo status quo
Every strata_ table: org/role-scoped RLS (never USING(true)); sensitive writes via SECURITY DEFINER RPC; approver ≠ submitter enforced in DB; snapshots INSERT-only with supersede flow. Basis: LOOP-007 evidence. Status: PROPOSED.

### D-005 (2026-07-05) — ProjectCard behind a source-agnostic mapping seam
STRATA never reads ph_* Jira tables from UI; Jira is one connector feeding strata_project_cards via config-driven field mappings + execution links carrying source_system/source_key/confidence/mapping owner. Basis: blueprint §9/§24 + LOOP-008. Status: PROPOSED.

### D-006 (2026-07-05) — Configuration-first enforcement
Perspectives, scorecard models, weights, formulas, thresholds, RAG bands, value categories, gates, workflows, upload templates, mappings, roles, labels: governed versioned metadata only; Salam terms are demo seed. Basis: blueprint §5/§24, user non-negotiables. Status: BINDING (from activating contract).

### D-007 (2026-07-05) — AI advisory-only
AI may summarize, explain variance, detect anomalies, draft narratives/scenarios; outputs marked advisory with snapshot/config provenance + confidence + human-review state. AI never certifies, approves, mutates config, changes formulas, overwrites sources, or closes gates. Status: BINDING (from activating contract).

### D-008 (2026-07-05) — Phase gates honored
Phase 1 discovery only (this session, no code). Phase 2 UI/UX with 10-screenshot HARD STOP. Phase 3 only after explicit approval. Status: BINDING.

### D-009 (2026-07-05) — Owner answers to Q1–Q8 (Vikram, in-chat)
- **Q1:** YES — repurpose the existing "Strategy Hub" tile to STRATA at `/strata` with a redirect from `/strategyhub`.
- **Q2:** DECOMMISSION whatever is currently there (es_* strategy surfaces + okr-v2). Execution: unroute code surfaces now; physical file deletion + es_* table drops run as a controlled cleanup slice after STRATA is live (dropping DB tables is destructive — scheduled, not skipped).
- **Q3:** Ignore both screenshot lists — design the surfaces with Claude's own judgment; ambition is market leadership. The 10 canonical surfaces remain the coverage floor.
- **Q4:** Single tenant for now (schema stays multi-tenant-ready via organization_id columns; no org enforcement active).
- **Q5:** Calc engine = RPCs + versioned formula metadata, as recommended (ratifies D-003).
- **Q6:** Ingestion channels = governed uploads + Jira adapter only for now; ERP/BI deferred.
- **Q7:** Board pack export = PDF **and** PPTX.
- **Q8:** YES — Salam data ships only as labeled demo seed.

### D-010 (2026-07-05) — Phase 2 screenshot gate WAIVED by owner
Owner directive: "why are you writing design mocks, I rather want you to implement… /goal implement with highest precision and high fidelity." The Phase 2 mock/screenshot hard stop is waived; implementation (Phase 3) begins immediately. UI/UX still carries 80% acceptance weight — screenshot EVIDENCE is still collected per surface during implementation (CATALYST_UI_UX_ACCEPTANCE.md), it is no longer a pre-implementation gate.

### D-011 (2026-07-05) — Implementation isolation
Shared checkout sits on feat/CAT-WIKI-CATYFLOW-20260704 (another session's branch). STRATA implements in its own git worktree/branch off origin/main per the concurrent-sessions contract. DB work targets STAGING first (project-ref verified before every DDL batch).

### D-012 (2026-07-05) — Owner REJECTED session-002 UI; executive design lift mandated
Vikram (in-chat /goal): STRATA UI must be lifted "50×" — current delivery reads as plain HTML with grey
backgrounds; no discovery of canonical data tables / status colors / typography / spacing was applied;
expects 10+ visually appealing strategy-native features (Gartner-grade); identify 200+ UI/UX issues and
fix them across all 10 screens. This supersedes the visual-acceptance portion of session 003.
Execution: canonical discovery (JiraTable, CatalystStatusPill/statusPalette, typography, spacing,
benchmark screens) → issue register in 05_UI_UX_REVIEW.md → systematic rebuild of STRATA surfaces on
canonical components + recharts executive visuals → light/dark screenshot re-verification.

### D-013 (2026-07-05) — Strategy hub-switcher entry = THE operational entrypoint to STRATA
Owner (in-chat, screenshot of switcher): every strategy pathway must converge on the hub-switcher Strategy
entry and it must be enabled/operational. Executed: HubSwitcher entry already targeted /strata (⌘2,
un-deprecated) — added search aliases (strategy/scorecard/okr) so "Search hubs" finds it; added /strategy +
/strategy/* legacy redirects in App.tsx (alongside /strategyhub, /strategyhub/*, /strategy-room); rewired
residual legacy links (project-hub TopNav, tabIdentity, hub-tone, workspaceContext, ReqAssistGenerate) from
/strategyhub|/strategy → /strata. Access verified: 'enterprise' is a CORE_NAV_MODULE with full grants seeded
for the standard delivery roles (admin bypass on top); mobile nav flag strategy_hub already enabled on staging.
Scope note: nav-file edits outside the Plan Lock file list were explicitly directed by the owner in-chat.
