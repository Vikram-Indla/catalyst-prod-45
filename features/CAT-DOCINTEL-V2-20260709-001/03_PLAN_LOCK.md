# PLAN LOCK — CAT-DOCINTEL-V2-20260709-001

**Active version:** v2.1 — Complete Doc Intel BRD Review Workbench journey
**Status:** APPROVED — execution authorized by slice
**Approved by:** Vikram, 2026-07-11
**Debate mode:** WR
**Timebox:** maximum 2 hours per implementation slice
**Implementation allowed now:** YES — active v2.1 slices only; Slice 1 resumed after the approved
collision-safe route rebaseline in `19_ROUTE_REBASELINE_AND_GOAL_RESUME.md`

> The original backend V2 roadmap is retained below as historical evidence. It is not the active
> implementation contract. The active contract begins here and supersedes the backend-shaped UI
> assumptions in the historical sections.

---

## V2 ACTIVE OBJECTIVE — BRD REVIEW WORKBENCH

Replace the current backend-shaped Doc Intel journey with a job-led, Rovo-inspired (not
Rovo-cloned) BRD Review Workbench that lets a user understand a source, ask grounded questions,
review findings, create cited deliverables, approve them, and convert approved outputs into
traceable work. Preserve every delivered capability. Move extraction, provider, queue, prompt and
processing diagnostics to a backend-enforced Admin surface while keeping user-facing citations and
exact evidence one click away.

**First user contract:** Review a BRD and turn accepted findings into traceable work.

**Functionality verdict required:** ADDITIVE or NEUTRAL. Any subtractive result is a hard stop.

## USER DECISION REQUIRED TO LOCK V2

Admin authority boundary:

- **Recommended:** global processing, re-sync, prompt/model and audit controls require either the
  legacy `user_roles.role='admin'` role or the `super_admin` product role.
- Ordinary project members retain user-facing Ask, review, generation, approval and linking only
  where existing project RLS permits them.
- Project-admin/owner authority is deferred because no canonical project-admin role contract was
  proven in this discovery pass.

Approved boundary: global processing controls require legacy `admin` OR product `super_admin`.
`/admin` route placement or `AdminGuard` alone is not backend authorization.

## NON-SCOPE

- A pixel clone of Rovo.
- A generic blank chat as the whole product.
- A new persisted `analysis`/conversation entity in this phase.
- True version diff/compare, collaborative annotations, mentions or reviewer assignment.
- A rich BRD editor until ADF storage/conversion is separately Plan-Locked.
- Agent/persona marketplace, lineage graph, theme analytics or readiness scorecards.
- Automated Jira creation from unreviewed extraction.
- Deleting the existing evidence, document, facts, artifact, traceability, Ask or link capability.

## TARGET INFORMATION ARCHITECTURE

User-facing:

```text
For you
Library
Themes
Deliverables

Source workbench
  Overview
  Ask
  Findings
  Deliverables
  Work items
    Linked work
    Traceability

Contextual
  Source/evidence drawer
    Readable source
    Exact evidence
  Version menu
```

Admin:

```text
Document Intelligence
  Sources, ingestion and raw extraction
  Processing health
  Audit and retries

Deferred behind a separate permission Plan Lock
  Prompts and models
```

## CANONICAL COMPONENTS SELECTED

| UI element | Canonical component | Evidence / decision |
|---|---|---|
| Page/workbench shell | `src/components/ads/AtlaskitPageShell.tsx` | Supports content and fixed side rail; extend, do not hand-roll |
| Page header | `src/components/ads/PageHeader.tsx` | One semantic H1 and action slot |
| Library/findings/deliverables lists | `src/components/shared/JiraTable/JiraTable.tsx` | Mandatory enterprise list candidate; audit-grade story exists |
| List page chrome | `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx` | Canonical toolbar/filter/table composition |
| Source/evidence inspector | `src/components/ads/CatalystDrawer.tsx` | ADS Drawer wrapper; preserve citation focus/close contract |
| Empty/loading/error | ADS `EmptyState`, `Spinner`, `SectionMessage` | No custom state widgets |
| Status | `StatusLozenge` / ADS Lozenge | No hand-styled pills |
| Peer navigation | `@atlaskit/tabs` | Only genuine peer views; Work items subviews remain keyboard accessible |
| Work-item promotion | Existing `PromoteArtifactModal` + `ProposalTable` | Extend existing flow; no replacement modal/table |
| Rich artifact editing | `AtlaskitEditor` + ADF | DEFER until storage/conversion contract exists |

Explicit non-reuse: `UnifiedLinksTab`, `HubItemDetailPage`, `CatalystDetailPanel`, `CatyIconCTA` as
the Home submit control, and `SurfaceCard`. Each is either coupled to another domain or violates the
required ADS/canonical contract.

The screen-level contract, hierarchy, states and capability-preservation map are locked from
`15_SCREEN_BLUEPRINT_AND_LOCK_DECISIONS.md`. If this Plan Lock and that blueprint conflict, this
Plan Lock wins; the work must stop and rebaseline rather than silently choosing.

## ORDERED IMPLEMENTATION SLICES — ACTIVE V2.1 COMPLETION CORRECTION

The first v2 draft preserved too much of the current backend-shaped navigation and omitted a real
review start, dedicated Library, project Deliverables hub and resumable For-you content. The 15
two-hour work units below supersede the obsolete v2.0 A–G2 draft retained later for audit history.
Only these v2.1 slices are executable after approval.

### SLICE 1 — Route and navigation foundation (2h, ADDITIVE)

**Purpose:** Split For you from Library and register collision-safe destinations. User views live
under `views/*`, review under `actions/*`, and canonical sources under `source/:slug`; the legacy
one-segment source route remains compatible.

**Files to touch:**

1. `src/lib/routes.ts` — add `home`, `library`, `review`, `themes`, `deliverables` builders using
   the approved namespaces; retain `list()` as a compatibility alias to Home; make `workspace()`
   canonical at `source/:slug`.
2. `src/modules/docintel/DocintelRoutes.tsx` — mount new routes before `source/:slug`, retain
   legacy `:slug`, and use truthful pending states for routes delivered in later slices.
3. `src/modules/docintel/components/DocintelNavigation.tsx` — NEW; peer navigation using canonical
   ADS components.
4. `src/modules/docintel/pages/DocintelHomePage.tsx` — NEW skeletal state-safe route.
5. `src/modules/docintel/pages/DocintelLibraryPage.tsx` — NEW wrapper around the current library
   behavior; no data contract change.
