# IDEATION — GREENFIELD REBUILD BLUEPRINT (CLEAN SLATE)

> **Supersedes** `02_CANONICAL_DISCOVERY.md` as the design of record. That file remains only as (a) platform-seam evidence and (b) the source of the decommission inventory in §12.
> **Mandate**: wipe the existing Ideation module entirely. Zero carryover of its UI, concepts, object model, statuses, scoring fields, components, hooks, services, or data structures. Design fresh from Catalyst platform primitives + external benchmark evidence.
> **Status**: research for implementation. No code. Plan Lock required before any build slice.

---

## 1. FIRST PRINCIPLES (what the module is, argued from zero)

An enterprise Ideation module has exactly one job: **turn unstructured demand into governed, strategy-traceable Business Requests — and kill everything else fast, transparently, and kindly.**

Derived requirements (each traced to benchmark or platform evidence, none to the legacy module):

1. **Capture must be effortless and omnichannel** — every benchmark leader wins intake through low-friction channels (Productboard notes/email/Slack, ServiceNow portal title+category, ClickUp forms). Catalyst's native channels are: form, Caty chat, AI voice, and document/screenshot ingestion (docintel). Those four are the launch channels.
2. **Evidence is a first-class object, not a text field** — the strongest pattern in the class (Productboard insights, JPD insights): raw input is preserved verbatim and *linked*, so decisions cite sources.
3. **Triage is a funnel with an inbox-zero contract** — untriaged ideas are a visible, owned queue, never a swamp.
4. **Scoring is a configurable framework, not hardcoded formulas** — Productboard weighted drivers, Aha! scorecards, ServiceNow assessment weights. Admin defines the model; the module computes it.
5. **Decisions are governed transitions** — Catalyst already owns a canonical workflow runtime (`ph_wf_*`, 18 guard types, advisory/blocking enforcement, transition audit). The module defines *no status machinery of its own*.
6. **Conversion is the only exit that creates work** — target is `business_requests` (the Level-0 hierarchy root, MIM-N keys), created through the existing key-sequencing precedent, with a permanent two-way link and live delivery rollup back to the idea (JPD pattern) and automatic closure on delivery completion (ServiceNow pattern).
7. **Strategy linkage is mandatory at decision time** — the platform's unmodeled STRATA↔BR seam is closed here: an idea cannot be Approved without a strategy-element link (guard-enforced, admin can relax).
8. **AI proposes, humans dispose** — every AI output is a persisted, evidenced, confidence-scored suggestion requiring explicit human action; zero silent writes.
9. **The submitter loop always closes** — every terminal decision notifies the submitter with the reason (Aha! ship-notification evidence: this is what keeps intake alive).
10. **Bilingual (EN/AR) and RTL from day one** — the platform already ships AR voice ASR and AR docintel; a KSA-ministry platform cannot launch an EN-only intake surface.

---

## 2. MODULE IDENTITY

- **Name**: Ideation (module key `ideation` — registered in `admin_role_module_permissions`; **decoupled from `ENABLE_AI`** — AI features degrade, the module never disappears).
- **Routes** (registered as builders in `src/lib/routes.ts`; slug contract, no `:id` params):
  - `/ideation` — Inbox (triage-first landing; the funnel IS the homepage)
  - `/ideation/explore` — full list/table
  - `/ideation/portfolio` — decision board (value/effort field, funnel columns)
  - `/ideation/ideas/:slug` — idea detail
  - `/ideation/submit` — intake (also launchable as a global modal from anywhere)
  - `/admin/ideation/*` — admin config
- **Navigation**: peer hub in global nav between Strategy (STRATA) and Product Hub — mirroring its logical seat between strategy and demand.
- **Home**: ForYou section ("Ideas waiting on you" for reviewers, "Your ideas" for submitters) + `WidgetShell`/`MetricCard` dashboard cards.
- **Display key**: `IDEA-<n>` global sequence (race-safe sequencing per the `generateIssueKey` precedent). **Slug**: DB trigger per the releases-slug precedent, frozen on create.

---

## 3. DOMAIN MODEL (all-new tables, `idn_` prefix — no legacy table touched)

