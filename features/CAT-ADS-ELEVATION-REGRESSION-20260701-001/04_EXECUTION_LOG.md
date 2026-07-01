# Execution Log

## 2026-07-01 — Session 001

### Phase 1 — SHIPPED

**Commit**: `c2c7b2c77`
`fix(elevation): restore shadow and border visibility after ADS migration`

**Changes:**
- `src/components/ui/popover.tsx` — removed `shadow-lg`, added `boxShadow: var(--ds-shadow-overlay)` to style
- `src/components/ui/hover-card.tsx` — removed `shadow-lg`, added `boxShadow: var(--ds-shadow-overlay)`
- `src/components/ui/context-menu.tsx` — removed `shadow-lg` from SubContent + Content, added `boxShadow: var(--ds-shadow-overlay)` to both style props
- `src/components/ui/select.tsx` — removed `shadow-lg dark:shadow-[...]`, added `boxShadow: var(--ds-shadow-overlay)` to style
- `src/components/ui/lookup-select.tsx` — removed `shadow-lg` from SelectContent className pass-through
- `src/components/resource360/r360-member.css` — `.r3-ring-canvas` + `.r3-ring-card` borders: `--ds-border` → `--ds-border-bold`
- `src/components/resource360/R360RingView.tsx` — empty-state container border: `--ds-border` → `--ds-border-bold`
- `src/components/catalyst-detail-views/subtask/CatalystViewSubtask.tsx` — key text: `--ds-text-subtlest` → `--ds-text-subtle`
- `design-governance/audit-baseline.json` — tokens ratcheted 27468→27461

**Gates**: color-gate ✅ 67=67, audit-gate ✅ no category above baseline

### Phase 2 — SHIPPED

**Commit**: `349e580b3`

**Root cause confirmed**: `--ds-shadow-raised` is a full box-shadow declaration post-ADS. Used as color/bg → invalid CSS → browser inherits. Every `--fg-*`, `--stroke-*`, `--row-hover`, shadow token referencing it produced invisible text, borders, and shadows.

**All in `src/index.css`:**
- `--fg-1..4` text ladder → `var(--ds-text*)` tokens
- `--stroke-1/2`, `--divider`, `--input-bd` → `var(--ds-border*)` tokens
- `--cp-bg-hover`, `--row-hover`, `--table-section-bg`, hover rules → `var(--ds-background-neutral-subtle)`
- `--neutral-fg/bg/bd` → `var(--ds-text-subtle)` / neutral-subtle / border
- `--cp-shadow-*`, `--shadow-elev-*`, `--shadow-1/2` → `var(--ds-shadow-raised)` / `var(--ds-shadow-overlay)` direct
- `--ds-blanket` overrides REMOVED — post-ADS these produced invisible modal backdrops
- Dark mode: mention bg, jus-table box-shadow, sprint-releases hover

**Gates**: color-gate ✅ 67=67, audit-gate ✅ 27434=27434

**Stop condition flagged**: Modal blanket blue-cast (dark mode) — Atlaskit `--ds-blanket` has navy cast. Review separately.
