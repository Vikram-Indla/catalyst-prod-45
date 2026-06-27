# CATALYST OPERATING CONTRACT — CLAUDE CODE BOOTSTRAP

> **This file is the active operating contract for all Claude Code sessions in this repo.**
> Every agent, subagent, skill, and continuation session is bound by these rules.
> Conflicts → stop and ask. Do not silently choose.

---

## PRECEDENCE ORDER

When instructions conflict, resolve in this order — highest first:

1. Active user-approved **Plan Lock** (`03_PLAN_LOCK.md` in the active feature folder)
2. Active **feature handover** (`07_HANDOVER.md` / `08_DRIFT_LOG.md` in the active feature folder)
3. This **CLAUDE.md**
4. **Catalyst canonical components** and Storybook MCP
5. **Atlassian Design System** (https://atlassian.design/)
6. Historical lessons and local notes

**If instructions conflict, stop and ask. Do not silently choose.**

---

## OPERATING COMMANDS

### `activate feature <name>`

Starts a new Catalyst feature or fix. Claude must:

1. Create Feature Work ID: `CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>`
2. Create `~/catalyst/features/<FEATURE_WORK_ID>/` with all required artifacts
3. Read `CLAUDE.md` and `docs/ways-of-working/*`
4. Run pre-flight
5. Spawn mandatory discovery agents (parallel)
6. Run the Karpathy discovery loop (log to `11_KARPATHY_LOOP_LOG.md`)
7. Produce Plan Lock (`03_PLAN_LOCK.md`)
8. **Stop before coding** — Plan Lock must be reviewed before implementation

### `continue feature <FEATURE_WORK_ID>`

Resumes an existing feature. Claude must:

1. Read `CLAUDE.md` and `docs/ways-of-working/*`
2. Read the full feature folder
3. Read in order: `03_PLAN_LOCK.md`, `07_HANDOVER.md`, `08_DRIFT_LOG.md`, `09_DECISIONS.md`, `11_KARPATHY_LOOP_LOG.md`
4. Create a new session log under `sessions/`
5. Run pre-flight
6. Return rehydration report (state, active Plan Lock, next action)
7. **Stop unless Plan Lock explicitly allows execution**

**No Feature Work ID + no feature folder = no implementation.**

---

## MANDATORY START SEQUENCE

Every task begins — no exceptions:

```bash
pwd
git branch --show-current
git status --short --untracked-files=all
git stash list --max-count=5
```

Then:
1. Identify the Feature Work ID (`CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>`). If unknown → stop and ask.
2. Read active feature folder: `~/catalyst/features/<FEATURE_WORK_ID>/`
3. Read in order: `00_READ_ME_FIRST.md`, `01_OBJECTIVE.md`, `03_PLAN_LOCK.md`, `07_HANDOVER.md`, `08_DRIFT_LOG.md`, `09_DECISIONS.md`, `11_KARPATHY_LOOP_LOG.md`
4. Print: `Recommended Claude conversation title: <FEATURE_WORK_ID> — <short purpose>`

---

## FEATURE WORK ID — MANDATORY

**No implementation may begin without a Feature Work ID and active feature folder.**

Format: `CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>`

Example: `CAT-RBAC-ADMIN-UI-20260626-001`

Rules:
- If Feature Work ID is unknown → stop and ask.
- If multiple candidate folders exist → list them and ask which to continue.
- If no folder exists → create it before planning.
- Each Feature Work ID maps to exactly one folder: `~/catalyst/features/<FEATURE_WORK_ID>/`
- Every session must write/update a session log under `sessions/`.

Print at session start:
```
Recommended Claude conversation title:
<FEATURE_WORK_ID> — <short purpose>
```

---

## FEATURE FOLDER DISCIPLINE

Every meaningful feature must have a working folder:

```
~/catalyst/features/<FEATURE_WORK_ID>/
  00_READ_ME_FIRST.md
  01_OBJECTIVE.md
  02_CANONICAL_DISCOVERY.md
  03_PLAN_LOCK.md
  04_EXECUTION_LOG.md
  05_UI_UX_REVIEW.md
  06_VALIDATION_EVIDENCE.md
  07_HANDOVER.md
  08_DRIFT_LOG.md
  09_DECISIONS.md
  10_SCREENSHOT_CHECKLIST.md
  11_KARPATHY_LOOP_LOG.md
  09_DECISIONS.md
  10_SCREENSHOT_CHECKLIST.md
  sessions/
    001_<session-purpose>.md
    002_<session-purpose>.md
```

Any continuation session **must** read `00`, `01`, `03`, `07`, `08`, `09` before acting.

See template: [`docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md`](docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md)

---

## PLAN LOCK BEFORE CODE

**No code before Plan Lock.**

Plan Lock must define: objective, non-scope, 2-hour timebox, canonical components selected, canonical screens selected, files to modify, files forbidden, UI/UX rules, data/backend rules, integration/wiring rules, parallel execution plan, screenshot checklist, validation commands, stop conditions, drift/rebaseline rules.

See template: [`docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md`](docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md)

---

## PARALLEL AGENTS MANDATORY

**Parallel agents are mandatory.** Claude must not work as a single waterfall coder for non-trivial work.

Required agents before implementation:

| Agent | Purpose |
|---|---|
| Canonical Component Discovery | Find existing Catalyst components that fit |
| Canonical Screen Discovery | Find existing screens/routes that fit |
| UI/UX Critic | Score the proposed design against ADS + Storybook |
| Integration Architect | Define wiring, data flow, API contracts |
| Data/Safety Guard | Flag DB column existence, RLS, migration risk |
| Implementation Planner | Produce the ordered file edit list |
| QA/Screenshot Validator | Define and run the screenshot acceptance checklist |

See: [`docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md`](docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md)

---

## CANONICAL COMPONENT HIERARCHY

Use this order — no skipping:

1. Existing Catalyst canonical component
2. Existing Catalyst wrapper
3. Catalyst Storybook component (query `catalyst-storybook` MCP)
4. Atlassian Design System primitive (`@atlaskit/*`)
5. Hand-rolled component — **only with explicit Vikram approval**

"Overkill" is not evidence. Prove unsuitability with API and usage evidence.

See: [`docs/ways-of-working/CATALYST_CANONICAL_COMPONENTS.md`](docs/ways-of-working/CATALYST_CANONICAL_COMPONENTS.md)

---

## HAND-ROLLED UI BANNED

**Hand-rolled UI is rejected by default.**

Banned custom implementations of:
tables, menus, dropdowns, modals, drawers, tabs, badges, lozenges, status pills, avatars, date fields, inline edit fields, rich text editors, tooltips, spinners, empty states, sidebars, navigation items, permission matrices, action menus.

Use Catalyst canonical components or ADS primitives (`@atlaskit/*`).

---

## JIRATABLЕ / TABLE-LIST RULE

Before building any table or list surface:

**Prove whether `JiraTable` or another Catalyst canonical table fits.**

**JiraTable is mandatory** for Jira/work-item surfaces and first candidate for enterprise admin lists.

No custom `<table>`, CSS grid table, or flex table unless explicitly approved after written proof.

---

## ADS TOKENS ONLY — HARD STOP ⛔

> **This is the single most violated rule. Violations block commits. No exceptions.**
> Vikram has had to correct this more than 100 times. Every violation from this point is a failure.

**BEFORE WRITING OR TOUCHING ANY STYLED COMPONENT run this audit:**

```bash
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsl[a]?\(|bg-(red|green|blue|yellow|orange|lime|pink|purple|slate|gray|zinc|neutral|stone|amber|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-|text-(red|green|blue|yellow|orange|lime|pink|purple|slate|gray|zinc|neutral|stone|amber|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-)" \
  src/
```

**If it returns ANY match in a file you are about to touch → fix before committing.**

**Banned — absolutely no exceptions:**
- bare hex values: `#E9F2FE`, `#0C66E4`, any hex
- raw `rgb()`, `rgba()`, `hsl()`, `hsla()` — even with CSS variables as arguments
- Tailwind color utilities: `bg-slate-100`, `text-gray-500`, `border-green-200`, etc.
- inline `style={{ color: 'green' }}` or any named CSS color
- lime, bright green, yellow/orange, rainbow on non-AI controls
- custom color constants or local color maps (e.g. `const COLOR_MAP = { low: '#...' }`)
- hex fallbacks in `var(--ds-*, #fallback)` — use token-only, no fallback hex

**Allowed — only these patterns:**
- `var(--ds-background-*)`, `var(--ds-text-*)`, `var(--ds-border-*)`, etc. — NO hex fallback
- ADS `token('color.background.neutral')` helper from `@atlaskit/tokens`
- `@atlaskit/lozenge`, `@atlaskit/badge`, `@atlaskit/tag` — let the component own its color
- Canonical Catalyst component-owned colors (component sets color internally, caller passes no color prop)
- `AIIntelligenceButton` / `CatyRainbowCTA` rainbow — only those two, nowhere else

**ADS Token reference (memorise these):**

| Purpose | Token |
|---|---|
| Page background | `var(--ds-surface)` |
| Sunken / alternate row | `var(--ds-surface-sunken)` |
| Card / elevated | `var(--ds-surface-raised)` |
| Primary text | `var(--ds-text)` |
| Secondary text | `var(--ds-text-subtle)` |
| Placeholder / hint | `var(--ds-text-subtlest)` |
| Danger text | `var(--ds-text-danger)` |
| Warning text | `var(--ds-text-warning)` |
| Success text | `var(--ds-text-success)` |
| Info text | `var(--ds-text-information)` |
| Link / brand text | `var(--ds-text-brand)` |
| Border default | `var(--ds-border)` |
| Border bold | `var(--ds-border-bold)` |
| Border focused | `var(--ds-border-focused)` |
| Border danger | `var(--ds-border-danger)` |
| Neutral bg | `var(--ds-background-neutral)` |
| Neutral subtle bg | `var(--ds-background-neutral-subtle)` |
| Success subtle bg | `var(--ds-background-success)` |
| Warning subtle bg | `var(--ds-background-warning)` |
| Danger subtle bg | `var(--ds-background-danger)` |
| Info subtle bg | `var(--ds-background-information)` |
| Selected bg | `var(--ds-background-selected)` |
| Brand bold bg (CTA) | `var(--ds-background-brand-bold)` |
| Icon default | `var(--ds-icon)` |
| Icon subtle | `var(--ds-icon-subtle)` |
| Icon danger | `var(--ds-icon-danger)` |
| Icon success | `var(--ds-icon-success)` |
| Overlay shadow | `var(--ds-shadow-overlay)` |
| Focus ring | `var(--ds-border-focused)` |

**ENFORCEMENT: Before every commit touching styled code:**

```bash
# Run this. Zero output = clean. Any output = STOP, fix first.
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}(?!['\"]?\s*\))|rgba?\s*\(|hsl[a]?\s*\()" \
  src/ | grep -v "node_modules" | grep -v "\.snap"
```

---

## SCREENSHOT SIGNOFF MANDATORY

**Screenshots are mandatory for UI/UX acceptance.**

Screenshots do not prove functionality. DOM/tests/API probes prove functionality.

No screenshot acceptance = no UI-heavy commit.

See: [`docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md`](docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md)

---

## REGRESSION RED FLAG

**Regression is banned.**

If in doubt, stop and raise:

```
RED FLAG:
1. What might regress
2. Why
3. Evidence
4. Safer option
5. Decision needed
```

Do not patch over a regression. Stop, raise, decide.

---

## TWO-HOUR SLICE RULE

No implementation slice exceeds 2 hours. If it cannot fit, split it.

After one correction loop: accept / split / rebuild / stop+revert. No endless patching.

---

## KARPATHY LOOP

**Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.**

Every discovery and implementation decision follows this loop. Log every loop to `11_KARPATHY_LOOP_LOG.md`.

See: [`docs/ways-of-working/CATALYST_KARPATHY_LOOP.md`](docs/ways-of-working/CATALYST_KARPATHY_LOOP.md)

---

## AIDEN VALIDATION BLOCK

Every major Claude response must end with an Aiden Validation Block.

See: [`docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md`](docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md)

---

## CONTEXT HEALTH AND HANDOVER

At context risk, stop and write/update handover. Do not continue across conversation changes without reading the handover and Plan Lock.

See template: [`docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md`](docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md)

---

## COMMIT GATE

No commit without:

- Feature Work ID confirmed
- Session log written to `sessions/<NNN>_<purpose>.md`
- Plan Lock approved
- Raw validation output
- Screenshot acceptance for UI changes
- Guardrails confirmed (no banned colors, no hand-rolled UI, no assumption defaults)
- Exact file list approved
- Commit message approved

Stage explicit files only. Never `git add -A` or `git add .`.

---

## ZERO-ASSUMPTION DATA RENDERING

When data is unknown, uncertain, or missing — render nothing (dash, empty, no icon).

**Never render a domain-specific default that is factually wrong.**

A lie is always worse than silence.

Banned patterns:
```tsx
// BANNED — lies when parent type is unknown
type={r.parent_issue_type || 'Story'}
const status = row.status || 'todo'
```

Correct patterns:
```tsx
// CORRECT — renders nothing when unknown
r.parent_issue_type ? <JiraIssueTypeIcon type={r.parent_issue_type} /> : null
const status = row.status ?? null
```

---

## FOUR UNIVERSAL RULES

1. **Think before coding** — state assumptions, present ambiguities, ask when unclear.
2. **Simplicity first** — no abstractions, features, or future-proofing not in spec.
3. **Surgical changes** — touch only what the task requires.
4. **Goal-driven** — state what "done" looks like before coding. Verify before stopping.

---

## SELF-TEST BEFORE CODING

Run [`docs/ways-of-working/CATALYST_SELF_TEST.md`](docs/ways-of-working/CATALYST_SELF_TEST.md) before every task.

**If any answer is NO, do not code.**

---

## SUPPORTING DOCS

| Doc | Purpose |
|---|---|
| [`CATALYST_ONBOARDING.md`](docs/ways-of-working/CATALYST_ONBOARDING.md) | **Start here on a fresh clone** — one-time setup + how to run `activate feature` |
| [`CATALYST_OPERATING_SYSTEM.md`](docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md) | Full operating system — TRIAD roles, delivery loop, drift control |
| [`CATALYST_PARALLEL_AGENTS.md`](docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md) | Agent definitions, inputs, outputs, failure criteria |
| [`CATALYST_CANONICAL_COMPONENTS.md`](docs/ways-of-working/CATALYST_CANONICAL_COMPONENTS.md) | Canonical-first rules, JiraTable rule, proof of unsuitability |
| [`CATALYST_UI_UX_ACCEPTANCE.md`](docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md) | Screenshot requirements, forbidden visuals, ADS token rules |
| [`CATALYST_PLAN_LOCK_TEMPLATE.md`](docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md) | Copy-paste Plan Lock template |
| [`CATALYST_FEATURE_FOLDER_TEMPLATE.md`](docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md) | Feature folder structure and required contents |
| [`CATALYST_CONTEXT_HANDOVER_TEMPLATE.md`](docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md) | Handover template |
| [`CATALYST_SELF_TEST.md`](docs/ways-of-working/CATALYST_SELF_TEST.md) | Self-test checklist — run before every task |
| [`CATALYST_KARPATHY_LOOP.md`](docs/ways-of-working/CATALYST_KARPATHY_LOOP.md) | Karpathy Loop protocol — hypothesis, experiment, measure, log |
| [`CATALYST_AIDEN_VALIDATION_BLOCK.md`](docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md) | Aiden Validation Block — required at end of every major response |
| [`CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md`](docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md) | activate feature / continue feature full protocol |
| [`CATALYST_CANONICAL_RULEBOOK.md`](docs/ways-of-working/CATALYST_CANONICAL_RULEBOOK.md) | Catalyst-specific canonical rules — JiraTable, access management, modal patterns |
| [`archive/CLAUDE_OLD_BACKUP_20260626_0242.md`](docs/ways-of-working/archive/CLAUDE_OLD_BACKUP_20260626_0242.md) | Full previous CLAUDE.md (2416 lines) |
