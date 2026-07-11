# CAT-IDEATION-DISCOVERY-20260709-001 — Ideation Module Discovery Dossier

> **Type**: Research/discovery only. No code was implemented.
> **Date**: 2026-07-09 · **Discovery method**: 6 parallel codebase lanes + 6-product external benchmark (official docs)
> **Verdict preview**: **REVAMP EXISTING** — a substantial Ideation module already exists at `/ideation/*` and must not be rebuilt; it must be re-seated, governed, and completed.

---

## A. EXECUTIVE SUMMARY

**Ideation already exists in Catalyst.** The target assumption ("Ideation should sit between Strategy and Business Requests") is **directionally correct but architecturally imprecise**, and the assumption that this is a greenfield module is **false**.

What discovery actually found:

1. A production-wired Ideation peer hub exists at `/ideation/{backlog,board,roadmap,themes,analytics,matrix,triage,intelligence}` ([FullAppRoutes.tsx:571-593](src/routes/FullAppRoutes.tsx)), gated behind `ENABLE_AI`, with a rich `ph_ideas` schema (RICE + WSJF + IMAC + investor-fit scoring columns, votes, comments, evidence, audit-log table, AI enrichment fields), 8 satellite tables, and 9 analytics views.
2. **The conversion path is mis-seated.** Ideas convert into `ph_requests` ([ideasRoadmapService.ts:95](src/services/ideasRoadmapService.ts)) — not into `business_requests`, which is the canonical **Level-0 root** of the 6-level work-item hierarchy ([20260703100000_work_item_type_registry.sql](supabase/migrations/20260703100000_work_item_type_registry.sql)). The very seam the module exists to serve is pointed at the wrong table.
3. **The Strategy↔Business Request attachment point is unmodeled** anywhere in Catalyst. `ph_ideas.theme` is free text; STRATA's `strata_strategy_elements` (element_type `theme`) is never referenced. Ideation is precisely the object that should close this traceability gap — Idea carries the strategy-element link and hands it to the Business Request on conversion.
4. Roughly 40% of the module is façade: merge/duplicate UI with no backend mutation, an Export button that is a no-op, RICE/WSJF columns never surfaced in UI, `ph_idea_audit_log` with no viewer, no notifications wired (despite `idea_*` events already registered in [notificationEvents.ts](src/constants/notificationEvents.ts)), no ModuleGuard permission registration, no canonical-workflow (`ph_wf_*`) integration, and components living in `src/modules-dormant/ideation/`.
5. All infrastructure needed for the AI Idea-to-Business-Request Copilot already exists as primitives: multi-provider LLM gateway ([_shared/llm.ts](supabase/functions/_shared/llm.ts)), `ai-similar-items` edge function + [LinkSimilarItemsDialog](src/components/catalyst-detail-views/improve/LinkSimilarItemsDialog.tsx), a Caty **business-request persona** ([caty-assistants.ts](src/lib/caty-assistants.ts)), voice capture ([voice-flow](src/features/voice-flow)), docintel document/screenshot ingestion, and `ai_usage_log`. What is missing is the governed suggestion-lifecycle layer (proposal → human decision → audit).

**Recommendation**: **Revamp Existing** (not Build New, not Reuse as-is). Re-seat the conversion onto `business_requests`, bind Idea to STRATA strategy elements, adopt the canonical workflow runtime for lifecycle governance, wire the already-registered notifications, register the module in the permission model, implement the merge/duplicate backend, and build the AI Copilot as a governed suggestion layer over existing AI primitives. Justification in §K.

---

## B. EVIDENCE MAP (Catalyst artifacts inspected)

### Routes & module surface
| Artifact | Path | Finding |
|---|---|---|
| Ideation routes | `src/routes/FullAppRoutes.tsx:571-593` | Peer hub `/ideation/*`; legacy `/product/ideas/*` and `/product-hub/ideation` redirect in |
| Route gating | `FullAppRoutes.tsx:133-139` | All idea pages lazy-loaded only when `ENABLE_AI`; wrapped in `MG k="ai_features"` |
| Route registry | `src/lib/routes.ts` | Route-builder convention; slug contract documented; **no ideation builders registered** |
| STRATA routes | `src/modules/strata/StrataRoutes.tsx` | `/strata/*` — strategy surface (cycles, elements, scorecards, KPIs, execution, VMO) |

### Ideation pages, components, hooks, services
| Artifact | Path | Finding |
|---|---|---|
| Master page | `src/pages/producthub/IdeationPage.tsx` (556 ln) | matrix/triage/intelligence views, convert drawer, stats bar |
| Backlog | `src/pages/producthub/IdeasBacklogPage.tsx` (333 ln) | Canonical BacklogPage adapter, JiraTable-based |
| Board | `src/pages/producthub/IdeasBoardPage.tsx` | KanbanBoardShell, 5 columns, drag persists status |
| Roadmap / Themes / Analytics | `src/pages/producthub/Ideas{Roadmap,Theme,Analytics}Page.tsx` | Quarter kanban, theme cards + conversion rates, funnel analytics |
| Detail view | `src/components/catalyst-detail-views/idea/CatalystViewIdea.tsx` (28.5KB) | Full-page detail on CatalystViewBase, activity panel |
| Dormant components | `src/modules-dormant/ideation/` | CreateWizard, MatrixView, TriagePanel, IntelligenceHub, IdeaDrawer, ideation-data.ts (status/type/priority/quarter config) |
| Hooks | `src/hooks/useIdeasHub.ts` (primary), `src/hooks/useIdeation.ts` (legacy) | react-query CRUD, stats, themes, roadmap |
| Services | `src/services/ideationService.ts`, `src/services/ideasRoadmapService.ts`, `ideasRoadmapPptx.ts` | Legacy adapter; **conversion targets `ph_requests`** (line 95); PPTX export unused |
| Test | `src/components/kanban/__tests__/ideasBoardAdapter.test.ts` | Only test on the surface; no conversion/vote/comment/E2E tests |