6. `src/modules/docintel/pages/DocintelDocumentsPage.tsx` — move current library implementation to
   the new Library page; retain only a compatibility export if imports require it.
7. `src/modules/docintel/pages/__tests__/DocintelRoutes.test.tsx` — NEW.

**Binary acceptance:** old `/doc-intelligence` and every existing one-segment source URL resolve;
new source links use `/source/:slug`; view/action routes cannot shadow a frozen slug; upload and
health routes are not shadowed; browser back/forward works; no UUID route is introduced.

### SLICE 2 — Intent-first For you (2h, ADDITIVE)

**Purpose:** Make Ask, Review and Create understandable without training while showing only truthful
recent sources/deliverables and needs-attention states.

**Files to touch:**

1. `src/modules/docintel/components/DocintelIntentComposer.tsx` — NEW; modes, source scope and
   proven task starters.
2. `src/modules/docintel/components/DocintelRecentWork.tsx` — NEW; sources and deliverables only,
   never fictional analyses.
3. `src/modules/docintel/pages/DocintelHomePage.tsx` — complete Home composition.
4. `src/modules/docintel/components/AskPanel.tsx` — additive `mode="hero"`; inline default unchanged.
5. `src/modules/docintel/domain/index.ts` — project-scoped recent artifact read only; no write.
6. `src/modules/docintel/hooks/useDocintel.tsx` — corresponding query hook.
7. `src/modules/docintel/components/__tests__/DocintelIntentComposer.test.tsx` — NEW.
8. `src/stories/audit-grade/21-DocintelForYou.stories.tsx` — NEW.

**Binary acceptance:** each mode routes or submits through an existing proven contract; scope is
visible before submit; no source/project state is honest and actionable; no operational telemetry.

### SLICE 3 — Three-decision BRD review start (2h, ADDITIVE)

**Purpose:** Start a useful review without inventing a persisted analysis entity.

**Files to touch:**

1. `src/modules/docintel/pages/DocintelReviewStartPage.tsx` — NEW; review job, source/version and
   expected-output decisions.
2. `src/modules/docintel/components/DocintelSourcePicker.tsx` — NEW; canonical selectable source list.
3. `src/modules/docintel/pages/DocintelHomePage.tsx` — Review starter navigation only.
4. `src/modules/docintel/pages/__tests__/DocintelReviewStartPage.test.tsx` — NEW.
5. `src/stories/audit-grade/22-DocintelReviewStart.stories.tsx` — NEW.

**Binary acceptance:** a user starts in at most three decisions; existing source and Upload paths
work; Start navigates to the chosen source's Findings view; no durable “review” record is claimed.

### SLICE 4A — Source Overview (2h, ADDITIVE)

**Purpose:** Opening a source communicates truthful review progress and next action rather than raw
extraction.

**Files to touch:**

1. `src/modules/docintel/components/DocintelWorkspaceOverview.tsx` — NEW; truthful counts/actions.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — Overview default and controlled view selection.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — NEW.
4. `src/stories/audit-grade/23-DocintelWorkspaceOverview.stories.tsx` — NEW.

**Binary acceptance:** no uncited summary is fabricated; title/status/version/upload/themes remain;
Overview counts/actions render only from existing data; Overview is the default.

### SLICE 4B — Contextual source and evidence (2h, NEUTRAL)

**Purpose:** Preserve readable source and exact evidence one click away without treating extraction
as the product.

**Files to touch:**

1. `src/modules/docintel/components/DocintelSourceDrawer.tsx` — NEW; compose Readable source and only
   the exact selected claim evidence with ADS Tabs inside `CatalystDrawer`; do not mount the full raw
   `EvidenceViewer` in the final user drawer.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — View source action and drawer state.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — drawer reachability/focus.
4. `src/stories/audit-grade/23-DocintelWorkspaceOverview.stories.tsx` — drawer states.

**Binary acceptance:** readable Document remains user-reachable; exact selected evidence remains
user-reachable; full raw Evidence remains temporarily available until Slice 10 moves it to Admin;
drawer closes on Escape, returns focus and hides technical citation machinery.

### SLICE 5A — Findings and five-destination workbench (2h, NEUTRAL)

**Purpose:** Make Findings a primary job and establish Overview, Ask, Findings, Deliverables and Work
items as the only top-level source destinations.

**Files to touch:**

1. `src/modules/docintel/components/DocintelFindingsPanel.tsx` — NEW JiraTable composition over the
   existing facts/review hooks.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — final five destinations and query-state
   navigation.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — reachability and keyboard
   assertions.
4. `src/modules/docintel/components/__tests__/DocintelFindingsPanel.test.tsx` — NEW.
5. `src/stories/audit-grade/24-DocintelFindings.stories.tsx` — NEW.

**Binary acceptance:** Facts becomes Findings with unchanged confirm/reject/reset payloads; Ask and
Deliverables retain their existing contracts; navigation is keyboard reachable.

### SLICE 5B — Work items and traceability composition (2h, NEUTRAL)

**Purpose:** Compose current Links and Traceability into one user job without losing either.

**Files to touch:**

1. `src/modules/docintel/components/DocintelWorkItemsPanel.tsx` — NEW; ADS Tabs compose Linked work
   and Traceability.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — mount final Work items destination.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — exact-once reachability.
4. `src/stories/audit-grade/24-DocintelFindings.stories.tsx` — Work items states.

**Binary acceptance:** existing link/unlink/origin behavior and traceability matrix are reachable;
Evidence, Document, Facts, Artifacts, Traceability, Ask and Links each map exactly once.

### SLICE 6A — Source Deliverable Studio (2h, NEUTRAL)

**Purpose:** Organize the exact 12 artifact values by user outcome inside the source workbench.

**Files to touch:**

1. `src/modules/docintel/components/artifactTypes.ts` — presentation group/description metadata only.
2. `src/modules/docintel/components/GenerationPanel.tsx` — grouped creation and canonical history.
3. `src/modules/docintel/components/__tests__/GenerationPanel.test.tsx` — NEW.
4. `src/stories/audit-grade/25-DocintelDeliverables.stories.tsx` — NEW.

**Binary acceptance:** all 12 exact values and generation payloads survive; empty, generating, error,
history, open and review states are covered.

### SLICE 6B — Project Deliverables hub (2h, ADDITIVE)

**Purpose:** Make existing outputs resumable across a project without violating the slug contract.

**Files to touch:**

