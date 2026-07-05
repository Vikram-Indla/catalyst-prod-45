# STRATA / Strategy Greenfield Module — Claude Code Execution Attachment

## 0. Purpose

This attachment gives Claude Code the phased delivery contract for building the Greenfield **STRATA / Strategy** module inside Catalyst.

The attached STRATA blueprint and three Mermaid flowcharts are the controlling source of truth. The build must not become a dashboard collection, static scorecard, generic PPM page, or patched version of old StrategyHub/Astryx residue.

The module must be:
- **Configuration-first**
- **Executive-grade**
- **Evidence-linked**
- **Lineage-first**
- **Governed and auditable**
- **Reusable across organizations**
- **Built through Catalyst canonical design/system patterns wherever they strengthen the product**

---

## 1. Master Power Prompt — Under 4,000 Characters

```text
You are Claude Code. Build a GREENFIELD Catalyst module named STRATA / Strategy. Do not patch old StrategyHub/Astryx residue. Use the attached STRATA Blueprint + three Mermaid flowcharts as contractual source: executive product blueprint, configuration/control plane, strategy-to-value linkage, and source-to-decision lineage.

PHASE 1 — DISCOVERY ONLY
Read the repo before coding. Discover routes, existing Strategy/Astryx/StrategyHub code, shell, canonical components, typography, Supabase schema/migrations, services, permissions/RBAC, audit patterns, uploads, integrations and test conventions. Produce a discovery report: what exists, what is reusable, what must be replaced, risks, gaps, proposed architecture, migration/service plan, and traceability map to the blueprint. No assumption without file/schema/DOM/MCP evidence. If unclear, stop and ask.

PHASE 2 — UI/UX ONLY, HARD STOP
UI/UX has 80% weight. Design a fresh, authoritative CIO/CXO-grade product, not generic CRUD, not a routine PPM dashboard, not yesterday’s scorecard. Use Catalyst canonical components and typography where they are strong; create premium IA, dense hierarchy, micro-interactions, evidence drawers, DnD/canvas, scenario views, strong empty/loading/error states, responsive layout, and clear live/draft/pending/locked labels. Respect Catalyst shell. Before implementation you MUST show 10 core screenshots in this conversation and STOP for approval:
1 Executive Command Center
2 Strategy Room / Strategy Map Canvas
3 Admin Configuration Engine
4 Taxonomy/Perspective Manager
5 Scorecard Model Builder
6 KPI/OKR Library + KPI Detail
7 Initiative + Project Card Linkage
8 Portfolio / VMO Benefit Realization
9 Upload Validation + Lineage Pipeline
10 Snapshot / Decision Cockpit / Board Pack
Do not begin Phase 3 until I approve the UI/UX screenshots.

PHASE 3 — IMPLEMENTATION ONLY AFTER APPROVAL
Implement the approved design and full domain foundation. Build migrations, services, APIs/hooks, screens, state, seed data, tests and evidence. Required domains: strategy cycles/elements/maps/plays/objectives; configurable perspectives/taxonomies; scorecard models/instances/lines; KPI formulas/targets/actuals; OKRs/KRs; initiatives/project cards/milestones/dependencies; portfolios/benefits/value gates; sources/upload runs/staging/validation/lineage; snapshots/decisions/actions/audit/RBAC.

NON-NEGOTIABLE ARCHITECTURE
Never hard-code perspectives, scorecard models, weights, formulas, thresholds, RAG logic, value categories, gate stages, upload templates, workflows, mappings or RBAC. They are governed metadata with versions, effective dates and audit. Screens query domain services; UI constants must not hold business truth. Project Card abstracts Jira/API/manual/ERP sources; Jira is not the schema.

GOVERNANCE + AI
Every executive number must trace to source, owner, formula version, target, validation, run ID, config version and snapshot. Separate live monitoring from locked review evidence. AI may summarize, explain variance, draft scenarios and detect anomalies; AI must never approve, certify, mutate config, change formulas, close gates or overwrite data.

QUALITY BAR
Use up to 10 agents: repo, schema, design, executive UX, governance, lineage, integration, QA/a11y, security/RBAC, acceptance. Agents must challenge each other until stronger patterns are exhausted. No cheap UI, fake metrics, placeholder screens, silent fallbacks, broken lineage or hard-coded tenant terms. Deliver: discovery report, screenshot pack, approval checkpoint, implementation, tests, MCP evidence, and a traceability matrix proving every blueprint/flowchart item is delivered or explicitly deferred with my approval.
```

