# PHASE 8c: Admin + Integrations Typography — Plan Lock

**Feature Work ID:** CAT-ADS-TYPOGRAPHY-20260628-001  
**Slice:** 8c (Admin + Integrations)  
**Date:** June 28, 2026  
**Status:** Plan Lock Ready for Execution

---

## OBJECTIVE

Replace 170 hard-coded fontSize values with ADS tokens in Admin (89 Vercel + 87 Jira + 84 access + ops).  
All inline `style={{ fontSize: 12 }}` → `style={{ fontSize: 'var(--ds-font-size-200)' }}`

**Done when:**
- 170 violations → 0 violations
- No fontSize hardcoding in admin/ or integrations/ files
- Audit gate passes (zero new violations)
- Screenshots validated (light + dark mode; mobile responsive)

---

## SCOPE

### In Scope (170 violations, ~20–30 files)

**High-impact admin/integration files:**
- VercelConnectionPage.tsx (89 violations)
- JiraSyncPage.tsx (87 violations)
- AdminAccessPage.tsx (84 violations)
- Integration/connection management pages
- Admin configuration pages
- Ops/DevOps pages

### Out of Scope
- Chat-v2 (Phase 8a, complete)
- Project Hub + Shared (Phase 8b, complete)
- Strategy + Detail Views (Phase 8d)
- Other modules (Phases 8e–8f)
- Tests, stories, storybook

---

## CANONICAL COMPONENTS & RULES

**Typography Token Mapping (same as 8a & 8b):**

| From | To | Use Case |
|------|----|----|
| `fontSize: 10–28` | `'var(--ds-font-size-50/100/200/300/400/500/600/700/800)'` | All sizes |

**Pattern:**
```tsx
// BEFORE
style={{ fontSize: 14, color: 'var(--ds-text)', ... }}

// AFTER
style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', ... }}
```

---

## FILES TO IDENTIFY & MODIFY

**Primary targets (highest violations):**
1. Admin/integration pages with large violation counts
2. Configuration/settings components
3. Modal dialogs and forms
4. Toolbar/action components

**Note:** Will scan and identify exact files before transformation.

---

## VALIDATION & ACCEPTANCE

### Screenshot Checklist
- [ ] Light mode (default)
- [ ] Dark mode (theme switch)
- [ ] Mobile viewport (320px)
- [ ] Tablet viewport (768px)
- [ ] Desktop (1440px)
- [ ] Admin panels readable
- [ ] Integration forms legible
- [ ] Dialogs properly formatted

### Lint & Build Validation
- [ ] `npm run audit:ads` — Typography violations 170→0
- [ ] `npm run audit:ads:gate` — No new violations
- [ ] `npm run test` — All tests pass
- [ ] `npm run build` — No TypeScript errors

### Commit Gate
- [ ] Feature Work ID confirmed
- [ ] Screenshots captured
- [ ] Audit validated
- [ ] Commit: "fix(ads): typography tokens in admin + integrations (Phase 8c, 170→0)"

---

## FORBIDDEN

❌ No refactoring beyond token replacement  
❌ No custom colors  
❌ No `git add -A`  

---

## STOP CONDITIONS

1. Dark mode breaks
2. Mobile <320px has overflow
3. New violations introduced
4. Tests fail
5. >10% scope drift

---

## EXECUTION PLAN

1. Scan admin/ + integrations/ for fontSize violations
2. Identify top files (highest count first)
3. Apply transformation script (proven pattern from 8a + 8b)
4. Stage and commit in 1–2 batches
5. Validate and complete

---

**Approved for execution.**