1. `src/modules/docintel/pages/DocintelDeliverablesPage.tsx` — NEW project JiraTable with drawer detail.
2. `src/modules/docintel/domain/index.ts` — project artifact list read.
3. `src/modules/docintel/hooks/useDocintel.tsx` — project artifact query.
4. `src/modules/docintel/pages/__tests__/DocintelDeliverablesPage.test.tsx` — NEW.
5. `src/stories/audit-grade/25-DocintelDeliverables.stories.tsx` — project states.

**Binary acceptance:** source/title/type/review/grounding/updated state is truthful; details use a
drawer, not a UUID route; no edit/persistence capability is implied.

### SLICE 7 — Governed promotion and honest provenance (2h, NEUTRAL)

**Purpose:** Enforce the human boundary and represent work-created/link-failed truthfully.

**Files to touch:**

1. `src/modules/docintel/components/ArtifactView.tsx` — Promote only when approved.
2. `src/modules/docintel/components/PromoteArtifactModal.tsx` — persisted visible partial result and
   retry/recovery; never full-success on provenance failure.
3. `src/modules/docintel/components/__tests__/ArtifactPromotion.test.tsx` — NEW.
4. `src/test/edge/docintel-contracts.test.ts` — approval/provenance invariants.

**Binary acceptance:** draft/verified cannot promote; approved can; created-work/link-failed remains
visible with retry; created work is not silently deleted.

### SLICE 8A — Library and source identity (2h, ADDITIVE)

**Purpose:** Make uploaded document, Jira and git sources distinct and useful in Library.

**Files to touch:**

1. `src/modules/docintel/types.ts` — map proven `source_type` and only returned anchor metadata.
2. `src/modules/docintel/pages/DocintelLibraryPage.tsx` — canonical source/useful-state columns and filters.
3. `src/modules/docintel/pages/__tests__/DocintelLibraryPage.test.tsx` — NEW.
4. `src/stories/audit-grade/26-DocintelLibrary.stories.tsx` — NEW.

**Binary acceptance:** all three live types are distinct; useful state never invents review or
deliverable counts; existing project/theme filtering and row navigation survive.

### SLICE 8B — Truthful citation source identity (2h, ADDITIVE)

**Purpose:** Carry proven source identity and anchors into Ask and the source/evidence drawer.

**Files to touch:**

1. `src/modules/docintel/types.ts` — map only returned citation metadata.
2. `src/modules/docintel/components/AskPanel.tsx` — source identity/freshness in evidence view.
3. `src/modules/docintel/components/DocintelSourceDrawer.tsx` — truthful source/anchor labels.
4. `supabase/functions/docintel-ask/index.ts` — return source type/title/slug and proven anchors; no
   fabricated page, line or external URL.
5. `src/modules/docintel/components/__tests__/citationMarkers.test.tsx` — source cases.
6. `src/test/edge/docintel-contracts.test.ts` — citation contract.

**Binary acceptance:** document citations retain exact pages; Jira/git show only available anchors;
unknown metadata renders nothing; current citation marker resolution is unchanged.

### SLICE 8C — Dedicated Themes destination (2h, ADDITIVE/NEUTRAL)

**Purpose:** Make existing theme browse/create/tag capability discoverable without inventing theme
analytics or approved automatic conclusions.

**Files to touch:**

1. `src/modules/docintel/pages/DocintelThemesPage.tsx` — NEW existing theme list/create composition.
2. `src/modules/docintel/components/ThemeTags.tsx` — navigation affordance only if required.
3. `src/modules/docintel/pages/DocintelLibraryPage.tsx` — theme filter/deep-link integration.
4. `src/modules/docintel/pages/__tests__/DocintelThemesPage.test.tsx` — NEW.
5. `src/stories/audit-grade/27-DocintelThemes.stories.tsx` — NEW.

**Binary acceptance:** create/tag/untag/filter payloads remain unchanged; empty/populated/error
states work; no theme score, clustering approval or fabricated count is displayed.

### SLICE 9 — Admin authority and re-sync hardening (2h, SECURITY GATE)

**Purpose:** Secure global operations before any operational UI is relocated.

**Files to touch:**

1. `supabase/functions/docintel-sync/index.ts` — manual calls require the approved backend role and
   explicit project; cron/service-role path unchanged.
2. `src/modules/docintel/domain/index.ts` — `triggerReindex(projectId)`.
3. `src/modules/docintel/hooks/useDocintel.tsx` — scoped mutation.
4. `src/modules/docintel/pages/DocintelHealthPage.tsx` — explicit active project and sanitized errors.
5. `src/test/edge/docintel-contracts.test.ts` — 401, 403, wrong-scope, admin 200 and service-role cases.

**Binary acceptance:** ordinary member=403; approved authority=200 only for explicit project;
cron/service-role survives. Schema/RLS/grant change triggers a separate migration Plan Lock.

### SLICE 10 — Admin operations surface and final user cleanup (2h, NEUTRAL)

**Purpose:** Put processing detail where authorized operators expect it and remove machinery from
the normal journey only after Slice 9 passes.

**Files to touch:**

1. `src/routes/FullAppRoutes.tsx` — guarded `/admin/document-intelligence` route.
2. `src/lib/routes.ts` — Admin builder.
3. `src/components/admin/AdminSidebarV2.tsx` — navigation entry.
4. `src/modules/docintel/pages/DocintelAdminPage.tsx` — NEW; canonical tabs for sources/raw
   extraction, health and audit/retries, exposing only currently real controls/data.
5. `src/modules/docintel/pages/DocintelHealthPage.tsx` — reusable Admin composition and collapsed
   sanitized provider detail.
6. `src/modules/docintel/components/EvidenceViewer.tsx` — mount only in authorized Admin source
   inspection after the exact-evidence user path is proven.
7. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — remove the temporary full raw Evidence
   entry only after Admin inspection and contextual exact-evidence both exist.
8. `src/modules/docintel/pages/DocintelLibraryPage.tsx` — remove user Health entry only after Admin exists.
9. `src/modules/docintel/pages/__tests__/DocintelAdminRoute.test.tsx` — NEW.

**Binary acceptance:** approved operators retain health/retry/re-sync; ordinary users cannot reach
the route or operation; Home/Library/workbench show no extraction, prompt, queue, embedding or raw
provider machinery; raw extraction remains available to approved operators; all current user
capabilities remain reachable in the location mapped by the blueprint. Prompt/model management is
not shown until a separate permission Plan Lock secures its DB/API contract.

### V2.1 FILE AUTHORIZATION RULE