---

## 2. Mandatory Phase Gate Contract

### Phase 1 — Discovery Only

Claude Code must begin with repo and product discovery. No implementation should happen in this phase except temporary probes, local reads, and evidence collection.

#### Discovery Scope

Claude Code must inspect:

| Area | Required Discovery |
|---|---|
| Existing strategy functionality | Existing StrategyHub, Astryx, strategy routes, screens, services, stores, migrations, seed data, tests, permissions |
| Catalyst shell | Top navigation, side navigation, route layout, page wrappers, responsive constraints |
| Canonical UI | Existing reusable components, typography, spacing, tokens, table/list/card/detail/editor patterns |
| Data model | Supabase schema, migrations, RLS, service functions, DB naming conventions, audit patterns |
| RBAC | Roles, permissions, admin gating, approval patterns, user scope/data scope |
| Integrations | Jira/API/manual upload patterns, connector abstractions, import/sync jobs, validation handling |
| Testing | Lint, typecheck, unit tests, integration tests, visual evidence, MCP/Chrome conventions |
| Existing defects | Broken UI, hard-coded arrays, cheap components, missing lineage, non-canonical components, route/data mismatches |

#### Phase 1 Deliverables

Claude Code must produce:

1. Discovery report.
2. Existing-state inventory.
3. Reuse / replace / delete recommendation.
4. Architecture risk register.
5. Proposed domain modules and migrations.
6. Proposed service/API/hook structure.
7. UI/UX strategy and design benchmark.
8. Traceability map against the blueprint and three Mermaid flows.
9. Questions requiring owner approval.
10. Explicit list of assumptions blocked from implementation.

#### Phase 1 Exit Rule

Claude Code cannot move into UI/UX design until discovery is complete and any blocking ambiguity has been raised.

---

## 3. Phase 2 — UI/UX Only, Hard Stop

This phase is a design gate. Claude Code must produce UI/UX evidence before implementation.

### UI/UX Weight

UI/UX carries **80% of the success criteria**. The product must feel like a CIO/CXO-grade executive operating system, not a CRUD module.

The experience must be:

- Fresh
- Authoritative
- Dense but usable
- Visually premium
- Executive-facing
- Evidence-rich
- Interactive
- Traceability-driven
- Modern without losing strategy discipline

### Required UX Principles

Claude Code must design:

| UX Principle | Required Behavior |
|---|---|
| Executive authority | Screens must feel board/CXO-ready, not operational backlog pages |
| Mental model clarity | User must understand strategy → KPI → initiative → portfolio → value → decision |
| Traceability | Every metric must expose owner, formula, validation, source, run and snapshot |
| Configuration awareness | Screens must visibly read from selected model, cycle, period and config version |
| Modern interaction | Canvas, drag/drop, drawers, split panes, drilldowns, command surfaces, scenario panels where useful |
| Governance clarity | Live, draft, pending-validation, rejected and locked snapshot states must be visually distinct |
| Design system fit | Use Catalyst canonical patterns where strong; do not import random UI language |
| No bland admin | Configuration screens must be enterprise-grade control plane, not plain forms |
| Responsive quality | Layout must work across realistic viewport sizes |
| Accessibility | Keyboard, contrast, focus state, semantic structure, screen-reader basics |

### Mandatory 10 Screenshots

Claude Code must show these **10 core screenshots in the conversation** and then stop.

