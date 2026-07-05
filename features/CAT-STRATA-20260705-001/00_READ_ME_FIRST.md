# CAT-STRATA-20260705-001 — Read Me First

> Read this file before anything else in this feature folder.
> Do not implement before reading 01_OBJECTIVE.md and 03_PLAN_LOCK.md.

## Feature Work ID
CAT-STRATA-20260705-001

## Status
PHASE 1 — DISCOVERY (no UI, no DB, no implementation permitted in this phase).

## What this feature is about
STRATA — greenfield Catalyst Strategy module: enterprise strategy execution, balanced scorecard, KPI/OKR library, initiative/project-card linkage, portfolio/VMO benefit realization, upload/validation/lineage pipeline, snapshots/decisions/board packs, admin configuration engine, AI advisory layer.

## Controlling sources of truth (contractual)
1. `STRATA_Executive_Product_Blueprint_and_Enterprise_Data_Lineage_Model.docx` (26 sections + appendices A–F). Extracted text mirrored at `blueprint/strata_blueprint.txt` in this folder.
2. `STRATA_Three_Phase_Claude_Code_Attachment.md` — three-phase gate contract (Discovery → UI/UX hard stop → Implementation).
3. Three flowcharts (images in activating conversation):
   - Flow 1 (lineage): Source systems/Reporter → Ingestion → Staging → Validation (Data Owner + Validator) → Canonical STRATA model → Calculation engine → Snapshot layer → Audit trail → Decision layer (CEO dashboard, CXO scorecard, value gate, review forum, action register). Admin configures rules/mappings.
   - Flow 2 (admin control plane): Business Owner/Strategy Admin → Admin Console + Audit Trail & Version History → Configuration Engine (versioned metadata + governance control) → strategy taxonomy, perspectives, scorecard models, KPI formula types, weighting models, cycles & periods, value taxonomy, gate models, upload templates, RBAC & workflow, integration mappings, effective-dated config → Runtime product experience.
   - Flow 3 (strategy linkage): StrategyCycle → StrategyElement → Objective → OKR / KPI / Portfolio → Initiative → ProjectCard (+ Milestone, Benefit, Dependency) → ValueGate / BenefitActual → Snapshot / Decision → Executive Decision Layer. Source System → UploadRun → ValidationResult feeds KPI/ProjectCard.

## Phase gates (hard — never bypass)
- **Phase 1** Discovery only (this session).
- **Phase 2** UI/UX only, 80% acceptance weight, exactly 10 screenshots, then HARD STOP for explicit approval.
- **Phase 3** Implementation only after Phase 2 approval.

## Non-negotiables
Configuration-first (no hard-coded perspectives, weights, formulas, thresholds, RAG bands, value categories, gates, workflows, upload templates, mappings, labels, roles, or tenant terms — all versioned, effective-dated, approved, audited metadata). Every executive number has lineage. Live/draft/pending-validation/locked states always visible. Snapshots immutable unless superseded. AI advisory-only (never certifies, approves, mutates config, changes formulas, overwrites sources, or closes gates). Project Card is source-agnostic (Jira is a connector, not the schema). ADS tokens only. Canonical components first. Zero-assumption rendering. Greenfield: do NOT patch old StrategyHub/Astryx residue unless discovery proved reuse.

## How to continue this feature

```
continue feature CAT-STRATA-20260705-001
```

or:

```bash
node scripts/catalyst-feature.mjs continue CAT-STRATA-20260705-001
```

## Files to read on continuation
1. 00_READ_ME_FIRST.md (this file)
2. 01_OBJECTIVE.md
3. 03_PLAN_LOCK.md
4. 07_HANDOVER.md
5. 08_DRIFT_LOG.md
6. 09_DECISIONS.md
7. 11_KARPATHY_LOOP_LOG.md
8. 12_AGENT_OUTPUTS.md
