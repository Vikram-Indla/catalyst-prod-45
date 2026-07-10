# IDEATION — ELITE DESIGN BLUEPRINT (Design Pack v1)

> Companion to `03_GREENFIELD_REBUILD_BLUEPRINT.md` (architecture of record). This pack adds what 03 lacks: verdict, prioritized feature inventory, mock screen pack, visual direction + icon decision, native-fit proof, AI blueprint detail, 9-phase build plan, greenfield safety, blind spots, and binary acceptance criteria.
> Research only. No code. Every claim cites Catalyst evidence (file:line) or benchmark evidence (official docs, gathered 2026-07-09); unverifiable claims are marked **Not Confirmed** with a discovery action.

---

## A. VERDICT

**Does `03_GREENFIELD_REBUILD_BLUEPRINT.md` prove an elite/premium Ideation? Not yet.** It is architecturally sound (schema, lifecycle, AI governance, conversion seam) but fails the "premium proof" bar on six counts, all closed by this pack:

| # | Gap in 03 | Closed by |
|---|---|---|
| 1 | No screen-level specs — surfaces named, never designed | §C (11 mock screens) |
| 2 | No prioritized feature inventory with evidence + criteria | §B |
| 3 | No visual direction (type, spacing, density, motion, microcopy) and no icon decision | §D |
| 4 | Native fit asserted, not proven — shell/nav/create-menu/icon-registry integration points uncited | §E.1 native-fit proof table (new evidence: `HubSwitcher.tsx:72`, `CatalystShell.tsx:242,416-420`, `icons.registry.ts:371-392`, `ContextSwitcher.tsx:600-605`) |
| 5 | Build sequence had phases but no exit criteria, screenshot lists, tests, risks, rollback per phase | §G |
| 6 | No mobile/iPad spec, no blind-spot register for the rebuild itself | §C.11, §I |

**New shell evidence found this pass (changes the plan)**: the platform *already reserves an Ideation seat* — hub icon assets ([icons.registry.ts:148,159,371-392](src/components/icons/icons.registry.ts) → `assets/icons/hubs/ideation.svg` + outline), a HubSwitcher DISCOVER entry (`Home, Strategy, Ideation` — [HubSwitcher.tsx:9,72](src/components/layout/HubSwitcher.tsx), currently `deprecated: true, moduleKey: 'product'`), CatalystShell ideation route detection + hub-home map ([CatalystShell.tsx:127-130,242,416-420](src/components/layout/CatalystShell.tsx)), and a legacy `IdeationSidebar.tsx` whose header comment *documents the peer-hub rationale* ("Ideas are organization-wide intake. Product affinity is decided at the conversion wizard"). The rebuild re-uses these **shell seats** (they are platform chrome, not ideation inventory) with a new sidebar config, un-deprecates the HubSwitcher entry, and repoints `moduleKey` to the new `ideation` key.

---

## B. FEATURE INVENTORY (P0 = launch-blocking · P1 = fast-follow · P2 = later)

