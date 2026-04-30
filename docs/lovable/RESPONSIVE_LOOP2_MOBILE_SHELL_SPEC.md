# Loop 2 Spec Memo — Mobile Shell for CatalystShell

**Status:** SPEC ONLY — no code in this loop. Implementation gated on Vikram sign-off.
**Author:** Lovable, 2026-04-30
**Scope:** Wire a global off-canvas drawer + header collapse for `CatalystShell` behind `useNavBreakpoint().isNarrow` (<1024px). Covers all 11 module sidebars listed below.
**Out of scope:** Inner page content reflow (per-route Tier-A/Tier-B loops). dnd-kit boards, dense tables, split-panes (Tier-B, separate spec).

---

## 1. Hard Rules (re-state of contract)

1. **Zero desktop regression.** ≥1024px renders identical to 2026-04-30 baseline (`/mnt/documents/responsive-loop1/desktop-1440.png`). Pixel-diff gate.
2. **Atlaskit primitives + ADS tokens only.** No raw hex, no `bg-white`, no Tailwind color classes. All surfaces consume `--ds-*` (or `--cp-*` bridge) tokens. NOCTURNE remains banned.
3. **One surface per loop.** This loop touches only `CatalystShell.tsx` + a NEW `GlobalMobileDrawer` component. Module sidebars are NOT edited — they are rendered inside the drawer, unchanged.
4. **No new breakpoint hook.** Reuse `useNavBreakpoint()` (`isCompact <1280`, `isNarrow <1024`, `isMobile <768`). The drawer is gated on `isNarrow`.
5. **Existing `MobileMenuDrawer` is NOT reused.** It is TaskHub-scoped, hardcoded items, raw hex, `bg-white`. It will be deprecated in a later loop. The new component is `GlobalMobileDrawer` and lives under `src/components/layout/`.
6. **Click-only contract preserved.** Desktop sidebar stays click-only (Apr 2026 final). Mobile drawer is click-only too — no edge-swipe, no hover-peek.

---

## 2. Surface Inventory — 11 Module Sidebars

All are lazy-loaded in `CatalystShell.tsx` lines 19–37 and selected by `workspaceType`. This loop renders the **already-resolved sidebar** inside the off-canvas container — sidebar internals untouched.

| # | Sidebar component                  | workspaceType trigger | Notes                                              |
|---|------------------------------------|-----------------------|----------------------------------------------------|
| 1 | `HomeSidebar`                      | `home` (default)      | Pinned/Recent/Jump to                              |
| 2 | `UnifiedSidebar`                   | unified surfaces      | Cross-hub                                          |
| 3 | `EnterpriseSidebar`                | `enterprise`          | Strategy + portfolio                               |
| 4 | `ProductRoomSidebar`               | `product`             | Product room                                       |
| 5 | `ProjectSidebar` / `ProjectHubSidebar` | `project` / `projecthub` | Two distinct components, both inside `project*` |
| 6 | `ReleaseRoomSidebar` (`OperationsSidebar`) | `release-room` | Imported from OperationsSidebar.tsx                |
| 7 | `ReleaseHubSidebar`                | `releasehub`          |                                                    |
| 8 | `ReleasesManagementSidebar`        | `releases-mgmt`       |                                                    |
| 9 | `TestManagementSidebar` / `TestHubSidebar` | `test-mgmt` / `testhub` | Two components                              |
|10 | `IncidentHubSidebar`               | `incidenthub`         |                                                    |
|11 | `PlanHubSidebar` / `TaskHubSidebar` / `WikiSidebar` | hub-specific | Grouped — each renders standalone inside drawer    |

> Total distinct sidebar components rendered by `CatalystShell`: **14**, grouped as 11 modules above. The drawer is sidebar-agnostic — it accepts whatever `<Suspense>` node `CatalystShell` resolves.

---

## 3. Header Collapse Contract (`CatalystHeader` at `<1024px`)

Pixel-locked behaviour at `useNavBreakpoint().isNarrow === true`:

| Element              | ≥1024 (baseline)         | <1024 (this loop)                                                       |
|----------------------|--------------------------|-------------------------------------------------------------------------|
| Sidebar chevron      | Toggle pinned/hidden     | Becomes **drawer trigger** (hamburger icon, `@atlaskit/icon/glyph/menu`). Opens `GlobalMobileDrawer`. Aria-label: "Open navigation". |
| Workspace switcher   | Inline label + chevron   | Icon-only (`HubSwitcher` already supports compact via `isCompact`)      |
| Global search        | Full input               | Icon-only trigger; click expands as overlay (existing `isNarrow` path)  |
| `+ Create`           | Full button + label      | Icon-only `+` (existing `isNarrow` path)                                |
| Ask Catalyst         | Pill + label             | Hidden at `isNarrow`. Surfaced inside drawer footer instead.            |
| Notifications        | Bell + badge             | Bell + badge (unchanged)                                                |
| Profile menu         | Avatar + chevron         | Avatar only (chevron hidden)                                            |
| Header height        | 48px                     | 48px (unchanged — must NOT grow)                                        |

**Invariants:**
- `--app-header-h` stays 48px (the `useAppHeaderOffset` consumer must not see drift).
- No new top-nav row. Everything fits in the existing 48px shell.
- Header background/border tokens unchanged.

---

## 4. Off-Canvas Sidebar Contract (`GlobalMobileDrawer`)

**File (NEW):** `src/components/layout/GlobalMobileDrawer.tsx`

**Primitive:** Composition of `@atlaskit/modal-dialog`'s drawer mode is not used (it's modal-style). Use a custom panel built from:
- `@atlaskit/portal` for the layer
- `@atlaskit/focus-lock` for trap
- ADS tokens for surface (`elevation.surface.overlay`), border (`color.border`), shadow (`elevation.shadow.overlay`)
- `prefers-reduced-motion` honoured (no transform animation when reduced)

**Geometry:**

| Property            | Value                                                                    |
|---------------------|--------------------------------------------------------------------------|
| Mount               | `document.body` via `@atlaskit/portal` (z above header)                  |
| Side                | Left edge                                                                |
| Width               | `min(320px, 86vw)` — leaves a tap-out gutter                             |
| Height              | `100dvh` (dynamic vh, handles iOS URL bar)                               |
| Top offset          | `0` (drawer covers header — header chrome lives inside drawer top)       |
| Backdrop            | `rgba(0,0,0, token('opacity.disabled'))` via ADS — click-to-close        |
| Animation           | 200ms `cubic-bezier(.2,0,0,1)` translateX. Disabled if `reduce-motion`.  |
| Safe area           | `padding-top: env(safe-area-inset-top)` for iPhone notch                 |
| Body scroll lock    | `overflow:hidden` on `<html>` while open; restore on close               |

**Children rendered inside drawer (top → bottom):**
1. **Drawer header (48px):** Catalyst logo (left), close `X` (right, `@atlaskit/icon/glyph/cross`).
2. **Workspace switcher row (40px):** Reuses `HubSwitcher` in expanded mode (drawer is wide enough).
3. **Active sidebar slot:** `<Suspense>` wrapper around the sidebar component the parent already resolved. Sidebar receives `expanded={true}` always (inside drawer there is no collapsed mode — pinned-vs-hover does not apply).
4. **Drawer footer (sticky, 56px):** Ask Catalyst pill + Settings icon. Safe-area aware (`padding-bottom: env(safe-area-inset-bottom)`).

**Interaction:**
- Open: tap hamburger in header.
- Close: tap backdrop, tap close-X, press `Escape`, navigate (route change auto-closes).
- Focus: on open, focus lands on close button. On close, focus returns to hamburger.
- Aria: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to drawer header.

**State ownership:** Drawer open/close state is **local** to `CatalystShell` (`useState`). It is NOT added to `CatalystContext` — keeps blast radius zero.

---

## 5. CatalystShell Wiring (proposed diff sketch — do not apply this loop)

```tsx
// CatalystShell.tsx — sketch
const { isNarrow } = useNavBreakpoint();
const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

// Auto-close on route change
useEffect(() => { setMobileDrawerOpen(false); }, [location.pathname]);

// Render branches
return (
  <>
    <CatalystHeader
      compact={isNarrow}
      onMobileMenuClick={isNarrow ? () => setMobileDrawerOpen(true) : undefined}
      // ...existing props unchanged
    />

    {isNarrow ? (
      <>
        {/* Desktop sidebar slot stays NULL at <1024 */}
        <main className="cs-main cs-main--mobile">{children}</main>
        <GlobalMobileDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sidebar={ResolvedSidebarNode /* whatever the workspaceType picked */}
        />
      </>
    ) : (
      // ─── EXISTING DESKTOP BRANCH — UNCHANGED ────────────────────
      <ExistingShellLayout />
    )}
  </>
);
```