**`idn_ideas`** — deliberately narrow; everything variable is normalized out.
`id uuid PK · idea_key text UNIQUE · slug text UNIQUE (trigger) · title text · problem_statement adf · proposed_value adf (nullable) · idea_class enum('problem','opportunity','improvement') · workflow_status_key text (ph_wf_* runtime — the ONLY status column) · submitter_id → auth.users · owner_id (triage owner, nullable) · sponsor_id (nullable) · product_id → products (nullable) · strategy_element_id → strata_strategy_elements (nullable until Decision gate) · origin_channel enum('form','chat','voice','document') · language enum('en','ar') · score_total numeric (materialized from active scoring model) · decision enum('approved','declined','parked','merged') nullable · decision_reason text · decided_by/decided_at · parked_until date · merged_into_id → idn_ideas · converted_business_request_id → business_requests · converted_at/by · archived_at · created_at/updated_at`
*Note what is intentionally absent*: no priority column (score is the priority), no department free-text (submitter profile provides it), no quarter/milestone/roadmap columns (roadmapping belongs to the BR after conversion — ideas are not planned, they are decided), no per-formula scoring columns.

**`idn_evidence`** — first-class evidence objects (the Productboard-insight pattern on Catalyst rails):
`id · idea_id · kind enum('snippet','document','link','voice_transcript','image') · body text (verbatim snippet/transcript) · document_id → ai_documents (docintel) nullable · url nullable · source_attribution text (who said it, where) · added_by · created_at`

**`idn_votes`** — `id · idea_id · user_id · importance smallint 1–4 (critical/important/nice/none — Productboard's 4-level importance beats bare +1) · comment text nullable · UNIQUE(idea_id,user_id)`

**Comments**: reuse the platform comment/activity infrastructure (ActivityPanel + CommentEditor with mentions); storage `idn_comments` following the `incident_comments` shape.

**Scoring framework** (governed, versioned — GovernedEnvelope pattern from STRATA):
- **`idn_scoring_models`** — `id · name · slug · description · aggregation enum('weighted_sum','weighted_avg') · + GovernedEnvelope (version, status, effective_from/to, approved_by, change_reason, supersedes_id)`
- **`idn_scoring_drivers`** — `id · model_id · key · label_en/label_ar · weight numeric · scale_min/scale_max · direction enum('higher_better','lower_better') · rubric jsonb ({score: description}) · order_index`
- **`idn_idea_scores`** — `id · idea_id · driver_id · model_version · value numeric · scored_by · rationale text · source enum('human','ai_suggested_accepted') · created_at`
- Ships with three admin-installable presets (Value/Effort, RICE, WSJF) as *templates in the framework*, not columns. `idn_ideas.score_total` recomputed on score write against the active model version; historical scores keep their version (ServiceNow assessment-weight lesson: scores must survive weight changes).

**AI suggestion ledger** (the HITL + audit backbone):
- **`idn_ai_suggestions`** — `id · idea_id · kind enum('classification','summary','duplicate','strategy_mapping','work_item_mapping','scores','recommendation','br_draft') · payload jsonb · confidence numeric 0–1 · evidence_refs jsonb · model text · prompt_version text · status enum('proposed','accepted','edited','rejected','superseded') · decided_by/decided_at · override_note text · created_at`
- Companion call-level logging stays in the existing `ai_usage_log`.

**Similarity/duplicates**:
- **`idn_idea_embeddings`** — `idea_id PK · embedding vector(1536) (gateway `embed()`) · embedded_at · content_hash` (pgvector index; refreshed on title/problem change via hash check).
- Duplicate handling = a `duplicate` suggestion → human merge action → losing idea gets `decision='merged'`, `merged_into_id`, votes and evidence **re-pointed** to the winner (non-destructive; loser retained read-only). Merge preview is mandatory UI.

**Conversion**:
- **`idn_conversions`** — `id · idea_id · business_request_id · mode enum('manual','ai_assisted') · br_draft_suggestion_id → idn_ai_suggestions nullable · converted_by · created_at` (a table, not just columns: it is the audited traceability edge) — plus `business_requests.source_idea_id` backlink column (single additive migration to an existing table; the only non-`idn_` schema touch).