| P | Feature | User value | Benchmark evidence | Catalyst evidence | AI role | Cx | Done criterion |
|---|---|---|---|---|---|---|---|
| P0 | Single-screen idea submit (form) | Zero-friction capture | ClickUp form→task instant record (help.clickup.com 6310233090711); ServiceNow title+categories minimal portal | `?create=1` deep-link convention [ContextSwitcher.tsx:600-605]; ADF editor exists [EpicDescriptionEditor] | Post-submit enrichment only | S | Submit ≤3 required fields; idea visible in Inbox <2s |
| P0 | Triage Inbox (queue + preview) | Inbox-zero screening | Productboard Unprocessed/Processed (support 360056318634); ServiceNow Closed-Skipped economics | JiraTable compact + detail-pane pattern [IssueDetailPane] | Suggestions ready badge | M | Untriaged count visible; j/k keyboard; decline-with-reason inline |
| P0 | Explore table | Findability at scale | JPD idea list views | JiraTable canonical [src/components/shared/JiraTable/] | — | S | Sort/filter/saved-filter; 10k rows paginated p95<2s |
| P0 | Idea detail page | Single source of truth | All 6 benchmarks | CatalystViewBase [catalyst-detail-views/shared/] | AI panel mount | M | All §C.4 zones render; slug route |
| P0 | Lifecycle on workflow runtime + locks | Governance without custom code | ServiceNow demand states | `ph_wf_*` runtime, 18 guards [workflow/canonical/runtime.ts:19-47] | Recommendation maps to transitions | M | Transitions role-gated; terminal RLS-locked |
| P0 | Votes with importance (1–4) | Demand signal beyond +1 | Productboard 4-level importance (support 15692165775379) | ReactionBar precedent is emoji-only → new control (§D gap) | Vote data feeds scoring driver | S | 1 vote/user; importance editable; milestone notify |
| P0 | Comments + mentions + watchers | Collaboration + loop-closing | Aha! portal comment loops | ActivityPanel/CommentEditor [catalyst-ds/activity/, comments/] | — | S | Mention notifies; watcher rows on submit/vote |
| P0 | Evidence objects (snippet/doc/link/voice) | Decisions cite sources | Productboard insights (support 360056354314); JPD insights | docintel `ai_documents` [docintel-ingest]; attachments panel | Transcripts auto-attach as evidence | M | Evidence list on detail; doc page-refs resolvable |
| P0 | Governed scoring framework (models/drivers/rubrics) | Admin-tunable prioritization | Productboard weighted drivers (support 28306158464787); Aha! scorecards; ServiceNow assessment weights | GovernedEnvelope pattern [strata/types.ts]; WSJFScoringModal as editor-UX reference | Score suggestions per driver | L | Weights admin-editable; versioned; totals recompute |
| P0 | Conversion wizard → business_requests | The one governed exit | JPD idea→delivery link; ServiceNow idea→demand→artifact | `business_requests` L0 root [work_item_type_registry.sql]; MIM-N sequencing [convertPage.ts:63-79]; CreateBusinessRequestModal field shape | BR draft prefill | L | BR created w/ `source_idea_id`; idea locks; both keys shown |
| P0 | Notifications (IdeationHub event set) | Submitter trust | Aha! ship-notification close-loop | Trigger service + schemes [notificationTriggerService.ts] | `ai_insight_generated` type exists [notifications.ts] | M | 100% terminal decisions notify with reason |
| P0 | Permissions + module registration | Enterprise access control | PB 4-role + custom field roles | `admin_role_module_permissions`, ModuleGuard [useModuleAccess.ts:174-258] | AI access follows role | M | Role matrix test green |
| P0 | Admin: scoring models + intake config + AI toggles | Governance ownership | ServiceNow idea_admin; PB item customization | Admin page pattern [pages/admin/AdminAccessPage.tsx:114-150] | Threshold + per-capability toggles | M | Config changes audited (GovernedEnvelope) |
| P1 | AI Copilot: classify/summarize/duplicates/mapping | Triage at 10× speed | PB AI dedupe+auto-link (support 15113485128467); Now Assist similar-demand | Gateway [_shared/llm.ts]; `ai-similar-items` precedent; pgvector | Core | L | Suggestion ledger 100% audited; eval gates pass |
| P1 | AI BR-draft generation | Minutes-not-days conversion | Now Assist demand creation (docs xanadu now-assist-spm) | BR column map [types/business-request.ts] | Core | M | Draft fills ≥90% required BR fields |
| P1 | Non-destructive merge + preview | Duplicate hygiene w/o data loss | Anti-pattern: ClickUp irreversible merge (help 6309881445399); Planview consolidate-with-backlinks | ConfirmDialog family [catalyst-detail-views/shared/] | Duplicate suggestions feed it | M | Votes/evidence transfer; loser read-only |
| P1 | Portfolio decision field (value/effort) | One triage surface for leadership | ServiceNow Demand Workbench bubble chart (docs c_DemandWorkbenchBubbleChart) | No canonical chart — flagged gap (§D) | Score positions plotted | M | Inline approve/decline from quadrant |
| P1 | Voice + chat intake channels | Capture at speed of speech | — (Catalyst differentiator) | voice-flow + `voice-transcribe` (AR/EN) [features/voice-flow/]; Caty personas [caty-assistants.ts] | Transcription→classification | M | AR+EN dictated idea lands as Draft w/ transcript evidence |
| P1 | Homepage widgets + ForYou section | Exec + personal visibility | PB Insights-trends digest | WidgetShell/MetricCard [product-dashboard/, dashboard/]; ReleaseOpsForYouSection precedent | — | S | Funnel widget + "waiting on you" section live |
| P1 | Delivered auto-close + rollup | Traceability both ways | ServiceNow auto Closed-Complete; JPD delivery progress on idea | BR `process_step` (**event source Not Confirmed** — discovery: verify BR update hooks) | — | M | BR terminal → idea Delivered ≤5min |
| P1 | AR/RTL full surface | KSA-first platform | — | `name_ar` convention, `detectScript` [lib/i18n/]; AR voice+docintel shipped | AR output mirrors input | M | RTL screenshot pass all screens |
| P2 | Docintel bulk intake (upload deck → ideas) | Workshop capture | PB note→many insights | docintel pipeline wired | Segmentation + per-idea drafts | L | 1 doc → n draft ideas w/ page evidence |
| P2 | Idea campaigns (time-boxed challenges) | Focused solicitation | Planview Challenges vs Communities (success.planview 81_Configuring_Challenge_Phases) | None — new concept | Theme clustering | L | Campaign filter + close-out report |
| P2 | Public/portal intake + CSV import | External stakeholders | Aha! portals; PB portal | No inbound-email/portal infra — **Not Confirmed**; discovery: platform decision | — | L | Deferred |
| P2 | Pairwise/crowd ranking | Low-fatigue crowd signal | Planview pairwise sets of 15 | None | — | M | Deferred |

---

## C. MOCK SCREEN PACK

Conventions for all screens: shell = CatalystShell + Ideation sidebar seat (evidence §A); header = HubPageHeader pattern [layout/HubPageHeader.tsx]; all colors `var(--ds-*)`; empty/loading/error = EmptyBoardState / LoadingSkeleton / ErrorBoundary; AI trigger = `AIIntelligenceButton` (sanctioned rainbow CTA). Personas: **Sara** (submitter, any role), **Omar** (reviewer/triage owner), **Huda** (approver/portfolio lead), **Adel** (ideation admin).

### C.1 Landing — Triage Inbox (`/ideation`)
**Goal**: reviewer reaches inbox-zero; every idea gets a decision or an owner. **Persona**: Omar. **Data**: `idn_ideas` where stage ∈ {Submitted, Screening} + `idn_ai_suggestions` ready-flags.
```
┌─ Sidebar ─┬──────────────────────────────────────────────────────────────┐
│ Inbox •12 │ Ideation · Inbox                      [Filters] [+ New idea] │
│ Explore   ├───────────────────────────────┬──────────────────────────────┤
│ Portfolio │ QUEUE (JiraTable compact)     │ PREVIEW (selected idea)      │
│ ────────  │ ● IDEA-142 Unified login  AI✦ │ IDEA-142 · Submitted · 2d    │
│ Admin ⚙   │   Sara A · 2d · 4 votes       │ Problem (2-line clamp)…      │
│           │ ○ IDEA-141 AR invoices        │ ✦ 3 AI suggestions ready     │
│           │   Khalid · 3d · 1 vote        │   [dup? IDEA-98 ·87%]        │
│           │ ○ IDEA-139 …                  │ ─────────────────────────    │
│           │ (j/k to move, Enter to open)  │ [Take ownership]             │
│           │                               │ [Advance ▸] [Decline] [Merge]│
└───────────┴───────────────────────────────┴──────────────────────────────┘
```
**Zones**: queue (left, 55%), preview (right, 45%); untriaged counter in sidebar badge. **Components**: JiraTable (compact density) [shared/JiraTable], preview on IssueDetailPane sections, Lozenge, Avatar, AIIntelligenceButton. **Actions**: take ownership · advance to Screening/Evaluation · decline (reason modal, `comment_required` guard) · merge (opens C.6) · open detail. **Fields shown**: key, title, submitter, age, votes, AI-ready badge, origin-channel icon. **States**: empty ("Inbox zero — nothing waiting on you" + illustration), loading skeleton rows, error boundary, AI-unavailable (suggestion chips hidden, banner). **Permissions**: reviewers+ see queue; submitters landing here are redirected to Explore filtered to "mine". **AI**: duplicate + classification chips inline; never auto-applied. **Notifications**: `idea_triage_assigned` on ownership take. 