| # | Screenshot | Must Show |
|---|---|---|
| 1 | Executive Command Center | Enterprise health, scorecard status, exceptions, value at risk, decision queue |
| 2 | Strategy Room / Strategy Map Canvas | Strategy hierarchy + cause/effect network, owner/stage/status, DnD affordances, evidence drilldown |
| 3 | Admin Configuration Engine | Taxonomies, scorecard models, formulas, gates, uploads, RBAC, workflows, versions |
| 4 | Taxonomy / Perspective Manager | Create/edit/retire perspectives, weights, effective dates, hierarchy, active state |
| 5 | Scorecard Model Builder | Configurable scorecard model, perspective weights, rollup method, thresholds, period granularity |
| 6 | KPI/OKR Library + KPI Detail | KPI dictionary, formula, owner, data owner, reporter, validator, target, actual, lineage |
| 7 | Initiative + Project Card Linkage | Objective/play/KPI/benefit/portfolio mapping, source system, confidence, milestones |
| 8 | Portfolio / VMO Benefit Realization | Planned/forecast/realized value, baselines, assumptions, attribution, value gates |
| 9 | Upload Validation + Lineage Pipeline | Source → ingestion → staging → validation → canonical write → calculation → snapshot |
| 10 | Snapshot / Decision Cockpit / Board Pack | Locked evidence pack, decision record, action register, audit trail |

### Phase 2 Hard Stop

After the 10 screenshots, Claude Code must stop.

It must not:
- Create migrations for final implementation.
- Implement permanent services.
- Wire production data.
- Merge UI into final routes.
- Continue into Phase 3.
- Assume approval.

It must ask for explicit approval: **“Approve Phase 2 UI/UX so I can begin Phase 3 implementation?”**

---

## 4. Phase 3 — Implementation After Approval Only

Implementation can begin only after explicit approval of the 10 screenshot pack.

### Required Implementation Domains

| Domain | Required Objects / Capabilities |
|---|---|
| Strategy | StrategyCycle, Period, StrategyElement, Theme, Play, Objective, StrategyMapEdge, MapNode |
| Scorecard | Perspective, ScorecardModel, ScorecardInstance, ScorecardLine, rollup method, threshold scheme |
| KPI / OKR | KPI, KPIFormulaVersion, KPITarget, KPIActual, OKR, KeyResult, Commentary |
| Execution | Initiative, ProjectCard, Milestone, Dependency, ExecutionLink, external source mapping |
| Portfolio / VMO | Portfolio, PortfolioMembership, Benefit, BenefitBaseline, BenefitTarget, BenefitActual, Assumption, AttributionRule |
| Gates | GateModel, GateInstance, criteria, evidence checklist, verdict, decision options |
| Data Lineage | DataSource, UploadTemplate, UploadRun, StagingRecord, ValidationResult, CanonicalWrite, LineageRecord |
| Governance | Snapshot, CalculatedValue, Decision, Action, BoardPack, Approval, AuditEvent |
| Admin | Taxonomies, workflows, RBAC, permissions, integration mapping, effective-dated config |
| AI Advisory | Narrative drafts, variance explanation, anomaly detection, stale-data alerts, scenario drafts |

### Implementation Quality Rules

1. Screens must query domain services.
2. UI must not calculate critical enterprise scores independently.
3. All formula, rollup and RAG logic must be centralized.
4. Every calculated result must store provenance.
5. Every upload run must retain raw reference, row count, run ID and validation outcome.
6. Every executive metric must drill back to source, owner, formula, target, validation, config version and snapshot.
7. Review snapshots must be immutable unless superseded by a controlled version.
8. AI outputs must be marked advisory and must include provenance.
9. Project Card must abstract Jira/API/manual/ERP sources.
10. Jira must not become the STRATA schema.
11. Configuration must be governed records, not frontend constants.
12. Test data must be explicitly identified as seed/demo data.
13. No placeholder metrics are allowed in executive views.
14. No silent fallback data is allowed.
15. No hard-coded tenant-specific strategy terms are allowed as system constants.

---

## 5. Non-Negotiable Configuration-First Rules

Claude Code must not hard-code:

- Perspectives
- Scorecard models
- Scorecard weights
- KPI formula types
- KPI formulas
- Thresholds
- RAG bands
- Value categories
- Gate stages
- Gate criteria
- Decision options
- Upload templates
- Column mappings
- Workflow states
- Workflow transitions
- RBAC roles
- Approval authority
- Integration mappings
- Review periods
- Snapshot policies

All of the above must be stored as governed metadata with:

- Version
- Status
- Owner
- Effective from / to
- Approval state
- Audit history
- Active / retired state
- Change reason where applicable

---

## 6. Acceptance Criteria by Feature Area

### 6.1 Executive Command Center

| Criterion | Pass Condition |
|---|---|
| Executive-grade | UI is visually authoritative and suitable for CEO/CXO review |
| Live vs locked clarity | Every major view shows whether data is live, draft, pending-validation or locked |
| Drilldown | User can move from enterprise health to supporting scorecard, KPI, source and decision evidence |
| Value visibility | Value at risk, benefit realization and key exceptions are visible |
| Decision focus | Decisions and actions are surfaced, not hidden in comments |

### 6.2 Strategy Room / Map Canvas

| Criterion | Pass Condition |
|---|---|
| Hierarchy + network | Supports both structured strategy hierarchy and cause/effect mapping |
| DnD/canvas | Strategic elements can be organized through rich interaction where feasible |
| Evidence | Nodes expose KPI, initiative, owner, stage, status and evidence |
| Filtering | Supports period, owner, perspective, objective/play/status filters |
| Governance | Promotion to active governance requires required fields and owner |

### 6.3 Admin Configuration Engine

| Criterion | Pass Condition |
|---|---|
| Control plane | Admin module governs taxonomies, scorecards, formulas, gates, uploads, workflows, RBAC |
| Versioning | Config changes create version history |
| Effective dating | Config supports effective from/to where applicable |
| Approval | Sensitive config changes require approval pattern |
| No hidden constants | Business meaning is visible and configurable in admin |

### 6.4 Perspectives / Taxonomy

| Criterion | Pass Condition |
|---|---|
| Configurable perspectives | Users/admins can create, edit, retire, order and weight perspectives |
| Parent hierarchy | Perspective hierarchy is supported where needed |
| Effective dates | Perspective changes can be time-bounded |
| Scorecard usage | Scorecards reference configured perspectives |
| Generic readiness | No tenant-specific perspective is coded as a fixed system constant |

### 6.5 Scorecards

| Criterion | Pass Condition |
|---|---|
| Model-driven | CEO, CXO, sector, function, portfolio and initiative scorecards come from models |
| Weighted | Lines and perspectives can carry weights |
| Versioned | Models and instances preserve history |
| Drillable | Scorecards drill to KPI/objective/initiative/project/benefit/source |
| Defensible | Scores store formula version, config version and source versions |

### 6.6 KPI / OKR Library

| Criterion | Pass Condition |
|---|---|
| Governed dictionary | KPI is defined once and reused across contexts |
| Required metadata | KPI cannot be approved without owner, source, formula/entry method, frequency, target and validator |
| Role separation | Accountable owner, data owner, reporter, validator and escalation owner are distinct fields |
| Formula version | Formula changes create a new version |
| OKR interoperability | OKRs can use KPI definitions or standalone KR measurements without forcing all KPIs to be OKRs |

### 6.7 Initiative / Project Card / Execution Linkage

| Criterion | Pass Condition |
|---|---|
| Strategy linkage | Initiative links to objective/play/KPI/benefit/portfolio |
| Project abstraction | Project Card carries source system and source key |
| Mapping confidence | External mapping includes confidence and owner |
| Milestones | Project Card exposes milestone baseline/forecast/actual progress |
| Dependencies | Dependency status, due date, SLA and impact are represented |

### 6.8 Portfolio / VMO / Benefit Realization

