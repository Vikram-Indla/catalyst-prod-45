# CATALYST FEATURE FOLDER TEMPLATE

> Every meaningful feature gets a working folder keyed to its Feature Work ID.
> Create at: `~/catalyst/features/<FEATURE_WORK_ID>/`

---

## FEATURE WORK ID FORMAT

```
CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>
```

Example: `CAT-RBAC-ADMIN-UI-20260626-001`

Rules:
- One ID per feature/fix
- One folder per ID — never share a folder across IDs
- If ID is unknown: stop and ask Vikram
- If multiple candidate folders exist: list them and ask which to continue
- If no folder exists: create it before planning

---

## FOLDER STRUCTURE

```
~/catalyst/features/<FEATURE_WORK_ID>/
  00_READ_ME_FIRST.md          ← orientation; read before anything else
  01_OBJECTIVE.md              ← what we're building and why; acceptance criteria
  02_CANONICAL_DISCOVERY.md    ← output from Canonical Component + Screen Discovery agents
  03_PLAN_LOCK.md              ← active Plan Lock (copy from CATALYST_PLAN_LOCK_TEMPLATE.md)
  04_EXECUTION_LOG.md          ← running log of what was done, what changed, decisions made
  05_UI_UX_REVIEW.md           ← UI/UX Critic agent output; screenshot acceptance records
  06_VALIDATION_EVIDENCE.md    ← validation command outputs, DOM probe results, API responses
  07_HANDOVER.md               ← handover for next session (use CATALYST_CONTEXT_HANDOVER_TEMPLATE.md)
  08_DRIFT_LOG.md              ← all drift events, rebaseline decisions, superseded Plan Locks
  09_DECISIONS.md              ← all explicit decisions made during the feature (permanent record)
  10_SCREENSHOT_CHECKLIST.md   ← screenshot checklist with reference/implementation pairs
  11_KARPATHY_LOOP_LOG.md      ← Karpathy discovery loop log (created by activate feature command)
  12_AGENT_OUTPUTS.md          ← raw outputs from all parallel agents
  sessions/
    001_<session-purpose>.md   ← session log for session 1
    002_<session-purpose>.md   ← session log for session 2
```

---

## MANDATORY READS FOR CONTINUATION SESSIONS

Before ANY action in a continuation session (use `continue feature <FEATURE_WORK_ID>`):

1. `00_READ_ME_FIRST.md` — orientation
2. `01_OBJECTIVE.md` — what done looks like
3. `03_PLAN_LOCK.md` — active constraints
4. `07_HANDOVER.md` — where we left off
5. `08_DRIFT_LOG.md` — what changed and why
6. `09_DECISIONS.md` — permanent decisions (do not re-litigate)
7. `11_KARPATHY_LOOP_LOG.md` — discovery context

**Do not act before reading all seven.**

---

## SESSION LOG FORMAT

Every Claude Code conversation writes one session log to `sessions/`.

Filename: `<NNN>_<short-session-purpose>.md`

Example: `001_plan-lock-and-canonical-discovery.md`

```markdown
# Session Log — <FEATURE_WORK_ID>

Feature Work ID: <ID>
Claude conversation label: <recommended title>
Date/time: <YYYY-MM-DD HH:MM>
Branch: <branch name>
HEAD: <git commit hash>

## Objective
<what this session aimed to accomplish>

## Plan Lock status
<DRAFT | APPROVED | SUPERSEDED — link to 03_PLAN_LOCK.md version>

## Files changed
| File | Change |
|---|---|
| <path> | <summary> |

## Files forbidden
- <path>

## Validation evidence
<paste key command output or summarize>

## Screenshots
| Item | Status |
|---|---|
| <item> | accepted / rejected / pending |

## Drift detected
<none / describe drift event + reference 08_DRIFT_LOG.md entry>

## Next exact prompt
```
continue feature <FEATURE_WORK_ID>

Then run pre-flight:
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5

Next action: <exact next step>
```
```

---

## FILE CONTENTS GUIDE

### 00_READ_ME_FIRST.md

```markdown
# <FEATURE_WORK_ID> — READ ME FIRST

**Status:** <In Progress | Blocked | Complete>
**Last updated:** <date>
**Active Plan Lock:** 03_PLAN_LOCK.md (v<N>)
**Last session:** sessions/<NNN>_<purpose>.md

## Current state
<1-2 sentences: what is working, what is not>

## Most important constraint right now
<one sentence>

## Next action
<exact next step — command to run or file to edit>
```

### 01_OBJECTIVE.md

```markdown
# Objective — <FEATURE_WORK_ID>

## What we're building
<description>

## Why
<business/user reason>

## Acceptance criteria
- [ ] <criterion>
- [ ] <criterion>

## Non-scope
- <item>
```

### 09_DECISIONS.md

```markdown
# Decisions — <FEATURE_WORK_ID>

Permanent record. Do not re-litigate entries here without a new explicit decision.

## Decision <N> — <date>

### Question
<what was decided>

### Context
<why it came up>

### Options considered
1. <option>
2. <option>

### Decision
<what Vikram decided>

### Rationale
<why>

### Impact on Plan Lock
<none / amended / superseded>
```

### 10_SCREENSHOT_CHECKLIST.md

```markdown
# Screenshot Checklist — <FEATURE_WORK_ID>

| # | Item | Reference | Implementation | Status |
|---|---|---|---|---|
| 1 | Reference (canonical) | sessions/XXX/ref.png | — | pending |
| 2 | Implementation | — | sessions/XXX/impl.png | pending |
| 3 | Dark mode | sessions/XXX/dark_ref.png | sessions/XXX/dark_impl.png | pending |
| 4 | Empty state | — | sessions/XXX/empty.png | pending |
| 5 | Loading state | — | sessions/XXX/loading.png | pending |
| 6 | Error state | — | sessions/XXX/error.png | pending |
| 7 | Regression check | sessions/XXX/adj_before.png | sessions/XXX/adj_after.png | pending |
```

### 08_DRIFT_LOG.md

```markdown
# Drift Log — <FEATURE_WORK_ID>

## <date> Drift Event <N>

### What drifted
<description>

### Why
<root cause>

### Evidence
<what we observed>

### Options
1. <option>
2. <option>

### Decision
<what Vikram decided>

### Action
<what we did>

### Plan Lock impact
<superseded / amended / unchanged>
```
