# Experiment Log Template

Generic template for any Catalyst feature.

---

## experiment-log.tsv

Gitignored. Lives in repo root. One row per experiment. Header:

```
experiment	status	feature	files_touched	scorecard_ads	scorecard_parity	scorecard_functional	scorecard_reuse	composite	decision	description
```

Example rows:
```tsv
exp-001	complete	sample-feature	none	100	100	100	100	100	blocked	Dry run — generic capability verification
exp-006	complete	test-hub	src/pages/testhub/repository/RepositoryPage.tsx	100	85	90	100	93.5	keep	Repository read path — folder tree + case list
```

Initialize:
```bash
echo "experiment\tstatus\tfeature\tfiles_touched\tscorecard_ads\tscorecard_parity\tscorecard_functional\tscorecard_reuse\tcomposite\tdecision\tdescription" > experiment-log.tsv
```

---

## Per-Experiment Record Block (fill for each experiment)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPERIMENT: exp-XXX
FEATURE:    <feature-slug>
TITLE:      <title>
TYPE:       research | build | validation
DATE:       YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HYPOTHESIS:
  <what this experiment expects to find or prove>

ALLOWED EDIT SURFACE (declare before any code):
  Allowed:   src/...
             src/...
  Forbidden: everything else
             Always forbidden: supabase/, package.json, CLAUDE.md

ACCEPTANCE CRITERIA (declare before any code):
  [ ] <criterion>
  [ ] ADS audit: 0 new violations in touched files
  [ ] TypeScript: 0 new errors

BLOCKED BY: <experiment-id> | none

──────────────────────────────────────────────────
BEFORE CODING — Pattern Reuse Check:
  Searched for: <concept>
  Existing in Catalyst: <component or hook path>
  Decision: mount existing | extend | build new (needs approval)
──────────────────────────────────────────────────

ALLOWED-EDIT-SURFACE filled before work: yes / NO (if NO → experiment invalid)

EXECUTION:
  <notes on what was done>

SCORECARD (from scorecard.md):
  Hard fails:         _ (any = reject)
  Catalyst visual:    ___/25
  Functional:         ___/20
  Data correctness:   ___/15
  Pattern reuse:      ___/15
  Validation health:  ___/10
  UX completeness:    ___/5
  Maintainability:    ___/10
  TOTAL:              ___/100

VALIDATION EVIDENCE:
  TypeScript errors: _
  ADS violations (touched files): _
  Screenshot: <path | N/A (research experiment)>

DECISION: keep | revise | reject | blocked

REASON: <fill>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Decision Key

| Decision | Composite | Criteria |
|---|---|---|
| `keep` | ≥ 80 | Zero P0 violations, human approved |
| `revise` | 65–79 | Fixable issues in same experiment |
| `reject` | < 65 | P0 violation, or wrong approach — start fresh |
| `blocked` | — | External dependency or waiting for human gate |

---

## Phase Summary Block

Run at end of each phase:

```
Phase X Summary:
  Experiments run:         _
  Keep:                    _ (_%)
  Revise (then keep):      _
  Reject:                  _
  Blocked:                 _
  Average composite score: _
  P0 violations caught:    _
```