### C.2 Explore Table (`/ideation/explore`)
**Goal**: anyone finds any idea. **Persona**: all. **Data**: `idn_ideas` all stages, paginated.
```
│ Ideation · Explore        [Search…] [Stage ▾][Class ▾][Strategy ▾][⤓ CSV] │
├────────────────────────────────────────────────────────────────────────────┤
│ Key▾    Title                Class     Stage        Score  Votes  Owner Age│
│ IDEA-142 Unified login       Problem   ◔ Screening   —      4👍   OA    2d │
│ IDEA-140 Vendor portal AR    Opportun. ◑ Evaluation  7.2    12👍  HK    5d │
│ IDEA-133 Batch invoicing     Improve.  ✓ Converted   8.1    23👍  —    12d │
│                       ‹ 1 2 3 … ›  (server pagination)                    │
```
**Components**: JiraTable full density + ColumnHeaderMenu, saved-filter chips, CSV export (Explore-scope). **Actions**: row→detail; bulk (reviewer+): decline, assign owner. **Fields**: key, title, class, stage lozenge, score_total, votes chip, strategy element, owner, age; converted rows show linked `MIM-n` key. **States**: no-results ("No ideas match — clear filters"), first-run empty ("Capture your first idea" + CTA). **Permissions**: read for module members; bulk actions reviewer+. **AI**: none (deliberately calm surface). **Notifications**: none.

### C.3 Global Create Idea Modal (`?create=idea` from anywhere; `/ideation/submit` full page)
**Goal**: capture in <60 seconds without leaving context. **Persona**: Sara. **Data**: insert `idn_ideas` (Draft→Submitted).
```
┌─ New idea ────────────────────────────────────────────── ✕ ─┐
│ Title*        [___________________________________________] │
│ What problem or opportunity?* (ADF editor)                   │
│ [B I … 🎤 voice] [attach ⌁ drop file/screenshot]             │
│ Proposed value (optional, collapses)                         │
│ Class* ( ) Problem ( ) Opportunity ( ) Improvement           │
│ Product   [Select… ▾]  (optional)                            │
│ ─────────────────────────────────────────────────────────── │
│ ✦ After you submit, Caty will check for similar ideas.       │
│                              [Save draft]  [Submit idea]     │
└──────────────────────────────────────────────────────────────┘
```
**Zones**: single screen, no steps (benchmark: multi-step kills intake — ClickUp/ServiceNow minimal-intake evidence §B). **Components**: Atlaskit ModalDialog, EpicDescriptionEditor (ADF, image paste via supabaseImageUpload), VoiceMicButton + capsule [voice-flow], CatalystAttachmentsPanel drop-zone. **Actions**: save draft / submit / dictate / attach. **Fields**: title*, problem*, value, class*, product. Nothing else — scoring/strategy are downstream roles' work (Planview per-gate disclosure evidence). **States**: validation inline; offline/AI-down = plain submit still works; success flag with "View idea" link. **Permissions**: any module member. **AI**: post-submit async enrichment note (never gates). **Notifications**: `idea_submitted` → triage owners. **Entry points**: sidebar button, ContextSwitcher "+ New idea" (`?create=idea` — extends the documented `?create=1` convention [ContextSwitcher.tsx:600-605]), Caty chat, voice.

### C.4 Idea Detail (`/ideation/ideas/:slug`)
**Goal**: everything about one idea; the decision record. **Personas**: all (zones role-gated). **Data**: `idn_ideas` + satellites.
```
│ ← Inbox   IDEA-142 · Unified vendor login          ◔ Screening  [⋯]       │
├──────────────────────────────────────────────┬─────────────────────────────┤
│ Problem (ADF)                                │ Stage      ◔ Screening      │
│ …vendors juggle 4 logins across portals…     │ Owner      ◯ Omar A         │
│ Proposed value (ADF)                         │ Sponsor    + add            │
│ ─ Evidence (3) ────────────────────────────  │ Strategy   ⚠ required to    │
│ 🎤 Voice transcript · Sara · 2d              │            approve [pick ▾] │
│ 📄 Vendor survey.pdf p.4 "…quote…"           │ Product    Vendor Portal    │
│ 🔗 Support thread                            │ ── Score (model v3) ──      │
│ ─ Discussion & history (ActivityPanel) ────  │ Value    ●●●●○  4 rationale │
│ [tabs: Comments | History]                   │ Effort   ●●○○○  2           │
│ @mention supported                           │ Total    7.2  [suggest ✦]   │
│                                              │ ── Community ──             │
│ [✦ AI Copilot]  ← right-edge drawer trigger  │ 👍 12 votes · Critical×3    │
│                                              │ [Vote ▾ importance]         │
│                                              │ Watching (5) 👁 [watch]     │
│                                              │ ── Linked ──                │
│                                              │ (after convert) MIM-231 ▣   │
│                                              │  BR status: In delivery ◑   │
└──────────────────────────────────────────────┴─────────────────────────────┘
```
**Components**: CatalystViewBase layout family [catalyst-detail-views/shared/], ActivityPanel (comments+audit) [catalyst-ds/activity/ActivityPanel.tsx], Lozenge, Avatar, evidence list rows (new composition), scoring panel (WSJFScoringModal interaction pattern, inline rail form), vote control (§D gap), linked-BR card. **Actions**: transition (workflow-gated buttons), score (reviewer+), vote, comment, watch, add evidence, merge, convert (approver, only at Approved), reopen (approver, audited). **States**: terminal = read-only banner "Locked — converted to MIM-231" (RLS-enforced); Parked shows `parked_until`; AI-down hides suggest buttons. **Permissions**: scoring rail hidden from submitters (per-gate disclosure); decision buttons per §7 role matrix (03). **AI**: Copilot drawer (C.5); per-driver suggest buttons. **Notifications**: status/comment/mention/decision events (03 §8).

