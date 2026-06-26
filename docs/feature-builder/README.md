# Catalyst Feature Finder & Builder

Reusable capability for discovering, designing, building, and validating any Catalyst feature.

Inspired by Karpathy AutoResearch. Adapted for product UI development.

---

## Purpose

Any Catalyst feature — Test Hub, Admin RBAC, Product Hub filters, Replay Widget, any module — follows the same loop:

1. Intake → 2. Discovery → 3. Audit → 4. Benchmark → 5. Gap analysis → 6. Target design → 7. Experiments → 8. Validate → 9. Decide → 10. Human gate

The capability enforces this loop. It prevents rushing into code before discovery. It prevents rebuilding what Catalyst already has.

---

## How to Invoke

```bash
# Initialize a feature workspace
./scripts/feature-builder/init-feature.sh <feature-slug> "<objective>"

# Start an experiment
./scripts/feature-builder/start-experiment.sh <feature-slug> <experiment-id> "<title>"

# Validate an experiment
./scripts/feature-builder/validate-experiment.sh <feature-slug> <experiment-id>

# Record decision
./scripts/feature-builder/finish-experiment.sh <feature-slug> <experiment-id> keep|revise|reject|blocked "<reason>"
```

Examples (future):
```bash
./scripts/feature-builder/init-feature.sh test-hub "Rebuild Test Hub as Catalyst-native AI-assisted test management benchmarked against AIO Tests"
./scripts/feature-builder/init-feature.sh admin-rbac "Build enterprise-grade Catalyst-native role and permission management"
./scripts/feature-builder/init-feature.sh product-hub-filters "Replicate Project Hub filter behavior into Product Hub without duplicating logic"
```

---

## Directory Structure

```
docs/feature-builder/
  README.md                              ← this file
  capability-charter.md                  ← what this is and why
  invocation-guide.md                    ← full lifecycle + command reference
  feature-registry.md                    ← registry of all initialized features

  Templates (generic, reusable):
  feature-program-template.md
  feature-intake-template.md
  catalyst-pattern-discovery-template.md
  current-state-audit-template.md
  external-benchmark-research-template.md
  gap-analysis-template.md
  experiment-plan-template.md
  experiment-log-template.md
  quality-scorecard.md
  decision-gate-template.md
  human-approval-gates.md

  features/                              ← per-feature workspaces (created by scripts)
    <feature-slug>/
      feature-program.md
      feature-intake.md
      catalyst-pattern-discovery.md
      current-state-audit.md
      external-benchmark-research.md
      gap-analysis.md
      target-catalyst-design.md
      experiment-roadmap.md
      decision-log.md
      experiments/
        <experiment-id>/
          hypothesis.md
          allowed-edit-surface.md
          research-notes.md
          baseline.md
          implementation-notes.md
          validation-log.md
          screenshot-notes.md
          scorecard.md
          decision.md

scripts/feature-builder/
  README.md
  init-feature.sh
  start-experiment.sh
  validate-experiment.sh
  finish-experiment.sh
```

---

## Core Principles

1. **Discover before build** — always inspect existing Catalyst patterns before any code
2. **Research before design** — document external benchmark before proposing target design
3. **Bounded edit surface** — every experiment defines allowed and forbidden files before coding
4. **Evidence over confidence** — every experiment produces validation evidence
5. **Screenshot required for UI** — UI experiments require screenshot notes
6. **Human gate** — no commit, no merge without JK/Aiden approval
7. **Catalyst-native first** — no new design languages, no arbitrary components
8. **Reuse or extend** — never rebuild what Catalyst or Atlaskit already has

---

## Karpathy Analogy

| AutoResearch | Catalyst Feature Builder |
|---|---|
| `program.md` | `feature-program.md` |
| `train.py` | bounded experiment files |
| `val_bpb` metric | quality scorecard (4 dimensions) |
| 5-min run budget | single bounded slice |
| results.tsv | experiment-log.tsv (gitignored) |
| keep / discard | keep / revise / reject / blocked |
| loops forever | loops until feature complete |
