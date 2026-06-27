# 09 — DECISIONS

| # | Decision | Rationale | Date |
|---|---|---|---|
| D1 | ADS-13 dark-chrome runs on its own branch `fix/dark-chrome-ads13`, off `main` | Bundle README marks ADS-13 "tracked separately"; needs its own dark-mode VR gate | 2026-06-27 |
| D2 | ADS-13 slice scope = **Finding 1 only** (delete Group A white-fallback footgun) | Byte-identical render (A⊆B verified); low risk; fits 2-hour slice | 2026-06-27 (user-chosen) |
| D3 | **Defer Finding 3** (standardize overlay fallbacks) | Bundle said "~40"; actual = **332 occurrences** across ~40+ files; inert today; high blast radius | 2026-06-27 |
| D4 | **Defer Finding 4** (buried nav-text) | Scope/specificity issue; needs live DOM probe before any edit | 2026-06-27 |
| D5 | Top dark-rule comment rewritten (not just deleted) | It claimed "uniform white / no tonal step" — now false under the Group B ramp; kept the still-true facts (highest-specificity, single source of truth, light untouched) | 2026-06-27 |
| D6 | `packages/tokens/definitions.ts` NOT applied | No `packages/tokens/` dir; external `@catylast/tokens` | (carried from sweep) |
| D7 | PR7–PR9 long-tail blocked; no self-invented mappings | 265 unmapped hexes need Claude Design mappings; inventing = forbidden | (carried) |
| D8 | Feature-folder docs organized in-repo to match convention (siblings 001/003 tracked) | "Get folders in order" — now git-tracked & committed in main repo | 2026-06-27 |
| D9 | ADS-13 Finding 1 committed & merged via PR #288 (`c80fe30fc`) | Commit gate satisfied (build 0, render-identity proof, DOM probe); user authorized execution | 2026-06-27 |

## Open (await user)
- (none for the active slice — ADS-13 Finding 1 merged.) Remaining feature work is deferred
  (Findings 3 & 4) or blocked (PR7–PR9 mappings); all out of scope for this slice.