Each slice may touch only its explicit file list. All other repo files are forbidden for that slice.
A newly discovered necessary file, new package, schema/RLS/grant change, shared canonical-component
edit or payload change not stated above is a STOP and Plan Lock rebaseline.

## OBSOLETE V2.0 DRAFT SLICES — RETAINED FOR AUDIT ONLY, NOT EXECUTABLE

The A–G2 slices below were the first draft and are superseded by Active v2.1 above. They must not be
used for implementation or file authorization.

## ORDERED IMPLEMENTATION SLICES

### SLICE A — Outcome-first Home (2h, ADDITIVE)

**Purpose:** Make Doc Intel's value legible above the existing project/theme library without
removing the JiraTable, Upload action or existing Ask drawer fallback.

**Files to touch:**

1. `src/modules/docintel/components/AskPanel.tsx` — additive `mode="hero"` and optional starter
   prompts; preserve current inline behavior by default.
2. `src/modules/docintel/components/DocintelHomeHero.tsx` — NEW; ADS composer and BRD-first task
   starters only.
3. `src/modules/docintel/pages/DocintelDocumentsPage.tsx` — mount hero; keep project/theme filters,
   JiraTable, Upload and current Ask fallback.
4. `src/modules/docintel/components/__tests__/AskPanel.hero.test.tsx` — NEW.
5. `src/stories/audit-grade/21-DocintelHomeHero.stories.tsx` — NEW.

**Binary acceptance:** Hero dominates above the fold; project/document/theme Ask payload is
unchanged; existing list, row navigation, filter, upload, loading, error, empty and no-project states
remain reachable.

### SLICE B — Workspace Overview (2h, ADDITIVE)

**Purpose:** Opening a source answers “what can I do?” rather than defaulting to extracted pages.

**Files to touch:**

1. `src/modules/docintel/components/DocintelWorkspaceOverview.tsx` — NEW; summary, review state,
   source scope and navigation-only next actions.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — controlled ADS Tabs; add Overview as
   default while retaining all seven existing panels untouched.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — NEW.
4. `src/stories/audit-grade/22-DocintelWorkspaceOverview.stories.tsx` — NEW.

**Binary acceptance:** Overview actions only select existing destinations; title/status, versions,
new-version upload, theme create/tag and every old capability remain present.

### SLICE C — Consolidate the pipeline-shaped IA (2h, NEUTRAL)

**Dependency:** Slice B screenshots accepted.

**Purpose:** Replace seven equal implementation tabs with six job-level destinations while keeping
Evidence, Facts and Traceability available under Analysis.

**Files to touch:**

1. `src/modules/docintel/components/DocintelAnalysisPanel.tsx` — NEW; compose EvidenceViewer,
   FactsReviewPanel and TraceabilityMatrix behind secondary ADS Tabs.
2. `src/modules/docintel/pages/DocintelWorkspacePage.tsx` — primary tabs become Overview,
   Document, Deliverables, Ask, Linked work, Analysis.
3. `src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx` — assert every former
   capability is present and keyboard-reachable exactly once.

**Binary acceptance:** No component hook/callback changes; every former panel remains reachable;
Evidence is not the default; no capability removal.

### SLICE D — Deliverables by user goal (2h, NEUTRAL)

**Purpose:** Replace the flat 12-button developer panel with governed outcome groups while
preserving the exact artifact type and generation payload contract.

**Groups:** Understand; Plan; Validate and ship.

**Files to touch:**

1. `src/modules/docintel/components/artifactTypes.ts` — presentation group/description metadata
   only; exact values remain stable.
2. `src/modules/docintel/components/GenerationPanel.tsx` — canonical grouped selector with existing
   history/detail/generate behavior.
3. `src/modules/docintel/components/__tests__/GenerationPanel.test.tsx` — NEW.
4. `src/stories/audit-grade/23-DocintelDeliverables.stories.tsx` — NEW.

**Binary acceptance:** All 12 types remain selectable and send
`{projectId, documentIds:[documentId], artifactType}`; empty, generating, error, history and open
artifact states survive.

### SLICE E — Governed promotion and honest provenance (2h, NEUTRAL)

**Purpose:** Enforce the human decision boundary and prevent the UI from reporting complete success
when document-to-work provenance linking fails.

**Files to touch:**

1. `src/modules/docintel/components/ArtifactView.tsx` — promotion is available only for approved
   artifacts; verified/draft remain reviewable, not promotable.
2. `src/modules/docintel/components/PromoteArtifactModal.tsx` — record link failures, keep a partial
   result visible, provide retry/recovery, and never emit full-success toast on failed provenance.
3. `src/modules/docintel/components/__tests__/ArtifactPromotion.test.tsx` — NEW.
4. `src/test/edge/docintel-contracts.test.ts` — add approval/provenance invariants where applicable.

**Binary acceptance:** Draft/verified artifact cannot open Promote; approved artifact can; work item
success + link failure renders partial success with retry; no created work is silently deleted.

### SLICE F — Source identity and citation clarity (2h, ADDITIVE)

**Purpose:** Stop rendering 25 Jira issues and 2 git files as anonymous documents, and show source
identity inside the user trust layer without exposing block/model telemetry.

**Files to touch:**

1. `src/modules/docintel/types.ts` — map the existing `ai_documents.source_type`; extend citation
   response type only with fields actually returned.
2. `supabase/functions/docintel-ask/index.ts` — include `source_type`, slug/title and available
   source anchor metadata in citation payload; no invented external URL.
3. `src/modules/docintel/components/AskPanel.tsx` — source-type/freshness labelling in the existing
   evidence drawer.
4. `src/modules/docintel/pages/DocintelDocumentsPage.tsx` — visually distinguish document/Jira/git
   using canonical icons/text; keep JiraTable.
5. `src/modules/docintel/components/__tests__/citationMarkers.test.tsx` — extend source-type cases.
6. `src/test/edge/docintel-contracts.test.ts` — citation contract cases.

**Binary acceptance:** All three live source types render distinctly; document citations retain exact
page evidence; Jira/git citations show truthful available anchors and never fabricate a page, line
or external link.

### SLICE G1 — Admin authority and re-sync hardening (2h, BLOCKED UNTIL PLAN APPROVAL)

**Purpose:** Enforce the approved Admin authority before relocating any operational UI.

**Files to touch:**

1. `supabase/functions/docintel-sync/index.ts` — manual sweep requires the approved role and an
   explicit project scope; cron/service-role paths remain unchanged.
