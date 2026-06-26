# Validation Log: test-hub / exp-001

**Date:** 2026-06-26
**Type:** research

Research experiment — no code changes. Standard TS/ADS/build checks not applicable.

---

## Validation Commands

Not run — research experiment. No src/ files modified.

```bash
# These would be run for build experiments:
# npx tsc --noEmit
# node design-governance/rules/audit.js <touched-files>
# node design-governance/scripts/self-test.mjs
# npm run build
```

---

## Results

**TypeScript errors:** N/A (no src/ changes)
**ADS violations (touched files):** N/A (no src/ changes)
**ADS self-test:** N/A
**Build:** N/A
**Screenshot path:** N/A — research experiment

---

## Documentation Completeness Check

| File | Filled? |
|---|---|
| feature-intake.md | ✅ |
| catalyst-pattern-discovery.md | ✅ |
| current-state-audit.md | ✅ |
| external-benchmark-research.md | ✅ |
| experiment-roadmap.md | ✅ |
| hypothesis.md | ✅ |
| allowed-edit-surface.md | ✅ |
| research-notes.md | ✅ |
| baseline.md | ✅ |
| implementation-notes.md | ✅ |
| validation-log.md | ✅ (this file) |
| screenshot-notes.md | ✅ |
| scorecard.md | ✅ |
| decision.md | ✅ |

## Delta from Baseline

No code delta — research only. All 14 documentation files written.

---

## Validation Run: 2026-06-26 00:54

### TypeScript

```
Errors: 0
```

### ADS Self-Test

```
Result: PASS

[1m━━ Design-system audit self-test ━━[0m

Running 45 fixtures…

  [32m✓[0m bare-hex-color
  [32m✓[0m hex-in-var-fallback (must NOT flag — ADS-canonical)
  [32m✓[0m hex-in-nested-var-fallback (must NOT flag)
  [32m✓[0m hex-in-token-fallback (must NOT flag — @atlaskit/tokens canonical)
  [32m✓[0m tailwind-text-size
  [32m✓[0m tailwind-font-weight
  [32m✓[0m tailwind-padding-utility
  [32m✓[0m tailwind-gap-utility
  [32m✓[0m tailwind-rounded-chrome
  [32m✓[0m tailwind-color-class
  [32m✓[0m tailwind-italic
  [32m✓[0m inline-uppercase
  [32m✓[0m tailwind-uppercase
  [32m✓[0m off-grid-padding
  [32m✓[0m on-grid-padding (must NOT flag — 4/8/16/24/32)
  [32m✓[0m on-grid-padding-with-border-on-same-line (must NOT flag)
  [32m✓[0m invalid-fontweight
  [32m✓[0m jira-fontweight-653 (must NOT flag)
  [32m✓[0m react-select-import
  [32m✓[0m storypoints-banned-field
  [32m✓[0m bare-rgb
  [32m✓[0m bare-rgba
  [32m✓[0m rgb-in-var-fallback (must NOT flag)
  [32m✓[0m react-toastify-import
  [32m✓[0m sonner-import (must NOT flag)
  [32m✓[0m react-hot-toast-import (must NOT flag)
  [32m✓[0m banned-column-story-points-th
  [32m✓[0m banned-column-mdt-ref-th
  [32m✓[0m atlaskit-button-legacy
  [32m✓[0m atlaskit-button-new (must NOT flag)
  [32m✓[0m non-ads-css-import
  [32m✓[0m atlaskit-css-import (must NOT flag)
  [32m✓[0m ignore-next-line marker exempts the following line
  [32m✓[0m ignore-next-line only exempts the immediately following line
  [32m✓[0m hex-in-jsdoc-block-comment
  [32m✓[0m rgb-in-jsdoc-block-comment
  [32m✓[0m google-fonts-import
  [32m✓[0m typekit-import
  [32m✓[0m atlassian-cdn-import (must NOT flag)
  [32m✓[0m google-fonts-link-tag
  [32m✓[0m fontawesome-link-tag
  [32m✓[0m atlassian-preconnect-link (must NOT flag)
  [32m✓[0m self-hosted-font-face
  [32m✓[0m atlassian-font-face (must NOT flag)
  [32m✓[0m dynamic-google-fonts-url-string

[1m━━ Result ━━[0m
[32m45 passed[0m, [2m0 failed[0m

[32m[1mAll audit rules verified.[0m
```

### ADS Audit Summary

```

  [TAILWIND_CLASS] src/components/backlog/DetailPanel/DetailsTab.tsx:59
    Content: <label className="text-xs font-semibold text-muted-foreground">Contained In:</label>
    Fix: Replace Tailwind utility "text-xs" with ADS token or inline style: fontSize/fontWeight/padding/margin/color from ADS tokens (var(--ds-*)).

  [TAILWIND_CLASS] src/components/backlog/DetailPanel/DetailsTab.tsx:69
    Content: <div className="flex flex-col gap-2">
    Fix: Replace Tailwind utility "gap-2" with ADS token or inline style: fontSize/fontWeight/padding/margin/color from ADS tokens (var(--ds-*)).

  [TAILWIND_CLASS] src/components/backlog/DetailPanel/DetailsTab.tsx:70
```

### Summary for This Run

TypeScript errors: 0
ADS self-test:     PASS

