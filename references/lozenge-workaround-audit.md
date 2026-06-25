# @atlaskit/lozenge Workaround Audit

**Package:** `@atlaskit/lozenge@^11.14.0`  
**Status:** BUGGY — permanent workaround active  
**Audited:** 2026-06-24

---

## Bug

`@atlaskit/lozenge` v11 inner `<span>` carries:
- `text-transform: uppercase`
- `font-weight: 653`
- `letter-spacing > 0`

No prop exists to disable these. Modern Jira renders sentence case, weight 500, no tracking.

---

## Workaround (active in codebase)

### HTML structure required

```html
<span data-cp-lozenge-jira-parity>
  <Lozenge appearance="...">Label Text</Lozenge>
</span>
```

### CSS override (in `src/index.css`)

```css
/* Lozenge Jira parity — inner span typography reset */
[data-cp-lozenge-jira-parity] [class*="css-"] span {
  text-transform: none !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
}
```

### Where applied

| File | Usage |
|------|-------|
| `src/components/shared/JiraTable/cells.tsx` | Status cells in all table surfaces |
| `src/components/ui/CatalystStatusPill.tsx` | Status pill (uses native span instead) |
| `BacklogPage.atlaskit.tsx` | Group header status labels |

> Note: `CatalystStatusPill` does NOT use `@atlaskit/lozenge` — it renders a custom `<button>` with inline-style background to match Jira's exact computed colors (ADS bold tokens diverge from Jira's actual hex). The lozenge workaround applies only where `@atlaskit/lozenge` is explicitly used.

---

## Audit Findings

### Current state (2026-06-24)

- `data-cp-lozenge-jira-parity` wrapper present in: **cells.tsx** (makeStatusCell, makeStatusEditCell)
- CSS override present in: **src/index.css** (search `data-cp-lozenge-jira-parity`)
- Missing wrapper on: BacklogPage group header `<Lozenge>` — **ACTION NEEDED**

### Grep verification

```bash
grep -rn "data-cp-lozenge-jira-parity" src/
# Expected: cells.tsx + index.css
```

---

## Fix (No upstream fix available)

Maintain the wrapper permanently. When adding any new surface that renders `<Lozenge>`, always wrap it:

```tsx
// ✅ CORRECT
<span data-cp-lozenge-jira-parity>
  <Lozenge appearance="success">Done</Lozenge>
</span>

// ❌ WRONG — will render uppercase
<Lozenge appearance="success">Done</Lozenge>
```

---

## When to remove

Remove only when `@atlaskit/lozenge` v12+ ships with a `textTransform` prop or the CSS override becomes unnecessary (verify via DOM probe after upgrade).
