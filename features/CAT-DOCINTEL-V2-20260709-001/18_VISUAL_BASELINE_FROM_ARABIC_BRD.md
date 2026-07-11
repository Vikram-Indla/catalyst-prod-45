# Visual Baseline — Knowledge-first Doc Intel

**Feature Work ID:** CAT-DOCINTEL-V2-20260709-001
**Date:** 2026-07-11
**Status:** Approved by user 2026-07-11; no source implementation

## Revised mental model

Doc Intel has two products sharing one engine:

1. **Knowledge experience:** theme-scoped, persona-aware Ask; document qualification; reviewed
   findings; meaningful business outputs; project-context handoff.
2. **Knowledge operations:** connectors, extraction/Markdown, indexing, freshness, deduplication,
   failures, retries and provider/model diagnostics.

The user experience never foregrounds extraction blocks, chunks, embeddings, confidence math,
provider state or queue mechanics. Exact source evidence remains available on demand when validating
a claim or asking for traceability.

## Required user-facing surfaces

- For you: Rovo-like theme/persona Ask and next work requiring attention.
- Knowledge base: sources grouped by theme, project and source identity with freshness and ingestion
  coverage (“already known” versus “new/changed”).
- Themes: machine-suggested knowledge pockets with human confirmation.
- Document workspace: Overview, Ask, Findings, Deliverables, Work items; readable source/evidence on demand.
- Deliverable qualification: no BRD/Epic/Test output until the corresponding input criteria pass.
- Project-context creation: every work output previews target project/type/fields and evidence backlink.

## Required Admin surfaces

- Catalyst/Jira/attachment/document/Git source connections and permission scope.
- Sequential or incremental collection with a visible knowledge-cut timestamp.
- Page/section-aware conversion, Markdown where appropriate, indexing and theme suggestion.
- Source identity, deduplication and per-document ingestion coverage.
- Processing health, raw extraction, failures, retries and audit.
- Git provider connector gap: current git adapter is not a repository fetch/sync integration.

## BRD qualification contract

Page count or token volume alone never qualifies a BRD. Minimum gates:

- purpose and business outcome;
- in/out scope;
- stakeholders/personas and ownership/RACI;
- business rules and scenario/use-case coverage;
- permissions;
- non-functional requirements;
- assumptions, dependencies, risks and open questions;
- reviewer and approval state;
- sufficient traceable source material for every generated section.

If a gate is absent, Doc Intel explains what is missing and asks for it; it does not fabricate a BRD.

## Arabic BRD evidence

The supplied 29-page Arabic BRD (`وثيقة متطلبات الاعمال - عرض وطلب المواد الخام_V.2.pdf`) proves the
target workflow:

- clear purpose and terminology;
- in/out scope;
- stakeholder/RACI content;
- UC001–UC009;
- permission matrix;
- NF001–NF005;
- reviewer/approval fields that require completion.

Recommended theme: **Raw materials marketplace**. The system suggests the placement; a user confirms it.

## Screen critique closure

Current Evidence view is an Admin extraction inspector mislabeled as the product. Current Document
view is a sparse translated-text container. Seven entity tabs force the user to reverse-engineer the
backend. READY/EXTRACTED/CONF labels communicate processing, not value. The replacement default is a
truthful Overview with coverage, readiness, attention and next action; evidence is summoned only when
needed.

## Visual decision surface

The interactive visualization `docintel-visual-blueprint.html` contains four agreed views:

1. Mental model and user/Admin boundary.
2. Persona/theme-led user portal.
3. Arabic BRD workspace with qualification and on-demand evidence.
4. Admin connectors and knowledge-processing operations.

## Buyer-facing staging proof

After baseline approval, `docintel-customer-demo.html` translated the mental model into a customer
journey using a read-only staging snapshot from `cyijbdeuehohvhnsywig`:

- Senaei BAU: 31/31 sources ready (25 Jira, 4 uploaded/recorded documents, 2 Git documents);
- 414 knowledge chunks across all 31 sources;
- Industrial Scanning theme with the real Raw Materials BRD and Audio Test source;
- 6 extracted facts, all still unreviewed (the governance gap is shown, not hidden);
- 5 generated deliverables: 4 verified and 1 promoted Epic;
- 2 real document-to-work links (one manual story, one promoted Epic).

The demo sequence is: **For you → Knowledge theme → Understand → Deliverables**. The commercial
promise is not file extraction; it is a governed path from living project knowledge to linked work.