### C.5 AI Idea→BR Copilot Panel (right drawer on detail)
**Goal**: reviewer applies AI leverage with zero silent writes. **Persona**: Omar/Huda. **Data**: `idn_ai_suggestions` for idea.
```
┌ ✦ Caty · Idea Copilot ───────────────── ✕ ┐
│ Ran 2m ago · model gpt/gemini · v2026.07.1 │
│ ┌ Classification ────────────── 92% ▓▓▓▓░ ┐│
│ │ Problem · Vendor Portal                  ││
│ │ evidence ▸        [Accept] [Edit] [✕]    ││
│ ├ Possible duplicate ─────────── 87% ▓▓▓▓░ ┤│
│ │ IDEA-98 "Single sign-on for vendors"     ││
│ │ evidence ▸ shared terms, same product    ││
│ │ [Compare & merge…]            [Dismiss]  ││
│ ├ Strategy mapping ──────────── 74% ▓▓▓░░ ┤│
│ │ Theme: "Digital vendor experience"       ││
│ │ evidence ▸        [Accept] [Edit] [✕]    ││
│ ├ Driver scores ─────────────── 71% ▓▓▓░░ ┤│
│ │ Value 4 · Effort 2 · rationale ▸         ││
│ │ [Apply to score panel]                   ││
│ ├ Recommendation ───────────────────────  ┤│
│ │ ADVANCE to Evaluation (not convert yet)  ││
│ └ Draft Business Request ── [Generate ✦] ─┘│
│ ⓘ Suggestions are proposals. Nothing is    │
│   applied without your action.             │
└────────────────────────────────────────────┘
```
**Components**: drawer per Caty panel pattern [components/caty-ai/], suggestion card (new canonical composition — §D gap), confidence Lozenge + bar, evidence expander. **Actions**: accept/edit/reject per card (writes decision to ledger + applies field mutation as the *user*); regenerate; generate BR draft (feeds C.8). **States**: below-threshold cards collapsed + amber flag; stale banner when idea edited after run; failure = "Copilot unavailable — manual flow unaffected". **Permissions**: visible to reviewer+; respects caller RLS for retrieval. **AI**: this IS the surface; every card = ledger row (03 §3). **Notifications**: `idea_ai_suggestions_ready` (P4).

### C.6 Duplicate / Merge Preview (modal)
**Goal**: merge without data loss or surprise. **Persona**: Omar.
```
┌ Merge ideas ────────────────────────────────────────────┐
│  KEEP  IDEA-98  SSO for vendors      12👍 · 4 evidence  │
│  MERGE IDEA-142 Unified vendor login  4👍 · 3 evidence  │
│ ── What will happen ─────────────────────────────────── │
│ ✓ 4 votes move (duplicates by same user collapse)       │
│ ✓ 3 evidence items re-linked                            │
│ ✓ 5 watchers merged                                     │
│ ✓ IDEA-142 becomes read-only, links to IDEA-98          │
│ ✗ Nothing is deleted                                    │
│ Reason* [________________________]                      │
│                       [Cancel]  [Merge into IDEA-98]    │
└──────────────────────────────────────────────────────────┘
```
**Components**: ModalDialog + ConfirmDialog family pattern [catalyst-detail-views/shared/ConfirmDeleteDialog.tsx]. **Benchmark rationale**: explicit-transfer manifest is the direct inverse of ClickUp's silent-loss merge and Productboard's legacy destructive merge (§B anti-patterns). **States**: side pre-selected from duplicate suggestion; swap-direction control. **Permissions**: reviewer+. **Notifications**: `idea_merged` → both submitters. **Audit**: merge row in `idn_audit_log` + suggestion status if AI-originated.

### C.7 Portfolio — Prioritization Field (`/ideation/portfolio`)
**Goal**: leadership decides from one surface. **Persona**: Huda. **Data**: Evaluation+ ideas with score components.
```
│ Ideation · Portfolio    model: Default v3 ▾   [Field | Funnel]  [Filters] │
├────────────────────────────────────────────────────────────────────────────┤
│ Value ▲   Q2 BIG BETS          │           Q1 QUICK WINS                   │
│        ·IDEA-140 (12👍)        │   ·IDEA-98 ◉(16👍)   ·IDEA-121            │
│ ───────────────────────────────┼─────────────────────────────────────────  │
│           Q4 MONEY PIT         │           Q3 FILL-INS                     │
│        ·IDEA-77                │   ·IDEA-101                               │
│                    Effort ▶    │  ◉=selected → footer action bar:          │
│  [Approve ✓] [Park ⏸] [Decline ✕] [Open]                                   │
```
**Components**: value/effort field chart = **new component (flagged §D gap; no canonical scatter exists — DependencyMatrix is grid-only [components/dependencies/])**; bubble=votes, color=stage token; funnel toggle = stage-column board on PragmaticBoard. **Benchmark**: ServiceNow Demand Workbench single-triage-surface (§B). **Actions**: select→inline decide (guard-checked; failing guards explain inline). **States**: unscored ideas tray at edge ("needs scoring: 4"); empty state per stage. **Permissions**: approver decisions; reviewers view. **AI**: none on-surface (decisions are human turf). **Notifications**: `idea_decision`.

### C.8 Conversion Wizard — Idea → Business Request (modal, 3 steps)
**Goal**: governed exit; BR born complete. **Persona**: Huda. **Data**: idea + AI BR-draft suggestion → insert `business_requests` + `idn_conversions`.
```
Step 1 · Draft        Step 2 · Checks         Step 3 · Confirm
┌─────────────────────────────────────────────────────────────┐
│ ● Draft  ○ Checks  ○ Confirm                                │
│ Title        [Unified vendor login…            ] ✦ from AI  │
│ Type         [feature ▾]   Category [Industrial ▾]          │
│ Urgency      [High ▾]      Stakeholders [MoC ×][+ ▾]        │
│ Description (ADF: scope/objectives/metrics/risks/AC) ✦      │
│ Strategy     Digital vendor experience (carried from idea)  │
│                                    [Back] [Next: checks →]  │
├── step 2 ───────────────────────────────────────────────────┤
│ ✓ Strategy link present                                     │
│ ✓ Scores complete (model v3)                                │
│ ✓ Duplicate review complete                                 │
│ ⚠ Sponsor missing (advisory — proceed allowed)              │
├── step 3 ───────────────────────────────────────────────────┤
│ Creates MIM-232 · locks IDEA-142 (read-only + live rollup)  │
│ Notifies: submitter, 12 voters, 5 watchers                  │
│                                  [Back] [Create request ✓]  │
└─────────────────────────────────────────────────────────────┘
```
**Components**: ModalDialog multi-step; field set mirrors `business_requests` 22-column shape [types/business-request.ts] and CreateBusinessRequestModal [product-hub/CreateBusinessRequestModal.tsx]; guard checklist (new composition — renders runtime guard evaluations, same registry as [runtime.ts:19-47]). **States**: guard-fail blocks per enforcement config (advisory vs blocking [ph_wf_enforcement_config]); AI-draft absent → blank editable form. **Permissions**: approver only; idea must be Approved. **AI**: prefill only; human edits everything; ✦ marks AI-populated fields (evidence per field via ledger). **Notifications**: `idea_converted`. **Audit**: `idn_conversions` row + BR audit [business_request_audit_logs].

