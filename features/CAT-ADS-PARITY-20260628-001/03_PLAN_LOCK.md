# Plan Lock — CAT-ADS-PARITY-20260628-001

**Status:** APPROVED v2 (with Phase 11 blocker flagged)  
**Created:** 2026-06-28  
**Approved by:** Vikram (v1 approved)  
**Approved on:** 2026-06-28  
**Updated with discovery:** 2026-06-28  
**Supercedes:** v1  
**Superceded by:** none (pending Phase 11 resolution)

---

## OBJECTIVE (Copy from 01_OBJECTIVE.md)

Five sequential ADS compliance fixes across surfaces, typography, spacing, components, and accessibility. Target: 95%+ parity.

---

## SCOPE & DEPENDENCIES

### Phase execution order (SEQUENTIAL)

```
Phase A (prerequisite) → baseline audit gate
   ↓ (GATE: hex count < 600)
Phase B (6) — Light Surface
   ↓ (passes validation)
Phase D (8) — Typography  
   ↓ (passes validation)
Phase E (9) — Spacing
   ↓ (passes validation)
Phase C (prerequisite) → (scoping pending)
Phase F (prerequisite) → (scoping pending)
   ↓ (both complete)
Phase G (11) — Canonical Migration
   ↓ (passes validation)
Phase H (13) — Accessibility
   ↓ (passes validation)
COMPLETE — all gates pass
```

### GATES (HARD STOP if not met)

| Gate | Metric | Baseline | Target | Validation |
|---|---|---|---|---|
| A | Hex count | 20 | < 600 | ✅ PASS (discovered: 20) |
| B | Light surface compliance | 80% (12/15) | 95%+ (15/15) | `npm run audit:colors` |
| D | Typography violations | 2,133 | < 2,133 | `npm run audit:typography` |
| E | Spacing violations | 1,118 | < 1,118 | `npm run audit:spacing` |
| G (revised) | E2E tests | unknown | all pass | `npx playwright test e2e/` |
| H | A11y violations | ~15-20 | all 0 | `npm run audit:a11y` |

---

## CANONICAL COMPONENTS (Selected)

### Mandatory use (Phase 6, 8, 9)

- `AtlaskitPageShell` — app layout wrapper
- `CatalystInput` — all input fields (highest-impact target for spacing fixes)
- `JiraTable` — for Jira/work-item list surfaces
- `CatalystStatusPill` — status indicators
- `GlobalBreadcrumb` — breadcrumb navigation

### New canonical components (DEFERRED to follow-up work)

- `GlobalPageHeader` — create in CAT-ADS-FOLLOWUP-CANONICALS with tab/menu support for chat panels
- `CatalystFormField` — create in CAT-ADS-FOLLOWUP-CANONICALS for orphaned label/input pairs

These are NOT created in Phase 11 (design blocker identified by Integration Architect). Scope moved to dedicated follow-up feature.

---

## CANONICAL SCREENS (Selected)

Phase 6, 8, 9: Issue list, backlog, sidebar, card/panel surfaces
Phase 13: Full backlog + sidebar + issue detail (keyboard navigation, focus rings, contrast)

---

## FILES TO MODIFY

### Phase 6 (Light Surface)

