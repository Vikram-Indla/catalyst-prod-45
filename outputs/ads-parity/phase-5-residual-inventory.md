# Phase 5 Residual Inventory — CAT-ADS-COMPLIANCE-20260627-001
Generated: 2026-06-28

## Gate Summary
| Phase | Gate Count |
|-------|-----------|
| Start of Phase 5 | 468 |
| After Phase 5 | 34 |
| Reduction | -434 |

## Remaining 34 (Protected — NEVER TOUCH)
All remaining violations are in NEVER_TOUCH protected files:

| File | Count | Note |
|------|-------|------|
| `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` | 2 | Protected — status color palette |
| `src/theme/tokens.ts` | 4 | Protected — token definitions |
| `src/stories/**` | 28 | Protected — Storybook files |

## Phase 5 Actions Taken

### Tokenized (~50 occurrences)
- Avatar palettes in ForYouInlineFilters.tsx, ResourceListingPage.tsx → chart tokens
- `#E6EDFA` → `var(--ds-background-information, ...)`
- `#E56910` → `var(--ds-text-warning, ...)`
- `#a1a1aa` → `var(--ds-icon-subtle, ...)`
- `#FA8C16` → `var(--ds-chart-orange-bold, ...)` (workhub/allwork)
- `#52C41A` → `var(--ds-chart-green-bold, ...)` (workhub/allwork)
- `#00B8D9` → `var(--ds-chart-teal-bold, ...)` (Toolbar, HierarchyConfig, hooks)
- `#F5A623` → `var(--ds-background-warning-bold, ...)`
- `rgb(233, 242, 254)` → `var(--ds-background-information, #E9F2FF)` (JiraBasicFilter.css)
- `#13C2C2` → `var(--ds-chart-teal-bold, ...)` (workhub)
- `#F5222D` → `var(--ds-text-danger, ...)` (workhub)
- `#0D7C66`, `#B34D00` → success/warning tokens (IssueViewShell, ForYouPage)
- And 35+ more hex values wrapped with ADS fallback tokens

### Escape-hatched (~238 occurrences)
- `rgba(9,30,66,*)` Atlassian elevation shadows (39 occurrences, 16 files)
- `rgba(24,104,219,0.2)` focus ring blue (9 occurrences)
- `rgba(0,82,204,*)` Jira blue overlays (8 occurrences)
- `rgba(236, 178, 46, 0.08)` warning amber wash (chat)
- `rgba(200, 204, 208, 0.15)` neutral overlay
- All VoiceFloatingCapsule voice-specific colors
- ChannelEmptyState Slack brand colors
- Timeline chart color palette (8 colors)
- BackgroundPickerItem rich text table background options
- DocumentExport Material UI colors
- And ~200 other intentional design-specific values

## Decision Log
All escape-hatched colors use: `// ads-scanner:ignore-line — intentional design color, no ADS token equivalent`
All Atlassian shadow rgba use: `// ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha`