2. `src/modules/docintel/domain/index.ts` — `triggerReindex(projectId)`; no global `{}` user call.
3. `src/modules/docintel/hooks/useDocintel.tsx` — pass project scope through `useTriggerReindex`.
4. `src/modules/docintel/pages/DocintelHealthPage.tsx` — pass active project and sanitize user-facing
   provider failures.
5. `src/test/edge/docintel-contracts.test.ts` — unauthenticated, ordinary member, wrong-scope and
   valid-admin cases.

**Binary acceptance:** unauthenticated=401; ordinary member=403; approved admin authority=200 for an
explicit project; cron/service-role behavior unchanged. If a migration or new permission table is
required, STOP and create a separate migration Plan Lock.

### SLICE G2 — Admin relocation (2h, after G1)

**Purpose:** Remove embeddings/chunks/provider/prompt/job diagnostics from the normal user journey
without deleting operational capability.

**Files to touch:**

1. `src/routes/FullAppRoutes.tsx` — guarded `/admin/document-intelligence` route.
2. `src/components/admin/AdminSidebarV2.tsx` — canonical Admin navigation entry.
3. `src/modules/docintel/pages/DocintelDocumentsPage.tsx` — remove primary Knowledge Health action
   only after the Admin route exists; retain a sanitized needs-attention cue.
4. `src/modules/docintel/pages/DocintelHealthPage.tsx` — Admin diagnostics wording and collapsed /
   redacted raw provider error details.
5. `src/modules/docintel/pages/__tests__/DocintelAdminRoute.test.tsx` — NEW.

**Binary acceptance:** approved admins can reach operational detail; ordinary users cannot reach the
route or call the privileged operation; user Home contains no embeddings, prompts, queues, provider
payloads or raw extraction controls.

## OBSOLETE V2.0 FILES-FORBIDDEN SECTION — AUDIT HISTORY ONLY

- `src/modules/docintel/hooks/useDocintel.tsx`
- `src/modules/docintel/hooks/useDocintelHealth.ts`
- `src/modules/docintel/domain/index.ts`
- `src/modules/docintel/domain/governance.ts`
- `src/modules/docintel/types.ts`
- `src/modules/docintel/DocintelRoutes.tsx`
- `src/lib/routes.ts`
- `src/routes/FullAppRoutes.tsx`
- `src/components/admin/AdminSidebarV2.tsx`
- `src/components/layout/CatalystShell.tsx`
- `src/components/layout/WikiSidebar.tsx`
- `src/components/shared/JiraTable/JiraTable.tsx`
- `src/components/shared/JiraTable/index.ts`
- `src/modules/docintel/components/EvidenceViewer.tsx`
- `src/modules/docintel/components/FactsReviewPanel.tsx`
- `src/modules/docintel/components/TraceabilityMatrix.tsx`
- `src/modules/docintel/components/ArtifactView.tsx`
- `src/modules/docintel/components/PromoteArtifactModal.tsx`
- `src/modules/docintel/components/DocumentLinksPanel.tsx`
- Every file under `supabase/`

Later slices use only their explicit file lists. Any additional file requires a rebaseline.

## DATA AND SECURITY RULES

- Staging only: `cyijbdeuehohvhnsywig`, explicitly confirmed by Vikram on 2026-07-11 and verified
  against `supabase/.temp/project-ref`; never prod `lmqwtldpfacrrlvdnmld` in these slices.
- Do not read, print, persist or place the clipboard database password in commands, logs, feature
  artifacts or source. Use the existing authenticated Supabase tooling/secure prompt only when an
  approved slice actually requires it.
- `source_type` is proven live and NOT NULL on `ai_documents`; do not add a redundant column.
- No new analysis/conversation table in v2.
- Raw DB fields remain snake_case; mapped UI objects use their proven current contract.
- Admin UI guard and backend authorization must both pass.
- Do not rely on `ModuleGuard`/`ModuleGate` for backend security.
- Never expose service-role credentials or raw prompt/provider payloads to the user surface.
- `ai_agent_prompts` management is deferred: its current broad authenticated SELECT policy must be
  addressed by a separate RLS/grant Plan Lock before an Admin prompt/model UI is allowed.
- Current broad Doc Intel `SECURITY DEFINER` EXECUTE grants are a security finding. Do not expand
  them. Any change to grants/RLS requires a separate migration Plan Lock and anon/member probes.
- Jira/git anchors render only when present; zero-assumption rendering applies.

## UI / UX RULES

- ADS tokens only; no raw colors, Tailwind colors or local palettes.
- Canonical components first; no hand-rolled table, drawer, modal, tab, editor or status pill.
- Sentence-case labels.
- Citations remain user-facing; block/model internals do not.
- Background processing is quiet unless blocked or failed.
- “Not found in sources” remains a valid grounded result.
- English/Arabic direction, logical CSS and citation placement must survive.
- The strict targeted audit currently reports 43 pre-existing Doc Intel violations. Any touched
  file must fix its own matching violations before commit; ratchet-pass alone is not compliance.

## VALIDATION COMMANDS

All applicable commands must exit 0 or the slice stops:

```bash
npx tsc --noEmit
npx vitest run src/modules/docintel/components/__tests__/citationMarkers.test.tsx src/modules/docintel/components/__tests__/confidence.test.ts src/test/edge/docintel-contracts.test.ts
npx vitest run src/modules/docintel/pages/__tests__/DocintelRoutes.test.tsx src/modules/docintel/components/__tests__/DocintelIntentComposer.test.tsx src/modules/docintel/pages/__tests__/DocintelReviewStartPage.test.tsx
npx vitest run src/modules/docintel/pages/__tests__/DocintelWorkspacePage.test.tsx src/modules/docintel/components/__tests__/DocintelFindingsPanel.test.tsx src/modules/docintel/components/__tests__/GenerationPanel.test.tsx
npx vitest run src/modules/docintel/pages/__tests__/DocintelDeliverablesPage.test.tsx src/modules/docintel/components/__tests__/ArtifactPromotion.test.tsx src/modules/docintel/pages/__tests__/DocintelAdminRoute.test.tsx
npx vitest run src/modules/docintel/pages/__tests__/DocintelLibraryPage.test.tsx src/modules/docintel/pages/__tests__/DocintelThemesPage.test.tsx
npm run lint:colors:gate
npm run audit:ads:gate
npm run scan:ads-violations
npm run lint:accessibility
npm run test:a11y
npm run test:visual
node scripts/ads-contrast-gate.cjs --live --routes /doc-intelligence,/doc-intelligence/library,/doc-intelligence/audio-test-revenue-target
node design-governance/rules/audit.js <each-explicit-styled-file-touched-by-the-slice>
```

