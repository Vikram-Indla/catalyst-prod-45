# CANONICAL DISCOVERY — CAT-STRATA-STRATEGY-ADS-20260720-001

All canonical targets are already present in the repo. No new shared component is created.

| Need (finding) | Canonical selected | Location / import | Evidence it fits | Consumed how (page-local) |
|---|---|---|---|---|
| Sentence-case readiness labels/badges (DI-01) | Plain ADS-tokened text (no component) | `StrataStrategyRoomPage.tsx` `ReadinessBand` | Labels/badges are plain `<div>/<span>`, not lozenges — casing is 100% source-controlled; `text-transform:none` proven live (SELECTOR_MAP #1) | Rewrite authored strings + drop `letterSpacing` |
| View switcher (DI-03) | `@atlaskit/tabs` (`Tabs`,`TabList`,`Tab`) | `import Tabs, { Tab, TabList } from '@atlaskit/tabs'` | Installed; canonical in-repo precedent `DatabaseSurface.tsx:762-784` uses `selected`+`onChange` TabList switcher | Replace `ViewToggle` in-page; Map = adjacent ADS `Button` |
| Map action (keep navigational) | ADS `Button appearance="subtle"` | `@/components/ads` (already imported) | Map is a route, not an in-page view; button role ≠ tab, so not announced in the tab set | Calls existing `navigate(Routes.strata.strategyMap())` |
| Inspector empty state (DI-06) | ADS `EmptyState size="compact"` | `@/components/ads` (already imported + used on this page at 795/946/994) | Wrapper's `compact` variant is purpose-built for panel/rail/card nesting (`EmptyState.tsx:64-132`) | Swap the plain `<div>` inner content only; rail/drawer mount unchanged |
| TypeChip spacing (DI-07) | ADS spacing token `var(--ds-space-050)` (4px) | CSS var | 4/8 rhythm; current `5px` is off-grid (SELECTOR_MAP #7) | One inline-style value |
| Containment (DI-08, page-local) | ADS surface/elevation/space tokens | inline styles on page containers | Reserve elevation for true layers; readiness band + rail double-contain | Page-local containers only; **`StrataPanel` untouched** |

## Canonical targets DEFERRED (shared component — out of scope here)
| Finding | Canonical fix | Why deferred | Blast radius if touched |
|---|---|---|---|
| DI-04 dropdown trigger | Canonical ADS trigger on `StrataChipMenu` | Lives in `components/shared.tsx:337-383` — shared | Cycle/Period on **all 26 STRATA pages** + KPI Library/Portfolio/Execution |
| DI-05 count badge | Subdued count text in `StrataPanel` | Lives in `components/shared.tsx:1074-1081` — shared | **~30 STRATA pages / ~40 `count=` sites** |
| DI-08 residual | Reduce `StrataPanel` border+raised shadow | Shared elevation; page can't change it without editing shared | All `StrataPanel` consumers |

## DI-02 (lozenge casing) — canonical mechanism is contested (see 09_DECISIONS D1)
The audit's mechanism (`data-cp-lozenge-jira-parity` wrapper → sentence case) is **inert in light mode**
after the 2026-06-09 global directive removed the sentence-case override and stripped the attribute from
the shared `Lozenge`. A page-scoped re-enable is possible (idiom precedent: `shared.tsx:509`
`.strata-page-shell .jira-table-grid{...}`) but partially reintroduces removed behavior → **blocked on D1**.
No change to `components/ads/Lozenge.tsx` or global CSS under any option.