### C.9 Admin — Ideation Settings (`/admin/ideation/*`)
**Goal**: Adel governs without engineering. **Data**: config tables (GovernedEnvelope).
```
│ Admin · Ideation                                                          │
│ ├ Scoring models      Default v3 (active) · [+ model] [install preset ▾] │
│ │   Driver     Weight  Scale  Rubric        AR label                     │
│ │   Value      0.6     0–5    [edit]        القيمة                        │
│ │   Effort     0.4     0–5    [edit]        الجهد                         │
│ │   [Publish v4…] (requires approval — GovernedEnvelope)                 │
│ ├ Workflow            → opens Workflow Studio (ideation workflow)        │
│ ├ Intake              channels: Form ✓ Chat ✓ Voice ✓ Docs ✓             │
│ ├ AI                  Copilot ✓ · per-capability toggles · threshold 0.6 │
│ │                     prompt version: 2026.07.1 (read-only viewer)       │
│ ├ Roles               matrix per §7 (admin_role_module_permissions)      │
│ └ Retention           archive terminal after [90] days                   │
```
**Components**: admin layout pattern [pages/admin/AdminAccessPage.tsx:114-150], per-module admin dir precedent [modules/workhub/admin/pages/]; workflow deep-link (Workflow Studio owns statuses — no bespoke status editor). **Permissions**: ideation admin + SuperAdmin. **Audit**: every publish = versioned envelope row. **States**: draft-vs-active model banner; preset installer preview.

### C.10 Homepage Widgets + ForYou Section
**Goal**: ideation earns homepage presence. **Data**: dashboard queries (§E.4).
```
ForYou:  ▸ Ideas waiting on you (3)   ▸ Your ideas: IDEA-142 ◔ Screening
Widgets: ┌ Idea funnel (30d) ┐ ┌ Top ideas ┐ ┌ Time to decision ┐
         │ 48→31→12→5 conv.  │ │ IDEA-98 16👍│ │ median 6.5d ▁▃▅ │
```
**Components**: ForYou section per ReleaseOpsForYouSection precedent [components/releasehub/foryou/]; WidgetShell + MetricCard [product-dashboard/WidgetShell.tsx, dashboard/MetricCard.tsx]. **Permissions**: widgets respect module access; counts RLS-scoped. **States**: zero-state renders CTA not blank.

### C.11 Mobile / iPad
**Inbox** → single pane; preview becomes full-screen push; swipe right = advance, left = decline (with reason sheet); j/k replaced by native scroll. **Submit** → full-screen sheet; voice button prominent (thumb zone); camera → screenshot evidence via docintel. **Detail** → right rail collapses to accordion above activity; sticky action bar bottom. **Portfolio** → field chart requires ≥ tablet width; phones get funnel-column list instead (declared, not squeezed). **Targets** ≥44px; JiraTable → card list under `sm` breakpoint (JiraTable density modes cover tablet; phone card-list = **new composition, flagged**). RTL mirrors all directional gestures. **Not Confirmed**: existing responsive breakpoints convention — discovery action: audit `tailwind.config` breakpoints + an existing mobile surface (MobileMenuDrawer [layout/MobileMenuDrawer.tsx]) before Phase 7 Plan Lock.

---

## D. VISUAL DIRECTION

**Premium principles** (each traceable): (1) *Calm data, loud decisions* — tables/lists neutral (`--ds-text`, `--ds-surface`), decision moments get the only strong color (brand-bold buttons, semantic lozenges) — Tufte data-ink discipline applied via ADS tokens. (2) *One AI voice* — every AI element uses the ✦ affix + AIIntelligenceButton rainbow (the sole sanctioned rainbow per CLAUDE.md); AI never impersonates system text. (3) *Per-gate disclosure* — submitters see 4 fields, reviewers see scoring, approvers see decisions (Planview PPM Pro evidence). (4) *Evidence adjacency* — no score, suggestion, or decision renders without its "why" one interaction away.

**Typography**: ADS type tokens only — `font.heading.large` page titles, `font.heading.small` rail/section headers, `font.body` default, `font.body.small` metadata, `font.code` keys (IDEA-142, MIM-231). No custom faces/sizes (audit-gate enforces hardcoded font-size — [scripts/ads-audit-gate.cjs] per CLAUDE.md enforcement).
**Spacing/density**: `--ds-space-*` 8px grid; Inbox queue = compact density, Explore = comfortable default with user toggle (JiraTable density modes exist [shared/JiraTable]); detail rail rows 32px rhythm.
**Dark mode**: token-pass only — ThemeProvider→AdsThemeProvider bridge [providers/ThemeProvider.tsx, theme/atlassian/AdsThemeProvider.tsx]; module stays **outside AstryxZone** (Astryx is light-first — CLAUDE.md Astryx section); acceptance = zero visual regressions in dark screenshots.
**RTL**: LanguageContext [contexts/LanguageContext.tsx]; logical CSS properties (start/end, never left/right); wireframes above mirror wholesale; field chart axes flip; `detectScript` drives per-field direction in mixed AR/EN content [lib/i18n/detectScript].
**Accessibility**: WCAG AA; every icon-only control labeled; lozenge stage info duplicated in text (never color-only); field chart keyboard-navigable list-equivalent (toggle satisfies this); focus rings `--ds-border-focused`; reduced-motion honored.
**Empty states**: always name the next action ("Inbox zero 🎉 — see Explore", "No ideas yet — capture the first one"), EmptyBoardState pattern [components/empty-states/].
**Microcopy**: verbs not nouns ("Submit idea", "Decline with reason", "Merge into IDEA-98"); decline template auto-inserts reason scaffold; AI disclosure fixed string: "Suggestions are proposals. Nothing is applied without your action." AR copy authored, not machine-translated, at launch.
**Motion**: Atlaskit motion durations only; drawer slide + suggestion-card entrance stagger ≤200ms; no celebratory motion except one-time submit success flag.

