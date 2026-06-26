# Catalyst Feature Finder & Builder — Protocol

**Version:** 1.0  
**Date:** 2026-06-25  
**Model:** Adapted from Karpathy AutoResearch (karpathy/autoresearch)  
**Applies to:** Any new Catalyst module or major feature domain

---

## Overview

The Catalyst Feature Builder is an autonomous research-build-validate loop for shipping Catalyst-native features. It adapts the AutoResearch discipline (fixed scope, fixed metric, autonomous iteration, evidence-based keep/discard) to UI product development.

**One experiment = one bounded slice = one pass/fail decision.**

---

## The Four Fixed Files

Like AutoResearch's `prepare.py` / `train.py` / `program.md` / `results.tsv`, every Feature Builder run has four artefacts:

| Artefact | Who Authors | Mutability | Purpose |
|---|---|---|---|
| `CLAUDE.md` guardrails | Vikram | Immutable during a run | The ground truth rules. Never violated. |
| Experiment target files | Builder | One bounded set per experiment | The thing being built |
| `research-program.md` | Vikram + Builder | Evolves between phases | Domain intent, gap analysis, priority order |
| `experiment-log.tsv` | Builder | Appended per experiment | Evidence record (untracked by git) |

---

## Setup for a New Domain

1. **Read the research program** — `docs/feature-builder/<domain>-research-program.md`
2. **Read the gap analysis** — `docs/feature-builder/<domain>-gap-analysis-template.md`
3. **Probe existing Catalyst code** — identify canonical components, existing tables, routing
4. **Establish baseline** — what exists today, measured against the scorecard
5. **Confirm experiment queue** — ordered list of slices from research program
6. **Initialize** `experiment-log.tsv` with header

---

## The Experiment Loop

```
LOOP:
  1. Read research-program.md → pick next experiment from queue
  2. Declare upfront:
       - Scope: exactly which files will be touched
       - Acceptance test: what "pass" looks like (measurable, pre-specified)
       - Blocked by: any dependency that must exist first
  3. Search for existing Catalyst/Atlaskit implementation (REUSE FIRST rule)
  4. Write the minimal code for this slice only
  5. Run the scorecard (catalyst-quality-scorecard.md)
  6. Decision:
       PASS  → log to experiment-log.tsv, commit, advance to next slice
       FAIL  → log, revert touched files, redesign approach
       REVISE → log, adjust scope, re-run slice
  7. Never start the next slice without completing the current one's decision
  8. Append to experiment-log.tsv every cycle (even crashes)
```

---

## Scope Rules (Non-Negotiable)

These mirror AutoResearch's "only touch train.py" rule:

- Each experiment touches **1-3 files maximum**. If it needs more, split the experiment.
- Declare the file list **before writing code**. Do not add to scope mid-experiment.
- Do NOT touch shared components unless the experiment is explicitly "fix shared component X".
- Do NOT modify routes, admin pages, or global state unless the slice requires it.
- Do NOT refactor adjacent code unless a P0 bug is discovered.

---

## The Immutable Constraints (prepare.py equivalent)

These never change during a feature build run:

1. **CLAUDE.md guardrails** — ADS tokens, no hardcoded hex, no parallel reimplementation, no Google Fonts, staging-first, etc.
2. **Existing canonical components** — `JiraTable`, `CatalystViewBase`, `CatalystSidebarDetails`, `JiraIssueTypeIcon`, `StatusPill`, etc. Reuse or extend; never rebuild.
3. **tm_* tables** — the settled DB schema for Test Hub. No new tm_* columns without migration + Vikram approval.
4. **Atlaskit design system** — `@atlaskit/*` components, `var(--ds-*)` tokens, 4/8/16/24/32px spacing only.
5. **Route structure** — do not rename existing routes without explicit instruction.
6. **Git discipline** — stage only touched files by explicit path; never `git add -A`.

---

## Acceptance Criteria Template

Every experiment must specify these before writing code:

```
Experiment: <n> — <name>
Scope: <file1>, <file2>
Acceptance:
  - [ ] <measurable functional criterion 1>
  - [ ] <measurable functional criterion 2>
  - [ ] ADS scan clean: node design-governance/rules/audit.js <files>
  - [ ] TypeScript clean: npx tsc --noEmit (no new errors)
  - [ ] No new hardcoded hex in touched files
  - [ ] Existing tests still pass (if test harness covers the file)
Blocked by: <dependency experiment or "none">
```

---

## Decision Rules

| Condition | Decision | Action |
|---|---|---|
| All acceptance criteria pass | **PASS** | Log `keep`, commit, next slice |
| Functional criteria pass, ADS violations present | **REVISE** | Fix violations, re-score |
| Core functional criterion fails | **FAIL** | Log `discard`, revert, redesign |
| Crash or build error | **CRASH** | Log `crash`, fix or skip |
| Scope creep detected | **STOP** | Reset scope, restart slice |

---

## Simplicity Criterion (from AutoResearch)

"All else being equal, simpler is better."

Applied to Catalyst:
- Mounting `JiraTable` with a new `dataSource` adapter > building a parallel table component
- `useState` + `useEffect` > custom hook if the custom hook adds no reuse
- Reusing `CatalystViewBase` with `hideSidebar` > building a custom detail drawer
- Adding a prop to an existing component > forking the component

When two approaches produce the same visual/functional result, ALWAYS choose the one that adds fewer lines and reuses more existing code.

---

## The Research Phase vs Build Phase

**Research Phase** (comes first, always):
- Read external product documentation (AIO Tests PDFs, Jira docs, etc.)
- Probe existing Catalyst code for reusable patterns
- Map external feature → Catalyst-native equivalent
- Identify what's already built, what's partially built, what's missing
- Output: gap analysis + ordered experiment queue

**Build Phase** (follows research):
- Execute experiments from the queue in priority order
- One slice at a time
- No build-phase research detours (log them, address in next research sweep)

**Never start building without a completed research phase for the domain.**

---

## The experiment-log.tsv Format

Tab-separated. NOT committed to git (add to .gitignore if not already).

```
experiment	status	files_touched	scorecard_parity	scorecard_ads	scorecard_functional	description
001	keep	src/pages/testhub/repository/RepositoryPage.tsx	85	100	90	Baseline read of existing repository page
002	keep	src/pages/testhub/cycles/CyclesPage.tsx	80	95	85	Cycle list with status counts
003	discard	src/pages/testhub/cycles/CycleDetailPage.tsx	60	70	40	CycleDetail planned but missing execution wiring
```

Columns:
1. `experiment` — zero-padded 3-digit counter
2. `status` — `keep` | `discard` | `crash` | `revise`
3. `files_touched` — comma-separated relative paths
4. `scorecard_parity` — 0-100, AIO Tests parity score
5. `scorecard_ads` — 0-100, ADS compliance score
6. `scorecard_functional` — 0-100, functional completeness score
7. `description` — brief description of the experiment

---

## When to Stop vs When to Continue

**Continue (autonomous):**
- Next experiment in queue is clear
- Acceptance criteria well-defined
- No schema migration required
- No wide refactor detected

**Pause and ask Vikram:**
- Experiment requires new DB column or table
- Experiment requires modifying shared canonical component API
- Experiment requires new route registration
- Ambiguous acceptance criteria ("should this behave like X or Y?")
- Research phase reveals a fundamentally different architecture than planned

**Full stop:**
- CLAUDE.md guardrail conflict detected
- Research program needs to be rewritten based on new findings
- Dependency experiment failed in a way that invalidates the queue

---

## Anti-Patterns (Banned)

- "I'll build the full feature in one pass" → Violates single-slice rule
- "This looks good enough" → Requires passing scorecard, not subjective judgment
- "I'll fix the adjacent code while I'm here" → Violates scope rule
- "I'll just add a utility function" → Declared in scope upfront or not touched
- Screenshot as functional verification → Screenshot proves appearance only
- `git add -A` → Staged by explicit path only
- Building without research phase → Violates research-first rule