**High-impact targets:**
- `src/components/*/index.tsx` — card backgrounds (grep #FAFAFA, #fff, #FFFFFF, #F7F8F9)
- `src/components/IssueRow/*.tsx` — hover/selected row states
- `src/components/shared/AtlaskitPageShell.tsx` — surface tokens inheritance

**Estimate:** 15–25 files

### Phase 8 (Typography)

**High-impact targets:**
- `src/components/Chat/*.tsx` — highest violation density
- `src/components/Timeline/*.tsx` — arbitrary font sizes
- `src/TaskModal/*.tsx` — custom sizing
- `src/index.css` — global type overrides

**Estimate:** 20–30 files

### Phase 9 (Spacing)

**HIGHEST-IMPACT TARGET:** `src/components/CatalystInput/*.tsx` (67 consumers, 78% violations)

**Other targets:**
- `src/components/IssueRow/*.tsx` — padding/gap/margin
- `src/components/shared/*.tsx` — section spacing
- Shell dimensions in `src/components/shared/AtlaskitPageShell.tsx`

**Estimate:** 30–50 files (after CatalystInput, cascades to consumers)

### Phase 11 (REVISED — Cleanup Only)

**SCOPE CHANGE:** Discovery found GlobalPageHeader (page-level header) cannot replace chat-panel headers (MessagePanelHeader has tabs, SidebarHeader has Unreads toggle, DraftsAndSentHeader has custom state). Defer canonical creation to follow-up work (CAT-ADS-FOLLOWUP-CANONICALS-YYYYMMDD-001).

**Files to delete (genuinely dead code):**
- `src/components/BacklogBreadcrumb.tsx` — 0 production consumers, orphaned hand-rolled component
- `src/components/ChatShell.tsx` — v1 legacy, superseded by ChatV2Shell

**Keep (already canonical — no changes):**
- `src/components/ChatV2Shell.tsx` — canonical chat surface, in active use
- `src/components/CatalystBreadcrumbs.tsx` — canonical breadcrumb (1 consumer: AiAccessPage)

**Defer to follow-up work:**
- SidebarHeader, MessagePanelHeader, DraftsAndSentHeader (chat-panel headers, design mismatch with GlobalPageHeader)
- GlobalPageHeader & CatalystFormField (new canonicals, require proper design scope)

**Estimate:** ~30 minutes (remove 2 files, verify E2E) — fits well within 2h slice

### Phase 13 (Accessibility)

**Focus ring fixes (23 files):**
- `src/components/*/index.tsx` — add :focus-visible rules

**Interactive divs (50+ files):**
- grep for `onClick` on `<div>` or `<span>` → convert to `<button>` or add ARIA

**Text contrast (40+ files):**
- Upgrade --ds-text-subtlest → --ds-text-subtle
- Verify token contrast is ≥4.5:1 (normal text)

**Estimate:** 50–80 files

---

## FILES FORBIDDEN

- `src/components/Storybook.tsx` — do not touch stories
- `src/pages/` — do not refactor page structure
- `src/hooks/` — do not add new hooks (use existing)
- `src/utils/` — do not add new utilities (use existing)
- `src/types/` — do not change type definitions without peer review
- Any `.test.ts(x)` — do not modify tests in this pass; tests validate separately
- `package.json` — do not add dependencies
- `tsconfig.json`, `.eslintrc` — do not change config

---

## UI/UX RULES

### Tokens only

**HARD STOP:** No hardcoded colors, Tailwind utilities, or custom values. Every color must be:
- `var(--ds-background-*)`, `var(--ds-text-*)`, `var(--ds-border-*)`, `var(--ds-icon-*)`, `var(--ds-shadow-*)`
- or ADS `token()` helper from `@atlaskit/tokens`
- or component-owned color (component sets internally, never passed from outside)
- or CatyRainbowCTA / AIIntelligenceButton (exceptional, pre-approved)

Audit before every commit:
```bash
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}(?!['\"]?\s*\))|rgba?\s*\(|hsl[a]?\s*\()" \
  src/ | grep -v "node_modules" | grep -v "\.snap"
```

### Light mode priority

Phase 6 and 8 focus on light mode first. Dark mode tested as secondary validation (no contrast failures).

### ADS token reference (memorize)

| Purpose | Token |
|---|---|
| Page background | `var(--ds-surface)` |
| Card background | `var(--ds-surface-raised)` |
| Sunken background | `var(--ds-surface-sunken)` |
| Primary text | `var(--ds-text)` |
| Secondary text | `var(--ds-text-subtle)` |
| Tertiary text | `var(--ds-text-subtlest)` |
| Border default | `var(--ds-border)` |
| Border focused | `var(--ds-border-focused)` |
| Row hover | `var(--ds-background-neutral-hovered)` |
| Row selected | `var(--ds-background-selected)` |

---

## DATA/BACKEND RULES

- No schema changes (Replay DB transition history is empty; epics have null parent_key — render nothing, not assumptions)
- No RLS changes
- No migration needed (token/spacing/type/a11y fixes are presentational)
- No API contract changes

---

## INTEGRATION/WIRING RULES

- AtlaskitPageShell must define all surface tokens at shell level; consumers inherit
- CatalystInput must be the canonical input; no inline `<input>` elements outside it
- GlobalBreadcrumb must be the canonical breadcrumb; no custom breadcrumb implementations
- GlobalPageHeader must replace all 3 header duplicates without changing route structure
- CatalystFormField must pair label to input via htmlFor/id; all forms must use it

---

## PARALLEL EXECUTION PLAN

### Discovery phase (before coding) — MANDATORY

Parallel agents (2h max):
1. **Canonical Component Discovery** — validate GlobalPageHeader and CatalystFormField APIs against existing Catalyst patterns
2. **Design Audit** — baseline audit outputs for colors, typography, spacing, a11y (establish gate baseline)
3. **Integration Architect** — map all deprecated component consumers (ChatShell, ChatV2Shell, etc.)
4. **QA/Screenshot Validator** — define screenshot acceptance checklist for all 5 phases
5. **Karpathy Loop** — hypothesis (can we hit all 5 gates?), experiment design (which phase first?), measure plan (audit commands)

### Execution phase (after Plan Lock approval)

**2-hour slices, sequential (Phase 11 reduced to ~30m):**

| Slice # | Phase | Duration | Gate |
|---|---|---|---|
| 1 | B: Light Surface | 2h | `npm run audit:colors` |
| 2 | D: Typography | 2h | `npm run audit:typography` |
| 3 | E: Spacing | 2h | `npm run audit:spacing` |
| 4 | G: Cleanup (revised) | ~30m | E2E tests pass (no route breakage) |
| 5 | H: Accessibility | 2h | `npm run audit:a11y` |

**Total:** ~8.5 hours (4 × 2h slices + 1 × 0.5h cleanup) + discovery phase

**Note:** Phase 11 reduced scope (delete BacklogBreadcrumb + ChatShell only). GlobalPageHeader & CatalystFormField deferred to CAT-ADS-FOLLOWUP-CANONICALS.

---

## SCREENSHOT CHECKLIST

| # | Phase | Item | Reference | Implementation | Status |
|---|---|---|---|---|---|
| 1 | 6 | Light mode — issue list | Jira screenshot | Catalyst screenshot | pending |
| 2 | 6 | Light mode — card surfaces | Jira screenshot | Catalyst screenshot | pending |
| 3 | 6 | Light mode — row hover/select | Jira screenshot | Catalyst screenshot | pending |
| 4 | 8 | Dark mode — typography contrast | Jira screenshot | Catalyst screenshot | pending |
| 5 | 8 | Light mode — typography hierarchy | Jira screenshot | Catalyst screenshot | pending |
| 6 | 9 | Layout — nav height 56px | Jira screenshot | Catalyst screenshot | pending |
| 7 | 9 | Layout — rail width 240px | Jira screenshot | Catalyst screenshot | pending |
| 8 | 9 | Layout — row density | Jira screenshot | Catalyst screenshot | pending |
| 9 | 11 | After migration — no visual change | Before screenshot | After screenshot | pending |
| 10 | 13 | Keyboard navigation — focus rings visible | n/a | Catalyst screenshot (tab through) | pending |
| 11 | 13 | Dark mode — text contrast passing | a11y audit | Catalyst screenshot | pending |

---

## VALIDATION COMMANDS

```bash
# Phase 6
npm run audit:colors

# Phase 8
npm run audit:typography

# Phase 9
npm run audit:spacing

# Phase 11
npm run audit:duplicates
npx playwright test e2e/

# Phase 13
npm run audit:a11y
npm run audit:contrast
```

---

## STOP CONDITIONS

**Stop and raise if:**

1. Any gate fails after 1 correction loop (accept / split / rebuild / revert)
2. A phase introduces regressions (verified via E2E + manual smoke)
3. A file modification touches a FORBIDDEN file
4. A change uses hardcoded colors, Tailwind utilities, or custom tokens
5. New canonical component APIs don't match Catalyst patterns
6. Screenshot acceptance blocked (visual mismatch vs. reference)

---

## DRIFT & REBASELINE RULES

- If Phase A gate changes (hex count baseline shifts), rebaseline all downstream gates
- If new deprecated components are discovered mid-Phase 11, add to migration list (update Plan Lock)
- If a11y audit reveals new violations (e.g., from Phase 6 changes), add to Phase 13 work
- Any drift → update 08_DRIFT_LOG.md, re-evaluate Plan Lock, decision needed before continuing

---

## Approval & Decision Log

- [x] Plan Lock v1 approved (2026-06-28)
- [x] Discovery agents completed (2026-06-28)
- [x] Phase 11 scope decision: **Option B selected** (reduce to cleanup, defer canonicals)
- [x] Plan Lock v2 updated with revised Phase 11 scope
- [x] All gate thresholds confirmed (baseline audits captured)
- [x] No regressions expected (Data/Safety Guard cleared)
- [x] **Plan Lock v2 APPROVED** — ready for Slice 1 execution

---

**Next:** Begin Slice 1 (Phase 6: Light Surface) immediately.
