# CATALYST SELF-TEST

> Run this checklist before every task.
> **If any answer is NO, do not code.**

---

## SELF-TEST BEFORE CODING

| # | Check | Answer |
|---|---|---|
| 1 | Did I read CLAUDE.md? | YES / NO |
| 2 | Do I have a Feature Work ID? (`CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>`) | YES / NO |
| 3 | Does the feature folder exist at `~/catalyst/features/<FEATURE_WORK_ID>/`? | YES / NO |
| 4 | Did I read `00_READ_ME_FIRST.md`, `01_OBJECTIVE.md`, `03_PLAN_LOCK.md`, `07_HANDOVER.md`, `08_DRIFT_LOG.md`, `09_DECISIONS.md`? | YES / NO / N/A |
| 5 | Did I run pre-flight? (`pwd`, `git branch`, `git status`, `git stash list`) | YES / NO |
| 6 | Did I spawn parallel agents? (or is task trivial single-file?) | YES / NO / TRIVIAL |
| 7 | Did I identify canonical components? (or confirm none apply) | YES / NO |
| 8 | Did I avoid proposing hand-rolled UI? | YES / NO |
| 9 | Did I define the screenshot checklist (`10_SCREENSHOT_CHECKLIST.md`)? | YES / NO / NO_UI |
| 10 | Did I define validation commands? | YES / NO |
| 11 | Did I define stop conditions? | YES / NO |
| 12 | Did I check context health? (context load OK?) | YES / NO |
| 13 | Did I print the recommended Claude conversation title? | YES / NO |

---

## FAIL CLOSED RULE

**If any answer is NO, do not code.**

Stop, fix the gap, re-run the self-test, then proceed.

---

## TRIVIAL TASK EXCEPTION

A task is "trivial" if it meets ALL of:
- Single file change
- No UI involved
- No DB involved
- No new component required
- Change is <= 10 lines

Even trivial tasks require: pre-flight (check 4) and reading CLAUDE.md (check 1).

---

## ACTIVATION PHRASES (verified in CLAUDE.md)

These phrases confirm the governance contract is active:

- `No code before Plan Lock`
- `Parallel agents are mandatory`
- `Hand-rolled UI is rejected by default`
- `Screenshots are mandatory for UI/UX acceptance`
- `JiraTable is mandatory`
- `Bare colors are banned`
- `If any answer is NO, do not code`

---

## HOW TO RUN THIS CHECKLIST

At session start:

```bash
# 1. Confirm governance files exist
test -f CLAUDE.md && echo "CLAUDE_MD_PRESENT"
test -f docs/ways-of-working/CATALYST_SELF_TEST.md && echo "SELF_TEST_PRESENT"
test -f docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md && echo "PLAN_LOCK_TEMPLATE_PRESENT"
test -f docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md && echo "PARALLEL_AGENTS_PRESENT"

# 2. Confirm activation phrases
grep -n "No code before Plan Lock" CLAUDE.md
grep -n "Parallel agents are mandatory" CLAUDE.md
grep -n "Hand-rolled UI is rejected by default" CLAUDE.md
grep -n "Screenshots are mandatory for UI/UX acceptance" CLAUDE.md
grep -n "JiraTable is mandatory" CLAUDE.md
grep -n "Bare colors are banned" CLAUDE.md
grep -n "If any answer is NO, do not code" docs/ways-of-working/CATALYST_SELF_TEST.md

# 3. Secret scan (no secrets in active governance files)
grep -RIn "sbp_\|service_role\|anon key\|eyJhbGci\|JIRA_API_TOKEN\|ANTHROPIC_API_KEY\|GEMINI_API_KEY\|RESEND_API_KEY" CLAUDE.md docs/ways-of-working --exclude-dir=archive || echo "NO_SECRETS_FOUND"
```

All checks must pass before implementation begins.
