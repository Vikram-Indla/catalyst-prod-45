# Karpathy Loop Log — CAT-DOCINTEL-V2-20260709-001

## Loop 13 — 2026-07-11 — “Can source trust remain accessible without raw extraction navigation?”

**Hypothesis:** A contextual drawer can preserve document reading and exact claim evidence while
keeping extraction machinery out of the customer mental model.

**Experiment:** Mounted TranslatedDocumentView plus a safe exact-evidence contract in CatalystDrawer,
then tested the real Audio Test source, no-selection evidence, prohibited fields and keyboard close.

**Measure:** The real translated sentence remained available; no technical retrieval fields leaked;
Escape closed and returned focus. The full raw Evidence tab remains only as a temporary migration
bridge until Slice 10.

**Keep/Discard:** **Keep.** Contextual source/evidence becomes the trust pattern; raw extraction is
not part of the drawer and will move to authorized Admin later.

## Loop 12 — 2026-07-11 — “Does emitting `view=findings` deliver Findings?”

**Hypothesis:** The Review Start URL is sufficient for the existing workspace to open the review
panel.

**Experiment:** Clicked Start Review on the authenticated staging flow and inspected the resulting
selected tab and query state.

**Measure:** The URL contained `view=findings`, but the uncontrolled workspace ignored it and
selected Evidence. The initial vertical review layout also placed Start below the fold.

**Keep/Discard:** **Discard.** Added neutral controlled tab query keys, renamed Facts to Findings,
and used a three-column decision layout. Live proof now reaches Findings, preserves Back/Forward,
and keeps Start visible in one viewport.

## Loop 11 — 2026-07-11 — “Does the inherited Ask empty state work as a Home hero?”

**Hypothesis:** Reusing the inline Ask empty state inside the new Home composer will communicate
grounding without additional design work.

**Experiment:** Implemented the approved intent composer and captured the authenticated staging
Home at the default desktop viewport.

**Measure:** The full EmptyState created a large dead area around one small input, recreating the
old sparse/silly feeling. Review and Create inherited the same problem; the Ask input also occupied
only 320px inside a 1,094px composer.

**Keep/Discard:** **Discard.** Hero mode now uses a compact grounding hint, all composer prompts use
compact ADS composition, and the tab panel is full width. Re-measurement: Ask input 986px inside the
1,094px composer; light/dark/1280 screenshots passed.

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

## Loop 12 — 2026-07-12 — “Should project deliverables use artifact detail routes?”

**Hypothesis:** A detail URL containing the artifact UUID is required to resume generated work.

**Experiment:** Listed real project artifacts in JiraTable and opened `ArtifactView` in a drawer
from local row state.

**Measure:** Five real deliverables became resumable; cited detail opened; the URL stayed at the
project Deliverables hub with only the display project key; no slug or schema change was needed.

**Keep/Discard:** **Discard.** Project list plus drawer detail is sufficient and obeys the slug
contract without implying a new persistence model.

## Loop 11 — 2026-07-12 — “Should 12 artifact types appear as one flat chooser?”

**Hypothesis:** A flat list is the most direct way to expose every capability.

**Experiment:** Preserved all exact backend values while grouping them into three customer
outcomes and naming the Generate action after the selection.

**Measure:** No payload changed; every value remained visible; the user now chooses an outcome
before a format; existing history became a canonical table without losing row-open behavior.

**Keep/Discard:** **Discard.** Keep all 12 capabilities, but present them through the customer job.

## Loop 10 — 2026-07-11 — “Should Links and Traceability remain top-level destinations?”

**Hypothesis:** Links and Traceability are independent enough to remain primary source tabs.

**Experiment:** Mounted both unchanged components as peers beneath one Work items destination and
tested legacy query mappings plus live staging reachability.

**Measure:** Link actions and the matrix remained reachable exactly once; the source lost another
implementation-shaped choice; no data or mutation contract changed.

**Keep/Discard:** **Discard.** Work items is the user job; Linked work and Traceability are its
keyboard-reachable peers.

## Loop 9 — 2026-07-11 — “Do source pages belong as a primary destination?”

**Hypothesis:** A user needs Document/Evidence as persistent top-level tabs to trust Findings.

**Experiment:** Reframed the source around five jobs and opened readable source or the selected
claim evidence contextually from View source and Page 1.

**Measure:** The real staging finding remained verifiable; Page 1 restored focus after Escape; no
quotation or processing detail was invented; the source workspace lost two implementation-shaped
destinations without losing reachability.

**Keep/Discard:** **Discard.** Keep source/evidence contextual and preserve the five customer jobs.

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
