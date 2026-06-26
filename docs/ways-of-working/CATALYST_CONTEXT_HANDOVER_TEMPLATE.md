# CATALYST CONTEXT HANDOVER TEMPLATE

> Copy to `~/catalyst/features/<feature-name>/07_HANDOVER.md`.
> Write at context risk or end of session.
> Incoming session reads this before any action.

---

```markdown
# HANDOVER — <Feature Name>

**Written:** <date time>
**Session ended at:** <what triggered handover>
**Git HEAD:** <commit hash>
**Branch:** <branch name>

---

## OBJECTIVE (brief)

<1-2 sentences: what we're building>

---

## ACTIVE PLAN LOCK

File: `03_PLAN_LOCK.md` (v<N>)
Status: <APPROVED / SUPERSEDED>

Key constraints from Plan Lock:
- Files to modify: <list>
- Files forbidden: <list>
- Timebox remaining: <estimate>

---

## CURRENT STATE

### What is working
- <item>

### What is NOT working / incomplete
- <item>

### What was last touched
File: <path>
Change: <what>
State: <complete / in-progress / broken>

---

## CHANGED FILES

| File | Status | Notes |
|---|---|---|
| <path> | complete / in-progress / broken | <notes> |

---

## FORBIDDEN FILES

Do not touch these in the next session:
- <path>
- <path>

---

## SCREENSHOTS

| Screenshot | File | Status |
|---|---|---|
| Reference | <path> | captured / missing |
| Implementation | <path> | captured / missing |
| Dark mode | <path> | captured / missing |

---

## VALIDATION EVIDENCE

Commands run and output:
```bash
<command>
# output: <paste or summarize>
```

Outstanding validations needed:
- <item>

---

## DRIFT LOG SUMMARY

See `08_DRIFT_LOG.md` for full log.

Active drift events: <count>
Most recent drift: <brief description>

---

## NEXT EXACT PROMPT

Paste this as your first message in the next session:

```
Continue feature: <feature-name>
Read: ~/catalyst/features/<feature-name>/00_READ_ME_FIRST.md
      ~/catalyst/features/<feature-name>/03_PLAN_LOCK.md
      ~/catalyst/features/<feature-name>/07_HANDOVER.md
      ~/catalyst/features/<feature-name>/08_DRIFT_LOG.md

Then run pre-flight:
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5

Next action: <exact next step>
```
```