**Iconography — decision**:
- **Chosen: `@atlaskit/icon/core/lightbulb`** (verified installed: `node_modules/@atlaskit/icon/core/lightbulb.js`). Justification: (1) it is already the platform's idea-signifier — the legacy sidebar used Lightbulb for Ideas Backlog [IdeationSidebar.tsx:22,45], so user recognition carries at zero cost; (2) core-set icons are the current-generation ADS icons (glyph set is legacy); (3) pairs with `lightbulb-filled` for active/selected nav state (verified installed).
- Hub-scale contexts (HubSwitcher tile, hub header) keep the **existing registered hub asset** `assets/icons/hubs/ideation.svg` + outline [icons.registry.ts:148,159,377,392] — consistency with every other hub's dual filled/outline treatment.
- **Alternative 1**: `@atlaskit/icon/core/lightbulb-filled` as primary — rejected as default (filled reads as "active" in ADS nav conventions; reserve for selected state).
- **Alternative 2**: `@atlaskit/icon/glyph/lightbulb` — rejected: legacy glyph set, inconsistent stroke with core-set icons used across new surfaces.

---

## E. NATIVE ARCHITECTURE (delta over 03 §3–§10; 03 remains normative for schema)

### E.1 Native-fit proof table (interaction → evidence)
| Interaction | Mechanism | Evidence |
|---|---|---|
| Strategy → Idea | `idn_ideas.strategy_element_id` → `strata_strategy_elements`; picker reads STRATA elements | [modules/strata/types.ts]; [20260705100100_strata_strategy_scorecard.sql] |
| Idea → BR | wizard → `business_requests` insert + `idn_conversions` + `source_idea_id` backlink; MIM-N via shared sequencing | [convertPage.ts:63-79]; [generateIssueKey.ts]; [work_item_type_registry.sql] |
| BR → Epic/Feature/Story/Release | existing hierarchy + BR links (milestone links, feature JSONB) — ideation adds nothing below BR | [2026-06-28_003_create_br_milestone_links.sql]; [business-request.service.ts:56-61] |
| Idea ← delivery rollup | linked-BR card reads BR `process_step` + progress (service pattern `getBRWithMilestones`) | [business-request.service.ts] |
| Reports | `idn_*` views feed widgets; ForYou section | [ForYouPage.atlaskit.tsx]; [WidgetShell.tsx] |
| Hub nav | HubSwitcher DISCOVER seat (un-deprecate, `moduleKey: 'ideation'`), shell sidebar seat, hub-home map | [HubSwitcher.tsx:72]; [CatalystShell.tsx:127-130,242,416-420] |
| Create menu | `?create=idea` param on ideation routes + ContextSwitcher entry | [ContextSwitcher.tsx:600-605] |
| Admin | `/admin/ideation` under AdminLayout/AdminGuard | [pages/admin/AdminAccessPage.tsx] |
| Rules | ideation workflow + 3 new guards in guard registry | [workflow/canonical/runtime.ts:19-47] |
| Notifications | IdeationHub set via trigger service + schemes | [notificationTriggerService.ts]; [constants/notificationEvents.ts] |
| Chat | Caty `idea` persona (8th persona, existing pattern) | [lib/caty-assistants.ts] |
| Voice | voice-flow capsule in submit + comments; transcript→evidence | [features/voice-flow/]; [supabase/functions/voice-transcribe/] |
| Docintel | attachments ingested; page-level evidence refs | [supabase/functions/docintel-ingest/] |
| Audit | runtime transition audit + `idn_audit_log` + suggestion ledger + `ai_usage_log` | [runtime.ts:210-214]; [20260704000000_ai_usage_log.sql] |
| Permissions | module key + role matrix + RLS | [useModuleAccess.ts:174-258]; [guards/ModuleGuard.tsx:55-138] |
| Icons | registry hub slot + core lightbulb | [icons.registry.ts:371-392]; node_modules verification |

### E.2 Models & view-models (canonical layering [modules/incidents/* reference])
`src/modules/ideation/types.ts`: `Idea`, `IdeaEvidence`, `IdeaVote`, `ScoringModel`, `ScoringDriver`, `IdeaScore`, `AiSuggestion`, `IdeaConversion`, `IdeaFilters`. View-models in `shared/computations.ts` (pure): `TriageQueueVM` (idea + ai-ready flags + age buckets), `IdeaDetailVM` (idea + scores-by-driver + guard states + linked-BR rollup), `PortfolioVM` (x/y from class-tagged drivers, bubble size, quadrant), `FunnelVM` (stage counts + conversion %, from views). API layer `api/ideationApi.ts` (no React): `listIdeas(filters,page)`, `getIdeaBySlug`, `createIdea`, `updateIdea`, `transition(ideaId,toKey,reason?)`, `castVote`, `addEvidence`, `scoreDriver`, `mergeIdeas(winnerId,loserId,reason)`, `convertToBusinessRequest(ideaId,draft)`, `listSuggestions`, `decideSuggestion(id,action,edit?)`, admin CRUD for models/drivers. Hooks mirror 1:1 with react-query keys `ideationKeys.*`.

### E.3 New workflow guards (registered in GUARD_EVIDENCE_REGISTRY [runtime.ts:19-47])
`strategy_link_present` (real: `strategy_element_id NOT NULL`), `scores_complete` (real: count(idn_idea_scores where model_version=active) = count(active drivers)), `duplicate_review_complete` (real: all `duplicate` suggestions decided ∨ none exist).

### E.4 Dashboard queries (SQL views, security_invoker)
`idn_v_funnel_30d` (stage counts + conversion rate), `idn_v_time_to_decision` (median/percentiles from audit transitions), `idn_v_top_ideas` (votes+score composite), `idn_v_triage_load` (untriaged count + oldest age — feeds Inbox badge + admin SLA), `idn_v_ai_adoption` (suggestion accept/edit/reject rates — AI governance metric).

### E.5 Tests (named)
Unit: score aggregation per model version; guard evaluators; merge-transfer function; key sequencer race (concurrent insert). Integration: lifecycle matrix (role × transition), RLS lock probes (terminal write attempts per role), conversion end-to-end (BR row + backlink + lock + notifications), notification emission per event. UI: Inbox adapter, Explore table adapter, wizard step logic. AI: eval harness (§F). E2E: submit→triage→score→approve→convert→BR visible in Product Hub.

---

## F. AI BLUEPRINT — Idea-to-BR Copilot (normative detail over 03 §6)

