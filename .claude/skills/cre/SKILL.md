---
name: cre
version: 1.0.0
description: >-
  Catalyst Rules Engine (CRE) management skill. Lets any developer add, list,
  validate, or update product rules (module ownership, hierarchy, link
  restrictions) after a git pull — no personal plugin required. Triggers on:
  "/cre", "cre add", "cre list", "cre validate", "add CRE rule", or any request
  to modify product rules in Catalyst.
---

# Catalyst Rules Engine (CRE) — Skill

This skill ships CRE rule management with the repo. Every developer who pulls
`main` can query and extend the engine — no personal setup required.

## Source of truth (all committed to this repo)

| Artifact | Path |
|---|---|
| Locked rule table (human-readable) | `src/lib/catalyst-rules/RULE_TABLE.md` |
| TypeScript engine | `src/lib/catalyst-rules/CatalystRules.ts` |
| Public barrel | `src/lib/catalyst-rules/index.ts` |

**Rule:** `RULE_TABLE.md` wins on any divergence. If code and table disagree,
update the code — not the table.

---

## How CRE works (for developers)

CRE is a pure TypeScript engine at `@/lib/catalyst-rules`. No DB. No network.
Import from the barrel; never import `CatalystRules.ts` directly.

Three chokepoints enforce every rule at runtime:

| Surface | Choke | API |
|---|---|---|
| Create dialog (`CreateStoryModal`) | Type picker filtered before render | `getAllowedTypesForModule(module)` |
| Subtask panel (`SubtasksPanel`) | `allowedChildTypes` prop | `getAllowedChildTypes(parentType)` |
| Link picker (`LinkedWorkItemsSection`) | Candidate filter | `canLinkTo(src, tgt)` |

**Any new surface that creates, links, or parents a work item MUST import from
`@/lib/catalyst-rules` and call the relevant function.** This is enforced in
`.husky/pre-commit`.

---

## Command: `/cre list`

Print all current rules from `RULE_TABLE.md`.

Steps:
1. Read `src/lib/catalyst-rules/RULE_TABLE.md`.
2. Print Grids A, B, C, D in a readable table.
3. Print the Change Log.
4. **Stop.** No edits.

---

## Command: `/cre add "<rule text>"`

Add a new rule. Always plan-mode first — never execute without YES.

Steps:
1. Read `src/lib/catalyst-rules/RULE_TABLE.md` and `CatalystRules.ts`.
2. Classify the rule:
   - **Grid A** — module ownership: which type belongs in which module
   - **Grid B** — hierarchy: which type can be child of which parent
   - **Grid C** — link restriction: which type pairs are banned from `ph_issue_links`
   - **Grid D** — creation rights (derived automatically from Grid A)
3. Produce PLAN MODE output:

```
══════════════════════════════════════════════════════
CRE PLAN — /cre add
══════════════════════════════════════════════════════
Rule classification:  Grid [A/B/C/D]
New row ID:           [e.g. A15, B14, C11]
Rule text:            [canonical statement]
RULE_TABLE.md change: [exact row to add]
CatalystRules.ts change: [exact code diff]
Migration needed:     [Yes / No — if yes, data audit SQL]
Regression risk:      [what existing surfaces are affected]
══════════════════════════════════════════════════════
Awaiting YES to proceed.
══════════════════════════════════════════════════════
```

4. **STOP.** Wait for explicit YES before touching any file.

On YES:
5. Update `src/lib/catalyst-rules/RULE_TABLE.md` — add row + Change Log entry
   with today's date and "Pending confirmation".
6. Update `src/lib/catalyst-rules/CatalystRules.ts` — implement the rule exactly.
7. Run gates:
   ```bash
   npx tsc --noEmit
   npm run lint:colors:gate
   npm run audit:ads:gate
   ```
8. Present the diff. **Stop before committing.** Ask Vikram to confirm the rule
   and update Change Log entry from "Pending confirmation" to "Confirmed by Vikram".
9. Only after confirmation: stage explicit files and commit.

---

## Command: `/cre update <row-id> "<new rule text>"`

Modify an existing rule. Same plan-mode protocol as `/cre add`.

Steps:
1. Read `RULE_TABLE.md` and `CatalystRules.ts`.
2. Locate the row by ID (e.g. `A4`, `C1`, `B6`).
3. Produce PLAN MODE output (same format as `/cre add` but showing old→new diff).
4. **STOP.** Wait for YES.
5. On YES: update both files, run gates, present diff, stop before commit.
6. Change Log entry requires Vikram confirmation before commit.

---

## Command: `/cre validate "<type>" in "<module|parentType|targetType>"`

Dry-run a rule query without modifying any file.

Examples:
- `/cre validate "QA Bug" in "TEAM"` → calls `canCreateInModule('QA Bug', 'TEAM')`
- `/cre validate "Epic" child of "Story"` → calls `canBeChildOf('Epic', 'Story')`
- `/cre validate "Business Request" link "QA Bug"` → calls `canLinkTo(...)`

Steps:
1. Read `CatalystRules.ts`.
2. Evaluate the rule query mentally (or trace through the code).
3. Return: `ALLOWED` or `BANNED` + which rule (row ID) applies.
4. **No file changes.**

---

## Stop conditions (never bypass)

- Rule classification is ambiguous → ask before writing the plan.
- Rule conflicts with an existing row → surface the conflict, ask how to resolve.
- Rule touches Grid A (module ownership) and migration is needed → include the
  data audit SQL in the plan; do not proceed without confirming migration scope.
- Any gate fails → stop, report failure, do not commit.
- Vikram has not confirmed the Change Log entry → do not commit.

## Guard rails inherited from CLAUDE.md

ADS tokens only in any styled output. No hand-rolled UI. Explicit file staging
only. Surgical changes — touch only `RULE_TABLE.md` and `CatalystRules.ts`
unless the rule requires wiring a new chokepoint (requires separate
`activate feature` slice).
