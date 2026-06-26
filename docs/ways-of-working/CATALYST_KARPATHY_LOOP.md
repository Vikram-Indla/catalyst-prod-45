# CATALYST KARPATHY LOOP

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
>
> Every discovery and implementation decision runs through this loop.
> Log every loop entry to `~/catalyst/features/<FEATURE_WORK_ID>/11_KARPATHY_LOOP_LOG.md`.

---

## THE LOOP

```
HYPOTHESIS  →  EXPERIMENT  →  MEASURE  →  KEEP/DISCARD  →  LOG
```

| Step | Description |
|---|---|
| **Hypothesis** | State exactly what you expect to be true — "JiraTable fits this RBAC Users surface" |
| **Experiment** | Run the smallest probe that tests the hypothesis — inspect API, grep usages, check screenshot |
| **Measure** | Collect evidence — API signature, component props, visual fit, test output |
| **Keep/Discard** | Accept (keep) or reject (discard) the hypothesis with evidence attached |
| **Log** | Write the loop entry to `11_KARPATHY_LOOP_LOG.md` |

---

## DISCOVERY LOOP EXAMPLES

### Hypothesis: JiraTable fits the RBAC Users admin surface

```
Hypothesis: JiraTable can render a list of users with role badges and action menus.
Experiment:
  1. grep -r "JiraTable" src/components --include="*.tsx" | head -20
  2. Read JiraTable props/API
  3. Check Storybook MCP for JiraTable usage examples
Measure:
  - JiraTable accepts columns, data, row actions
  - Existing usage in src/pages/admin/IssuesAdminPage.tsx
  - No custom cell renderers needed for name, email, role badge
Keep: JiraTable fits. Use JiraTable for RBAC Users table.
Log:
  [LOOP-001] Hypothesis: JiraTable fits RBAC Users.
  Evidence: API reviewed, existing usage confirmed, no custom renderer needed.
  Decision: KEEP — use JiraTable.
```

### Hypothesis: Existing UserModal can be adapted for RBAC role assignment

```
Hypothesis: Existing UserModal in src/components/users/UserModal.tsx has the right shell.
Experiment:
  1. Read src/components/users/UserModal.tsx
  2. Check props: does it accept onRoleAssign or similar?
Measure:
  - Modal is for user profile editing only, not role assignment
  - No role assignment props
Discard: Cannot adapt. Need to use a Catalyst modal primitive for a new RoleAssignModal.
Log:
  [LOOP-002] Hypothesis: UserModal can be adapted.
  Evidence: Props inspected — no role assignment surface exists in UserModal.
  Decision: DISCARD — build RoleAssignModal from Catalyst modal primitive (not hand-rolled).
```

---

## IMPLEMENTATION LOOP EXAMPLES

### Hypothesis: Replacing hand-rolled table with JiraTable

```
Hypothesis: Replacing <table> in RbacUsersTable.tsx with JiraTable improves Catalyst fit.
Experiment: Modify RbacUsersTable.tsx per Plan Lock.
Measure:
  - TypeScript: no errors
  - Lint: no violations
  - Screenshot: visual matches canonical Jira admin table
  - Dark mode: no light-metaphor artifacts
Keep: TS + lint + screenshot all pass. KEEP.
Log:
  [LOOP-003] Hypothesis: JiraTable swap in RbacUsersTable.
  Evidence: TS clean, lint clean, screenshot accepted by Vikram.
  Decision: KEEP.
```

### Hypothesis: ADS token `var(--ds-text)` for table header color

```
Hypothesis: --ds-text is the correct ADS token for RBAC table header text.
Experiment: grep -r "ds-text" src/components/admin | head -10
Measure: 12 existing usages confirmed — all table headers use --ds-text
Keep: Confirmed. Use var(--ds-text).
Log:
  [LOOP-004] ADS token --ds-text confirmed for table headers.
  Decision: KEEP.
```

---

## LOG FORMAT

Every loop entry in `11_KARPATHY_LOOP_LOG.md` must follow this format:

```markdown
## [LOOP-<NNN>] <Short description>

**Date:** YYYY-MM-DD
**Phase:** Discovery | Implementation | Validation
**Hypothesis:** [What you expected to be true]
**Experiment:** [Exact probe run — grep, read, screenshot, etc.]
**Evidence:** [What you found]
**Decision:** KEEP | DISCARD
**Reason:** [Why — 1-2 sentences]
**Next step:** [What to do with this result]
```

---

## RULES

1. Every hypothesis must be stated **before** the experiment. No post-hoc hypotheses.
2. Experiments must be **minimal** — smallest probe that answers the question.
3. "I assume" is not evidence. Run the probe.
4. A KEEP decision must have evidence. A DISCARD must name a better alternative.
5. Every loop entry must be logged before moving to the next experiment.
6. Do not run more than 3 loops on the same hypothesis. If 3 loops fail, stop and escalate.

---

## DISCOVERY LOOP — REQUIRED BEFORE PLAN LOCK

Before writing Plan Lock, run the Karpathy Discovery Loop for:

| Question | Loop Type |
|---|---|
| Which Catalyst canonical component fits? | DISCOVERY |
| Does an existing screen/route cover the UX? | DISCOVERY |
| Do the DB columns exist? | DISCOVERY |
| Which ADS tokens apply? | DISCOVERY |
| Are there existing Supabase hooks to reuse? | DISCOVERY |
| What might regress? | DISCOVERY |

All discovery loops must be logged in `11_KARPATHY_LOOP_LOG.md` before the Plan Lock is written.

---

## IMPLEMENTATION LOOP — REQUIRED DURING EXECUTION

During implementation, run a Karpathy Loop for every file edit:

| Question | Loop Type |
|---|---|
| Does this change break TypeScript? | IMPLEMENTATION |
| Does this change introduce banned colors? | IMPLEMENTATION |
| Does this change produce the correct screenshot? | IMPLEMENTATION |
| Does this change break adjacent functionality? | IMPLEMENTATION |

---

## RELATIONSHIP TO PLAN LOCK

Discovery loops → inform Plan Lock.
Implementation loops → validate Plan Lock decisions.

If an implementation loop produces a DISCARD result that contradicts Plan Lock → this is drift. Log in `08_DRIFT_LOG.md` and ask for rebaseline.
