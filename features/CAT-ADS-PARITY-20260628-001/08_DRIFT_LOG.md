# Drift Log — CAT-ADS-PARITY-20260628-001

**Status:** No drift detected yet

Track all drift events, rebaseline decisions, and superseded Plan Locks here.

---

## What is drift?

Changes to the external environment that invalidate Plan Lock assumptions:

1. **Gate threshold changes** — Phase A baseline shifts (hex count changes from <600 to >600)
2. **New violations discovered** — Mid-Phase 6, audit reveals additional light surface violations not in original prompt
3. **Dependency changes** — Prerequisites (A, C, F) complete earlier/later than expected, or with different outputs
4. **Regression discovered** — Phase 6 changes break dark mode (contraindicated by plan)
5. **Scope creep** — New deprecated components discovered in integration phase
6. **Resource constraints** — A phase cannot fit in 2-hour slice; needs split
7. **Conflict with other work** — Another team's changes conflict with ADS Parity work

---

## Drift events (none yet)

### When drift is detected

1. **Stop** — Do not continue implementing
2. **Raise** — Log drift event here with description, evidence, options
3. **Decide** — Vikram chooses: accept drift / rebaseline / split phase / rebuild
4. **Update** — Amend Plan Lock and this log
5. **Resume** — Continue with updated plan

---

## Template for drift events

```markdown
## <date> Drift Event <N>

### What drifted
<description of what changed>

### Why
<root cause>

### Evidence
<what we observed — screenshots, audit outputs, error logs>

### Impact on Plan Lock
<which section is invalidated — gates? file list? estimation?>

### Options
1. <option A — accept drift, amend plan>
2. <option B — rebaseline gate>
3. <option C — split phase>
4. <option D — rebuild / revert>

### Decision
<Vikram's call>

### Action
<what we do now>

### Plan Lock amendment
<mark as SUPERSEDED v1, create v2, update this log>
```

---

## Rebaseline history

None yet. When a gate baseline changes, document it here.

---

## Superseded Plan Locks

| Version | Status | Reason |
|---|---|---|
| v1 | DRAFT | Initial planning; awaiting approval |
| v2 | (pending) | To be created after discovery agents complete |

---

## Next

No drift detected. Await discovery agent outputs and baseline audit results. If drift detected, add Drift Event entry.