| Criterion | Pass Condition |
|---|---|
| Value rigor | Benefit contains baseline, planned, forecast, realized value and validation state |
| Assumptions | Benefit captures assumptions, causal mechanism and confidence |
| Attribution | Shared benefits and double-counting rules are handled |
| Gates | Continue/accelerate/rebaseline/pivot/stop decisions are supported |
| Finance validation | Realized value can be validated and audited |

### 6.9 Upload / Integration / Lineage

| Criterion | Pass Condition |
|---|---|
| Source registration | Source must be registered before feeding approved KPIs |
| Upload templates | Templates are versioned and generated from governed configuration |
| Staging | Raw load is staged with timestamp, uploader, file/run ID and row count |
| Validation | Schema/business validation produces row-level error reporting |
| Canonical write | Only accepted values feed executive scorecards |
| Lineage | Every number can trace backward to source run and validation outcome |

### 6.10 Snapshots / Decisions / Board Packs

| Criterion | Pass Condition |
|---|---|
| Snapshot lock | Review snapshot freezes scorecard values, config versions, data runs, commentary and exceptions |
| Decision evidence | Decisions link to snapshot and supporting objects |
| Action register | Follow-up actions have owner, due date and status |
| Board pack | Exported board pack reconciles to snapshot ID |
| Audit | Later changes do not overwrite previous review evidence |

### 6.11 AI Advisory

| Criterion | Pass Condition |
|---|---|
| Advisory only | AI cannot approve, certify, mutate config, change formulas, close gates or overwrite data |
| Provenance | AI output shows source snapshot/entities/config/live-vs-locked state |
| Use cases | AI can summarize, detect anomalies, explain variance, draft narrative and model scenarios |
| Human review | Human review is required before AI-generated narrative is published |
| Evidence | AI explanation must cite linked evidence objects |

---

## 7. Agent Model

Claude Code may use up to 10 agents:

| Agent | Responsibility |
|---|---|
| Repo Agent | Routes, modules, services, technical inventory |
| Schema Agent | Supabase schema, migrations, RLS, data model |
| Design Agent | Canonical components, typography, layout, responsive behavior |
| Executive UX Agent | CIO/CXO mental model, screens, journeys, information architecture |
| Governance Agent | Approvals, audit, snapshots, RBAC, segregation of duties |
| Lineage Agent | Source-to-decision traceability and evidence model |
| Integration Agent | Jira/API/manual/ERP/BI/source abstractions |
| QA/A11y Agent | Tests, accessibility, keyboard, visual QA |
| Security Agent | Permissions, scopes, sensitive operations |
| Acceptance Agent | Blueprint and flowchart traceability matrix |

Agents must challenge each other. They should not converge on the first obvious design. They must refine until no stronger implementation or UX pattern remains.

---

## 8. Required Evidence Package

At the end of each phase Claude Code must provide evidence.

### Phase 1 Evidence

- Files inspected
- Routes found
- Components found
- Schema/migrations inspected
- Services/hooks inspected
- Current defects/gaps
- Reuse/replace decision
- Blockers/questions

### Phase 2 Evidence

- 10 screenshots
- Design rationale
- Canonical components used
- Non-canonical components justified
- Accessibility review
- Responsive review
- UX risk register
- Explicit approval request

### Phase 3 Evidence

- Migration list
- Services/API list
- UI route list
- Test results
- Typecheck/lint results
- MCP/Chrome screenshots
- Seed data list
- Traceability matrix
- Deferred items with approval reference

---

## 9. Final Definition of Done

STRATA is not done unless:

1. Every blueprint entity is either implemented or explicitly deferred with approval.
2. Every Mermaid flowchart item is traceably represented.
3. The UI/UX hard stop occurred before implementation.
4. The 10 screenshots were reviewed and approved.
5. Configuration is metadata-driven.
6. No business truth is hard-coded in frontend constants.
7. Every executive metric has lineage.
8. Snapshots are locked and auditable.
9. AI is advisory only.
10. The module is visually strong enough for a CIO/CXO review.
11. Tests, typecheck, lint and evidence are provided.
12. Traceability matrix proves delivery.

