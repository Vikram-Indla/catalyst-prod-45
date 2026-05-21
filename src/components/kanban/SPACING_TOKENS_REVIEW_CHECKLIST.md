# Kanban Spacing Tokens — Code Review Checklist

## Purpose
This checklist enforces the centralized spacing token system for the kanban module. Every PR touching kanban layout must verify compliance with these rules.

---

## Pre-Commit Checklist (Developer)

Before pushing any changes to the kanban module, verify:

- [ ] **No hardcoded `gap` values**: Every `gap: <number>` in kanban files uses `SPACING_TOKENS.gap<N>`
  - Valid: `gap: SPACING_TOKENS.gap4`, `gap: SPACING_TOKENS.gap8`, `gap: SPACING_TOKENS.gap12`, `gap: SPACING_TOKENS.gap16`, `gap: SPACING_TOKENS.gap24`
  - Invalid: `gap: 4`, `gap: 8`, `gap: 12`, `gap: 16`, `gap: 24` (hardcoded)
  - Exception: `gap: 0` is permitted (no token needed)

- [ ] **SPACING_TOKENS imported**: If using any gap token, file must have:
  ```typescript
  import { SPACING_TOKENS } from './kanban-tokens';
  ```

- [ ] **No off-grid values**: All gaps conform to canonical 4px grid:
  - Valid: 4, 8, 12, 16, 24
  - Invalid: 2, 3, 6, 10, 14, 18, 20, 22, 28 (off-grid)

---

## Code Review Checklist (Reviewer)

For every PR modifying kanban/ directory:

### 1. Spacing Enforcement
- [ ] All `gap: <number>` replaced with `gap: SPACING_TOKENS.gap<N>`
- [ ] No new hardcoded gap values introduced
- [ ] SPACING_TOKENS import present in modified files
- [ ] Removed any off-grid values (2, 3, 6, 10, 14, 18, 20, 22, 28)

### 2. Type Safety
- [ ] TypeScript compilation passes (no missing imports, no type errors)
- [ ] SpacingGapKey type is used where relevant for strongly-typed spacing

### 3. Jira Parity
- [ ] Card-to-card vertical spacing = 8px (SPACING_TOKENS.gap8) ✅ Jira parity baseline
- [ ] Component-to-component gaps follow density config (`d.cardGap` uses SPACING_TOKENS values)
- [ ] Visual spacing matches Jira's kanban board layout

### 4. Files to Check
Mandatory files for spacing compliance:

- `kanban-tokens.ts` — Single source of truth
- `PragmaticBoard.tsx` — ✅ Batch A complete
- `WorkItemCard.tsx` — ✅ Batch B complete
- `InlineCreateCard.tsx` — ✅ Batch B complete
- `KanbanToolbar.tsx` — ✅ Batch C complete
- `KanbanColumn.tsx` — ✅ Batch C complete
- `AdvancedFilterPanel.tsx` — ✅ Batch C complete
- `KanbanSwimlane.tsx` — ✅ Batch C complete
- `SortableCard.tsx` — (check if layout uses gaps)
- `KanbanAvatar.tsx` — (check if layout uses gaps)

---

## Automated Checks (Future)

The following checks **should be automated** to catch violations at merge time:

### ESLint Rule: no-hardcoded-gap-in-kanban
```javascript
// .eslintrc.js extension
rules: {
  'no-hardcoded-gap-in-kanban': {
    enabled: true,
    scope: ['src/components/kanban/**/*.tsx', 'src/components/kanban/**/*.ts'],
    pattern: /gap:\s*(\d+)(?!.*SPACING_TOKENS)/,
    message: 'Use SPACING_TOKENS.gap<N> instead of hardcoded gap values in kanban module',
  }
}
```

### Grep Pre-Commit Hook
```bash
# Fail if hardcoded gap found in kanban files
if grep -r 'gap:\s*[0-9]\+[^_]' src/components/kanban/*.tsx src/components/kanban/*.ts 2>/dev/null | grep -v SPACING_TOKENS; then
  echo "ERROR: Hardcoded gap values found in kanban module. Use SPACING_TOKENS instead."
  exit 1
fi
```

---

## Test Plan (Phase 4)

Before/after screenshots verify:

1. **Card-to-card vertical spacing**: 8px gap maintained (measure with DevTools)
2. **Column-to-column horizontal spacing**: 10px gutter (from padding) maintained
3. **No layout shifts**: All components render at same size/position as before refactoring
4. **Density config**: Card gaps scale correctly when density changes (compact/normal/wide)
5. **Swimlane rows**: Swimlane header gap = 8px, interior card gaps follow d.cardGap

---

## Commit Message Template

When merging spacing-related work:

```
refactor: use SPACING_TOKENS in <component> (Batch <X>)

- Replaced hardcoded gap: <N> with gap: SPACING_TOKENS.gap<N> (<count> instances)
- Added SPACING_TOKENS import where needed
- Verified Jira parity: <description of spacing baseline>
- Zero layout changes: spacing values are identical to previous hardcoded values
```

---

## Reference: Canonical Spacing Values

| Token | Value | Use Case |
|-------|-------|----------|
| `gap4` | 4px | Inter-component spacing (buttons, icons) |
| `gap8` | 8px | Card-to-card vertical spacing (Jira parity baseline) |
| `gap12` | 12px | Heading-to-content spacing |
| `gap16` | 16px | Section-to-section spacing |
| `gap24` | 24px | Major region spacing |

All gaps conform to 4px baseline grid.

---

## Questions for Reviewers

- **Q: What if a component needs a non-canonical gap?**
  - A: Document the exception in a comment (`// Custom gap needed for X reason`), add it to SPACING_TOKENS with a comment, then use the token. Never hardcode.

- **Q: What about padding/margin?**
  - A: Padding and margin are NOT part of this system yet (out of scope for Phase 2). Only `gap` properties use SPACING_TOKENS.

- **Q: What about responsive/density-based spacing?**
  - A: Use `d.cardGap` from DensityConfig — it already returns a SPACING_TOKENS value.

- **Q: What if a 3D layout needs sub-pixel spacing?**
  - A: Document the exception with a comment, use exact px value with a TODO to migrate when design allows, and note it in the PR description.

---

## Severity
✅ **P0** — Any PR introducing hardcoded gap values is REJECTED until fixed. This is non-negotiable per CLAUDE.md architecture guardrails.
