# CAT-STRATA-20260705-001 — Objective

## Feature name
STRATA

## What we are building
A greenfield, configuration-first, executive-grade strategy execution and value realization module inside Catalyst — from admin configuration engine through strategy cycles/maps, KPI/OKR library, model-driven scorecards, initiative/project-card linkage, portfolio/VMO benefit realization, upload/validation/lineage pipeline, to locked snapshots, decisions and board packs — delivered in three gated phases.

## Why
Executives must move from an enterprise health signal to any supporting line of evidence — perspective, objective, KPI, initiative, project, milestone, benefit, value gate, source upload, formula, accountable owner — without losing traceability. STRATA answers four questions: Are we executing the strategy? Are we achieving the intended outcomes? Are investments creating the promised value? What decision is required now?

## Phase 1 (current) acceptance criteria
- [ ] Discovery report with existing-state inventory (file/schema evidence on every claim)
- [ ] Reuse / replace / delete verdicts for all strategy residue
- [ ] Architecture risk register
- [ ] Proposed domain modules + migration plan (proposal only — nothing applied)
- [ ] Proposed service/API/hook structure
- [ ] Proposed IA / data model and route map
- [ ] UI/UX strategy + design benchmark
- [ ] Traceability map: blueprint + 3 flowcharts → planned delivery
- [ ] Questions requiring owner approval
- [ ] Assumptions explicitly blocked from implementation

## Whole-feature acceptance (later phases)
- [ ] Every blueprint/flowchart item delivered or approved-deferred (traceability matrix)
- [ ] Every executive number has lineage to source, run, formula version, target, owner, validation, config version, snapshot
- [ ] Live / draft / pending-validation / locked states visually distinct everywhere
- [ ] Snapshots lock, reconcile, and are immutable unless superseded
- [ ] Project Card is source-agnostic; RBAC + segregation of duties hold
- [ ] No hard-coded business truth in frontend constants; config is versioned governed metadata
- [ ] AI outputs advisory-only with provenance
- [ ] Typecheck, lint, tests, seeds, MCP evidence all provided; UI/UX = 80% of acceptance weight

## Non-scope
- Patching old StrategyHub/Astryx residue in place (greenfield build; reuse only what discovery proved canonical)
- Live ERP/BI connectors in first release (registered sources + governed uploads first, per blueprint §25)
- Any AI approval/mutation authority
- Becoming a PM tool, BI warehouse, finance ledger, or document repository (blueprint §2 boundary)

## Target surface
New top-level hub (proposed `/strata`) inside CatalystShell, registered via `src/lib/hubs.ts` + `src/routes/FullAppRoutes.tsx`, with slug-contract routes in `src/lib/routes.ts`.

## Stakeholders
- Vikram / JK: Product Owner (phase-gate approvals)
- Claude Code: Discovery, design, implementation
