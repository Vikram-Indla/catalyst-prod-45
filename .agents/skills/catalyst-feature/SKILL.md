---
name: catalyst-feature
version: 1.0.0
description: >-
  Catalyst feature operating system. Turns `activate feature <name>` and
  `continue feature <FEATURE_WORK_ID>` into real commands for anyone who clones
  this repo. Enforces the Catalyst Operating Contract (AGENTS.md): Feature Work
  ID, feature folder, parallel discovery agents, Karpathy loop, and Plan Lock
  before any code. Triggers on: "activate feature", "continue feature",
  "start a feature", "resume feature", or "/catalyst-feature".
---

# Catalyst Feature Operating System

This skill ships the **`activate feature` / `continue feature`** workflow with
the repo so every developer who pulls `main` gets the same operating system —
no personal plugin install required.

It is a thin router. The full, authoritative protocol lives in version-controlled
docs; this skill points the agent at them and enforces the stop gates.

## Source of truth (all committed to this repo)

| Artifact | Path |
|---|---|
| Operating contract (precedence, gates, bans) | `AGENTS.md` |
| Activate / continue protocol (full) | `docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md` |
| Karpathy loop protocol | `docs/ways-of-working/CATALYST_KARPATHY_LOOP.md` |
| Full operating system | `docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md` |
| Parallel discovery agents | `docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md` |
| Plan Lock template | `docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md` |
| Feature folder template | `docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md` |
| Scaffolding script | `scripts/catalyst-feature.mjs` |
| Onboarding (one-time setup) | `docs/ways-of-working/CATALYST_ONBOARDING.md` |

## One-time setup (each developer, once)

The scaffolding script writes feature folders to `~/catalyst/features/`. Point
that at this repo so feature folders are version-controlled with the code:

```bash
# from the repo root, once
ln -s "$(pwd)" ~/catalyst
```

Full setup steps: `docs/ways-of-working/CATALYST_ONBOARDING.md`.

---

## Command: `activate feature <name>`

Starts a new feature. Run these steps in order. **Stop before coding.**

1. Run the mandatory start sequence:
   ```bash
   pwd
   git branch --show-current
   git status --short --untracked-files=all
   git stash list --max-count=5
   ```
2. Scaffold the Feature Work ID + folder:
   ```bash
   node scripts/catalyst-feature.mjs activate "<name>"
   ```
   This creates `CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>` and its full folder
   (`00`–`12` + `sessions/001_activate_feature.md`).
3. Read `AGENTS.md` and `docs/ways-of-working/*`.
4. Spawn the mandatory discovery agents **in parallel** (one message, multiple
   Agent calls) — see `CATALYST_PARALLEL_AGENTS.md`:
   Canonical Component Discovery, Canonical Screen Discovery, UI/UX Critic,
   Integration Architect, Data/Safety Guard, Implementation Planner,
   QA/Screenshot Validator.
5. Run the Karpathy discovery loop (Hypothesis → Experiment → Measure →
   Keep/Discard → Log) and log every loop to `11_KARPATHY_LOOP_LOG.md`.
6. Produce `03_PLAN_LOCK.md` from `CATALYST_PLAN_LOCK_TEMPLATE.md`.
7. **STOP.** Plan Lock is `DRAFT` — wait for explicit review before any code.

End with the required output block (Feature Work ID, folder, session log,
recommended conversation title, Plan Lock status).

---

## Command: `continue feature <FEATURE_WORK_ID>`

Resumes an existing feature. **Stop unless the Plan Lock explicitly allows execution.**

1. Run the mandatory start sequence (above).
2. Read `AGENTS.md` and `docs/ways-of-working/*`.
3. Verify the folder exists; if unsure of the ID:
   ```bash
   node scripts/catalyst-feature.mjs list
   ```
4. Scaffold the next session log:
   ```bash
   node scripts/catalyst-feature.mjs continue <FEATURE_WORK_ID>
   ```
5. Read in order: `00_READ_ME_FIRST.md`, `01_OBJECTIVE.md`, `03_PLAN_LOCK.md`,
   `07_HANDOVER.md`, `08_DRIFT_LOG.md`, `09_DECISIONS.md`,
   `11_KARPATHY_LOOP_LOG.md`, `12_AGENT_OUTPUTS.md`.
6. Return the **rehydration report** (format in the protocol doc).
7. **STOP** unless the Plan Lock explicitly allows execution.

---

## Stop conditions (never bypass)

- No Feature Work ID + no feature folder → **no implementation**. Ask which of:
  `activate feature <name>`, `continue feature <ID>`, or list existing.
- Plan Lock is `NOT_WRITTEN`, `SUPERSEDED`, or does not allow the current task → stop and ask.
- `07_HANDOVER.md` shows a RED FLAG → stop, address it first.
- Multiple candidate folders match → list them, ask which ID, do not guess.

## Guardrails inherited from AGENTS.md

ADS tokens only (no bare colors), no hand-rolled UI, JiraTable for work-item
surfaces, zero-assumption data rendering, screenshot signoff for UI, explicit
file staging only (never `git add -A`). The contract in `AGENTS.md` wins on any
conflict — when instructions conflict, **stop and ask**.