**Watchers & audit**: `idn_watchers (idea_id, user_id, reason enum('submitter','voter','manual'))`; field-level audit via `idn_audit_log (idea_id, action, changed_fields jsonb, actor, created_at)` + workflow transitions audited by the runtime's `recordAdvisoryStatusChange()`.

---

## 4. LIFECYCLE (defined in Workflow Studio on `ph_wf_*` — the module owns no state machine)

Default workflow (admin-editable per the runtime):

```
Draft → Submitted → Screening → Evaluation → Decided ─┬→ Approved → Converted → Delivered(auto)
                                                      ├→ Declined   (reason required)
                                                      ├→ Parked     (reason + parked_until)
                                                      └→ Merged     (via merge flow only)
```

- **Draft**: submitter-private. **Submitted**: enters the Inbox queue; watchers auto-added.
- **Screening** (inbox-zero stage): triage owner assigned; AI enrichment runs here; cheap kills happen here (Decline/Merge) — ServiceNow's "Closed-Skipped at review" economics.
- **Evaluation**: scoring against the active model; evidence gathering; guards accumulate.
- **Decided → Approved** transition guards (all runtime guard registry, advisory→blocking per admin): `strategy_link_present` (new guard), `scores_complete` (new guard: all active-model drivers scored), `duplicate_review_complete` (new guard), `comment_required` (existing) on Decline.
- **Converted**: human-only, wizard-only. **Delivered**: auto-set when the linked BR reaches its terminal process step (event listener; ServiceNow auto-close pattern) — submitter notified "your idea shipped."
- **Lock model**: `Converted`, `Merged`, `Delivered` = read-only except comments, enforced in **RLS policies**, not just UI. `Declined`/`Parked` re-openable by reviewer+ (audited). Archive after admin-configurable N days terminal.

---

## 5. SCORING & PRIORITIZATION UX

