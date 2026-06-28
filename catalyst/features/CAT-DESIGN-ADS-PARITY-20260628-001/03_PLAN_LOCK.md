# PLAN LOCK — CAT-DESIGN-ADS-PARITY-20260628-001

**Status:** APPROVED (for discovery phase only)
**Approved by:** User (Vikram review pending)
**Timebox:** 2.5 hours (Phases 0–4)
**Slice:** Discovery + Planning / Implementation follows in Phases 5–10

---

## OBJECTIVE

Conduct invasive design system audit of Catalyst against Atlassian Design System and Jira reference surfaces. Produce comprehensive fix strategy with canonical component map, token violations, light/dark mode failures, and guardrail contract. Discovery only — no implementation in this slice.

---

## NON-SCOPE

The following are OUT of scope for discovery phase:
- Code changes or refactoring
- UI implementation or redesign
- Bug fixes unrelated to design audit
- Feature additions
- Database or API changes
- Individual page fixes (canonical source fixes only in implementation phase)

---

## PARALLEL AGENTS — DISCOVERY PHASE

**Phase 0 — Baseline Capture (30 min):**
- Capture Jira reference screenshots (light + dark, multiple viewports)
- Capture Catalyst baseline screenshots (light + dark, multiple viewports)
- Extract computed CSS from both surfaces
- Save baseline evidence to `audits/ads-parity/screenshots/baseline/`
- Output: `baseline-evidence.md` + screenshot manifest

**Phase 1 — Canonical Component Discovery (30 min):**
- Scan Catalyst repo for all UI components (30 categories)
- Classify: canonical, wrapper, duplicate, non-canonical
- Document consumers and migration targets
- Output: `component-inventory.md` + `component-inventory.json`

**Phase 2 — ADS Compliance Checklist (30 min):**
- Run 160-point ADS compliance checklist
- Document PASS/FAIL/PARTIAL on every rule
- Group findings by category: tokens, light surfaces, dark surfaces, typography, spacing, icons, status, behavior
- Output: `compliance-checklist.md`

**Phase 3 — Screenshot Diff and Measurement (30 min):**
- Compare Jira vs Catalyst screenshots with DOM/CSS extraction
- Measure: nav heights, spacing, typography size/weight, color values, contrast ratios
- Identify deviations > 2px or non-token colors
- Output: `screenshot-diff.md` + `screenshot-diff.json` + measurement table

**Phase 4 — Fix Strategy & Plan Lock (30 min):**
- Synthesize findings from Phases 1–3
- Produce canonical component migration map
- Produce token mapping table (light + dark)
- Produce 10-lane fix strategy
- Produce file manifests per lane
- Produce validation commands per lane
- Output: updated `03_PLAN_LOCK.md` for Phase 5 implementation + individual Plan Locks for Phases 6–10

---

## CANONICAL COMPONENTS TO DISCOVER

Search for and classify (30 categories):
1. App shell / layout wrapper
2. Top navigation
3. Left rail / sidebar
4. Search input
5. Create button
6. Page header
7. Tab component
8. Badge component
9. Status lozenge
10. Issue row / list item
11. Icon wrapper
12. Project / avatar
13. Empty state
14. Loading / skeleton
15. Tooltip
16. Dropdown / menu
17. Popover
18. Modal / dialog
19. Drawer
20. Table
21. Card / panel
22. Form field
23. Select
24. Date picker
25. Toggle / switch
26. Checkbox / radio
27. Toast / flag
28. Breadcrumb
29. Pagination
30. Theme provider

---

## ADS COMPLIANCE CHECKLIST CATEGORIES

**A. Token and Theme (25 checks)**
- No raw hex, rgb/rgba, hsl colors
- No Tailwind arbitrary colors
- Light/dark mode handling correct
- Theme provider works

**B. Light Surface (15 checks)**
- Page background, nav, cards, inputs, rows match Jira intent
- Hover/selected states tokenized
- No muddy gray surfaces
- Elevation surfaces clean

**C. Dark Surface (20 checks)**
- Dark surfaces distinguishable from each other
- No surface fading / visual flattening
- Icons remain visible
- Contrast passes WCAG AA

**D. Typography (20 checks)**
- Font family, size, weight match Jira density
- Dark/light mode hierarchy clear
- No custom letter spacing

**E. Spacing (20 checks)**
- Uses ADS 8px scale
- Nav/rail/margins/gaps match Jira
- Row density matches Jira
- No arbitrary px values

**F. Iconography (20 checks)**
- Source is canonical
- Size, stroke, fill, color tokenized
- Remain sharp in light/dark
- Active/hover/selected states work

**G. Status/Badge/Lozenge (15 checks)**
- Component is canonical
- Colors tokenized
- Contrast passes in light/dark
- Placement matches Jira

**H. Behavior & Accessibility (25 checks)**
- Tabs preserve state
- Focus rings visible
- Tooltips readable
- Dialogs use correct elevation
- No component renders differently without reason
- Contrast gate passes

**Total: 160 checks**

---

## PARALLEL EXECUTION PLAN