### Database (supabase/migrations)
| Artifact | Path | Finding |
|---|---|---|
| `ph_ideas` + 8 satellites + 9 views | `20260516120000_bootstrap_full_schema.sql` | Satellites: `ph_idea_votes`, `ph_idea_comments`, `ph_idea_evidence`, `ph_idea_scores`, `ph_idea_expert_reviews`, `ph_idea_audit_log`, `ph_idea_v2030_mappings`, `ph_idea_compliance_tags`. Views: listing/board/matrix/triage/status_counts/dept_counts/top_contributors/impact_distribution/monthly_trend |
| Work-item type registry | `20260703100000_work_item_type_registry.sql` | 6 levels, 20 types, pairwise parent rules; `business_request` = level 0 |
| `business_requests` (22 col) | `20260428090000_business_request_feature_unification.sql` | MIM-N global key, process_step workflow, RLS |
| BR↔Milestone links | `2026-06-28_003_create_br_milestone_links.sql` | Link-table precedent |
| Task↔work-item links | `20260627170001_task_work_item_links.sql` | Link-table precedent with type CHECK |
| STRATA schema | `20260705100100_strata_strategy_scorecard.sql` | strategy elements, cycles, GovernedEnvelope versioning pattern |
| Slug trigger precedent | `20260701000009_releases_slugs.sql` | `catalyst_slugify()` + dedupe trigger; **ph_ideas has no slug** |
| AI audit | `20260704000000_ai_usage_log.sql` | Call-level log, service-role only |

### Platform conventions
| Area | Evidence | Status |
|---|---|---|
| Layering | pages→hooks→services→supabase (`src/modules/incidents/*` as reference) | Confirmed |
| State | react-query only (+ contexts for theme/lang/flags/auth) | Confirmed |
| Permissions | `useModuleAccess.ts:174-258`, `ModuleGuard.tsx:55-138`, `admin_role_module_permissions` | Confirmed; **Ideation not registered** |
| Rule engine | Canonical workflow runtime `src/lib/workflow/canonical/runtime.ts` — `ph_wf_*` tables, 18 guard types, advisory/blocking enforcement | Confirmed; standalone "CRE" **Not confirmed** (skill exists; runtime is the real engine) |
| Admin | `src/pages/admin/*` (AccessPage, FieldRegistry, FieldLayout, RolesAdmin) + per-module admin dirs | Confirmed; no Ideation admin screen |
| Audit | `audit_log`, `activity_logs`, `business_request_audit_logs`, `incident_history`, AuditTrailPage; `recordAdvisoryStatusChange()` | Confirmed; `ph_idea_audit_log` has no UI |
| Notifications | `notificationEvents.ts` (198 events, incl. ProductHub `idea_*`), `notificationTriggerService.ts` (schemes, rules, channels) | Confirmed; idea events not emitted |
| Slugs | trigger + routes.ts builders | Confirmed; `useXBySlug` hooks & `UuidToSlugRedirect` component **Not confirmed** in code |
| i18n/RTL | `LanguageContext`, `name_en/name_ar` column convention, `detectScript` Arabic detection | Partial — AR columns exist, UI EN-only |
| Dark mode | ThemeProvider → AdsThemeProvider → `--ds-*` tokens | Confirmed |
| Home | `ForYouPage.atlaskit.tsx` tabs; `WidgetShell`/`MetricCard` for dashboards | Confirmed; no formal home-widget registry |

### AI / chat / voice touchpoints
| Capability | Evidence | Status |
|---|---|---|
| LLM gateway | `supabase/functions/_shared/llm.ts` — Gemini 2.5 Flash → Claude Sonnet → Qwen failover, retries, `embed()` 1536-dim, `logUsage()` | Wired |
| Duplicate/similarity | `ai-similar-items` edge fn + `LinkSimilarItemsDialog.tsx` (issues only); `ph_ideas.ai_duplicate_ids[]` populated but merge has **no backend** | Partial |
| Caty assistants | `src/lib/caty-assistants.ts` — 7 role-gated personas incl. **business-request** | Wired |
| Chat | `src/features/chat-v2/` — Realtime, ticket-typed conversations; chat→action **Not confirmed** | Partial |
| Voice | `voice-transcribe` edge fn (Groq Whisper→Gemini), `src/features/voice-flow/*`, double-space hotkey, AR/UR/HI/EN + KSA phrases | Wired |
| Docs/screenshots | docintel pipeline (`docintel-ingest/-analyze/-ask`), pgvector embeddings, AR/EN | Wired |
| RAG | `kb-query` 9-stage hybrid pipeline | Wired |
| AI audit | `ai_usage_log` (calls only); suggestion-lifecycle audit (accept/override/reject) **Not confirmed anywhere** | Gap |
| HITL approval | No generic approval surface found for AI outputs | Gap |

### Canonical UI inventory (fit-for-ideation)
JiraTable (+cells/editors/ColumnHeaderMenu), PragmaticBoard/KanbanColumn/SortableCard/InlineCreateCard, CatalystViewBase + CatalystViewIdea, ActivityPanel/CommentEditor/CommentThread, WSJFScoringModal (+inline scores), IdeationMatrixView, EpicDescriptionEditor (ADF + mentions + supabase image upload), CatalystAttachmentsPanel, LinkSimilarItemsDialog, LinkWorkItemModal, Confirm{Delete,Archive,Clone}Dialog, Lozenge/PriorityIcon/Avatar/ReactionBar, WidgetShell/MetricCard, EmptyBoardState/LoadingSkeleton/ErrorBoundary. Full table in lane report; UI gaps listed in §H and §J.

---

## C. EXTERNAL PRODUCT BENCHMARK

