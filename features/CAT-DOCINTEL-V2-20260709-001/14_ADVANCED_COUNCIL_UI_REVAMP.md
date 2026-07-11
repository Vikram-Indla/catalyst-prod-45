# ADVANCED COUNCIL VERDICT v3 — Doc Intel BRD Review Workbench

**Feature Work ID:** CAT-DOCINTEL-V2-20260709-001
**Debate mode:** WR
**Evidence quality:** HIGH — live UI, code, staging schema/policies/functions, Mobbin and official sources
**Implementation authorized:** NO — Plan Lock and Admin authority await Vikram approval

## Executive verdict

**PROCEED WITH MODIFICATIONS.** Choose Option B: a BRD Review Workbench on the existing substrate.
Use Rovo's intent-first pattern for Home, NotebookLM's bounded workspace, Elicit's structured review,
Dovetail's evidence-to-insight discipline and Productboard's governed work handoff. Do not build a
pixel clone, generic chat shell or cosmetic reskin.

**One non-negotiable:** the first screen and default source view must express the user job—review a
BRD and turn accepted findings into traceable work—not the extraction pipeline.

## Options debated

| Option | Verdict | Reason |
|---|---|---|
| A. Cosmetic Rovo-style reskin | REJECT | Preserves unsafe governance and backend-shaped IA |
| B. BRD Review Workbench on existing substrate | ACCEPT | Highest user-value gain with additive/neutral slices and no initial schema expansion |
| C. New persistent analysis/collaboration platform | DEFER | Valuable, but adds schema, lifecycle, permissions and migration risk before the product model is validated |

## 1. Repository and branch context

- Branch: `main`; observed HEAD `b4c4998bb`.
- Active feature folder: this directory; active Plan Lock is v2 at the top of `03_PLAN_LOCK.md`.
- User routes in scope: `/doc-intelligence`, source workspace, upload, and current health entry.
- Admin target: guarded `/admin/document-intelligence`, contingent on backend authorization.
- Existing unrelated untracked TestHub session file is outside scope and must remain untouched.

## 2. Canonical component map

- Shell/header: `AtlaskitPageShell`, `PageHeader`.
- Lists: `JiraTable` with `CatalystListPageLayout`; no custom table/grid list.
- Evidence/source inspection: `CatalystDrawer`.
- Peer views: ADS Tabs; Work items nests Linked work/Traceability, while source/evidence remains a
  keyboard-accessible contextual drawer.
- States/status: ADS EmptyState, Spinner, SectionMessage and canonical lozenges.
- Promotion: extend `PromoteArtifactModal` and `ProposalTable`.
- Rich editing: defer; if approved later, use `AtlaskitEditor` with an explicit ADF contract.
- Explicit non-reuse: domain-coupled `UnifiedLinksTab`, `HubItemDetailPage`, `CatalystDetailPanel`,
  `SurfaceCard`, and `CatyIconCTA` as the primary composer action.

## 3. Functionality preservation report

Required verdict is **ADDITIVE or NEUTRAL**. Preserve upload/versioning, extraction/translation,
grounded Ask, citations/evidence, facts review, all 12 artifact values, artifact history/detail,
approval/rejection, promotion, links, themes, traceability, loading/error/empty states and bilingual
behavior. Facts becomes Findings; Links/Traceability compose Work items; Document/Evidence compose
the contextual source drawer. Each former capability remains reachable exactly once.

## 4. ADS and design-governance report

- `lint:colors:gate`: pass at discovery time.
- `audit:ads:gate`: pass at discovery time.
- Strict Doc Intel directory audit: 43 pre-existing findings, mainly spacing.
- Therefore every touched styled file must pass the strict targeted audit; a ratchet pass alone is
  insufficient. Live scoped contrast, accessibility, RTL, dark mode and screenshot gates apply.
- No raw colors, Tailwind palettes, local status pills, custom drawers/modals/tabs/tables or
  decorative “AI dashboard” widgets.

## 5. Dark mode and RTL report

The live content is bilingual, so RTL is functional scope. Composer direction, answer prose,
citation markers, drawers, grouped deliverables and workbench navigation must use logical layout,
retain reading order and avoid truncation. Every primary screen requires light/dark evidence and an
Arabic Ask/citation screenshot.

## 6. Data, schema and RLS report

- Live `ai_documents.source_type` is NOT NULL; do not add a duplicate column.
- Live mix: 25 Jira, 4 document and 2 git sources; the frontend type currently hides the distinction.
- Facts/themes/artifacts exist; five facts were unreviewed and only one artifact was promoted in the
  read-only snapshot.
- Several policies authorize by project membership rather than review/admin role.
- `ai_agent_prompts` SELECT was visible to authenticated users; themes allowed project-member writes.
- Numerous public Doc Intel SECURITY DEFINER functions had broad executable grants. Do not expand
  them; any grant/RLS change requires its own migration Plan Lock and negative probes.