**All agents run concurrently:**

1. **Agent: Screenshot Baseline Capture** (30 min)
   - Captures Jira + Catalyst evidence
   - Outputs: baseline screenshots, CSS extraction

2. **Agent: Canonical Component Discovery** (30 min)
   - Scans entire repo
   - Outputs: component-inventory.md + .json

3. **Agent: ADS Compliance Auditor** (30 min)
   - Runs 160-point checklist
   - Outputs: compliance-checklist.md

4. **Agent: Screenshot Diff & Measurement** (30 min)
   - Compares Jira vs Catalyst
   - Outputs: screenshot-diff.md + measurement tables

5. **Synthesizer** (30 min)
   - Ingests all agent outputs
   - Produces fix strategy + Plan Locks for Phases 5–10

---

## FILES TO MODIFY (Discovery Phase)

| File | Change Type | Purpose |
|---|---|---|
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/00_READ_ME_FIRST.md` | created | Feature folder README |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/01_OBJECTIVE.md` | created | Objective statement |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/03_PLAN_LOCK.md` | create/update | This file + next phases |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/baseline-evidence.md` | create | Jira + Catalyst baseline |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/component-inventory.md` | create | Component audit |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/compliance-checklist.md` | create | 160-point checklist |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/screenshot-diff.md` | create | Jira/Catalyst diff |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/fix-strategy.md` | create | Fix lanes + priority |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/11_KARPATHY_LOOP_LOG.md` | create | Discovery decisions |
| `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/sessions/001_discovery.md` | create | Session log |

---

## FILES FORBIDDEN

Do NOT touch during discovery:
- `src/` (no code changes)
- `tsconfig.json` (no config changes)
- `package.json` (no dependency changes)
- `.husky/` (no hook changes)
- Database schema or migrations
- Any app component or style files

---

## UI/UX RULES (For Audit)

- Use Atlassian Design System as source of truth
- Measure against live Jira surfaces
- Compare light and dark mode explicitly
- No guesses — screenshot or DOM evidence required
- Report deviations in pixels + token mappings
- Dark mode flattening / contrast is critical failure

---

## DATA/BACKEND RULES

- Discovery phase does not require DB changes
- No assumption defaults
- Document data dependencies if audit touches backend surfaces
- RLS impact: none (audit only)
- Migration required: no

---

## INTEGRATION/WIRING RULES

- No new React Query hooks
- No Edge function changes
- No prop/interface changes
- Audit only — discovery phase

---

## VALIDATION COMMANDS

```bash
# Check branch state
git branch --show-current
git status

# Start Catalyst locally (if needed)
npm run dev

# Start Storybook (if needed)
npm run storybook

# After discovery phase, run:
grep -rn "CAT-DESIGN-ADS-PARITY-20260628-001" catalyst/features/

# Verify audit documents exist
ls -la catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Any agent returns incomplete or ambiguous findings (incomplete audit is worse than no audit)
- Dark mode failures exceed 40% of components (may indicate systemic design system failure)
- Component inventory reveals > 15 duplicates (may require replan)
- Screenshot diff shows > 100 distinct violations (may be out of scope)
- Synthesis cannot produce coherent fix strategy from Phases 1–3

RED FLAG format:
```
RED FLAG:
1. <What blocks progress>
2. <Why>
3. <Evidence>
4. <Safer option>
5. <Decision needed>
```

---

## DRIFT/REBASELINE RULES

If audit findings require scope expansion mid-discovery:
1. Stop
2. Document in `08_DRIFT_LOG.md`
3. Get rebaseline approval
4. Update Plan Lock status to SUPERSEDED
5. Create new Plan Lock with adjusted scope

---

## NEXT PHASES (After Discovery Approved)

Once discovery completes and is approved:
- **Phase 5**: Token Foundation Fix (2-hour slice)
- **Phase 6**: Light Surface Fix (2-hour slice)
- **Phase 7**: Dark Surface Fix (2-hour slice)
- **Phase 8**: Typography Fix (2-hour slice)
- **Phase 9**: Spacing Fix (2-hour slice)
- **Phase 10**: Icon/Status/Lozenge/Component/Guardrail Fixes (multiple slices)

Each phase gets its own Plan Lock after discovery is complete.

---

## KARPATHY LOOP RECORD

Log every discovery hypothesis, experiment, finding in `11_KARPATHY_LOOP_LOG.md`.

Example:
```
## Hypothesis 1: Dark mode surfaces lack visual separation
**Experiment:** Extract computed background colors from Jira vs Catalyst in dark mode
**Measurement:** Screenshot diff + CSS color analysis
**Finding:** Catalyst uses var(--ds-surface) for page + nav + cards; Jira uses deeper hierarchy
**Decision:** KEEP finding; add to dark surface violations; requires fix strategy
```

---

## APPROVAL

This Plan Lock is **APPROVED for discovery phase** (Phases 0–4 only).

**Next approval gate:** Upon completion of Phase 4, before implementation begins.

Discovery findings will be synthesized into separate Plan Locks for Phases 5–10, which must be reviewed and approved before implementation.