| Product | Source quality | Intake | Object model | Lifecycle | Scoring | Duplicates | Conversion | AI | Governance | Copy | Avoid |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Jira Product Discovery** | Official Atlassian docs | Ideas created in-project; insights attached from Slack/support/links; contributor role free for insight/vote/comment | Idea = first-class type in a discovery project; **insights** (evidence snippets) attached to ideas; custom fields incl. formula fields | Custom idea workflows/statuses per project; roadmap views (now/next/later) | Weighted formula fields (impact/effort/insight-count), effort×impact matrix views | Merge ideas; Atlassian Intelligence similar-idea surfacing | **Idea → delivery ticket(s)** in Jira Software with persistent two-way link + delivery progress rollup on the idea | Atlassian Intelligence: summarize insights, draft descriptions | Creator vs contributor roles; project-level config | Delivery-progress rollup shown on the originating idea — traceability both ways | Idea fields siloed per project; cross-project portfolio view weak |
| **Aha! Ideas** | Official Aha! docs | Branded ideas portals (public/private/submit-only), email intake, Salesforce/Zendesk capture; proxy voting for account-weighted demand | Idea record with categories, custom fields, organizations, contacts, idea votes incl. proxy votes | Needs review → Future consideration → Planned → Shipped (customizable); auto status sync back to portal voters | Aha! score (custom weighted scorecards); vote counts, revenue-weighted (proxy vote $ ) | Merge duplicate ideas (votes combine); admin-controlled | **Promote idea → feature/epic/initiative** with lineage retained; shipped status flows back to voters | Aha! AI: idea summarization, auto-categorization, similar-idea detection, empathy-session insights | Granular portal permissions, custom terminology, idea visibility rules, workspace-level config | Closing-the-loop automation (voters notified on ship) builds submitter trust | Over-configurable portals become brand-inconsistent; scorecard sprawl |
| **Productboard** | Official support docs | Omnichannel notes: email fwd, Slack, Teams, Zendesk (two-way reopen), Intercom, Chrome ext, Notes API, forms | Note (raw) → **insight** (highlighted snippet) linked at any hierarchy level (product→component→feature) | Custom statuses per item type; notes carry Unprocessed/Processed inbox state | Customer Importance Score from weighted linked insights; 0–5 weighted drivers; custom formulas (RICE/WSJF/ICE/ROI) | AI duplicate detection + auto-tag; merge only on legacy boards & deletes non-insight data | Push/link features to Jira/ADO, two-way sync, field mapping, rule-based auto-import | Productboard AI + Pulse: summarize, auto-link, dedupe, topics, NL Q&A over feedback, Slack agent | 4 roles + custom per-field roles; teamspaces; archiving policies | Snippet-level evidence linking (one note feeds many items); inbox-zero triage semantics | Legacy/new fragmentation; destructive merge; feature-dense onboarding |
| **Planview (IdeaPlace + PPM Pro/Portfolios)** | Official success-center + community | Time-boxed Challenges vs always-on Communities; admin-configurable idea template; PPM Pro gated request intake | Idea→challenge+category+tags; numeric template fields feed ROI dashboards | Phases (timeline) vs Stages (idea progress) advanced by graduation requirements (votes, reviews, approvals) | Crowd voting, star rating, pairwise (sets of 15), expert scorecards, predictive market | ML **Consolidate Ideas** into a primary with backlinks; metrics/comments don't move | Challenge close-out → implementation; IdeaPlace→Portfolios integration notoriously weak (open feature request) | Planview Copilot/Anvi (Bedrock multi-agent); ML dedupe, NLP sentiment | Sponsor/Moderator/Expert roles; per-gate field visibility; Labs 2.0 custom roles | Pairwise micro-voting; per-gate progressive field disclosure | Gamification theater (virtual currency); dual phases/stages taxonomy |
| **ServiceNow SPM (Innovation/Demand)** | Official docs + community/KB | Idea Portal `/idea`; title + 1–5 categories; per-business-area idea modules each with own table | `im_idea_core` extends task; `im_module`, `im_category` M2M; Demand `dmn_demand` with stakeholders + tasks | Draft→Submitted→Accepted→Closed-Complete (auto on demand completion) / Closed-Skipped; Demand: Screening→Qualified→Approved | Stakeholder assessments → Risk/Value/Size 1–10; Score=((10−Risk)+(10−Size)+Value)/3; Demand Workbench bubble chart | No idea merge — Closed-Skipped; Now Assist similar-demand detection | idea→demand→Project/Epic/Story/Change with parent-link traceability; auto close-complete on delivery | Now Assist: conversational demand creation, similar-demand, summarization | idea_admin / idea_manager / demand_manager roles; per-module portal config; assessment weight config | One triage surface (bubble chart + promote actions); lifecycle transparency back to submitter | Dual idea tables confuse admins; assessment-gated scoring stalls without fallback |
| **ClickUp (Forms/Ideas)** | Official help docs | Form view → task auto-created in triage List; conditional logic; email-to-list; Slack | Idea = task + custom fields (voting, formula, AI fields); custom task types (workspace-global) | Custom statuses per List (not per type); approvals via Automations only | Priority field + manual RICE via number+formula fields; Voting field | Native Merge Tasks — permanent, silently drops custom-field values; no intake-time dedupe | Move to sprint/List preserves record; Relationships for epic links | Brain/Brain²: AI fields, Q&A, Autopilot agents | Custom roles (Enterprise), custom-field permissions, archiving | Form submission = first-class record instantly; vote field + formula score in one record | Irreversible destructive merge; global task types without per-type lifecycles |

**Cross-product patterns Catalyst should adopt**: (1) evidence/insight objects attached to ideas (JPD/Productboard) — Catalyst already has `ph_idea_evidence`, underused; (2) conversion that preserves a live two-way link with delivery-progress rollback to the idea and submitter notification on ship (JPD/Aha!/ServiceNow); (3) weighted-driver configurable scoring rather than hardcoded formulas (Productboard/Aha!); (4) inbox-zero triage state; (5) AI as summarize/dedupe/draft assistant with human approval (all six).
**Cross-product patterns to avoid**: destructive/irreversible merge (ClickUp/Productboard), dual-taxonomy lifecycles (Planview/ServiceNow), assessment-gated scoring without manual fallback (ServiceNow), gamification theater (Planview), per-project idea silos (JPD).

---

## D. CATALYST FIT BLUEPRINT

**Where Ideation sits — validated answer**: Ideation is a **peer intake module linked to the hierarchy, not a level inside it**.

Evidence-based reasoning:
- The hierarchy registry (`ph_work_item_types`, `ph_hierarchy_parent_rules`) is a seeded, system-owned 6-level structure whose root is `business_request`. Inserting "Idea" as a new Level −1 would ripple through every parent rule, UWV query, and hierarchy consumer. No benchmark product places ideas inside the delivery tree either — all six keep them as a linked intake object with a conversion edge.
- `ph_ideas` already lives outside the hierarchy with a conversion pointer (`linked_initiative_id`, `converted_at/by`). The architecture exists; only the **target** is wrong (`ph_requests` instead of `business_requests`).
- STRATA↔BR linkage is unmodeled. Idea is the natural carrier: **Strategy element (theme) → Idea → Business Request → Milestone → Epic → …** closes the chain with two links (idea→strategy element, conversion→BR) instead of retrofitting the hierarchy.

