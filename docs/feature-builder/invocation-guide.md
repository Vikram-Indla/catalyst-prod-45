# Catalyst Feature Finder & Builder — Invocation Guide

**Version:** 1.0
**Date:** 2026-06-26

---

## Full Lifecycle

Every feature passes through these phases in order. No skipping.

```
Phase 0 — Research (no code)
  Step 1:  Feature intake
  Step 2:  Catalyst pattern discovery
  Step 3:  Current state audit
  Step 4:  External benchmark research
  Step 5:  Gap analysis
  Step 6:  Target Catalyst design
  Step 7:  Human approval → proceed to build?

Phase 1 — Build (bounded slices)
  Step 8:  Start experiment (define scope)
  Step 9:  Implement (bounded edit surface)
  Step 10: Validate (TypeScript + ADS + acceptance criteria)
  Step 11: Screenshot evidence (UI only)
  Step 12: Score (quality scorecard)
  Step 13: Decision (keep / revise / reject / blocked)
  → Repeat steps 8-13 for each slice

Phase 2 — Ship
  Step 14: Human approval gate
  Step 15: Commit + PR
```

---

## Command Reference

### Initialize a feature workspace

```bash
./scripts/feature-builder/init-feature.sh <feature-slug> "<objective>"
```

Creates `docs/feature-builder/features/<feature-slug>/` with all required files.
Registers the feature in `docs/feature-builder/feature-registry.md`.

**Must be run before any other command for a feature.**

### Start an experiment

```bash
./scripts/feature-builder/start-experiment.sh <feature-slug> <experiment-id> "<title>"
```

Creates `docs/feature-builder/features/<feature-slug>/experiments/<experiment-id>/`.
Scaffolds 9 files: hypothesis, allowed-edit-surface, research-notes, baseline, implementation-notes, validation-log, screenshot-notes, scorecard, decision.

**Fill `allowed-edit-surface.md` before writing any code.**

### Validate an experiment

```bash
./scripts/feature-builder/validate-experiment.sh <feature-slug> <experiment-id>
```

Runs: TypeScript check, lint (if available in package.json), ADS audit note.
Writes results to `validation-log.md`.
Does NOT modify any source code.

### Record decision

```bash
./scripts/feature-builder/finish-experiment.sh <feature-slug> <experiment-id> <decision> "<reason>"
```

Decision values: `keep` | `revise` | `reject` | `blocked`

Updates `decision.md`, appends to `decision-log.md`, appends to `experiment-log.tsv` (if exists).

---

## Feature Directory Structure

Created by `init-feature.sh`:

```
docs/feature-builder/features/<feature-slug>/
  feature-program.md         ← objective + constraints + research requirements
  feature-intake.md          ← intake questions + inputs
  catalyst-pattern-discovery.md  ← what Catalyst already has
  current-state-audit.md     ← existing implementation state
  external-benchmark-research.md ← domain benchmark findings
  gap-analysis.md            ← feature gap matrix
  target-catalyst-design.md  ← Catalyst-native design proposal
  experiment-roadmap.md      ← ordered experiment queue
  decision-log.md            ← running log of all decisions
  experiments/
    README.md
    <experiment-id>/          ← created by start-experiment.sh
      hypothesis.md
      allowed-edit-surface.md
      research-notes.md
      baseline.md
      implementation-notes.md
      validation-log.md
      screenshot-notes.md
      scorecard.md
      decision.md
```

---

## Operating Gate — MUST Follow Every Experiment

```
PHASE 0 (research): fill allowed-edit-surface.md before writing anything
                    → "Allowed Files: (none — research only)"

PHASE 1 (build):    fill allowed-edit-surface.md with exact file paths
                    → no code change is permitted until this is done
                    → if new file needed mid-experiment: update this doc first, then continue
                    → if schema/route/edge function needed: STOP, request approval, then continue

fill scorecard.md   → required before calling finish-experiment.sh keep
                    → all PENDING rows must be resolved

hard fail = blocked regardless of scorecard total
```

This is the Catalyst equivalent of Karpathy's "only edit train.py" constraint.
Without a locked edit surface and an explicit evaluation metric, the loop can drift.

---

## Experiment ID Convention

Use sequential IDs with zero-padding:
```
exp-001   ← Phase 0: Catalyst pattern discovery
exp-002   ← Phase 0: Current state audit
exp-003   ← Phase 0: External benchmark research
exp-004   ← Phase 0: Gap analysis
exp-005   ← Phase 0: Target Catalyst design
exp-006   ← Phase 1: First build slice
exp-007   ← Phase 1: Second build slice
...
```

Research experiments (exp-001 through exp-005 typically) produce no code changes. Build experiments start at exp-006 or wherever the phase 1 queue begins.

---

## Decision Rules

| Decision | When to use | Next step |
|---|---|---|
| `keep` | Scorecard ≥ 80, all acceptance criteria pass, no P0 violations | Move to next experiment |
| `revise` | Scorecard 65-79, or minor issues fixable in same experiment | Fix issues, re-validate, re-score |
| `reject` | Scorecard < 65, or P0 violation, or wrong approach | Start fresh with different approach |
| `blocked` | External dependency, human approval needed, missing data | Log blocker, wait for unblock |

Any P0 violation = automatic `reject` regardless of composite score.

---

## Human Approval Gates

See: `docs/feature-builder/human-approval-gates.md`

Required before:
- Moving from Phase 0 (research) to Phase 1 (build)
- Any DB schema change
- Any new edge function
- Any new route
- Any AI call implementation
- Cross-hub integration
- After Phase 1 complete (before Phase 2 starts)
- Before any merge to main

---

## Simplicity Rule

Adapted from Karpathy AutoResearch:

> "All else being equal, simpler is better. An improvement from mounting an existing canonical component with an adapter is more valuable than an equivalent improvement from building a parallel component from scratch."

In practice:
- Mounting `JiraTable` with adapter > parallel table from scratch
- Extending `CatalystViewBase` > new detail view layout
- Adding prop to canonical > forking canonical

---

## Example Invocations

```bash
# Test management (future)
./scripts/feature-builder/init-feature.sh test-hub "Rebuild Test Hub as Catalyst-native AI-assisted test management benchmarked against AIO Tests"

# Role management (future)
./scripts/feature-builder/init-feature.sh admin-rbac "Build enterprise-grade Catalyst-native role and permission management"

# Filter reuse (future)
./scripts/feature-builder/init-feature.sh product-hub-filters "Replicate Project Hub filter behavior into Product Hub without duplicating logic"

# Replay capability (future)
./scripts/feature-builder/init-feature.sh replay-widget "Build session replay widget embedded in incident detail view"
```

None of the above should be invoked until the generic capability is approved (see `human-approval-gates.md`).