Slice-specific tests that do not exist yet are run only after their defining slice adds them.
The repo-wide `npm run audit:contrast` and directory-wide strict Doc Intel audit currently fail on
pre-existing debt, so they are evidence reports rather than impossible slice exit gates. A slice
must instead pass the live route contrast gate and strict audit for every styled file it changes.

Artifact contract gate:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/modules/docintel/components/artifactTypes.ts','utf8');for(const v of ['summary_en','summary_ar','epic','story','brd','gap_analysis','open_questions','business_process','acceptance_criteria','test_cases','release_notes','traceability'])if(!s.includes(v))process.exit(1)"
```

## SCREENSHOT CHECKLIST

- [ ] Home 1440×900 light/dark: composer dominant; Upload, project/theme scope and first recent/attention
      items visible without page overflow.
- [ ] Home 1280×720: composer, one starter and recent-work heading visible.
- [ ] Home no-project, empty, loading, error and active-theme states.
- [ ] Review start: three decisions maximum; existing source and upload paths.
- [ ] Library: uploaded document/Jira/git, filters, useful states and row actions.
- [ ] Themes: empty/populated/create/tag/filter states.
- [ ] Project Deliverables: empty/history/review-state/detail drawer.
- [ ] Workspace Overview light/dark with title/status/version/theme/upload preserved.
- [ ] Every primary destination plus Work items → Linked work/Traceability and contextual source/evidence.
- [ ] Deliverables empty, generating, error, history and opened artifact.
- [ ] English Ask with citations and evidence drawer; focus returns on Escape.
- [ ] Arabic Ask/answer/citations in RTL without truncation.
- [ ] Linked work empty/populated and unlink confirmation.
- [ ] Promotion approved, blocked, partial-link-failure and retry states.
- [ ] Admin authorized diagnostic view and non-admin denial.
- [ ] Zero new browser console errors on every captured route.

## ROLLBACK

- One atomic commit per slice; presentation slices A–F roll back with `git revert <slice-commit>`.
- G1 rollback must redeploy the prior staging function and re-probe cron/service-role/manual auth;
  never reopen the any-authenticated global sweep silently.
- G2 route/nav rollback is safe only while G1 security remains enforced.
- No data deletion or destructive migration is authorized by v2.

## STOP CONDITIONS

- Plan Lock not approved.
- Admin authority boundary not explicitly accepted or replaced.
- A slice needs a file outside its explicit list.
- A former capability becomes unreachable or needs a changed backend payload unexpectedly.
- A hand-rolled interactive primitive or new ADS debt appears.
- Any validation command exits non-zero.
- A screenshot shows horizontal page scroll, clipped CTA, missing focus state, dark-mode or RTL
  breakage.
- Source/citation UI invents unknown metadata.
- G1 requires schema/RLS migration without a separate Plan Lock.
- The 2-hour slice ends before tests and screenshots are complete.

---

## HISTORICAL BACKEND V2 ROADMAP (RETAINED, NOT ACTIVE)

---

## FULL-SCOPE ROADMAP (7 slices — Decisions 3-9)

| Slice | Theme | Closes | Key artifacts |
|---|---|---|---|
| **1** | Correctness bugs | confidence mis-scale, section_path NULL, fact-embedding→conflict detection | `confidence.ts`, `embed_stage.ts`, `docintel-analyze` |
| **2** | **MarkItDown spike (GATE)** | measures citation/page-fidelity of markdown conversion; verdict gates Slice 3 | scratch spike, fidelity diff report in `06_VALIDATION_EVIDENCE.md` |
| **3** | Universal ingestion | Word (fix 1-page collapse), Excel, PPT, image, audio — via MarkItDown per Slice 2 verdict | new `docintel-convert` service wiring, `docintel-ingest` |
| **4** | Prompt registry | hardcoded prompts → `ai_agent_prompts` (truthful provenance, tunable = fine-tuning enabler) | new migration, `docintel-analyze`/`docintel-generate` |
| **5** | Themes | `docintel_themes` create+tag+cluster-suggest+retrieval filter | new migration, new UI surface, `docintel_hybrid_search` theme param |
| **6** | Source adapters | Jira (`ph_issues`) + git/markdown into same RAG via `source_type` | additive `source_type` column, adapter edge fns, citation-anchor extension |
| **7** | Ops + proof + cleanup | Health failure banner, manual re-index button, promote-to-workitem e2e proof, link proof, `kb_*` deletion | `DocintelHealthPage`, `PromoteArtifactModal` proof, kb_* removal |

Each slice gets its own 2-hour timebox and its own detailed Plan Lock section appended here before
that slice starts. Slices 3-7 detail is deliberately deferred — Slice 2's spike verdict and
Slice 1's discovery answers reshape them.

---

## SLICE 1 — SUPERSEDED 2026-07-09 (drift: bugs already fixed + deployed)

> All three Slice 1 bugs were found already fixed in source (2026-07-07) and deployed live
> (generate v7 / analyze v7 / sync v6). Verified via live DB query 2026-07-09. Slice 1 became
> verify-only — no code changed. See `08_DRIFT_LOG.md` Drift Event 1. The detailed Slice 1 plan
> below is retained as the historical record; its "FILES TO MODIFY" were NOT modified.

## SLICE 1 (original plan — retained for record, NOT executed as code)

---

## OBJECTIVE

Slice 1 fixes the two self-documented correctness bugs (citation confidence mis-scale,
`docintel_match_facts` dead RPC) and resolves the three open discovery questions in
`02_CANONICAL_DISCOVERY.md` (theme-cache role, RAJiraSidePanel liveness, fact-embedding gap root
cause). "Done" = both bugs fixed and proven with a live re-query/re-probe, plus a written answer
to each open question that unblocks Slice 2 planning (themes UI, kb_* cleanup scope).

---

## NON-SCOPE

- Theme/collection browsing UI build-out (Slice 2, pending Q1 answer)
- Jira/git ingestion into the RAG pipeline (Slice 3)
- Manual re-index control, alerting, promote-to-work-item proof (Slice 3/4)
- `kb_*` deletion (Slice 4, pending Q2 answer)
- Any change to `ai_agent_prompts` registry wiring (separate slice — larger scope, touches every
  prompt call site)

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| `confidence.ts` helpers | `src/modules/docintel/components/confidence.ts` | Existing confidence-mapping logic; bug is in the mapping/scale, not a missing component — extend, don't replace |
| `embed_stage.ts` | `supabase/functions/_shared/embed_stage.ts` | Existing shared embedding helper; fact-embedding fix belongs here if root cause is a missing call, not new infra |

No new canonical components required for Slice 1 — this is a bug-fix slice.

---

## CANONICAL SCREENS SELECTED

| Screen | Route | Adapter needed |
|---|---|---|
| Ask panel / Artifact view | `/doc-intelligence/:slug` (Ask tab, Artifacts tab) | No — confidence display fix is in-place |
| Facts review | `/doc-intelligence/:slug` (Facts tab) | No |

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/modules/docintel/components/confidence.ts` | edit | Fix confidence-to-display scale so citation confidence matches actual grounding score |
| `supabase/functions/_shared/embed_stage.ts` | edit (pending root-cause read) | Add missing embedding call for `ai_requirement_facts`, if that's the root cause |
| `supabase/functions/docintel-analyze/index.ts` | edit (pending root-cause read) | Wire fact extraction → embedding if currently skipped |
| `docs/audits/doc-intel-current-state-discovery.md` | edit | Update §7 P0 items to reflect fixed status once proven live |