Fit per platform surface:
- **Hierarchy/work items**: Idea is NOT a `ph_work_item_type`. Conversion creates a `business_requests` row via the existing `nextRequestKey()`/`generateIssueKey()` sequencing (precedent: [convertPage.ts](src/components/wiki-hub/convertPage.ts) BR branch, [ConversionDialog.tsx](src/components/incidents/ConversionDialog.tsx)).
- **Homepage**: ForYouPage tab/section precedent (`ReleaseOpsForYouSection`) → "My ideas / Ideas awaiting my review" section; `WidgetShell`/`MetricCard` for dashboard cards.
- **Admin**: new `/admin/ideation` section following `src/pages/admin/*` + per-module admin pattern (WorkHub admin pages).
- **Rules**: adopt the canonical workflow runtime (`ph_wf_*` + guard registry) for the Idea lifecycle instead of the current free-text `status` column — gives transitions, role gates, advisory/blocking enforcement, and `recordAdvisoryStatusChange()` audit for free.
- **Notifications**: emit the already-registered ProductHub `idea_*` triggers through `notificationTriggerService`; scheme-configurable channels/recipients.
- **Chat/AI voice**: Caty gains an `idea` persona (pattern: existing 7 personas); voice-flow capsule reused on the intake form; docintel ingests idea attachments.
- **Reports**: existing 9 `ph_ideas_*` views feed analytics; add dashboard widgets via WidgetShell.
- **CRUD/model/view-model**: refactor to the canonical layering — `src/modules/ideation/{types.ts, api/ideationApi.ts, hooks/, shared/}`; retire the dormant folder and dual hook sets (`useIdeation` vs `useIdeasHub`).
- **UI/UX**: JiraTable backlog, PragmaticBoard board, CatalystViewIdea detail, WSJFScoringModal for scoring, LinkSimilarItemsDialog extended to ideas — see §H.

---

## E. IDEATION OBJECT MODEL

Legend: ✅ exists in `ph_ideas` today · 🔧 exists but unused/mis-wired · ➕ new.

**Core**: ✅ `id`, `idea_key` (🔧 stubbed generation — adopt `generateIssueKey`-style sequencing), ✅ `title`, ✅ `description` (ADF), ✅ `idea_type` (Problem/Opportunity/Feature Request/Solution/Improvement), ✅ `priority` P1–P4, ✅ `source`, ✅ `department`, ✅ `tags[]`, ➕ `slug` (slug contract — trigger per releases precedent), ➕ `product_id` (scope parity with BRs), ✅ `submitted_by`, ✅ `assigned_to`, ✅ `assigned_team`, ➕ `sponsor_user_id`.

**Scoring**: ✅ RICE (`reach/impact/confidence/effort` → generated `rice_score`), ✅ WSJF (`business_value/time_criticality/risk_reduction/job_size` → generated `wsjf_score`), ✅ IMAC+CTF six factors → `impact_total`, ✅ investor-fit six factors, ✅ `custom_score`, ✅ `vote_count`/`vote_score` (+ `ph_idea_votes` weighted ±1), ✅ `ph_idea_scores` (score audit), ✅ `ph_idea_expert_reviews`. 🔧 All except `impact_total`/votes are UI-orphaned — surface via WSJFScoringModal pattern. ➕ admin-configurable scoring weights (see §I Q7).

**AI**: ✅ `ai_summary`, `ai_category`, `ai_tags[]`, `ai_duplicate_ids[]`, `ai_enrichment_status`; ➕ `ph_idea_ai_suggestions` table (suggestion lifecycle: id, idea_id, suggestion_type [classify|score|duplicate|mapping|brief|conversion_draft], payload jsonb, confidence numeric, evidence_refs jsonb, model/provider, status [proposed|accepted|edited|rejected|superseded], decided_by, decided_at, override_note) — this is the missing HITL/audit layer.

**Governance/lifecycle**: 🔧 `status` free text → ➕ `workflow_status_key` bridged dual-column (incident precedent) on `ph_wf_*` runtime; ➕ approval fields (`approved_by/at`, `rejected_reason`), ➕ `parked_until`; ✅ `is_deleted` soft delete; ➕ `archived_at`; ➕ lock semantics post-conversion (see §F).

**Traceability**: ➕ `strategy_element_id` FK → `strata_strategy_elements` (replaces free-text `theme` as the governed link; keep `theme` text as display cache), ✅ `innovation_drive_id`, ✅ `ph_idea_v2030_mappings`, ✅ `ph_idea_compliance_tags`, ✅ `ph_idea_evidence` (evidence_type, link_url, description — extend with `document_id` → docintel and `note` snippet per Productboard insight pattern).

**Conversion**: 🔧 `linked_initiative_id`/`converted_initiative_id` (redundant pair, points at `ph_requests`) → ➕ replace with `converted_business_request_id` FK → `business_requests` + ➕ `business_requests.source_idea_id` backlink (or a `ph_idea_conversions` link table if multi-target conversion is ever needed); ✅ `converted_at`, `converted_by`; ➕ `conversion_mode` ('manual'|'ai_assisted').

**Duplicate/merge**: ✅ `parent_idea_id` (unused), ✅ `ai_duplicate_ids[]`; ➕ `merged_into_id` + `merged_at/by` + non-destructive semantics: losing idea → status `Merged`, votes/comments/evidence re-pointed or aggregated on winner, full record retained (explicit rejection of the ClickUp/Productboard destructive pattern).

**Audit**: ✅ `ph_idea_audit_log` (action, changed_fields, changed_by) — ➕ UI via ActivityPanel; ➕ every AI suggestion decision also lands here; ✅ `created_at/updated_at`.

**Reporting**: ✅ `roadmap_quarter`, `is_committed`, 6 milestone dates, `target_release_date`; ✅ 9 analytics views; ➕ time-in-status (derivable from audit log).

---

## F. LIFECYCLE & GOVERNANCE

**Statuses** (existing set, extended): `Draft → Submitted → Under Review → Enriched* → Prioritized* → Approved | Rejected | Parked* | Merged* → Converted to Request` (*new). Recommendation: keep the shipped 6-status spine and add `Parked` and `Merged`; model `Enriched`/`Prioritized` as **guard-verified gates on Under Review → Approved** rather than extra statuses (avoids Planview's dual-taxonomy trap; the workflow runtime's guard registry is built for exactly this — e.g. new guards `score_present`, `duplicate_check_complete`, `strategy_link_present`).

**Transitions & rules** (on `ph_wf_*` canonical runtime, advisory→blocking per-project via `ph_wf_enforcement_config`):
- Draft→Submitted: submitter only; title+description+type required.
- Submitted→Under Review: reviewer/moderator role.
- Under Review→Approved: guards `score_present`, `duplicate_check_complete`; approver role; reason optional.
- Under Review→Rejected: reason **required** (`comment_required` guard exists).
- Any pre-conversion state→Parked: reason + optional `parked_until`; auto-notify submitter.
- Under Review→Merged: only via merge flow; winner recorded; reversible within audit view.
- Approved→Converted: **human-only action** through the conversion wizard; creates BR; terminal.

