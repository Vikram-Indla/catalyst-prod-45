# PLAN LOCK — Slice 3 (premiumness fixes, /loop mandate)

**Status:** Approved via "/loop until fixed and merged" (2026-07-08). Same cadence as slices 1–2.
**Timebox:** 2h per batch; loop until all 6 live-verified + pushed.

## Fix lineup (priority order)
1. HubSwitcher popup: kill container focus ring (blue outline around whole dropdown).
2. HubSwitcher: Ideation deprecated row must LOOK unavailable (grayed, not-allowed cursor) —
   currently visually identical to live rows.
3. HubSwitcher: Folio tile gray → its registered purple tone (`tone: 'purple'` already in HUBS).
4. Dark mode: mute hub-switcher tile chroma (~30% desat via CSS filter on the tile img in dark —
   no color literals, filter only).
5. HomeSidebar Recent tree: global-hub group tiles (Incident/Tasks/Release) → monochrome glyph
   (outline mask + neutral ink, same technique as collapsed rail); ProjectIcon/ProductAvatar
   keep color (identity data).
6. SidebarBase width 220 → 240 (stop truncating "Sign-off queue" etc). Blast radius: all hubs use
   SidebarBase — screenshot Home + one other hub, light+dark.

## Files
- src/components/layout/HubSwitcher.tsx (1,2,3,4)
- src/components/ui/dropdown-menu.tsx — READ ONLY unless the ring originates there; if a shared
  fix is needed, scope it via className/prop from HubSwitcher, do not restyle the shared component.
- src/components/layout/HomeSidebar.tsx (5)
- src/components/layout/SidebarBase.tsx (6)
- design-governance baselines if ratchet moves down.

## Forbidden
Foreign in-flight: ChangeCockpitSections.tsx, test-management/*, any file another session has dirty.
Never git add -A. Explicit paths only.

## Validation per batch
tsc, lint:colors:gate, audit:ads:gate, live light+dark screenshots on localhost:8080, explicit-path
commit, push. Rebase/verify if concurrent commits land.
