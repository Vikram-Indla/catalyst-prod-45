# Plan Lock — CAT-ADS-ELEVATION-REGRESSION-20260701-001

**Status: APPROVED — Phase 1 executed, Phase 2 pending**

## Timebox: 2 hours total (1h used)

## Phases

### Phase 1 — COMPLETE (commit c2c7b2c77)
Fix the three confirmed regressions from screenshot evidence + Council verdict.

| Bug | Fix | Files |
|---|---|---|
| Panel-over-panel shadow | `shadow-lg` → `var(--ds-shadow-overlay)` | popover.tsx, hover-card.tsx, context-menu.tsx (×2), select.tsx, lookup-select.tsx |
| R360 card borders invisible | `--ds-border` → `--ds-border-bold` | r360-member.css (canvas + .r3-ring-card), R360RingView.tsx |
| Work item key pale | `--ds-text-subtlest` → `--ds-text-subtle` | CatalystViewSubtask.tsx |

### Phase 2 — NEXT
Migrate unmigrated custom tokens in Resource360 + workhub.

| Token | File | ADS Replacement |
|---|---|---|
| `--fg-3` | R360DetailPanel.tsx, R360RingView.tsx | `var(--ds-text-subtle)` |
| `--fg-2` | R360RingView.tsx | `var(--ds-text)` |
| `--bg-1`, `--bg-3`, `--bg-app` | R360RingView.tsx | `var(--ds-surface-sunken)` / `var(--ds-surface)` |
| `--aw-blue` | FieldsTab.tsx, AllWorkTab.tsx | `var(--ds-link)` |
| `--aw-text-subtle` | AllWorkTab.tsx | `var(--ds-text-subtle)` |

**Pre-condition**: grep all occurrences, map each → ADS token, verify visual parity before commit.

## Files Forbidden
- `src/styles/globals.css` (do not add new token definitions)
- Any file not in the Phase 2 table above

## Validation
```bash
npm run lint:colors:gate
npm run audit:ads:gate
```
Zero output = proceed. Any output = stop.

## Stop Conditions
- Any ratchet gate fails → stop, fix, re-gate
- Custom token has no clear ADS equivalent → stop, document in 09_DECISIONS.md, ask Vikram