**Input channels**: form text · Caty chat `idea` persona (min-role user, accent `--ds-background-brand-bold` family per persona table [caty-assistants.ts]) · voice (Groq Whisper→Gemini fallback, AR/UR/HI/EN + KSA phrase allowlist [voice-transcribe/index.ts]) · document/screenshot (docintel PDF/XLSX/PNG/JPEG, AR-native [docintel-ingest]).
**Retrieval (permission-scoped)**: duplicate scan = pgvector cosine over `idn_idea_embeddings` (gateway `embed()`, 1536-dim [_shared/llm.ts]) filtered by caller-visible rows (RLS-context query, not service-role); strategy mapping = element name/description similarity within caller's STRATA visibility; work-item mapping = `ai-search-issues`/`ai-similar-items` precedent endpoints.
**Confidence & evidence**: every suggestion `{confidence 0–1, evidence_refs[]}`; mapping/duplicate suggestions with zero evidence are **dropped server-side**; UI threshold (admin, default 0.6) collapses low-confidence cards.
**Generated BR draft**: JSON-schema-constrained output mapped to `business_requests` columns (title, request_type, category, urgency, stakeholders[], theme) + ADF description with fixed sections (scope, objectives, success metrics, assumptions, risks, acceptance criteria) + evidence bundle appendix; schema validation at the gateway (supported [_shared/llm.ts JSON schema]) forces retry on malformed output.
**Human approval**: suggestion ledger statuses `proposed→accepted|edited|rejected|superseded`; apply = user mutation; conversion additionally gated by Approved status + approver role + wizard step-2 guard pass. No auto-apply path exists in V1; a future auto-rule must be an explicit admin setting, default OFF.
**Rule gates**: the three E.3 guards + enforcement mode.
**Audit**: `ai_usage_log` (call), `idn_ai_suggestions` (proposal+decision), `idn_audit_log` (field application), BR audit on create.
**Admin toggles**: master Copilot switch; per-capability (classify/summarize/duplicate/mapping/scores/br-draft); confidence threshold; prompt-version pin; role floor for AI panel.
**Hallucination controls**: schema-validated outputs; evidence-or-drop rule; refuse-below-floor (gateway `CONF_REFUSE` precedent [kb-query]); strategy/work-item mappings restricted to retrieved candidates only (closed-world prompting); AR/EN output language mirrors input.
**Eval tests (release gates)**: golden set ≥50 labeled ideas (≥15 with known duplicates, ≥20 with known strategy mapping, ≥10 historical conversions). Gates: duplicate P≥0.8/R≥0.7; classification accuracy ≥0.85; mapping top-3 hit ≥0.75; BR draft required-field completeness ≥0.9; zero schema-invalid outputs across suite. Re-run on any prompt/model change (runs keyed to `prompt_version`); regression = gate failure blocks the change.

---

## G. PHASES (each phase = Plan-Locked slices ≤2h; screenshots per operating contract; flag `ideation` off in prod until Phase 8 exit)

**Phase 0 — Design lock.** Deliverables: this pack + 03 approved; icon decision ratified; §I discovery actions resolved (BR terminal-event source, breakpoints, chart approach); non-canonical component list approved (vote control, suggestion card, field chart, guard checklist, phone card-list); data-disposition sign-off for decommission. Exit: Plan Lock for Phase 1 written; all "Not Confirmed" items resolved or explicitly deferred. Risk: skipping this re-opens design mid-build. Plan-Lock questions: campaigns in/out of V1? portal intake ever? vote importance 4-level vs simple? which two drivers are the portfolio axes by default?
**Phase 1 — Foundations.** `idn_*` migrations + RLS + slug/key infra; module key registration + ModuleGuard; route builders + shell seat swap (new sidebar config, HubSwitcher un-deprecate → `moduleKey:'ideation'`); admin seeds (default scoring model v1, ideation workflow + guards, notification triggers, role defaults). Tests: sequencer race, RLS matrix probe, guard registration. Screenshots: hub tile, empty Inbox, admin skeleton. Risks: workflow-seed correctness — mitigate with runtime's advisory mode first. Rollback: flag off; drop `idn_*` (no consumer yet). Exit: navigable empty module behind flag, seeds verifiable in admin read-only.
**Phase 2 — Core CRUD.** Submit modal/page, Inbox (queue+preview), Explore, Detail (fields+comments+watchers+evidence add), CSV export. Tests: create/read/update, adapter tests, pagination perf probe. Screenshots: all four surfaces, empty+filled, light+dark. Risks: detail-page scope creep — rail items without backends render nothing (zero-assumption rule). Exit: submit→inbox→detail loop usable end-to-end by all roles.
**Phase 3 — Workflow, rules, permissions.** Transitions wired to runtime; decline/park/reopen with reasons; terminal RLS locks; role matrix enforcement; audit feed in ActivityPanel History tab. Tests: role×transition matrix, lock probes, reason-required guard. Screenshots: transition menus per role, locked banner. Risks: dual-column status bridging bugs — copy incident precedent exactly [useIncidents.ts:145-222]. Exit: lifecycle fully governed; enforcement configurable.
**Phase 4 — AI Copilot + duplicates.** Embeddings + `ideation-copilot` fn; suggestion ledger; drawer UI; merge preview + mutation; eval harness with golden set. Tests: §F gates; ledger-audit completeness; AI-off degradation. Screenshots: drawer (all card kinds), merge preview, AI-off state. Risks: eval-set assembly needs real-ish data — seed from workshop content, not legacy rows. Exit: §F release gates green; zero silent writes verified.
**Phase 5 — Conversion.** Wizard (3 steps), BR creation + backlink + `idn_conversions`, lock-on-convert, linked-BR rollup card, Delivered auto-close listener. Tests: E2E convert; guard-block paths; rollup refresh; auto-close timing. Screenshots: wizard steps, locked idea with live BR card, BR in Product Hub showing origin. Risks: BR terminal-event source (**Not Confirmed** — resolved in Phase 0). Exit: idea→MIM traceability queryable both directions.
**Phase 6 — Distribution.** IdeationHub notifications live; Caty persona; voice intake; docintel evidence; ForYou section + widgets. Tests: emission per event; persona routing; AR voice E2E; widget RLS. Screenshots: notification center, widgets, voice capture on submit. Exit: submitter loop closes (decision notify verified); widgets on home.
**Phase 7 — Polish.** AR translations + RTL pass; dark-mode audit; a11y audit (AA); iPad/mobile behaviors (C.11); motion; microcopy review; portfolio field chart final. Tests: axe pass, RTL screenshot suite, reduced-motion. Screenshots: full pack in AR-RTL + dark. Exit: color-gate + audit-gate ratchets pass; a11y clean.
**Phase 8 — Readiness + decommission.** Full E2E suite; perf at 10k seeded ideas; eval regression re-run; runbook; then decommission slice (03 §12) with consumer sweep + signed data disposition. Rollback: decommission is its own reversible-until-merged slice; module GA only after it lands. Exit: §J checklist 100%; legacy inventory gone; flag default-on.