**Lock points**: `Converted` and `Merged` are terminal and **read-only except comments** (enforced in RLS + service layer, not just UI). Post-conversion, the idea renders a live BR status rollup (JPD pattern) — submitters keep visibility without edit rights. `Rejected`/`Parked` are re-openable by reviewer+ roles (audited). Archive (`archived_at`) hides from default views after N days terminal (admin-configurable); delete remains soft (`is_deleted`) and admin-only.

**Duplicate merge**: non-destructive (see §E). Merge proposal can originate from AI (`ai_duplicate_ids`) but executes only on human confirmation with a preview diff of what transfers.

**Conversion to Business Request**: wizard pre-fills BR from idea + AI brief (title, description, request_type, category, theme/strategy link, urgency from priority, stakeholders); `request_key` via existing MIM-N sequencing; writes `converted_business_request_id` + `business_requests.source_idea_id`; emits `idea_converted` notification to submitter, voters, watchers; idea locks.

---

## G. AI CAPABILITY BLUEPRINT — Idea-to-Business-Request Copilot

**User journey**: (1) User submits raw input — typed text, Caty chat (`idea` persona), voice (voice-flow capsule → `voice-transcribe`), meeting notes/document/screenshot (docintel ingest) — or opens the Copilot on an existing idea. (2) Copilot returns a structured, fully editable proposal panel. (3) User accepts/edits/rejects each suggestion block. (4) If recommendation is "convert" and idea is Approved, user launches the conversion wizard with the AI-drafted BR pre-filled. (5) Human confirms; BR created; idea locks; everything audited.

**Input sources** (all existing primitives): text; chat-v2/Caty; voice-flow; docintel documents (PDF/XLSX/PNG/JPEG, AR/EN); pasted screenshots via `supabaseImageUpload` + docintel.

**Pipeline** (new edge function `ai-idea-copilot`, on `_shared/llm.ts` gateway):
1. **Classify** → idea_type, category, department (schema-validated JSON output — gateway already supports JSON schema).
2. **Brief** → structured idea brief (problem, proposed value, impacted users/teams, dependencies) stored as suggestion, never silently written to `description`.
3. **Duplicates** → embed via `embed()`; pgvector similarity over `ph_ideas` (+ optionally `business_requests`) with permission-scoped filtering; UI reuses LinkSimilarItemsDialog pattern; writes `ai_duplicate_ids` + suggestion row.
4. **Mapping** → candidate links to strategy elements, existing BRs/epics/features via `ai-search-issues`/`ai-similar-items` precedents; each with evidence snippet + confidence.
5. **Scoring suggestion** → proposed RICE/WSJF/IMAC values with one-line rationale each; user edits in WSJFScoringModal.
6. **Recommendation** → one of reject/merge/enrich/park/approve/convert + rationale + confidence.
7. **BR draft** → scope, objectives, success metrics, assumptions, risks, acceptance criteria, linked evidence — mapped to `business_requests` columns + description ADF.

**Output contract**: every block = `{value, confidence (0–1), evidence_refs[], model, prompt_version}` persisted to `ph_idea_ai_suggestions` with status `proposed`. UI shows confidence lozenge + expandable evidence (source doc page / similar item key / vote data). Low-confidence (< admin threshold) blocks render collapsed with a warning, never auto-applied.

**Human approval**: mandatory. The Copilot **never** creates/updates/converts/merges — it only writes suggestion rows. Apply actions are user mutations that copy suggestion→field and flip suggestion status to `accepted`/`edited` (with diff). Conversion additionally requires Approved status + converter role + wizard confirmation. A future admin rule permitting auto-actions must be an explicit `ph_wf_*`/admin setting, default OFF.

**Rule-engine gates**: conversion wizard checks workflow guards (`score_present`, `duplicate_check_complete`, `strategy_link_present`) before enabling Create; enforcement mode per project.

**Audit**: every pipeline run → `ai_usage_log` (call-level, exists); every suggestion + human decision → `ph_idea_ai_suggestions` + `ph_idea_audit_log` (lifecycle-level, new); conversion → BR audit (`business_request_audit_logs` exists).

**Failure handling**: provider failover is built into the gateway (3 providers, retries); on total failure the intake form degrades to plain manual submission (never blocks intake); enrichment is async (`ai_enrichment_status` = pending/processing/complete/failed already modeled); stale suggestions superseded on re-run.

**Admin controls**: enable/disable Copilot per org/module; per-capability toggles (classify/dedupe/score/draft); confidence threshold; role-based AI access (reuse Caty's minRole pattern); prompt template versioning (store `prompt_version` on suggestions; templates in a versioned config table following STRATA's GovernedEnvelope pattern).

**Safety**: permission-scoped retrieval (dedupe/mapping queries respect RLS via user-context queries, not service-role bypass); PII — idea content stays in-tenant Supabase, provider calls carry only necessary context; hallucination controls — schema-validated outputs, evidence-required for mapping suggestions (no evidence → suggestion dropped), refuse-below-threshold; bilingual behavior — AR input supported via docintel/voice pipelines, output language mirrors input.

**Evaluation**: golden set of ≥50 historical ideas with known duplicates/conversions; measure dedupe precision/recall, classification accuracy, BR-draft field completeness; regression suite re-run on prompt/model change (store eval runs keyed by `prompt_version`); target thresholds are acceptance criteria (§L).

---

## H. UX/UI BLUEPRINT (canonical components only)

