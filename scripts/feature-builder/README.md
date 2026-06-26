# Catalyst Feature Builder — Scripts

Generic invocation layer for any Catalyst feature.

---

## Commands

```bash
# 1. Initialize feature workspace
./scripts/feature-builder/init-feature.sh <feature-slug> "<objective>"

# 2. Start an experiment
./scripts/feature-builder/start-experiment.sh <feature-slug> <experiment-id> "<title>"

# 3. Validate (before finish)
./scripts/feature-builder/validate-experiment.sh <feature-slug> <experiment-id>

# 4. Record decision
./scripts/feature-builder/finish-experiment.sh <feature-slug> <experiment-id> keep|revise|reject|blocked "<reason>"
```

Full usage: `docs/feature-builder/invocation-guide.md`

---

## Experiment ID Convention

```
exp-001 through exp-005  ← Phase 0: Research (no code changes)
exp-006 onwards          ← Phase 1+: Build
```

---

## What Each Script Creates

### `init-feature.sh`

Creates `docs/feature-builder/features/<slug>/`:
- `feature-program.md` — objective, constraints, research checklist (Karpathy's program.md)
- `feature-intake.md` — inputs, benchmark list, intake questions
- `catalyst-pattern-discovery.md` — pre-filled template for exp-001
- `current-state-audit.md` — pre-filled template for exp-002
- `external-benchmark-research.md` — pre-filled template for exp-003
- `gap-analysis.md` — pre-filled template for exp-004
- `target-catalyst-design.md` — pre-filled template for exp-005
- `experiment-roadmap.md` — Phase 0/1/2/3 table
- `decision-log.md` — running decision history
- `experiments/README.md` — usage reminder

Also appends to `docs/feature-builder/feature-registry.md`.

### `start-experiment.sh`

Creates `docs/feature-builder/features/<slug>/experiments/<exp-id>/` (9 files):
- `hypothesis.md` — hypothesis + acceptance criteria
- `allowed-edit-surface.md` — **must be filled before any work starts** (Karpathy's constrained file)
- `research-notes.md` — findings for research experiments
- `baseline.md` — before-state snapshot
- `implementation-notes.md` — changes + reuse decisions for build experiments
- `validation-log.md` — TS/ADS/build check results (written by validate-experiment.sh)
- `screenshot-notes.md` — UI parity evidence
- `scorecard.md` — **must be filled before finish-experiment.sh keep** (Karpathy's val_bpb)
- `decision.md` — final decision (written by finish-experiment.sh)

### `validate-experiment.sh`

Runs:
1. `npx tsc --noEmit` — TypeScript error count
2. `node design-governance/scripts/self-test.mjs` — ADS self-test
3. `node design-governance/rules/audit.js src/` — ADS audit summary

Appends timestamped results to `validation-log.md`.

### `finish-experiment.sh`

- Updates `decision.md` (replaces `_pending_`)
- Appends to `decision-log.md`
- Appends to `experiment-log.tsv` (gitignored)

---

## Useful Standalone Commands

```bash
# ADS audit on specific area
node design-governance/rules/audit.js src/pages/<area>/ 2>&1 | tail -30

# TypeScript errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# ADS self-test
node design-governance/scripts/self-test.mjs

# Staging DB query
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name LIMIT 50;"

# Init experiment log manually
echo "experiment\tstatus\tfeature\tfiles_touched\tscorecard_ads\tscorecard_parity\tscorecard_functional\tscorecard_reuse\tcomposite\tdecision\tdescription" > experiment-log.tsv
```

---

## Git Discipline

Per CLAUDE.md — never `git add -A`. Stage explicit paths only:

```bash
git add docs/feature-builder/features/<slug>/experiments/<exp-id>/findings.md
```
