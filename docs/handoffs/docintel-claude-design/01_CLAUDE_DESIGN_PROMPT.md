# Prompt 1 — Claude Design

You have received six attachments: two current DocIntel screenshots, two Rovo reference
screenshots, one real Arabic BRD PDF, and one Catalyst code-context ZIP. Confirm that you can open
all six before designing. If any file is missing or unreadable, stop and name it. Do not infer its
contents.

## Your assignment

Revamp the existing Catalyst Document Intelligence product. This is a working-product redesign,
not a greenfield concept, generic AI chat, or Rovo clone. Produce implementation-ready design and
frontend code that Codex can reconcile into the supplied repository.

Product promise:

> Review a BRD, understand what matters, resolve findings, and turn accepted outcomes into
> traceable Catalyst work.

DocIntel's value is not extraction. It turns documents, Catalyst/Jira work, tests and delivery
evidence into grounded answers, reviewable findings, cited deliverables and governed work.

## First: critique what exists

Use the two current DocIntel screenshots. Explain concretely why the Evidence and Document screens
fail to communicate customer value. Identify hierarchy, comprehension, density, empty-space,
navigation, trust and action problems. Do not merely say the UI is outdated.

Use the Rovo screenshots only as interaction references. You may borrow its intent composer,
visible specialist selection and Recent work. Reject its generic blank-chat product model,
third-party launcher row, agent marketplace complexity, promotional cards and empty canvas.

## Required design exploration

Create six meaningfully distinct directions, not six visual skins:

1. Intelligence Command Center — DocIntel Home.
2. BRD Review Workbench — structured review of a source.
3. Change Impact Canvas — business, delivery, regression and test consequences.
4. Contextual Intelligence Sidecar — Project/work-item/Folio/TestHub entry.
5. Governed Deliverable Studio — cited output, approval and publication.
6. Test Quality Reviewer — requirements-to-test comparison.

For each show persona, entry point, user job, information hierarchy, core workflow, output,
premium differentiator, implementation dependency and failure risk. Mark each as:

- BUILD NOW — supported by current code/data.
- DESIGN NOW / BUILD LATER — valuable but missing a current contract.
- FUTURE — not part of this build.

Recommend a composite rather than forcing one direction to serve every job.

## Build-now information architecture

Global:

- For you / Command Center
- Library
- Themes
- Deliverables

Source workbench:

- Overview
- Ask
- Findings
- Deliverables
- Work items: Linked work and Traceability

Contextual drawer:

- Readable source
- Exact selected evidence

Authorized Admin:

- Sources and raw extraction
- Processing health
- Audit, retries and re-sync

Impact Canvas, contextual Sidecar and Test Quality Reviewer must be designed, but clearly labeled
Design Now / Build Later unless the ZIP proves the required contracts exist.

## Real data contract

Use the attached Arabic BRD as the primary content. The corresponding staged DocIntel record is:

- slug: `raw-materials-brd-arabic-real`
- title: `Raw Materials BRD (Arabic, real)`
- original file: `وثيقة متطلبات الاعمال - عرض وطلب المواد الخام_V.2.pdf`
- state: Ready
- pages: 24
- blocks: 616
- searchable chunks: 355
- requirement facts: 5
- generated artifacts: 3
- document links: 2
- unresolved extraction issues: 0

The truthful Catalyst work context is:

- key: `BAU-5963`
- project: Senaei BAU
- type: Epic
- summary: `Raw materials Challenges`
- status: Backlog
- priority: Medium
- a real PDF attachment exists

Important: the current processed document is incorrectly linked to unrelated `BAU-6155`. Show
`Linkage needs reconciliation`; do not display BAU-6155 as valid context and do not pretend the
database has been repaired.

Only render supplied or persisted values. Unknown values render nothing. Do not invent Jira URLs,
Git refs, source freshness, review counts, impact percentages, readiness scores or approval owners.

## Existing functionality that cannot be lost

- Project and source scoping.
- Upload and existing source URLs.
- English, Arabic and side-by-side readable document.
- Grounded Ask with exact citations.
- Findings confirm/reject/reset.
- All 12 existing deliverable types and generation payloads.
- Artifact review and approval.
- Approved-only promotion.
- Durable partial-promotion recovery.
- Document links and link origin.
- Traceability matrix.
- Versions.
- Themes and tagging.
- Document, Jira and Git source identity.
- Health, retry and re-sync for authorized Admin.

## Catalyst design constraints

Read the code ZIP before producing components. Reuse the supplied Catalyst components and ADS
primitives. Use `AtlaskitPageShell`, `PageHeader`/`ProjectPageHeader`,
`CatalystListPageLayout`, `JiraTable`, `CatalystDrawer`, ADS Tabs, ADS forms, ADS EmptyState,
Spinner, SectionMessage, Lozenge, `ProposalTable` and existing DocIntel components.

Do not hand-roll tables, tabs, menus, modals, drawers, navigation, breadcrumbs, pills, sidebars,
avatars or empty states. Do not add packages. Do not use hardcoded colors, RGB/HSL, Tailwind color
utilities, arbitrary type scales or a second styling system. Use ADS tokens. Support light/dark,
keyboard use, visible focus, responsive layout and mixed Arabic RTL/English identifiers.

Premium quality must come from calm hierarchy, contextual scope, evidence proximity, progressive
disclosure and clear next action—not glassmorphism, gradients or decorative dashboards.

## CRE build constraint

Any work-item create, parent or work-item-to-work-item link must use `@/lib/catalyst-rules`.
Creation must be filtered/validated by module. Parenting must use the allowed-child APIs.
Work-item links must use `canLinkTo` through the canonical linking path. Do not apply Grid C to
document-to-entity records stored in `ai_document_links`.

The existing `PromoteArtifactModal` currently creates and parents Epic/Story without CRE
enforcement. Your handoff must identify this as a required correction, not copy it as a pattern.

## Required screens and states

Design high-fidelity, connected states for:

1. First-time Command Center.
2. Returning Command Center with truthful recent sources/deliverables.
3. BAU-5963 contextual entry.
4. Review start with the Arabic BRD.
5. Source Overview.
6. Findings and decision state.
7. Exact citation opened to the source page.
8. Grounded Ask result.
9. Unsupported-answer refusal.
10. Deliverable creation, history and approval.
11. CRE-governed publish.
12. Partial publish and recovery.
13. Library.
14. Themes.
15. Authorized Admin.
16. Loading, empty, stale, error and permission-denied.
17. Desktop light, desktop dark, narrow responsive and Arabic RTL.
18. Concept-only Impact Canvas, Sidecar and Test Quality Reviewer.

## Required output

Return one downloadable package containing:

1. Current-state critique tied to the supplied screenshots.
2. Six concept directions and a comparison matrix.
3. Recommended composite architecture.
4. Complete connected screen set and interaction notes.
5. Design tokens and canonical-component inventory.
6. Screen → component → data field → action mapping.
7. CRE action matrix.
8. Loading/empty/error/permission/recovery states.
9. Accessibility, keyboard, responsive, dark-mode and RTL specification.
10. Frontend TSX/CSS or design-to-code export using the supplied architecture.
11. File manifest labeled RETAIN, UPDATE, ADD, MOVE, DELETE or DEFER.
12. Before/after responsibility for every changed file.
13. Dependency and asset manifest proving no new package is required.
14. Ten-item self-criticism of your own recommendation.

Do not claim the product has been implemented. Codex will verify and integrate the output against
the live repository.

