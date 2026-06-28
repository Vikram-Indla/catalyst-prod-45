# Validation Evidence — CAT-ADS-PARITY-20260628-001

**Status:** PENDING — baseline audits queued

Raw validation command outputs, DOM probe results, API responses, and gate metrics.

---

## Baseline audits (to be captured)

### Phase A (prerequisite)

```bash
npm run audit:colors
# Expected: hex count < 600
# Baseline: (pending)
```

### Phase 6: Light Surface

```bash
npm run audit:colors
# Expected: 15/15 checks pass (95%+)
# Baseline: 12/15 pass (80%)
# After Phase 6: (pending)
```

### Phase 8: Typography

```bash
npm run audit:typography
# Expected: <80 violations
# Baseline: ~100+ violations
# After Phase 8: (pending)
```

### Phase 9: Spacing

```bash
npm run audit:spacing
# Expected: <400 violations
# Baseline: 473+ violations
# After Phase 9: (pending)
```

### Phase 11: Canonical Migration

```bash
npm run audit:duplicates
# Expected: 0 deprecated components
# Baseline: 9 known duplicates
# After Phase 11: (pending)

npx playwright test e2e/
# Expected: all tests pass
# Baseline: (pending)
# After Phase 11: (pending)
```

### Phase 13: Accessibility

```bash
npm run audit:a11y
# Expected: focus rings = 0, interactive divs = 0, contrast failures = 0
# Baseline: 23 focus, 50+ interactive divs, 40+ contrast
# After Phase 13: (pending)

npm run audit:contrast
# Expected: all text ≥4.5:1 (normal) or ≥3:1 (large)
# Baseline: 40+ failures
# After Phase 13: (pending)
```

---

## Execution validation (to be filled)

### Slice 1 — Phase 6

| Command | Status | Output | Result |
|---|---|---|---|
| npm run audit:colors | pending | — | — |
| npm run test:regression | pending | — | — |

### Slice 2 — Phase 8

| Command | Status | Output | Result |
|---|---|---|---|
| npm run audit:typography | pending | — | — |

### Slice 3 — Phase 9

| Command | Status | Output | Result |
|---|---|---|---|
| npm run audit:spacing | pending | — | — |

### Slice 4 — Phase 11

| Command | Status | Output | Result |
|---|---|---|---|
| npm run audit:duplicates | pending | — | — |
| npx playwright test e2e/ | pending | — | — |

### Slice 5 — Phase 13

| Command | Status | Output | Result |
|---|---|---|---|
| npm run audit:a11y | pending | — | — |
| npm run audit:contrast | pending | — | — |

---

## DOM probes (to be captured after Phase 11 migration)

After canonical migration, verify:

```javascript
// GlobalPageHeader usage
const headers = document.querySelectorAll('[data-testid="global-page-header"]');
console.log(`GlobalPageHeader instances: ${headers.length}`);

// Deprecated component usage (should be 0)
const deprecated = document.querySelectorAll('[data-deprecated="true"]');
console.log(`Deprecated component instances: ${deprecated.length}`);

// ADS token usage (color properties)
const colors = getComputedStyle(document.body);
console.log(`Background: ${colors.backgroundColor}`);
console.log(`Text: ${colors.color}`);
```

---

## API responses (if applicable)

None expected for this compliance campaign (no backend changes).

---

## Gate summaries

Will be filled with audit outputs. Example format:

```
Phase 6 Gate Results:
  ✓ Color audit: 15/15 checks pass (95%+)
  ✓ Light mode contrast: all text ≥4.5:1
  ✓ Dark mode regression: no new failures
  Result: PASS
```

---

## Next

Awaiting Plan Lock approval → baseline audits → validation evidence populated during Slice 1–5 execution.
