# CATALYST ACTIVATE / CONTINUE PROTOCOL

> Full protocol for `activate feature <name>` and `continue feature <FEATURE_WORK_ID>`.
> These are the two entry points for all Catalyst feature work.
> No Feature Work ID + no feature folder = no implementation.

---

## FEATURE WORK ID FORMAT

```
CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>
```

Examples:
```
CAT-RBAC-ADMIN-UI-20260626-001
CAT-PRODUCT-HUB-FILTERS-20260626-001
CAT-REPLAY-WIDGETS-20260626-001
CAT-BACKLOG-TABLE-REFACTOR-20260626-001
CAT-NOTIFICATIONS-JIRA-SYNC-20260626-001
```

Rules:
- `<AREA>` = uppercase, hyphens, no spaces (e.g. `RBAC`, `PRODUCT-HUB`, `REPLAY`, `BACKLOG`)
- `<FEATURE>` = uppercase, hyphens, no spaces (e.g. `ADMIN-UI`, `FILTERS`, `WIDGETS`)
- `<YYYYMMDD>` = date the feature was activated
- `<###>` = 3-digit sequence starting at `001`, incremented if same slug+date already exists
- One ID per feature/fix. Never share an ID across unrelated features.

---

## `activate feature <name>` COMMAND

### What it does

```
1.  Read CLAUDE.md
2.  Read docs/ways-of-working/*
3.  Generate Feature Work ID from <name>
4.  Create ~/catalyst/features/<FEATURE_WORK_ID>/
5.  Create all required feature files (00–11 + 12_AGENT_OUTPUTS.md)
6.  Create sessions/ folder and sessions/001_activate_feature.md
7.  Run pre-flight
8.  Spawn mandatory discovery agents (parallel)
9.  Run Karpathy Discovery Loop
10. Produce Plan Lock draft (03_PLAN_LOCK.md)
11. STOP before coding — wait for Plan Lock review
```

### Pre-flight (run first, always)

```bash
pwd
git branch --show-current
git status --short --untracked-files=all
git stash list --max-count=5
```

### Mandatory discovery agents (spawn all in parallel)

| Agent | Mission |
|---|---|
| Canonical Component Discovery | Find Catalyst canonical components that fit |
| Canonical Screen Discovery | Find existing routes/screens that fit |
| UI/UX Critic | Score proposed design vs ADS/Storybook |
| Integration Architect | Define data flow, hooks, edge functions |
| Data/Safety Guard | Verify columns exist, check RLS, flag migration risk |
| Implementation Planner | Produce ordered file edit list |
| QA/Screenshot Validator | Define screenshot checklist |

### Karpathy Discovery Loop

Run before Plan Lock:
- Hypothesis: which canonical component fits?
- Hypothesis: which existing screen fits?
- Hypothesis: do all required DB columns exist?
- Hypothesis: which ADS tokens are correct?
- Log every loop to `11_KARPATHY_LOOP_LOG.md`

### Stop condition

Claude must stop after Plan Lock draft and wait for explicit Vikram/JK review before any implementation.

### Required output at end of `activate feature`

```
Feature Work ID:    CAT-<AREA>-<FEATURE>-<YYYYMMDD>-001
Feature folder:     ~/catalyst/features/CAT-<AREA>-<FEATURE>-<YYYYMMDD>-001/
Session log:        sessions/001_activate_feature.md

Recommended Claude conversation title:
CAT-<AREA>-<FEATURE>-<YYYYMMDD>-001 — <short purpose>

To continue in a new conversation:
  node scripts/catalyst-feature.mjs continue CAT-<AREA>-<FEATURE>-<YYYYMMDD>-001

Plan Lock: DRAFT — review required before implementation.
```

---

## `continue feature <FEATURE_WORK_ID>` COMMAND

### What it does