| Surface | Canonical base | Status |
|---|---|---|
| Ideation landing | Existing `/ideation/backlog` (BacklogPage adapter + JiraTable) + stats bar | Exists — polish |
| Intake form | `IdeationCreateWizard` (multi-step, validation) + `EpicDescriptionEditor` + `VoiceMicButton`/voice capsule + docintel upload via `CatalystAttachmentsPanel` | Exists — add voice/doc inputs |
| List/table | JiraTable with idea columns (key, summary, type, status, priority, votes, impact, assignee, quarter, actions) via `field-registry.ts` extension | Exists — add vote/impact cells |
| Board | `IdeasBoardPage` on KanbanBoardShell/PragmaticBoard | Exists |
| Prioritization matrix | `IdeationMatrixView` (impact×complexity quadrants) + `WSJFScoringModal` for editing | Exists — wire scoring modal |
| Idea detail | `CatalystViewIdea` on CatalystViewBase: Details / Description / Activity (ActivityPanel + audit log) / Attachments / Links / **AI Insights** tab | Exists — add AI tab + audit feed |
| AI assistant panel | Caty panel pattern (`caty-ai/`) + suggestion blocks with confidence Lozenge + accept/edit/reject buttons | **New composition** of existing parts |
| Voice capture | `VoiceFloatingCapsule` + `ComposerGhostText` in intake form | Exists — mount |
| Duplicate panel | `LinkSimilarItemsDialog` extended to `ph_ideas` + merge-preview dialog (ConfirmDialog pattern) | Extend |
| Conversion wizard | Modal.Dialog multi-step (CreateBusinessRequestModal as target-shape reference) with AI-draft prefill + guard checklist | **New (gap)** — no canonical wizard for cross-entity conversion; flag: build from Atlaskit ModalDialog + existing form fields |
| Dashboard widgets | `WidgetShell` + `MetricCard` (funnel, top ideas, my ideas); ForYou section per `ReleaseOpsForYouSection` precedent | New composition |
| Admin screens | `src/pages/admin/` pattern: categories/themes, scoring weights, statuses/workflow (Workflow Studio), AI settings, permissions | **New pages**, canonical layout |
| Empty/error/loading | EmptyBoardState, ErrorBoundary, LoadingSkeleton | Exists |
| Iconography | `icons.registry.ts` — add idea-type + source icons (@atlaskit set) | Extend |

**Non-canonical gaps flagged** (no canonical component exists; each needs explicit approval or Atlaskit primitive composition): `IdeaVoteButton` (numeric vote toggle — ReactionBar is emoji-only), `QuarterBadge` (tokens exist in ideation-data.ts, no component), `IdeaImpactBadge` (read-only score chip), `SourceIcon`, conversion wizard shell, AI suggestion block (confidence + evidence + accept/edit/reject). All colors via `--ds-*` tokens / component-owned colors only; AI CTA uses `AIIntelligenceButton` (already the trigger on ideation pages).

**Bilingual/RTL/dark/mobile**: AR columns + `detectScript` exist but ideation UI is EN-only — dossier flags EN/AR labels + RTL mirroring as required work; dark mode comes free from ADS tokens **if** the module stays outside AstryxZone (Astryx is light-mode-first; ideation pages are currently NOT Astryx-wrapped — recommend keeping them pure-ADS and revisiting Astryx only when its dark mode ships); tablet/iPad: JiraTable density modes + board horizontal scroll are the canonical answers; matrix view needs a touch-target pass.

---

## I. THE 10-QUESTION GRILLING

**Q1. Why a separate module instead of a BR field/intake form?**
*Why it matters*: wrong answer = duplicate intake surfaces and governance debt. *Catalyst evidence*: BRs are Level-0 delivery-committed objects with a 22-column slimmed schema and `process_step` workflow; ideas carry pre-commitment data (votes, RICE/WSJF/IMAC, AI enrichment, evidence, expert reviews) that was deliberately **removed** from BRs in the 108→22 column slim-down. *External*: all six products separate raw demand from committed demand (JPD idea vs delivery ticket, ServiceNow idea vs demand, PB note/insight vs feature). *Answer*: separate module; BR stays clean. *AI implication*: AI triage needs the noisy pre-commitment corpus to learn/dedupe against without polluting BR reporting. *Implementation*: revamp existing `/ideation` hub. *Risk if ignored*: BR table re-bloats; funnel metrics (submitted→converted) become unmeasurable.

**Q2. Between Strategy and BR, or linked intake outside the hierarchy?**
*Why*: determines whether we touch the seeded hierarchy registry. *Catalyst evidence*: `ph_hierarchy_parent_rules` is a system-seeded pairwise matrix; `ph_ideas` already sits outside with conversion pointers; Strategy↔BR link is unmodeled. *External*: no benchmark product puts ideas inside the delivery tree. *Answer*: **linked intake object, conceptually between Strategy and BR** — carries `strategy_element_id` upward and `converted_business_request_id` downward; never a `ph_work_item_type`. *AI implication*: mapping suggestions target links, not parents. *Implementation*: 2 FKs + backlink, zero hierarchy-registry changes. *Risk*: inserting a level breaks every hierarchy consumer (UWV, work-tree, parent rules).

**Q3. Idea object model?**
*Why*: field sprawl vs missing governance fields. *Catalyst evidence*: `ph_ideas` already has ~60 columns incl. 4 scoring systems; satellites for votes/comments/evidence/reviews/audit. *External*: JPD (insights as evidence), Aha! (proxy votes), PB (weighted drivers). *Answer*: §E — keep schema, add slug, sponsor, strategy FK, conversion FK correction, suggestion table, merge fields; **surface** the orphaned scoring fields rather than adding new ones. *AI implication*: `ph_idea_ai_suggestions` is the one genuinely new AI structure. *Implementation*: small migration set, no rebuild. *Risk*: adding a 5th scoring system before surfacing the 4 that exist.

**Q4. Lifecycle?**
*Why*: governance backbone. *Catalyst evidence*: shipped 6-status spine; canonical workflow runtime with 18 guard types and enforcement config exists and is unused by ideation. *External*: ServiceNow's Draft→Submitted→Accepted→Closed; PB inbox-zero; Planview's dual taxonomy as anti-pattern. *Answer*: §F — 6-status spine + Parked + Merged, with Enriched/Prioritized as transition guards not statuses. *AI implication*: recommendation output maps 1:1 to transitions. *Implementation*: bridge `status` → `workflow_status_key` (incident dual-column precedent). *Risk*: hand-rolled status machine drifts from Workflow Studio and can't be admin-configured.

**Q5. CRUD/locking/merge/duplicate/archive/reopen/delete rules?**
*Why*: the current module fails exactly here (merge UI without backend, no locks). *Catalyst evidence*: soft delete exists; audit table exists; no lock enforcement; `parent_idea_id` unused. *External*: destructive merges are the #1 trust-killer (ClickUp, PB legacy). *Answer*: §F lock table + non-destructive merge with preview; reopen audited; delete soft + admin-only. *AI implication*: AI may propose merges, never execute. *Implementation*: merge mutation + RLS lock policies + service-layer checks. *Risk*: converted ideas silently edited → BR and idea diverge → traceability lies.

