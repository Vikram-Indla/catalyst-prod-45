# CAT-ADS-COMPLIANCE-20260627-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

## [DEC-001] Slice ordering — enforcement before remediation
2026-06-27. ADS tooling is already mature; the gap is enforcement + a blocked long-tail. Chose CI/pre-commit enforcement (Slice 1) then audit ratchet (Slice 2) over risky bulk hex remediation (blocked on 265 unmapped mappings). Both shipped to PR #289.

## [DEC-002] Ratchet pattern = fail-on-increase vs committed baseline
2026-06-27. Gates never block existing debt; only NEW violations. Baselines (`color-baseline.json` 709; `audit-baseline.json` tokens 28913/typo 2201/spacing 1118/fonts 0) only ratchet down. Noise in the audit `tokens` category is inert under increase-only.

## [DEC-004] Branch isolation
2026-06-28. Branch `feat/ads-compliance-light-dark` created from worktree base `claude/goofy-murdock-eb6c58` (which tracks main). All compliance UI fixes happen on this branch only. CI enforcement gates (`ads-color-gate.cjs`, `ads-audit-gate.cjs`) remain on main and are not touched.

## [DEC-005] Unmapped hex strategy
2026-06-28. Full verbose scan (`no-hardcoded-colors.cjs --verbose`) produced 688 total violations. After excluding protected files (statusPalette.ts, workstream-colors.ts, index.css:239-247, stories/**, theme/tokens.ts) and cross-referencing against `references/ads-token-map.md` (148 mapped hex values): **223 unique unmapped hex values remain** across 407 occurrences. Grouped into 8 categories (A–H) and saved to `audit/baselines/before/unmapped-hex-grouped.md`. No self-invented mappings. Awaiting authoritative ADS mappings from design review before any sweep.

## [DEC-006] Protected hex exclusion list
2026-06-28. The following files and their hex values are NEVER_TOUCH in all sweep commands. Saved to `audit/baselines/before/protected-hex-list.md`.
- `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` — 18 hex values (ADS status semantic palette)
- `src/lib/workstream-colors.ts` — 25 hex values (workstream brand palette, all `--cp-workstream-*` or `--ds-chart-*` backed)
- `src/index.css` lines 239–247 — 6 hex values (Jira-parity block: `#858585`, `#D97706`, `#DDDEE1`, `#F0F1F2`, `#F8F8F8`, `#FF991F`)

## [DEC-007] Tailwind arbitrary color strategy
2026-06-28. Scan found **36 unique Tailwind arbitrary color values** (`bg-[#hex]`, `text-[#hex]`, `border-[#hex]`, `dark:bg-[#hex]`, etc.) across **59 occurrences** in TSX/TS files. These are Category G in the unmapped list. `tailwind.config.ts` already extends `theme.colors` with ADS/DS token vars (`var(--ds-*)`, `var(--surface-*)`, `var(--text-*)`, etc.) — meaning Tailwind arbitrary values CAN be replaced by existing utility classes (e.g. `bg-surface-1`, `text-text-secondary`). Migration approach: replace each arbitrary value with the nearest matching Tailwind token utility from the extended config. Awaiting authoritative mappings.

## [DEC-003] CI build 404 — root cause (DIAGNOSIS ONLY, no fix yet)
2026-06-27. CI `build` fails at `npm install`: `@atlassian/assets-workspace-host` 404s on public npm. Pinpointed via isolated registry-metadata probe (no node_modules touched): **`@atlaskit/link-datasource` depends on `@atlassian/assets-workspace-host`** (^0.7.0 latest / ^0.5.0 in the version your editor stack pins). That `@atlassian/*` package is Atlassian-internal, unpublished publicly. Pulled in transitively via the editor stack (`@atlaskit/editor-core`/`editor-plugins`/`editor-plugin-card`). Pre-existing — fails on `main` too. Unrelated to ADS compliance. Fix options pending JK decision (see handover). NOT a regression from this feature.

## [DEC-G1] Avatar colours — LOCKED 2026-06-28
  #FA8C16 → var(--ds-chart-orange-bold, #A54800)
  #52C41A → var(--ds-chart-green-bold, #216E4E)
  #EB2F96 → var(--ds-chart-magenta-bold, #943D73)

## [DEC-G2] StartNode border — LOCKED 2026-06-28
  #6B7FA3 → var(--ds-border-bold, #8590A2)

## [DEC-G3] Phase lifecycle colours — LOCKED 2026-06-28
  #F5A623 → var(--ds-background-warning-bold, #E2B203)
  #8A7CFF → var(--ds-background-discovery-bold, #5E4DB2)

## [DEC-G4] Attention badge background — LOCKED 2026-06-28
  #fefce8 → var(--ds-background-neutral-subtle, #F7F8F9)

## [DEC-C1] Priority palette canonical — LOCKED 2026-06-28
  Both FieldsTab.tsx and CanonicalFilter.tsx align to:
  Highest: bg=background-danger-bold/#C9372C, text=text-inverse/#FFFFFF
  High:    bg=background-danger/#FFECEB,      text=text-danger/#AE2A19
  Medium:  bg=background-warning/#FFF7D6,     text=text-warning/#974F0C
  Low:     bg=background-information/#E9F2FF, text=link/#0C66E4
  Lowest:  bg=background-neutral/#F1F2F4,     text=text-subtlest/#626F86

## [DEC-TAILWIND] Tailwind arbitrary strategy — LOCKED 2026-06-28
  Replace bg-[#hex]/text-[#hex]/border-[#hex] with Tailwind token class where
  tailwind.config.ts extended colors entry exists. Inline style for ambiguous cases.

## [DEC-PROTECTED] NEVER_TOUCH list — LOCKED 2026-06-28
  statusPalette.ts, workstreamColors.ts, index.css lines 239–247,
  src/stories/**, src/theme/tokens.ts