```
1.  Read CLAUDE.md
2.  Read docs/ways-of-working/*
3.  Verify ~/catalyst/features/<FEATURE_WORK_ID>/ exists
4.  Read files in this order:
      00_READ_ME_FIRST.md
      01_OBJECTIVE.md
      03_PLAN_LOCK.md
      07_HANDOVER.md
      08_DRIFT_LOG.md
      09_DECISIONS.md
      11_KARPATHY_LOOP_LOG.md
      12_AGENT_OUTPUTS.md
5.  Create next session log: sessions/<NNN>_<purpose>.md
6.  Run pre-flight
7.  Return rehydration report
8.  STOP unless Plan Lock explicitly allows execution
```

### Rehydration report format

```
=== REHYDRATION REPORT ===

Feature Work ID:   <ID>
Session log:       sessions/<NNN>_continue_feature.md
Branch:            <current branch>
HEAD:              <git log --oneline -1>

Objective:         <from 01_OBJECTIVE.md — one sentence>
Plan Lock status:  <DRAFT | APPROVED | SUPERSEDED>
Handover summary:  <from 07_HANDOVER.md — key state>
Drift log:         <from 08_DRIFT_LOG.md — any open drift>
Open decisions:    <from 09_DECISIONS.md — unresolved items>
Karpathy loops:    <last 3 loops from 11_KARPATHY_LOOP_LOG.md>

Next exact action: <one sentence — what to do next>
Waiting on:        <Vikram approval | Plan Lock | NONE>

=== END REHYDRATION REPORT ===
```

### Stop conditions

- If `03_PLAN_LOCK.md` is `NOT_WRITTEN` → stop, write Plan Lock before proceeding
- If `03_PLAN_LOCK.md` is `SUPERSEDED` → stop, ask for new Plan Lock
- If `07_HANDOVER.md` shows a RED FLAG → stop, address the flag before proceeding
- If Plan Lock does not explicitly allow execution of the current task → stop and ask

---

## SESSION LOG FORMAT

Every session must create a log at `sessions/<NNN>_<purpose>.md`:

```markdown
# Session <NNN> — <purpose>

**Date:** YYYY-MM-DD
**Feature Work ID:** CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>
**Mode:** DISCOVERY | PLANNING | EXECUTION | VALIDATION | HANDOVER

## Objective this session
[One sentence]

## Pre-flight
[Paste raw output of pwd / git branch / git status / git stash list]

## Plan Lock status
[DRAFT | APPROVED | SUPERSEDED — what changed?]

## Actions taken
[Bullet list]

## Files changed
[Explicit list with paths]

## Karpathy loops run
[List loop IDs]

## Validation evidence
[Commands + output summaries]

## Screenshot status
[NOT_REQUIRED | PENDING | ACCEPTED: <link/path>]

## Handover state
[What the next session needs to know]

## Aiden Validation Block
[Copy full block here]
```

---

## WHEN NO FEATURE WORK ID EXISTS

If the user starts a task without a Feature Work ID:

```
STOP.

No Feature Work ID. No Feature Work ID = no implementation.

Options:
1. `activate feature <name>` — start a new feature from scratch
2. `node scripts/catalyst-feature.mjs list` — list existing features and pick one to continue
3. `continue feature <FEATURE_WORK_ID>` — continue a named existing feature

Which applies?
```

Do not infer or guess. Ask.

---

## WHEN MULTIPLE CANDIDATE FOLDERS EXIST

If the user's description matches multiple feature folders:

```
Multiple candidate features found:

1. CAT-RBAC-ADMIN-UI-20260626-001 — RBAC admin UI (Plan Lock: APPROVED)
2. CAT-RBAC-SCHEMA-20260625-001 — RBAC schema migration (Plan Lock: SUPERSEDED)

Which feature are we continuing?
```

Do not proceed until Vikram confirms the ID.

---

## REBASELINE RULE

After one correction loop:
- **Accept** — deviation is acceptable, update Plan Lock
- **Split** — break into smaller slice, write new Plan Lock section
- **Rebuild** — discard current implementation, restart slice from canonical
- **Stop/Revert** — revert changes, write handover, stop

No third attempt on the same correction. If one correction loop doesn't resolve it → escalate to Vikram.
