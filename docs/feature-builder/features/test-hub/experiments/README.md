# Experiments: test-hub

Each experiment lives in its own subdirectory.

## Commands

```bash
# Start an experiment
./scripts/feature-builder/start-experiment.sh test-hub exp-001 "<title>"

# Validate
./scripts/feature-builder/validate-experiment.sh test-hub exp-001

# Record decision
./scripts/feature-builder/finish-experiment.sh test-hub exp-001 keep|revise|reject|blocked "<reason>"
```

## Experiment ID Convention

```
exp-001 through exp-005  ← Phase 0: Research (no code)
exp-006 onwards          ← Phase 1+: Build
```
