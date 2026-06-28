# OBJECTIVE — CAT-DESIGN-ADS-PARITY-20260628-001

## Primary Goal
Conduct a complete design system audit of Catalyst against Atlassian Design System (ADS) standards and live Jira surfaces. Identify all deviations, classify by severity, and produce a comprehensive fix strategy with guardrails to prevent regression.

## What "Done" Looks Like
By end of discovery phase:
1. **Canonical component inventory** — every UI component classified (keep/migrate/delete/duplicate)
2. **160-point compliance checklist** — pass/fail on every ADS rule
3. **Screenshot baseline** — Jira + Catalyst in light/dark, at 1440x900 and 1920x1080
4. **Token violation audit** — all hardcoded colors, spacing, typography identified and mapped to tokens
5. **Light/dark mode delta** — specific contrast, surface, and hierarchy failures documented
6. **Fix strategy document** — prioritized phases, file manifests, validation commands
7. **Guardrail contract** — automated checks to block future regressions

## Scope — Phase 0–4 (Discovery + Planning)
### Phase 0 — Branch, Baseline, Evidence Capture
- Create branch
- Capture Jira reference screenshots (light/dark)
- Capture Catalyst baseline screenshots (light/dark)
- Extract computed CSS from both surfaces
- Generate initial screenshot-diff report

### Phase 1 — Canonical Component Discovery
- Scan entire Catalyst repo
- Classify 30 component categories
- Document duplicates, gaps, non-canonical use
- Output: `component-inventory.md` + `component-inventory.json`

### Phase 2 — 160-Point ADS Compliance Checklist
- Run every ADS rule
- Document PASS/FAIL/PARTIAL on: tokens, light surfaces, dark surfaces, typography, spacing, icons, status/badge/lozenge, behavior/accessibility
- Output: `compliance-checklist.md`

### Phase 3 — Screenshot Diff and Measurement
- Compare Jira vs Catalyst with Playwright
- Measure: nav heights, spacing, typography, color, contrast
- Output: `screenshot-diff.md` + `screenshot-diff.json`

### Phase 4 — Fix Strategy (Plan Lock for Phases 5–10)
- Document canonical component migrations
- Token mapping table
- Fix priority order
- File manifests per fix lane (10 lanes total)
- Validation commands per lane
- Output: `03_PLAN_LOCK.md` for Phase 5 + individual Plan Locks for Phases 6–10

## Out of Scope
- Bug fixes unrelated to design system
- Feature additions
- Refactoring of business logic
- Database schema changes
- API changes

## Success Criteria
1. ✅ All 160 checklist items documented
2. ✅ No guesses — every finding grounded in screenshot or DOM
3. ✅ Canonical component map is complete and accurate
4. ✅ Fix strategy is executable in 2-hour slices
5. ✅ Guardrail contract is documented
6. ✅ Next phases are ready to implement

## Timeline
- Phase 0: 30 min (baseline capture)
- Phase 1: 30 min (component discovery)
- Phase 2: 30 min (checklist)
- Phase 3: 30 min (screenshot diff)
- Phase 4: 30 min (fix strategy + Plan Lock)
**Total discovery: ~2.5 hours**

## Risks
- Component discovery may reveal more duplicates than expected
- Dark mode contrast failures may be systemic (high fix cost)
- Token extraction may reveal inconsistent mapping (requires validation)
- Mitigation: If any phase exceeds 30 min, pause and replan