Exact file list for the fact-embedding fix is **pending** the Slice 1 discovery-question pass
(see `02_CANONICAL_DISCOVERY.md` open questions) — do not start coding until that read is done and
this table is updated to reflect the actual root cause.

---

## FILES FORBIDDEN

- `src/services/knowledgeBase.ts`, `src/pages/KBAdminSetup.tsx`, `src/pages/KBDataAudit.tsx`,
  `supabase/functions/kb-*` — legacy `kb_*` track, out of scope until Slice 4
- `src/modules/docintel/domain/index.ts` structural changes beyond what the two bug fixes require
- Any `ai_*` migration that isn't additive (no destructive schema changes)
- Any file in `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/` (historical record, don't edit)

---

## UI/UX RULES

- All colors: ADS tokens only (`var(--ds-*)`)
- No hand-rolled UI
- ADS spacing grid: 4/8/16/24/32px only
- Sentence-case labels
- Dark mode: verify by reload-into-dark
- Run color-law grep before commit (per repo CLAUDE.md)

---

## DATA/BACKEND RULES

- DB columns verified to exist: `ai_requirement_facts` columns to be confirmed via
  `mcp__supabase__list_tables` before editing embedding logic (staging `cyij` only — never prod)
- Field access: snake_case raw DB rows, camelCase mapped objects
- No assumption defaults
- RLS impact: none expected (read/embed existing rows, no new access patterns)
- Migration required: possibly, if `ai_requirement_facts` lacks an embedding column — verify first,
  do not assume

---

## INTEGRATION/WIRING RULES

- React Query hooks to use: `useRequirementFacts`, `useUpdateFactReview` (existing, in
  `useDocintel.tsx`) — no new hooks expected for the confidence fix
- New hooks required: none for Slice 1
- Edge functions involved: `docintel-analyze` (possible edit), `_shared/embed_stage.ts` (possible edit)
- Props/interface contracts: `confidence.ts` exports (`confidenceAppearance`, `groundingAppearance`,
  `pctLabel`) are covered by `confidence.test.ts` — any signature change must keep that test green
  or update it deliberately, not incidentally

---

## PARALLEL EXECUTION PLAN

**Phase 1 — Discovery (parallel, Slice 1 kickoff):**
- Agent: read `ai_theme_cache` schema + all code references (answers Q1)
- Agent: trace `RAJiraSidePanel.tsx` live usage / reachability (answers Q2)
- Agent: read `docintel-analyze/index.ts` + `embed_stage.ts` fact-extraction path (answers Q3)

**Phase 2 — Fix:**
- Fix confidence scale bug (isolated, no dependency on Phase 1 answers)
- Fix fact-embedding gap per Q3 answer

**Phase 3 — Validation:**
- Re-run live DB spot-check on `ai_document_embeddings`/new fact embeddings (staging `cyij`)
- Re-probe Ask/Artifact citation confidence display live at `localhost:8080`
- Re-run `confidence.test.ts` and any new/updated vitest

**Phase 4 — Documentation:**
- Update `06_VALIDATION_EVIDENCE.md` with proof
- Update `docs/audits/doc-intel-current-state-discovery.md` P0 section

---

## SCREENSHOT CHECKLIST

- [ ] Before: citation confidence showing mis-scaled value
- [ ] After: citation confidence showing corrected value
- [ ] Before: Facts tab / requirement facts semantic search non-functional (or docintel_match_facts
      empty result)
- [ ] After: fact match returning results
- [ ] Dark mode check on both

---

## VALIDATION COMMANDS

```bash
# Run before commit
npx tsc --noEmit
npx vitest run src/modules/docintel/components/__tests__/confidence.test.ts
npx vitest run src/test/edge/docintel-contracts.test.ts
npm run lint:colors:gate
```

Plus a live Supabase read-only spot-check (staging `cyij` only) confirming
`ai_requirement_facts` embeddings are non-null post-fix, and a live browser re-probe of the
Ask/Artifact citation confidence display.

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Root cause of the fact-embedding gap turns out to require a schema migration touching RLS
  (bigger than a 2-hour slice)
- `confidence.ts` signature change would break more than the one known test file
- Any live query touches prod (`lmqwtldpfacrrlvdnmld`) instead of staging (`cyijbdeuehohvhnsywig`)
- Slice exceeds 2 hours

---

## DRIFT/REBASELINE RULES

If this Plan Lock is superseded mid-slice:
1. Stop
2. Document drift in `08_DRIFT_LOG.md`
3. Get rebaseline approval from Vikram
4. Update this file status to SUPERSEDED
5. Create a new Plan Lock for the rebaselined scope

---

## SLICE 4 — Prompt registry (DRAFT, next code slice — awaiting go-ahead)

**Status:** DRAFT — awaiting Vikram go-ahead. First slice that changes code + schema + requires deploy.
**Timebox:** 2 hours (may split if deploy/verify overruns).

### Discovery findings (live `cyij`, 2026-07-09)
- `ai_agent_prompts` exists, 10 rows, ALL `"PLACEHOLDER — set in slice 10"` (never filled).
- Real prompts hardcoded inline: `docintel-analyze` (`SYSTEM_PROMPT`, `TRANSLATE_SYSTEM_PROMPT`),
  `docintel-generate` (`systemPrompt(type)`, `FACTS_SYSTEM_PROMPT`), `docintel-ask` (`systemPrompt(arabic)`).
- `ai_agent_runs` (24 rows) stamps `agent`/`provider`/`model` but NO `prompt_id` — no run→prompt link.

### OBJECTIVE
Make the prompt registry the runtime source of truth AND make provenance truthful. "Done" =
(1) `ai_agent_prompts` holds the ACTUAL prompts (backfilled from the current inline constants,
versioned, is_active); (2) all 3 edge functions load the active prompt from the registry at runtime,
falling back to an inline default only if the row is missing; (3) every `ai_agent_runs` row stamps
the `prompt_id` + version actually used; (4) deployed + verified live that a run references a real
(non-placeholder) prompt row. This also delivers the fine-tuning enabler — prompt edits become an
`UPDATE` + version bump, no redeploy.

### NON-SCOPE
- Changing prompt *content/wording* (behaviour must stay identical — backfill = byte-faithful copy
  of the current inline prompts, so extraction/generation quality does not drift). Actual tuning is
  a later, separate act once the mechanism is live.
- A prompt-editing admin UI (future slice — DB-level tuning is enough to unblock fine-tuning now).
- Any change to `docintel-sync`/`docintel-ingest` (no LLM prompts there).

### FILES TO MODIFY
| File | Change |
|---|---|
| `supabase/migrations/<new>_docintel_prompt_registry.sql` | additive: backfill `ai_agent_prompts` with real prompts (byte-faithful from edge fns, version 2, is_active, deactivate placeholders); add `prompt_id uuid` + `prompt_version int` to `ai_agent_runs` if absent |
| `supabase/functions/_shared/docintel.ts` (or new `_shared/prompts.ts`) | add `loadActivePrompt(admin, agent)` helper: reads active row, returns `{id, version, prompt}` or inline fallback |
| `supabase/functions/docintel-analyze/index.ts` | replace `SYSTEM_PROMPT`/`TRANSLATE_SYSTEM_PROMPT` inline use with registry load; stamp prompt_id on its `ai_agent_runs` inserts |
| `supabase/functions/docintel-generate/index.ts` | same for `systemPrompt(type)` + `FACTS_SYSTEM_PROMPT` |
| `supabase/functions/docintel-ask/index.ts` | same for `systemPrompt(arabic)` |

### FILES FORBIDDEN
- Anything under `src/` (this slice is edge-fn + schema only; no frontend change)
- `docintel-sync`, `docintel-ingest`, `kb_*`
- The intentional NUL-byte `dedupeKey` region in `docintel-generate` (deploy byte-faithfully)

### DATA/BACKEND RULES
- Migration is ADDITIVE only (backfill rows + nullable columns). No destructive change.
- Backfill prompts must be byte-faithful copies of the current inline constants — diff before/after.
- Verify `ai_agent_runs` lacks `prompt_id` before adding (idempotent `ADD COLUMN IF NOT EXISTS`).
- Staging `cyij` only. Never prod `lmqw`.

### INTEGRATION/WIRING RULES
- Registry load is best-effort with inline fallback → an empty/failed registry NEVER breaks
  ingestion or Q&A (resilience first).
- `loadActivePrompt` keyed by the existing `agent` values already used in `ai_agent_runs`
  (`structuring`, `translation`, `epic`, `story`, `brd`, `summary`, `ask`/`retrieval`, etc.) — map
  each inline prompt to its registry `agent` key.

### VALIDATION COMMANDS
```bash
npx tsc --noEmit
# deno lint on touched edge fns if available
```
Plus live proof (staging `cyij`): after redeploy + one Ask + one Generate, query that the new
`ai_agent_runs` rows carry a `prompt_id` pointing at a non-placeholder `ai_agent_prompts` row, and
that answer/artifact quality is unchanged vs pre-slice (regression guard).

### STOP CONDITIONS
- Backfilled prompt differs byte-wise from the inline constant (would change behaviour) → stop, re-diff.
- Edge-function deploy hits the quota/payment blocker again → stop, report (same blocker as prior feature).
- Any registry-load path that could throw and break ingestion/Q&A → stop, add fallback first.

### DEPLOY NOTE
Requires deploying 3 docintel edge functions + applying 1 migration to staging `cyij`. Deploy +
prod-DB targeting rules (CLAUDE.md) apply. Await explicit go-ahead before code.

---

## SLICE 2 (SPIKE — GATE, detailed now because it decides Slice 3)

**Objective:** Determine whether Microsoft MarkItDown can serve as Catalyst's universal ingestion
front-door WITHOUT regressing per-claim page/block citation fidelity — DocIntel's crown-jewel
differentiator. Spike only. No production wiring. Verdict = go/no-go for Slice 3 adoption breadth.

**Method (measure, don't adopt):**
1. Stand up `markitdown` locally (Python, isolated venv in scratchpad — NOT added to repo deps).
2. Convert a representative set through BOTH paths and diff:
   - one native-text PDF (has real pages) — current path vs MarkItDown
   - one .docx (the 1-page-collapse failure case) — current mammoth path vs MarkItDown
   - one .xlsx, one .pptx, one image, one short audio clip (MarkItDown only — current path can't)
   - one scanned-Arabic PDF (current Gemini-vision path vs MarkItDown OCR) — expect MarkItDown loses
3. For each, score: (a) does output retain page boundaries? (b) heading/section structure? (c) table
   fidelity? (d) can a citation still resolve to a locatable anchor in the source?

**Acceptance gate for Slice 3 adoption:**
- PASS (adopt as universal front-door for non-scanned-Arabic): MarkItDown output preserves enough
  page/heading anchoring that citations can still resolve. Gemini kept for scanned-Arabic.
- PARTIAL (adopt for non-cited media only): grounding degrades; use MarkItDown for pptx/audio/image
  where page-citation matters less, keep current path for PDF/docx.
- FAIL (reject): no fidelity path survives — close the gap in-house instead (better docx parser).

**Deliverable:** fidelity diff table written to `06_VALIDATION_EVIDENCE.md` + a one-line verdict in
`09_DECISIONS.md` (new decision entry) that rewrites Slice 3's Plan Lock detail.

**Non-scope for the spike:** any change to production edge functions, any repo dependency addition,
any Supabase write. Pure local measurement.

**Stop condition:** if standing up MarkItDown needs system-level installs that touch the user's
machine beyond a scratchpad venv → stop and ask before proceeding.
