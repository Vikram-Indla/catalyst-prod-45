# Catalyst Feature Builder — Quality Scorecard

**Version:** 1.0  
**Date:** 2026-06-25  
**Role:** The `val_bpb` equivalent for Catalyst experiments. Run after every experiment.

---

## How to Score

Score each dimension independently. Total is NOT a simple average — dimensions have weights. Read each criterion, probe the live code/UI, assign score. A single P0 failure in any dimension = overall FAIL regardless of score.

---

## Dimension 1 — ADS Compliance (weight: 25%)

**Ground truth:** `node design-governance/rules/audit.js <files touched>`  
**Pass threshold:** 0 violations in touched files

| Score | Condition |
|---|---|
| 100 | Zero violations in touched files. Audit exits 0. |
| 80 | 1-2 minor violations (e.g. spacing off-grid), none P0. Being fixed immediately. |
| 50 | P1 violations present (hardcoded hex, wrong token semantic). Needs revision. |
| 0 | P0 violation (non-Atlassian font, banned component, Tailwind utility on chrome) |

**P0 triggers automatic FAIL regardless of other scores:**
- Hardcoded hex `#RRGGBB` as primary value (not inside `var()` fallback)
- `@fontsource/*` import
- Tailwind color/font utility on any chrome element
- Custom `<table>` for work items (must use `JiraTable`)
- Hand-rolled dropdown (must use `@atlaskit/dropdown-menu` or canonical portal pattern)

**Commands:**
```bash
node design-governance/rules/audit.js src/<touched-file>
node design-governance/scripts/self-test.mjs
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

---

## Dimension 2 — AIO Tests Parity (weight: 30%)

**Ground truth:** AIO Tests PDF documentation (152 PDFs in `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/`)  
**Pass threshold:** Score ≥ 70 for a Phase 1/2 slice; ≥ 85 for Phase 3 slice

Rate based on how many AIO Tests user actions for this feature area work in Catalyst:

| Score | Condition |
|---|---|
| 100 | Every documented AIO action works end-to-end in Catalyst |
| 85 | Core user journey works; edge cases (bulk, offline, advanced filters) pending |
| 70 | Primary CRUD works; secondary features (versions, smart sets, etc.) missing |
| 50 | Partial CRUD (create + read only, no edit/delete) |
| 25 | Read-only or placeholder — no write path |
| 0 | Feature not reachable or crashes |

**Specific parity checks per feature area:**

### Cases
- [ ] Create case with title, steps, priority, type, folder
- [ ] Edit case inline (summary, priority, status)
- [ ] Add/remove/reorder steps
- [ ] Copy case (preserves steps + metadata)
- [ ] Move case to different folder
- [ ] Delete case (soft delete)
- [ ] Archive case
- [ ] Quick view (drawer, not full page)

### Test Cycles
- [ ] Create cycle with name, status, sprint assignment
- [ ] Edit cycle name/status
- [ ] Copy/archive/delete cycle
- [ ] View cycle scope (list of cases in cycle)
- [ ] Assign cases to cycle members

### Execution
- [ ] Execute a test run step-by-step
- [ ] Set step status (pass/fail/blocked/skipped)
- [ ] Auto-cascade to run status (all pass → passed, any fail → failed)
- [ ] Log defect from failed step
- [ ] Attach evidence (screenshot/file)
- [ ] Bulk actions on scope (bulk pass, bulk assign)

### Reports
- [ ] At least 3 report types renderable
- [ ] Data reflects real tm_* table state (not hardcoded)

### Traceability
- [ ] Jira issue → linked test cases visible
- [ ] Test case → linked Jira issues visible
- [ ] Coverage status (% cases in cycle)

---

## Dimension 3 — Functional Completeness (weight: 30%)

Rate the feature against its own acceptance criteria (declared before the experiment):

| Score | Condition |
|---|---|
| 100 | All declared acceptance criteria pass |
| 80 | All P1 criteria pass; P2 criteria (edge cases, loading states) pending |
| 60 | Core flow works; at least 1 declared criterion fails |
| 30 | Build succeeds but core functionality broken |
| 0 | Build fails / crashes on mount |

**Standard checks for any Catalyst page:**
- [ ] Page mounts without console errors
- [ ] Loading state renders correctly (no flash of broken UI)
- [ ] Empty state renders correctly (no blank white box)
- [ ] Error state handled (Supabase error → user-visible message, not crash)
- [ ] Data from `tm_*` tables (never `th_*`)
- [ ] Write paths (create/update/delete) persist to DB and re-fetch
- [ ] TypeScript: zero new `error TS` entries from `npx tsc --noEmit`
- [ ] No `console.error` or unhandled promise rejections on golden path

---

## Dimension 4 — Reuse Compliance (weight: 15%)

Rate how well the experiment reuses existing Catalyst patterns:

| Score | Condition |
|---|---|
| 100 | Mounts existing canonical components via adapter; no new primitives |
| 80 | Reuses most patterns; adds 1 new small component with justification |
| 50 | Partially reuses; some avoidable rebuilds present |
| 0 | Builds parallel implementation of existing canonical component |

**Auto-fail patterns:**
- Custom table for work items when `JiraTable` would work → FAIL
- Custom dropdown when `@atlaskit/dropdown-menu` or portal pattern would work → FAIL
- Parallel reimplementation of `CatalystViewBase` → FAIL
- Custom status badge when `CatalystStatusPill` would work → FAIL
- `<img>` with border-radius for avatars when `@atlaskit/avatar` exists → FAIL

---

## Composite Score

```
COMPOSITE = (ADS × 0.25) + (PARITY × 0.30) + (FUNCTIONAL × 0.30) + (REUSE × 0.15)
```

| Composite | Decision |
|---|---|
| ≥ 80 | PASS → keep, commit, advance |
| 65–79 | REVISE → fix specific failing sub-criteria, re-score |
| < 65 | FAIL → discard, revert, redesign approach |

**Any P0 violation overrides composite score → automatic FAIL.**

---

## Scoring Worksheet (copy per experiment)

```
Experiment: <n> — <name>
Date: YYYY-MM-DD
Files touched: <list>

DIM 1 — ADS Compliance
  Audit violations: ___
  P0 violations: none / <list>
  Score: ___/100

DIM 2 — AIO Parity
  PDF reference: <filename(s)>
  Actions working: ___/___
  Score: ___/100

DIM 3 — Functional Completeness
  Criteria declared: ___
  Criteria passing: ___
  TypeScript errors introduced: ___
  Console errors on golden path: none / <list>
  Score: ___/100

DIM 4 — Reuse Compliance
  Canonical components reused: <list>
  New components built: <list with justification>
  Score: ___/100

COMPOSITE: (___×0.25) + (___×0.30) + (___×0.30) + (___×0.15) = ___

DECISION: PASS / REVISE / FAIL / CRASH
NOTES: 
```
