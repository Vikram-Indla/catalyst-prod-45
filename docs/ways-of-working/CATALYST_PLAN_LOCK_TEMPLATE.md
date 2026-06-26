# CATALYST PLAN LOCK TEMPLATE

> Copy this template to `~/catalyst/features/<feature-name>/03_PLAN_LOCK.md`.
> Fill in every section before writing any code.
> **No code before Plan Lock is complete and reviewed.**

---

```markdown
# PLAN LOCK — <Feature Name>

**Status:** DRAFT | APPROVED | SUPERSEDED
**Approved by:** <Vikram / implicit>
**Timebox:** 2 hours from <start time>
**Slice:** <slice number> of <total>

---

## OBJECTIVE

<One paragraph. What does "done" look like? Be specific about the visible outcome.>

---

## NON-SCOPE

The following are explicitly OUT of scope for this slice:

- <item>
- <item>

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| <component> | <path> | <reason> |

Query evidence: <paste Storybook MCP or grep output confirming canonical selection>

---

## CANONICAL SCREENS SELECTED

| Screen | Route | Adapter needed |
|---|---|---|
| <screen> | <route> | <yes/no + adapter summary> |

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| <path> | edit/add | <what changes> |

---

## FILES FORBIDDEN

These files must NOT be touched in this slice:

- <path>
- <path>

---

## UI/UX RULES

- All colors: ADS tokens only (`var(--ds-*)`)
- No hand-rolled UI (table, modal, dropdown, etc.)
- ADS spacing grid: 4/8/16/24/32px only
- Sentence-case labels
- Icon registry: `JiraIssueTypeIcon` with canonical type strings only
- Dark mode: verify by reload-into-dark

---

## DATA/BACKEND RULES

- DB columns verified to exist: <list columns and verification command output>
- Field access: snake_case for raw DB rows, camelCase for mapped objects
- No assumption defaults (`|| 'Story'`, `|| 'todo'`, etc.)
- RLS impact: <none / describe impact>
- Migration required: <no / yes — describe>

---

## INTEGRATION/WIRING RULES

- React Query hooks to use: <list>
- New hooks required: <none / describe>
- Edge functions involved: <none / describe>
- Props/interface contracts: <describe key boundaries>

---

## PARALLEL EXECUTION PLAN

**Phase 1 — Discovery (parallel):**
- Agent: Canonical Component Discovery
- Agent: Canonical Screen Discovery
- Agent: UI/UX Critic

**Phase 2 — Architecture (parallel):**
- Agent: Integration Architect
- Agent: Data/Safety Guard

**Phase 3 — Plan:**
- Agent: Implementation Planner (synthesizes phases 1–2)

**Phase 4 — Execution:**
- Implement per file list above

**Phase 5 — Validation:**
- Agent: QA/Screenshot Validator

---

## SCREENSHOT CHECKLIST

- [ ] Reference screenshot captured
- [ ] Implementation screenshot captured
- [ ] Dark mode screenshot captured
- [ ] Empty state screenshot captured
- [ ] Loading state screenshot captured
- [ ] Error state screenshot captured
- [ ] Adjacent UI regression check screenshot captured

---

## VALIDATION COMMANDS

```bash
# Run before commit
<paste actual commands>
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Any file outside the FILES TO MODIFY list needs changes
- Any DB column doesn't exist as assumed
- Any canonical component doesn't fit (requires unsuitability proof)
- Any regression detected in adjacent UI
- Slice exceeds 2 hours

RED FLAG format:
```
RED FLAG:
1. What might regress / block
2. Why
3. Evidence
4. Safer option
5. Decision needed from Vikram
```

---

## DRIFT/REBASELINE RULES

If this Plan Lock is superseded mid-slice:
1. Stop
2. Document drift in `08_DRIFT_LOG.md`
3. Get rebaseline approval
4. Update this file status to SUPERSEDED
5. Create a new Plan Lock for the rebaselined scope
```