Dependency spine: 1→2→3→{4,5 parallel}→6→7→8; 4 and 5 independent after 3 (copilot BR-draft card degrades to absent if 5 lags).

---

## H. GREENFIELD SAFETY

- **No legacy data migration** — no read of `ph_ideas` anywhere in new code; eval/demo data seeded fresh (workshop-sourced), never copied. Enforced by acceptance check: zero imports/queries touching decommission inventory (03 §12) from `src/modules/ideation/`.
- **Additive schema** — all new objects `idn_`-prefixed; sole touch on existing tables = `business_requests.source_idea_id` (nullable, additive) + notification trigger rows + guard registry entries + module-permission rows. No ALTER of legacy idea tables (they only ever get DROPped, in the decommission slice).
- **Seeds** (committed migrations, idempotent): default scoring model v1 (Value/Effort) + RICE/WSJF presets (inactive); ideation workflow + 3 guards; IdeationHub notification triggers with scheme defaults; role→module defaults; demo ideas gated to non-prod.
- **Feature flags** — runtime module key `ideation` (admin-controlled access) + `VITE_ENABLE_IDEATION` build flag for pre-GA dark launch (precedent: flag registry [lib/featureFlags.ts]); explicitly NOT coupled to `ENABLE_AI`.
- **Rollback** — pre-GA: flag off = module invisible; `idn_*` drop-safe (no external consumers until conversion ships; after Phase 5, rollback = flag off + BR `source_idea_id` simply stays null-functional). Decommission slice ships last and separately (03 §12), RED-FLAG reviewed, with pre-drop archive per signed disposition.
- **No re-migration** — embeddings carry `content_hash` (recompute only on change); scores carry `model_version` (weight changes never rewrite history); suggestion ledger append-only with `superseded`; conversion edges immutable.

---

## I. BLIND SPOTS (new, beyond 03 §11/§J)

1. **HubSwitcher seat is mis-keyed** — entry is `deprecated: true, moduleKey: 'product'` [HubSwitcher.tsx:72]; shipping without repointing to `ideation` key silently gates the hub by Product access. *Action*: Phase 1 slice.
2. **SidebarBase is mixed-icon (Atlaskit + lucide)** — documented ADS debt [IdeationSidebar.tsx:16-18]; new sidebar config must use Atlaskit-core icons only, or inherits the violation. *Action*: icon audit in Phase 1 review.
3. **No canonical scatter/field chart** — portfolio surface needs a new component; charting approach (**Not Confirmed** — is recharts/visx already a dependency? *Action*: `package.json` audit in Phase 0) must be decided before Phase 3 ends.
4. **BR terminal-step event source Not Confirmed** — auto-Delivered needs a reliable hook on `business_requests.process_step` reaching terminal (realtime channel? trigger? poll?). *Action*: Phase 0 discovery on BR update paths [business-request.service.ts + realtime precedent useBoardIssues.ts:19-63].
5. **`?create=1` convention is per-list-page, not global** — a truly global "+ Idea" needs a ContextSwitcher/shell touchpoint owned by shell maintainers. *Action*: Phase 0 alignment; fallback = sidebar-local button only.
6. **react-intl is stubbed in tests and AR translations are infra-thin** [test/__stubs__/react-intl-next.ts] — AR-at-launch needs a translation workflow decision (string catalog owner). *Action*: Phase 0.
7. **Eval golden set has no legal source yet** — greenfield mandate forbids legacy rows; workshop/synthetic set must be authored. *Action*: Phase 4 pre-work, owner named in Plan Lock.
8. **Notification fatigue** — 10 event types × schemes defaulting loud = mute-everything risk (PB weekly-digest evidence suggests batching). *Action*: default P3/P4 events to in-app only; digest option flagged P2.
9. **Admin approval chain for GovernedEnvelope publishes** — who approves a scoring-model version? (STRATA has approved_by but ideation approver role mapping unstated). *Action*: define in Phase 0 Plan Lock.
10. **Legacy `/ideation/*` URL collision during dark launch** — old routes live until decommission; new module claims the same prefix. *Action*: decommission routes slice must precede Phase 2 exposure, or dark-launch under `/ideation-next/*` then flip (decide Phase 0).

---

## J. ACCEPTANCE CRITERIA (binary; module is "premium, native, buildable, tested, production-ready" only at 100%)

**Premium**: □ every §C screen implemented to spec incl. states · □ inbox-zero counter + keyboard triage work · □ per-gate disclosure verified per role · □ evidence one-interaction-away on every score/suggestion/decision · □ microcopy + AR copy reviewed by a human · □ motion ≤200ms, reduced-motion honored.
**Native**: □ hub tile/sidebar/hub-home/HubSwitcher (un-deprecated, `moduleKey:'ideation'`) live · □ routes via builders, slug-only params · □ workflow in Workflow Studio, zero module-owned state machine · □ notifications through trigger service schemes · □ Caty persona + voice + docintel channels functional · □ icons: core lightbulb + registered hub SVGs, zero lucide in new surfaces.
**Buildable**: □ every phase exited on its criteria with Plan Locks + session logs · □ all "Not Confirmed" items resolved before their consuming phase · □ non-canonical components (5 listed) explicitly approved pre-build.
**Tested**: □ §E.5 suites green in CI · □ §F eval gates green + regression wired to prompt-version changes · □ RLS lock/role probes green · □ E2E submit→convert green · □ RTL + dark screenshot suites accepted.
**Production-ready**: □ 10k-idea perf targets met · □ flag decoupled from ENABLE_AI, dark-launch verified · □ color-gate + audit-gate ratchets pass · □ decommission slice merged with signed data disposition, consumer sweep clean · □ runbook + admin docs delivered · □ zero references to legacy ideation inventory anywhere in `src/modules/ideation/`.