**Q6. Linking to Strategy/Initiative/BR/Epic/Feature/Story/Releases/reports?**
*Why*: traceability is the module's raison d'être. *Catalyst evidence*: link-table precedents (`business_request_milestone_links`, `task_work_item_links`, `kb_document_links`); STRATA elements exist; BR→feature JSONB links. *Answer*: upward `strategy_element_id`; downward `converted_business_request_id` (+ BR backlink); indirect Epic/Feature/Story/Release traceability **through** the BR (idea→BR→milestone→epic chain already modeled); related-items via a typed `ph_idea_links` table only if non-conversion links prove needed (defer). Reports read the chain. *AI implication*: mapping suggestions constrained to these link types. *Implementation*: 2 columns + 1 backlink now. *Risk*: direct idea→story links bypass BR governance and create shadow demand.

**Q7. Admin controls?**
*Why*: enterprise parity (every benchmark has idea_admin-grade config). *Catalyst evidence*: admin pattern exists (`AdminAccessPage`, FieldRegistry, Workflow Studio); STRATA's GovernedEnvelope for versioned config; **no ideation admin exists**. *Answer*: `/admin/ideation`: categories/themes mapping to strategy elements, scoring weights (which systems visible + driver weights), workflow/statuses via Workflow Studio, conversion rules (required guards), AI settings (toggles, thresholds, prompt versions), role permissions, intake templates. *AI implication*: admin owns AI on/off + thresholds. *Implementation*: config tables with GovernedEnvelope, admin pages on canonical layout. *Risk*: hardcoded weights (current state: formulas baked into generated columns) can't fit ministry-specific IMAC governance.

**Q8. Notifications/chat/voice/comments/mentions/watch/audit events?**
*Why*: submitter trust = close-the-loop (Aha! evidence). *Catalyst evidence*: `idea_*` triggers already registered in notificationEvents.ts ProductHub set but never emitted; scheme service supports channels/recipients; CommentEditor supports mentions; watch/subscribe pattern exists in notification prefs; `ph_idea_comments` exists. *Answer*: emit created/status_changed/commented/mentioned/vote-milestone/converted/rejected(with reason)/parked/merged; watchers = submitter+voters+explicit; Caty idea persona; voice on intake + comments. *AI implication*: `ai_insight_generated` event type already exists for suggestion-ready pings. *Implementation*: emission calls in service layer + scheme defaults. *Risk*: ideas as a black hole → intake dries up (the classic ideation-module death).

**Q9. Premium canonical UI required?**
*Answer*: §H table — 80% exists (backlog/board/matrix/detail/create wizard/analytics); genuinely new: AI suggestion panel, conversion wizard, admin screens, vote button, merge preview. *Catalyst evidence*: component inventory (§B). *External*: ServiceNow single-triage-surface, PB progressive disclosure. *AI implication*: suggestion block becomes a reusable canonical component for future AI features. *Implementation*: compose from Atlaskit + existing; flag the 6 non-canonical gaps for approval. *Risk*: hand-rolling any of these violates the operating contract.

**Q10. Biggest blind spots?**
*Answer*: §J register. Top five: (1) conversion mis-target `ph_requests` vs `business_requests` — silently corrupts the whole traceability story; (2) zero AI suggestion-lifecycle audit — the copilot is un-shippable under the contract without it; (3) no permission registration — `/ideation` is reachable by any authenticated user today (ModuleGuard key `ai_features` gates AI, not ideation-as-module); (4) merge façade — UI implies a capability that doesn't exist; (5) EN-only/no-RTL on a bilingual (AR-first ministry) platform with AR voice+docintel already shipped.

---

## J. BLIND SPOTS & RISK REGISTER

| # | Area | Blind spot | Sev | Impact | Recommendation | Owner area | Acceptance criterion |
|---|---|---|---|---|---|---|---|
| 1 | Data model | Conversion writes to `ph_requests`, not canonical `business_requests`; redundant `linked_initiative_id`/`converted_initiative_id` pair | **Critical** | Traceability chain broken at its keystone; funnel metrics wrong | Retarget conversion; migrate/backfill; drop redundant column | Backend | Converting an idea creates a `business_requests` row (MIM-N) with `source_idea_id`; old pointers migrated |
| 2 | AI governance | No suggestion-lifecycle audit (only call-level `ai_usage_log`); no HITL surface | **Critical** | Violates "every AI action creates an audit event"; copilot unshippable | `ph_idea_ai_suggestions` + decision audit | AI/Backend | 100% of suggestions have persisted status + decider + timestamp |
| 3 | Permissions | Ideation not in `admin_role_module_permissions`; no module key; RLS on `ph_ideas` not verified against role model | **High** | Unscoped access to pre-decision demand data | Register module; ModuleGuard with own key; RLS review | Security | Access matrix test passes per role |
| 4 | Governance | Free-text `status`, no workflow runtime, no lock enforcement post-conversion/merge | High | Silent edits to terminal ideas; no admin-configurable transitions | Bridge to `ph_wf_*`; RLS lock policies | Backend | Terminal ideas reject non-comment mutations at DB level |
| 5 | Duplicates | Merge UI with no backend; `ai_duplicate_ids` never actioned | High | Feature façade; duplicate pollution | Non-destructive merge mutation + preview | Backend/UX | Merge transfers votes/evidence, retains loser read-only |
| 6 | Strategy link | `theme` free text; no STRATA FK anywhere | High | "Between Strategy and BR" claim is currently fiction | `strategy_element_id` FK + admin theme mapping | Backend | Idea→strategy element→BR chain queryable |
| 7 | i18n/RTL | Ideation UI EN-only; no AR labels; RTL untested | High | Ministry AR users excluded despite AR voice/docintel existing | EN/AR labels via LanguageContext; RTL pass | Frontend | AR locale renders RTL with translated labels |
| 8 | Notifications | Registered `idea_*` events never emitted; no watch on ideas | Med-High | Submitter black hole; intake decay | Emit via trigger service; watcher rows | Backend | Status change notifies submitter+watchers per scheme |
| 9 | Scoring | RICE/WSJF/investor-fit stored, generated, never shown; weights hardcoded in generated columns | Med | Prioritization theater; admin can't tune | Surface via WSJFScoringModal; admin weights (recompute strategy needed for generated cols) | Product/Backend | Reviewer can score in UI; weights admin-editable |
| 10 | Testing | 1 adapter test; zero conversion/vote/merge/AI tests; no E2E | Med-High | Regressions invisible in the module's core flows | Test pyramid incl. conversion + AI eval suite | QA | CI covers convert/merge/lock paths |
| 11 | Performance | Backlog loads all ideas unpaginated; embedding search unindexed for ideas | Med | Degrades at enterprise volume | Pagination/virtualization (JiraTable hooks ready); pgvector index | Backend | 10k-idea backlog p95 < 2s |
| 12 | Keys/slugs | `idea_key` generation stubbed; no slug column (slug contract violation for any new detail route) | Med | Collision risk; contract breach | Sequencer per `generateIssueKey`; slug trigger | Backend | Unique keys under concurrent create; slug routes |
| 13 | Audit UX | `ph_idea_audit_log` invisible | Med | Governance claims unverifiable by users | ActivityPanel audit feed on detail | Frontend | History tab shows field-level changes |
| 14 | Module hygiene | Components in `modules-dormant/`, dual hook sets, dead export button, unused PPTX service | Med | Maintenance drag, confusion | Consolidate to `src/modules/ideation/` canonical layout | Frontend | Single hook/service layer; no dormant imports |
| 15 | Astryx | CLAUDE.md scopes Astryx to Ideation but pages aren't wrapped; Astryx lacks dark mode | Low-Med | Design-system ambiguity | Decide: stay pure-ADS (recommended) or wrap when Astryx dark ships | Design | Written decision in 09_DECISIONS |
| 16 | Reporting | Analytics views exist but no home/dashboard widgets; no export | Low-Med | Exec invisibility | WidgetShell cards + CSV export (fix dead button) | Frontend | Funnel widget on ForYou/dashboard |
| 17 | Production | `ENABLE_AI` gates the whole module — AI outage or flag-off kills non-AI ideation | Med | Availability coupling | Separate `ideation` module flag from AI capability flags | Platform | Module usable with AI disabled |

