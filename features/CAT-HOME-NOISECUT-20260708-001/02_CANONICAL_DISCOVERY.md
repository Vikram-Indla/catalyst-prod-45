# Canonical discovery (completed 2026-07-08, three parallel code probes + live screenshots)

## Surfaces & files (probed, exact)
| Element | File | Fact |
|---|---|---|
| Top nav shell | src/components/ja/CatalystHeader.tsx:77 | 56px grid `auto 1fr auto`; wordmark :165 = 17px/500, letterSpacing -0.4px hardcoded |
| Timer chip | src/components/releasehub/foryou/ReleaseChangeAnnouncementBanner.tsx:394 (`ReleaseTimerNavChip`) | tone map `T` :41–46; overrun → red dot + red `+Nd Nh Nm`; 1s self-tick |
| CHG card | same file :280–382 | 3px tone rail :284, raised surface, real @atlaskit/lozenge subtle (SCHEDULED/HIGH) via ReleaseOpsLozenges.tsx |
| Presence ring | src/components/shared/PresenceRing.tsx:26–28 | offline = solid 2px `var(--ds-background-warning-bold)` (amber) |
| Row status pills | src/components/shared/StatusLozenge/StatusLozenge.tsx:95 | hand-rolled span, uppercase, font-weight 653, BOLD tier via statusPalette.STATUS_BG (information-bold / warning-bold) |
| Rows | src/components/for-you/atlaskit/ForYouRow.tsx | jira-assigned variant :327 trailing slot = StatusLozenge only; project name :266 painted `color.link` but plain text (no anchor) |
| Grouping | src/components/for-you/atlaskit/AssignedPanel.tsx:55–91 | groups by literal status VALUE; order via statusCategoryOrder; headers :162 sentence-case label + count |
| Tabs | src/components/for-you/atlaskit/ForYouTabs.tsx:205–241 | 3 badge variants (blue square r2 / red square r2 / neutral r999); hardcoded fallbacks rgb(143,184,246), #AE2E24 |
| Collapsed rail | src/components/layout/HomeSidebar.tsx:479–522 | HUB_BORDER_COLORS map; 1.5px colored ring per hub; hexes #4A7FE0, #38BDF8 behind ads-scanner:ignore |
| Sidebar clock | src/components/layout/SidebarClock.tsx + src/hooks/useCityWeather.ts | live Open-Meteo fetch 30-min cache; dual-zone via resolveClockZones |
| Recent tree | src/components/layout/HomeSidebar.tsx:140–212 | localStorage-backed; per-row relative timestamp second line (11px) |

## Canonical components selected
- `@atlaskit/lozenge` (via src/components/ads/Lozenge.tsx, default subtle) — the ONLY lozenge going forward on this surface.
- Existing `SectionHeading` in AssignedPanel — reused, label source changes to category.
- No new components. No hand-rolled UI added anywhere.

## Blast radius (checked before lock)
- `StatusLozenge` (shared) is used beyond For You — slice 1 does NOT delete or restyle the shared
  component; it only stops rendering it in ForYouRow's jira-assigned trailing slot. Shared-component
  retirement is a later, separately-locked migration.
- `PresenceRing` used in ProfileMenu (+ chat surfaces) — color-only change on `offline` branch, shape/size untouched.
- `HUB_BORDER_COLORS` local to HomeSidebar — no external consumers.
- `ReleaseTimerNavChip` mounted only in CatalystHeader.tsx:245.

## Evidence
- Live screenshots (Vikram, 2026-07-08): nav, hub switcher, collapsed rail, For You light mode, search dropdown.
- Approved after-state: artifact eec5e73e (v1-before-after).
- Orange edge glow in captures verified NOT app code (no gradient/glow authored in shell/theme CSS) — OS/capture overlay; out of scope.
