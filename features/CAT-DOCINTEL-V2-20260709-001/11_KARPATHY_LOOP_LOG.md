# Karpathy Loop Log — CAT-DOCINTEL-V2-20260709-001

## Loop 10 — 2026-07-11 — “Are one-segment static Doc Intel destinations safe?”

**Hypothesis:** Static routes before `:slug` safely introduce Library, Review, Themes and Deliverables.

**Experiment:** Parallel canonical, route, data-safety, UI and QA review against the actual router and
`ai_documents` slug trigger.

**Measure:** Slugs are frozen and unrestricted; a source titled “Library” can own `library`. A static
`library` route would shadow it. Review/Themes/Deliverables also have no authorized page files in
Slice 1.

**Keep/Discard:** **Discard.** Recommend exact two-segment user paths (`views/library`, later exact
siblings, and `actions/review`) with no wildcard; preserve one-segment source URLs and expose
navigation only when the corresponding real page ships.

---

## Loop 9 — 2026-07-11 — “Can design-intelligence inject its annotated baseline safely?”

**Hypothesis:** The selected browser permits temporary SVG overlay injection on localhost.

**Experiment:** Loaded the signed-in route, captured DOM/raw screenshot, attempted read-only browser
evaluation and then the browser's normal navigation surface.

**Measure:** Evaluation exposes no DOM creation APIs; `javascript:` navigation is explicitly blocked
by browser security with a no-workaround instruction.

**Keep/Discard:** **Discard in this runtime.** Preserve the raw screenshot and structured violation
log; an explicit user-approved evidence rebaseline is required before source work.

---

## Loop 4 — 2026-07-11 — “Should the whole product be a Rovo clone?”

**Hypothesis:** Rovo's single intent composer can replace the current Doc Intel experience.

**Experiment:** Compared authenticated Rovo/Jira, live Doc Intel and Mobbin evidence from Rovo,
NotebookLM, Elicit, Dovetail and Productboard.

**Measure:** Rovo is strongest as a front door, but Doc Intel also needs bounded sources, structured
review, cited deliverables, approval and traceable promotion.

**Keep/Discard:** **Discard for the whole product; keep for Home.** Use a Rovo-inspired intent front
door feeding a source-bounded review workbench.

---

## Loop 5 — 2026-07-11 — “Is raw Evidence the user's primary value?”

**Hypothesis:** Defaulting to extracted pages helps users trust the system.

**Experiment:** Opened a live source and inspected Evidence, Ask, Artifacts and project-wide Ask.

**Measure:** Evidence exposed extraction output; Ask was a lone field in empty space; Artifacts were
12 flat developer labels. None answered “what can I do with this BRD?”

**Keep/Discard:** **Discard.** Default to Overview; keep readable source and exact selected evidence
one click away, while relocating the full extraction inspector to authorized Admin.

---

## Loop 6 — 2026-07-11 — “Should citations move to Admin with extraction?”

**Hypothesis:** Citations are implementation detail like OCR and block telemetry.

**Experiment:** Traced Ask/artifact citation payloads and compared grounded-research products.

**Measure:** Exact quote, source, page/section and version are the human verification contract;
block hashes, embeddings, prompts, provider errors and queue state are operations detail.

**Keep/Discard:** **Discard.** Keep citations user-facing; move only processing internals to Admin.

---

## Loop 7 — 2026-07-11 — “Can a cosmetic reskin safely solve the problem?”

**Hypothesis:** Information architecture and styling changes are sufficient.

**Experiment:** Traced promotion, source sync, Admin route guards, RLS/function grants and live data.

**Measure:** Draft/verified artifacts can be offered for promotion; provenance-link failure can be
swallowed; authenticated users can trigger a service-role-backed global re-sync; source identities
are incomplete in frontend/citation contracts.

**Keep/Discard:** **Discard.** UI slices remain additive/neutral, but governance hardening and honest
source/provenance states are required before the journey can be called trustworthy.

---

## Loop 8 — 2026-07-11 — “Must persisted analysis exist before testing the new journey?”

**Hypothesis:** A new analysis/conversation entity is required for the first useful revamp.

**Experiment:** Mapped existing source, Ask, facts, artifact and link contracts to proposed screens.

**Measure:** Home, Overview, primary Findings, contextual evidence, Work items and outcome-grouped
deliverables can validate the product model without schema changes; persistence materially expands
scope and migration risk.

**Keep/Discard:** **Defer.** Validate the BRD Review Workbench first; Plan-Lock persistence later.

## Loop 1 — 2026-07-09 — "Is DocIntel real or mock?"

**Hypothesis:** DocIntel might be a largely-mocked demo surface given how many adjacent Catalyst
features turned out to have mock/dead layers (per repo memory patterns).

**Experiment:** 4 parallel read-only agents — code inventory, live Supabase DB probe (staging
`cyij`), docs/tests/seeds inventory, live browser navigation with real Ask/Extract/Generate calls.

**Measure:** 378 real 1536-dim embeddings (non-null spot-checked), 78 real citations, active edge
functions (v5-7), live 15-min cron, non-deterministic 6-45s async latency on Ask/Extract/Generate,
real bilingual (EN/AR) grounded answers across different source documents in the same session.

**Keep/Discard:** Hypothesis **discarded** — DocIntel is real, not mock. Result documented in
`docs/audits/doc-intel-current-state-discovery.md`.

---

## Loop 2 — 2026-07-09 — "Does the acceptance record match reality?"

**Hypothesis:** If DocIntel v1's own `06_VALIDATION_EVIDENCE.md` claims a capability works, live
data will confirm it.

**Experiment:** Cross-checked every AC section against the Knowledge Framework Acceptance Criteria
doc, using the same live DB probe data (table row counts, RPC existence) gathered in Loop 1.

**Measure:** Most claims held up. One did not: §5 Conflict detection marked ✅, but its dependency
`docintel_match_facts` RPC has 0 rows to match against in `ai_requirement_facts` — the capability
cannot currently function despite the ✅ mark.

**Keep/Discard:** Hypothesis **partially discarded** — most of the acceptance record is accurate
and honestly self-critical (several 🟡 residuals correctly marked), but the conflict-detection ✅
is an overclaim. This became Decision 2 in `09_DECISIONS.md` and drives this feature's P0 scope.

---

## Loop 3 (planned, Slice 1 kickoff) — "What is the actual root cause of the fact-embedding gap?"

**Hypothesis:** Not yet formed — requires reading `docintel-analyze/index.ts` and
`embed_stage.ts` fact-extraction path first. This is the first task of Slice 1 execution.