---

## K. BUILD / REUSE / REVAMP ADVISORY

**Verdict: REVAMP EXISTING.**

- **Not Build New**: `ph_ideas` + 8 satellites + 9 views + 6 working pages + a 28.5KB canonical detail view + funnel analytics + a proven (if mis-targeted) conversion flow already exist and are production-wired. Rebuilding duplicates ~70% of shipped capability and violates the reuse-or-merge rule.
- **Not Reuse as-is**: five Critical/High defects (§J 1–7) mean the module currently cannot honor the governance contract it exists to provide — wrong conversion target, no AI audit layer, no permission registration, no lock enforcement, fictional strategy linkage.
- **Not Merge/Decommission**: no other Catalyst module owns pre-commitment demand; BRs deliberately shed these fields in the 2026-06 slim-down; external benchmarks unanimously keep the layer separate.

**Revamp scope (ordered, each a ≤2h-sliceable track)**: (1) conversion retarget + backlink migration; (2) permission/module registration + RLS review; (3) workflow-runtime adoption + locks; (4) strategy-element FK + admin theme mapping; (5) merge backend; (6) notification emission; (7) scoring surfacing + admin weights; (8) AI Copilot suggestion layer (`ai-idea-copilot` + `ph_idea_ai_suggestions` + panel); (9) conversion wizard; (10) i18n/RTL + widgets + tests + module-hygiene consolidation.

---

## L. ACCEPTANCE CRITERIA (condensed; each is binary-verifiable)

**Functional**: create/read/update/soft-delete idea via canonical layers; intake via form, chat, voice, document; vote (one weighted vote/user, toggleable); threaded comments with mentions; evidence attach (link, doc, snippet); search + filter by status/type/theme/quarter/assignee.
**Lifecycle**: only §F transitions possible; rejected requires reason; parked supports `parked_until`; terminal states read-only except comments, enforced at RLS; reopen audited.
**Traceability**: idea→strategy element queryable; conversion produces BR with `source_idea_id`; idea detail shows live BR status; strategy→idea→BR→epic chain resolvable in one query path.
**Work-item linking**: no idea appears in `ph_work_item_types` or hierarchy views; downstream links only via BR.
**Admin/rules**: module access per role via `admin_role_module_permissions`; statuses/guards editable in Workflow Studio; scoring weights, categories→strategy mapping, AI toggles, thresholds admin-configurable; config changes versioned (GovernedEnvelope).
**AI capability**: copilot produces classify/brief/duplicates/mapping/scores/recommendation/BR-draft blocks; every block carries confidence + evidence; dedupe precision ≥0.8 / recall ≥0.7 on golden set; BR draft fills ≥90% of required BR fields.
**AI safety/audit**: zero AI-initiated writes to domain tables; every suggestion + decision persisted with decider; retrieval permission-scoped (verified by cross-role test); AI-off fallback keeps full manual flow; provider failover tested.
**UI/UX/design system**: all listed surfaces on canonical components; zero new hex/rgb/Tailwind colors (`npm run lint:colors:gate` passes); non-canonical gaps built only with explicit approval; screenshot signoff per operating contract.
**Notifications/chat/voice**: §F events emitted through trigger service and scheme-configurable; Caty idea persona answers idea-context queries; voice dictation works in intake and comments (AR + EN).
**Data/model/API**: slug column + trigger; race-safe `idea_key` sequencing; RLS on all idea tables; migrations 1:1 with ledger; no `:id` route params (slug/key only); route builders registered in `routes.ts`.
**Reporting**: funnel, status distribution, theme conversion, time-to-convert widgets render from existing views; CSV export works.
**Permissions/security**: role matrix (submitter/reviewer/approver/admin) enforced in UI and RLS; converted-idea immutability penetration-tested; AI suggestions invisible to roles without idea access.
**Accessibility/dark/RTL**: WCAG AA on new surfaces; dark mode token-clean; AR locale fully translated + RTL-mirrored; keyboard-navigable board/matrix.
**Automated tests**: unit (services, guards, merge), integration (conversion, locks, notifications), adapter tests (board/table), AI eval + regression suite keyed to prompt versions; all in CI.
**Production readiness**: module flag decoupled from `ENABLE_AI`; pagination at 10k ideas p95 <2s; error states on every async surface; audit log UI; rollout behind flag with UAT screenshot acceptance.

---
*End of dossier. Benchmark rows for Jira Product Discovery and Aha! Ideas were compiled from official Atlassian/Aha! documentation via the research lane; if the dedicated JPD/Aha! sub-reports land after this file, their citations will be appended to §C.*