- Reviewer scores each driver 0–N against the rubric inline on the idea detail (right rail) — per-gate progressive disclosure (Planview PPM Pro pattern): submitters never see scoring fields; they appear at Evaluation for reviewer roles.
- Community signal = vote count + importance mix, displayed as its own chip, **feedable into the scoring model as a driver** (Productboard Customer-Importance pattern) but never auto-deciding.
- `/ideation/portfolio` renders the decision field: X = effort-class driver, Y = value-class driver, bubble = votes, color = funnel stage; quadrant actions (Approve/Decline/Park) inline — ServiceNow Demand-Workbench single-triage-surface pattern.
- Manual-score fallback is always available (ServiceNow's stalled-assessment lesson).

---

## 6. AI COPILOT (Idea→BR, designed in from day one)

One edge function **`ideation-copilot`** on the existing `_shared/llm.ts` gateway (Gemini→Claude→Qwen failover, JSON-schema outputs, `logUsage`).

**Intake-time (async, non-blocking)**: classification (`idea_class`, product, language), structured summary (problem/value/impacted-users draft), duplicate scan (pgvector over `idn_idea_embeddings`, permission-scoped), strategy-element candidates (against `strata_strategy_elements` names/descriptions), each written as `idn_ai_suggestions` rows.
**Evaluation-time (on demand)**: driver-score proposals with per-driver rationale; recommendation (approve/decline/park/merge/enrich) with confidence + cited evidence.
**Conversion-time**: BR draft mapped to `business_requests` columns (title, description ADF with scope/objectives/success-metrics/assumptions/risks/acceptance-criteria sections, request_type, category, urgency, stakeholders) + carried strategy link + evidence bundle — pre-fills the wizard, never creates.

**Input channels**: form text; Caty chat (new `idea` persona per the existing 7-persona pattern, min-role `user`); voice (voice-flow capsule → `voice-transcribe`, AR/EN, transcript saved as `idn_evidence` kind `voice_transcript`); documents/screenshots (docintel ingest, pages linked as evidence with `document_id`).

**Hard rules**: no AI write to any domain table other than `idn_ai_suggestions` + `idn_idea_embeddings`; every suggestion carries confidence + evidence or is dropped; below-threshold suggestions render collapsed and flagged; retrieval runs under caller RLS context (no service-role context leaks); AR input → AR output; full module works with AI disabled (admin toggle, or gateway outage → graceful "enrichment unavailable").
**Evaluation harness**: golden set (≥50 labeled ideas: known duplicates, known strategy mappings, historical conversions); metrics = dedupe P/R, classification accuracy, BR-draft required-field completeness; runs keyed to `prompt_version`; regression run on any prompt/model change; thresholds are release gates.

---

## 7. PERMISSIONS

| Role (module-scoped) | Capabilities |
|---|---|
| Submitter (any authenticated with module access) | create, edit own Draft, vote, comment, watch, view non-private ideas |
| Reviewer | triage ownership, screening actions, scoring, merge proposal, decline/park |
| Approver | approve, convert (wizard), reopen terminal, edit anyone's idea pre-decision |
| Ideation Admin | all + admin config |

Mapped through `admin_role_module_permissions` + `ModuleGuard moduleCode="ideation"` + `useModuleReadOnly()`; RLS mirrors the matrix on every `idn_*` table (votes/comments writable by author only; terminal-state write bans in policy). AI access follows the caller's role (Caty minRole pattern).

---

## 8. NOTIFICATIONS (trigger-service events, scheme-configurable)

New `IdeationHub` event set registered in `notificationEvents.ts` (fresh keys — legacy ProductHub `idea_*` keys retired with the wipe): `idea_submitted` (→ triage queue owners, P2) · `idea_triage_assigned` · `idea_status_changed` (→ submitter+watchers, P3) · `idea_comment_added` / `idea_mentioned` (P2) · `idea_vote_milestone` (10/25/50, → submitter, P4) · `idea_decision` (approved/declined/parked with reason, → submitter+watchers, P2) · `idea_merged` (→ both submitters) · `idea_converted` (→ submitter+voters+watchers, P2) · `idea_delivered` (→ submitter+voters — the loop-closer, P2) · `idea_ai_suggestions_ready` (→ triage owner, P4, reuses `ai_insight_generated` type). Channels in-app + email per scheme defaults; all admin-tunable via the existing scheme service.

---

## 9. UX BLUEPRINT (canonical components; fresh composition — no legacy screen reused)

| Surface | Composition |
|---|---|
| **Inbox** (`/ideation`) | Split view: queue list (JiraTable compact) + selected-idea preview pane; "Untriaged: N" header counter; keyboard j/k triage; bulk decline/merge with reason |
| **Submit** | Single-screen form (NOT a multi-step wizard — benchmark evidence says friction kills intake): title + problem (ADF editor) + optional value + product picker; voice capsule + doc-drop attached; AI assists *after* submit, never gates it. Global "+ Idea" entry point |
| **Explore** | JiraTable: key, title, class, stage lozenge, score_total, votes chip, strategy element, owner avatar, age; saved filters; CSV export |
| **Portfolio** | Value/effort field (new canonical component — flagged gap) + funnel columns toggle; inline decision actions |
| **Idea detail** | CatalystViewBase layout: left = problem/value, evidence list, comments/activity (ActivityPanel incl. audit + transitions); right rail = stage, owner, sponsor, strategy element picker, scoring panel (role-gated), votes, watchers, linked BR card with live status rollup |
| **AI panel** | Right-side drawer: suggestion cards (kind icon, confidence lozenge, evidence expander, Accept / Edit / Reject); trigger = `AIIntelligenceButton` (one of the two sanctioned rainbow CTAs) |
| **Merge preview** | Modal: side-by-side, explicit list of what transfers (votes, evidence, watchers), reversible-note; confirm pattern per ConfirmDialog family |
| **Conversion wizard** | 3 steps: (1) review AI/manual BR draft, (2) guard checklist (strategy link, scores, duplicate review — live green/red), (3) confirm → BR created, idea locks, both keys shown |
| **Admin** | `/admin/ideation`: Scoring models (driver editor + preset installer), Workflow (deep-link to Workflow Studio), Intake (channels on/off, submit-form field config), AI (master toggle, per-capability toggles, confidence threshold, prompt version viewer), Roles, Retention/archive |
| **States** | EmptyBoardState/LoadingSkeleton/ErrorBoundary everywhere; every async AI surface has explicit unavailable-state |

**Non-canonical gaps to approve before build** (flagged per contract): value/effort field chart, vote-with-importance control, AI suggestion card, guard checklist, funnel metric widget. Everything else composes from JiraTable, PragmaticBoard, CatalystViewBase, ActivityPanel, ADF editor, Lozenge/Avatar, WidgetShell, ModalDialog.
**EN/AR + RTL**: all labels through LanguageContext with AR strings at launch; driver labels bilingual (`label_en/label_ar`); RTL mirroring verified on Inbox/detail/portfolio; AR voice + AR docintel already platform-native. **Dark mode**: pure ADS tokens (module stays outside AstryxZone). **Tablet**: Inbox collapses to single pane; portfolio gets touch targets ≥44px; JiraTable density modes.

---

## 10. ARCHITECTURE SUMMARY

- **Code layout** (canonical layering): `src/modules/ideation/{types.ts, index.ts, api/ideationApi.ts, hooks/, shared/computations.ts, pages/, components/, admin/}` — pages→hooks→services→supabase, react-query only.
- **Edge functions**: `ideation-copilot` (+ reuse `voice-transcribe`, docintel, gateway).
- **Migrations**: `idn_*` tables + RLS + slug trigger + key sequencer + `business_requests.source_idea_id` + workflow seed (default ideation workflow + 3 new guards) + IdeationHub notification triggers. Ledger discipline per contract.
- **Tests**: unit (scoring compute, guards, merge transfer, key sequencing), integration (lifecycle transitions incl. lock enforcement, conversion end-to-end, notification emission, RLS role matrix), UI adapter tests (Inbox/Explore/Portfolio), AI eval harness (§6), E2E happy path (submit→triage→score→approve→convert→BR visible).
- **Production checks**: module flag off = clean 404-to-home; AI off = full manual flow; 10k ideas: Inbox p95 <2s (paginated queries from day one); color-gate + audit-gate ratchets pass; screenshot acceptance per surface.

---

## 11. TEN CRITICAL QUESTIONS — CLEAN-SLATE ANSWERS

1. **Why a module, not a BR form?** BRs are committed demand (Level-0, MIM-N, 22-column deliberately-slim schema). Pre-commitment demand needs votes, evidence, screening economics, and a 60–90% kill rate that must never pollute BR reporting. Every benchmark separates the layers. → Separate module with one governed exit.
2. **In the hierarchy or beside it?** Beside it. The type registry is a seeded system contract; no benchmark embeds ideas in the delivery tree. Idea = linked intake object: `strategy_element_id` up, `idn_conversions`→BR down. Zero hierarchy-registry changes.
3. **Object model?** §3 — narrow core + normalized evidence/votes/scores/suggestions/conversions. The design bet: *normalize variability (scoring, evidence, AI) out of the idea row*.
4. **Lifecycle?** §4 — 6 working stages + 4 decisions + auto-Delivered, defined in Workflow Studio, guards not statuses for enrichment/prioritization gates.
5. **CRUD/lock/merge/delete rules?** RLS-enforced terminal locks; non-destructive merge with preview and re-pointing; reopen audited; soft-delete admin-only; archive by retention policy.
6. **Linking?** Strategy element (mandatory at Approve), BR (conversion edge + backlink + live rollup + auto-Delivered). Epic/Feature/Story/Release traceability flows **through** the BR — no direct idea→story links (shadow-demand ban).
7. **Admin controls?** §9 admin surface: scoring models (GovernedEnvelope-versioned), workflow via Studio, intake config, AI toggles/thresholds, roles, retention.
8. **Notifications/chat/voice/audit?** §8 event set through the scheme service; Caty `idea` persona; voice+docintel as intake channels and evidence sources; runtime transition audit + `idn_audit_log` + suggestion ledger.
9. **Premium UI?** §9 — Inbox-first (the differentiator vs. legacy's view-sprawl: one triage surface, one explore surface, one decision surface, one detail).
10. **Blind spots?** (a) BR terminal-step detection for auto-Delivered needs a reliable event source — verify `process_step` change hooks before Plan Lock; (b) score recomputation on model re-version needs an explicit strategy (recompute vs. freeze — recommend freeze + banner); (c) email intake is expected by benchmarks but Catalyst has no inbound-email infra — declare out of scope V1, note as roadmap; (d) global "+ Idea" from every hub needs a nav-shell touchpoint — coordinate with shell owners; (e) data disposition of legacy `ph_ideas` rows (§12) is a business decision, not a technical one.

---

## 12. DECOMMISSION PLAN (the only section where the legacy module appears)

**Principle**: wipe, don't migrate. No legacy schema, component, hook, service, route, or concept survives. One open business decision: whether legacy idea *rows* are exported to a cold archive (CSV/parquet snapshot) before drop, or dropped outright — **needs explicit Vikram sign-off; destructive.**

Inventory to remove (single decommission slice, own Plan Lock, RED-FLAG reviewed):
- **Routes**: `/ideation/*` legacy mounts + `/product/ideas/*` + `/product-hub/ideation` redirects (`FullAppRoutes.tsx:133-139, 571-593`) — replaced by the new mounts.
- **Pages**: `src/pages/producthub/{IdeationPage,IdeasBacklogPage,IdeasBoardPage,IdeasRoadmapPage,IdeasThemePage,IdeasAnalyticsPage}.tsx`, `src/pages/product/ideas/IdeasRoadmapPage.tsx`, `src/pages/producthub/ideasBacklogDataSource.ts`.
- **Components**: `src/modules-dormant/ideation/` (entire folder), `src/components/catalyst-detail-views/idea/CatalystViewIdea.tsx`, `src/components/kanban/adapters/ideasBoardAdapter.tsx` + its test.
- **Hooks/services**: `useIdeation.ts`, `useIdeasHub.ts`, `ideationService.ts`, `ideasRoadmapService.ts`, `ideasRoadmapPptx.ts`, `src/types/ideasRoadmap.ts`.
- **DB**: `ph_ideas` + `ph_idea_votes/comments/evidence/scores/expert_reviews/audit_log/v2030_mappings/compliance_tags` + all 9 `ph_ideas_*` views + any `ph_innovation_drives` idea FKs (verify consumers first — `ph_requests` linkage checked for orphan impact).
- **Notification keys**: legacy ProductHub `idea_*` trigger entries.
- **Verify-no-consumers sweep** before drop: grep for `ph_ideas` / `useIdeasHub` / `CatalystViewIdea` imports outside the removal set; UWV and DemandFulfilmentGadget reference `ph_requests`, not ideas — confirm untouched.

---

## 13. BUILD SEQUENCE (each phase = one or more 2h slices, Plan Lock per slice)

1. **Foundations**: `idn_*` migrations, RLS, sequencer, slug, module registration, route builders, module scaffold.
2. **Core flow**: submit form → Inbox → detail → lifecycle on workflow runtime → decline/park with reasons → notifications.
3. **Community**: votes+importance, comments/mentions, watchers, evidence objects.
4. **Scoring**: models/drivers admin, scoring panel, portfolio surface.
5. **Conversion**: wizard, guards, BR creation, backlink, live rollup, auto-Delivered listener, locks.
6. **AI**: embeddings + copilot suggestions + AI panel + eval harness.
7. **Channels**: Caty persona, voice intake, docintel evidence.
8. **Hardening**: AR/RTL, dark-mode audit, widgets, exports, E2E, perf.
9. **Decommission**: §12 slice (can run any time after phase 2 ships behind the flag; before GA).

---

## 14. ACCEPTANCE CRITERIA (delta highlights; full grid to be frozen in Plan Lock)

Everything in the old dossier's §L reads across, re-based onto `idn_*`, plus clean-slate-specific gates: zero imports from the decommission inventory anywhere in the new module; zero references to legacy statuses/fields in UI copy; submit-to-inbox p95 <1.5s; untriaged-queue SLA metric visible to admins; submitter receives a reasoned notification for 100% of terminal decisions; `business_requests.source_idea_id` populated for 100% of conversions; auto-Delivered fires within 5 min of BR terminal step; AR locale passes full-surface RTL screenshot review; decommission slice merges only with signed data-disposition decision.
