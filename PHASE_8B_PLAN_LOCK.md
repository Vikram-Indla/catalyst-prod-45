# PHASE 8b: Project Hub + Shared Typography — Plan Lock

**Feature Work ID:** CAT-ADS-TYPOGRAPHY-20260628-001  
**Slice:** 8b (Project Hub + Shared)  
**Date:** June 28, 2026  
**Status:** Plan Lock Ready for Execution

---

## OBJECTIVE

Replace 108 hard-coded fontSize values with ADS tokens in Project Hub (62) + Shared (46) components.  
All inline `style={{ fontSize: 12 }}` → `style={{ fontSize: 'var(--ds-font-size-200)' }}`

**Done when:**
- 108 violations → 0 violations
- No fontSize hardcoding remains in project-hub or shared files
- Audit gate passes (zero new violations)
- Screenshots validated (light + dark mode; responsive 320–1440px)

---

## SCOPE

### In Scope (108 violations, ~20–25 files)

**Project Hub (62 violations):**
- GadgetSettingsPanel.tsx
- ProjectCard.tsx (already fixed in Phase 6, but may have additional violations)
- Project Hub dashboard components
- Project detail views
- Settings/configuration pages
- ~18 files estimated

**Shared (46 violations):**
- Base components used across app
- Layout utilities
- Common UI patterns
- ~7 files estimated

### Out of Scope
- Chat-v2 (Phase 8a, complete)
- Backlog (Phase 8a, complete)
- Admin pages (Phase 8c)
- Other modules (Phases 8d–8f)
- Tests, stories, storybook

---

## CANONICAL COMPONENTS & RULES

**Typography Token Mapping (same as Phase 8a):**

| From | To | Use Case |
|------|----|----|
| `fontSize: 10` | `'var(--ds-font-size-50)'` | Captions |
| `fontSize: 11` | `'var(--ds-font-size-100)'` | Small labels |
| `fontSize: 12` | `'var(--ds-font-size-200)'` | Small text |
| `fontSize: 13` | `'var(--ds-font-size-300)'` | Secondary text |
| `fontSize: 14` | `'var(--ds-font-size-400)'` | **MOST COMMON** — body text |
| `fontSize: 16` | `'var(--ds-font-size-500)'` | Small heading |
| `fontSize: 18` | `'var(--ds-font-size-600)'` | Medium heading |
| `fontSize: 20+` | `'var(--ds-font-size-700/800)'` | Large headings |

**Pattern (All violations follow this):**
```tsx
// BEFORE
style={{ fontSize: 14, color: 'var(--ds-text)', ... }}

// AFTER
style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', ... }}
```

**No custom colors, no Tailwind utilities, no refactoring.**

---

## FILES TO MODIFY

**High-impact (identified):**
1. src/components/project-hub/GadgetSettingsPanel.tsx (estimated 12 violations)
2. src/components/project-hub/ProjectCard.tsx (may have additional beyond Phase 6 fix)
3. src/components/project-hub/ProjectListView.tsx (estimated 8 violations)
4. src/components/shared/CommonLayout.tsx (estimated 6 violations)
5. src/components/shared/UtilityPanel.tsx (estimated 5 violations)

**Remaining files (estimated 20–25 total):**
- All project-hub subdirectories
- All shared component directories
- Configuration/settings components

---

## VALIDATION & ACCEPTANCE

### Screenshot Checklist
- [ ] Light mode (default)
- [ ] Dark mode (theme switch)
- [ ] Mobile viewport (320px)
- [ ] Tablet viewport (768px)
- [ ] Desktop (1440px)
- [ ] Dashboard widgets readable
- [ ] Project cards legible
- [ ] Settings panel text hierarchy

### Lint & Build Validation
- [ ] `npm run audit:ads` — Typography violations 108→0
- [ ] `npm run audit:ads:gate` — No new violations (gate passes)
- [ ] `npm run test` — All tests pass
- [ ] `npm run build` — No TypeScript errors

### Commit Gate
- [ ] Feature Work ID confirmed (CAT-ADS-TYPOGRAPHY-20260628-001)
- [ ] Session log written
- [ ] Plan Lock approved (this document)
- [ ] Screenshots captured (light + dark, mobile)
- [ ] Raw validation output (audit gate, test results)
- [ ] File list exact and staged
- [ ] Commit message: "fix(ads): typography tokens in project-hub + shared (Phase 8b, 108→0 violations)"

---

## FORBIDDEN

❌ No hand-rolled color overrides  
❌ No Tailwind color utilities  
❌ No bare hex colors  
❌ No inline comments beyond necessary escape hatches  
❌ No refactoring beyond token replacement  
❌ No `git add -A` (explicit file staging only)  

---

## STOP CONDITIONS

**If any of these occur, STOP and raise:**
1. Dark mode rendering breaks
2. Mobile viewport <320px has overflow
3. New violations introduced (gate fails)
4. Tests fail (regression detected)
5. File changes exceed scope (>10% diff outside phase files)

---

## NEXT STEPS

1. Identify exact files with violations (grep scan)
2. Apply typography transformation script
3. Validate: screenshots + audit gate
4. Commit Phase 8b complete (2 parts if needed)
5. → Begin Phase 8c (Admin + Integrations)

---

**Approved for execution.**
