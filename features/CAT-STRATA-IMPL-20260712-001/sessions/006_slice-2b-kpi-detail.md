# Session 006 — Slice 2B KPI Detail (anchor 06)

> `continue feature`. Resumed on `strata/impl-phase01` (synced with origin/main = 3112cbae7).
> Phase 2 Plan Lock approved; 2A StrataChainStrip done+merged. Start = 2B-1.

## Rehydration (pre-flight done)
- Branch synced, tree clean, no foreign commits. Read handover ⭐PHASE 2 NEXT + 03_PLAN_LOCK_PHASE2 +
  anchor 06 (re-read in context). 
- Chain-data DECISION RESOLVED: **use `useKpiEvidenceChain(kpi.id, activePeriod.id)`** →
  `strata_kpi_evidence_chain` RPC. Keys: kpi, actual, target, lineage, benefits, elements, projects,
  snapshots, initiatives, formula_version. Powers BOTH chain strip (elements=↑Objective, projects=▦Delivery,
  benefits=◇Value) AND trust strip (lineage=Source/Last-run, formula_version=Formula, actual.validation_status).
  Scorecards segment OMITTED (not in RPC — zero-assumption, don't invent). Element links resolve slug via
  `elementsQ` (useStrategyElements) id→slug map.
- Shapes: elements[{id,name,status,weight,element_type,perspective_id}]; projects[{id,name,stage,
  actual_progress,execution_health,blocked_dependencies}]; benefits[{id,name,confidence,lifecycle_stage}];
  formula_version{version,formula_type,expression}; lineage[]. achievement payload{achievement,status_key,
  actual,target,confidence}.

## Plan (2B-1 first)
2B-1: verdict band (replace StatStrip hero, verdict-first) + Trend (side by side) + StrataChainStrip +
trust strip. 2B-2: actuals/validation table (commentary column) + role-gated Submit/Validate.

## Status: building 2B-1.