## 7. Blast-radius report

- Slices A–D are presentation-only and explicitly forbid hooks, domain, routes, shared tables and
  Supabase files.
- Slice E changes promotion eligibility and partial-success communication only.
- Slice F changes a proven source/citation contract and therefore requires frontend plus edge tests.
- G1 is security-sensitive and precedes G2; moving Health before authorization is forbidden.
- Shared canonical components must not be edited for this feature.

## 8. UX and parity report

Rovo is the correct front-door reference, not the whole workspace. The target journey is:
For you → three-decision review start or scoped source → Overview/Ask/Findings/Deliverables/Work
items → approve → promote with provenance. Raw extraction is subordinate evidence. The complete
comparison is in `13_DOCINTEL_UI_REVAMP_STUDY.md`; the screen contract is in
`15_SCREEN_BLUEPRINT_AND_LOCK_DECISIONS.md`.

## 9. Accessibility report

One H1 per page; labels and descriptions for the composer; visible focus; ADS tab keyboard behavior;
drawer focus return on Escape; status not color-only; semantic headings for task groups; readable
source/citation labels; no horizontal page scroll at 1280×720; reduced-motion safe behavior.

## 10. Security and privacy report

The current user-triggered global re-sync accepts an authenticated caller and performs a
service-role-backed sweep. UI relocation is not a fix. G1 must require explicit project scope and
the approved backend role while preserving cron/service-role behavior. Provider errors, prompts,
embeddings and block telemetry stay out of user pages. Exact user-verifiable citations stay in.
Prompt/model controls remain deferred until their broad DB access policy is separately Plan-Locked.

## 11. Test and evidence report

Each slice requires focused Vitest coverage, TypeScript, color/ADS ratchets, targeted strict ADS
audit for touched files, live route contrast, accessibility/visual tests, browser console inspection
and the screenshots in `10_SCREENSHOT_CHECKLIST.md`. Promotion tests must cover draft, verified,
approved, created-work/link-failed and retry states. Admin tests must prove 401/403/200 boundaries.

## 12. Rollback report

One atomic commit per approved slice; presentation slices are independently revertible. G2 may be
reverted only while G1 remains secure. A G1 rollback must redeploy the prior staging function and
re-probe manual, cron and service-role paths. No destructive migration or data deletion is allowed.

## 13. Surprise recommendation

**ACCEPT as product framing:** call the core output a “Review dossier” or “Decision-ready document,”
not an extraction. Make the visible progression Source → Findings → Deliverable → Approved work.

**DEFER as implementation:** a persistent analysis/conversation entity and rich BRD editor. These
would improve continuity, but should be separately measured after the additive journey validates
that users understand and complete the review job.

## 14. VeriMAP Plan Lock

The executable contract is the active v2 section of `03_PLAN_LOCK.md`. It contains objective,
non-scope, exact file allowlists/forbidden files, canonical choices, security/data rules, seven
two-hour slices, binary acceptance, validation, screenshots, rollback, drift rules and stop
conditions. It remains DRAFT until the Admin authority boundary is accepted or replaced.

## 15. Post-completion report

Not applicable. No implementation occurred in this council pass. At completion, evidence must map
each Plan Lock criterion to a test, live probe or screenshot; confidence is not evidence.

## Advisor panel synthesis

| Advisor | Decision |
|---|---|
| Product strategist | Lead with the BRD review job, not “document intelligence” machinery |
| Information architect | Overview default; Findings primary; source/evidence contextual; traceability with Work items |
| Canonical component architect | Compose ADS/Catalyst primitives; JiraTable remains mandatory |
| UX critic | Current blank Ask and flat artifact grid fail discoverability and hierarchy |
| Integration architect | Preserve payloads in A–D; source/citation changes are isolated in F |
| Data/safety guard | No schema needed initially; source_type already exists; guard RLS/grants |
| Security advisor | Backend-authorize re-sync before Admin relocation |
| Accessibility advisor | Keyboard tabs/drawer, RTL evidence and non-color status are release gates |
| QA/screenshot validator | Prove states and capability reachability, not just happy-path polish |
| Implementation planner | Seven bounded slices; stop on any extra file or payload drift |
| Performance/viewport specialist | Keep Home useful at 1280×720 and avoid loading all detail eagerly |
| Editor specialist | Defer rich editing until ADF persistence/conversion is explicit |
| Workflow specialist | Promotion requires approval and honest partial-provenance state |
| Executive-report specialist | Organize deliverables by decision outcome, not internal artifact enum |
| Sync/integration specialist | Preserve identities and render only proven Jira/git anchors |

## Decision required

To lock v2, approve or replace this recommended Admin authority:
`legacy admin OR product super_admin` for global processing/re-sync/prompt/model/audit controls.
Project-member permissions otherwise remain governed by existing project RLS until separately
Plan-Locked.
