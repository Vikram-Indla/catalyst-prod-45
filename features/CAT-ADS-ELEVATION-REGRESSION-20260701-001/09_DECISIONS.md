# Decisions

## D1 — Council over Plan Lock for initial discovery
**Decision**: Ran `/council` first (no Plan Lock) because the problem was a post-migration regression needing root cause analysis, not a feature build.
**Rationale**: Council surfaced the elevation model mismatch (shadow-first vs surface-colour-first) which a Plan Lock alone wouldn't have caught.

## D2 — `--ds-border-bold` for card-level borders only
**Decision**: Switch card/canvas borders to `--ds-border-bold` but keep divider/separator borders as `--ds-border`.
**Rationale**: ADS intent — `--ds-border` is for dividers (intentionally subtle), `--ds-border-bold` is for card edges (must be perceivable).

## D3 — `--ds-shadow-overlay` for all overlay primitives
**Decision**: Use `--ds-shadow-overlay` (not `--ds-shadow-raised`) for popover/menu/hover-card overlays.
**Rationale**: These are overlay Z-level surfaces. `--ds-shadow-overlay` = `rgba(9,30,66,0.25)+rgba(9,30,66,0.31)` — strong enough to perceive against any surface. `--ds-shadow-raised` at 8% is for in-page card elevation.

## D4 — Custom tokens deferred to Phase 2
**Decision**: `--fg-3`, `--fg-2`, `--bg-1`, `--bg-3`, `--bg-app`, `--aw-*` deferred — need full grep + visual verification before replacing.
**Rationale**: Phase 1 fixes had screenshot evidence + confirmed regression. Phase 2 tokens need a mapping audit first.