**Critical:** the `else` branch is **byte-identical** to today. No conditional sneaks into the desktop path. This is what protects the pixel baseline.

---

## 6. Token Vocabulary (additions needed — `:root` + `.dark`)

No new tokens required if we stick to existing `--ds-*` overlays. If a Catalyst-specific bridge is needed:

```css
:root {
  --cp-drawer-width: min(320px, 86vw);
  --cp-drawer-z: 9000; /* below modals (9999), above header (1000) */
}
```

Both go in `src/styles/theme-tokens.css`. No `.dark` override needed — derives from `--ds-*` tokens used inside.

---

## 7. Verification Gate (must pass before Loop 2 closes)

| Check | Method |
|---|---|
| 1440px desktop pixel-identical to baseline | Screenshot diff vs `/mnt/documents/responsive-loop1/desktop-1440.png`, threshold 0px |
| 1024px boundary: shell flips at exactly 1023→1024 | Manual viewport scrub |
| 820px iPad: drawer opens, sidebar visible, scrollable, close works | Screenshot |
| 390px iPhone: drawer 86vw, backdrop tap closes, safe-area honoured | Screenshot |
| All 11 module sidebars render inside drawer without console error | Visit one route per workspaceType |
| `useAppHeaderOffset` reports 48px in all viewports | Read `--app-header-h` |
| `audit/contrast-probe.js` light + dark, `failingCount===0` | Re-run after HARD RELOAD |
| Reduced-motion respected | OS-level toggle, observe no transform |
| Body scroll locked while drawer open; restored on close | Manual |
| Route change auto-closes drawer | Click any nav item |
| `Escape` closes drawer; focus returns to hamburger | Keyboard |
| TS / build clean | Harness |

---

## 8. Risks & Halt Conditions

- **R1 — Workspace-type sidebar prop mismatch.** Some sidebars assume desktop-only context (e.g., pinned-state callbacks). If any sidebar throws or visually breaks inside the drawer, halt and file a per-sidebar Tier-B spec.
- **R2 — `useAppHeaderOffset` consumers expect a non-zero header on mobile.** If `--app-header-h` ever drops to 0 because we hide the header inside the drawer, page heights will jump. The header stays mounted at 48px outside the drawer; only its internal contents collapse.
- **R3 — Existing `MobileMenuDrawer` collisions.** TaskHub still uses `MobileMenuDrawer` from `MobileBottomNav`. We do NOT touch it this loop. Future cleanup loop will remove the duplicate once `GlobalMobileDrawer` is proven across all 11.
- **R4 — z-index war with existing modals (`StoryDetailModal`, global search overlay).** Drawer z = 9000, modals stay 9999. Verified order: header (1000) < drawer (9000) < modals (9999).

**Halt the loop if:** any desktop pixel diff > 0; any sidebar throws; `--app-header-h` drift; contrast probe regresses; `MobileMenuDrawer` (TaskHub) starts misbehaving as a side-effect.

---

## 9. Deliverables of the Implementation Loop (next loop, post-approval)

1. New file: `src/components/layout/GlobalMobileDrawer.tsx`
2. Edit: `src/components/layout/CatalystShell.tsx` — branch on `isNarrow`, wire drawer
3. Edit: `src/components/layout/CatalystHeader` (only the compact-mode path) — wire `onMobileMenuClick` + hide Ask Catalyst at `isNarrow`
4. Edit: `src/styles/theme-tokens.css` — add 2 `--cp-drawer-*` tokens
5. Verification artifacts: 3-viewport screenshots saved to `/mnt/documents/responsive-loop2/`

**Estimated lines touched:** ~180 net new, ~25 modified in `CatalystShell.tsx`. Module sidebars: 0 lines.

---

## 10. Sign-off Required

Vikram approves this memo → implementation loop opens. Otherwise, revise.
