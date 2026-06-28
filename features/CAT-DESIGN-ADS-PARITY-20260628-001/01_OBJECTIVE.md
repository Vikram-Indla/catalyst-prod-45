# CAT-DESIGN-ADS-PARITY-20260628-001 Objective

## Mission
Implement the Catalyst ADS (Atlassian Design System) Parity Audit across 14 phases, bringing the design system from 51% compliance to 90%+ by fixing token violations, dark mode surfaces, accessibility issues, and enforcing permanent three-layer compliance gates.

## Scope
**Phases 5–14 execution:**
- Phase 5: Token Foundation — hardcoded hex 709 → <20
- Phase 6: Light Surface Validation
- Phase 7: Dark Surface Critical Fix (P0 BLOCKER)
- Phase 8: Typography Standardization
- Phase 9: Spacing Grid Enforcement
- Phase 10: Icon Visibility & Contrast
- Phase 11: Canonical Component Migration
- Phase 12: CI Guardrail Implementation
- Phase 13: Accessibility (Focus Rings, Keyboard Navigation)
- Phase 14: Screenshot Regression Baseline

**Final Gate:** P0 Audit (60+ independent verification checks)

## Non-Scope
- Refactoring components beyond what token fixes require
- Adding new features or changing user-facing behavior
- Modifying design patterns (use existing Catalyst canonicals)
- Anything not directly tied to ADS compliance

## Success Criteria
1. npm run lint:colors:gate exits 0 (hardcoded hex ≤20)
2. npm run lint:colors exits 0 (total violations ≤target per phase)
3. All 10 Unbreakable Contract acceptance criteria pass
4. P0 Audit produces 0 critical violations (dark mode, contrast, focus)
5. CI pre-commit + build gates block all new violations
6. Screenshots validate light + dark mode rendering

## Timebox
- Phase 5: 2h (token foundation)
- Phases 6–14: sequential, self-paced per phase
- Final audit: 1–2h
- **Total estimate: 20–24h sustained effort**

## Priority
**P0 CRITICAL** — Dark mode surfaces + contrast + focus + canonical components are blockers. If any P0 fails, stop and escalate before Phase 7.

---
**Created:** 2026-06-28  
**Branch:** feat/ads-parity-light-dark-audit  
**Feature Work ID:** CAT-DESIGN-ADS-PARITY-20260628-001
