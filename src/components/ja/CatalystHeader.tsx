import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import SidebarCollapseIcon from '@atlaskit/icon/core/sidebar-collapse';

import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { ThemeToggle } from '@/components/ads';
import { HubSwitcher } from '@/components/layout/HubSwitcher';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { Link } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
import logoMarkLight from '@/assets/logo-mark-light.svg';
import logoMarkDark from '@/assets/logo-mark-dark.svg';

function useIsDarkTheme() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined') return () => undefined;
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => obs.disconnect();
    },
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
    () => false,
  );
}

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

// 3-column inline grid: auto | 1fr | auto
// Center column is a definite 1fr — flex-grow inside works correctly and
// the Popup trigger div gets a real containing-block width for Popper.js.
// justifyContent:center on the flex wrapper visually centres search+create.

export function CatalystHeader() {
  const isDark = useIsDarkTheme();
  const {
    sidebarHidden, sidebarPinned, sidebarHoverOpen, sidebarExpanded,
    cycleSidebarState,
  } = useCatalystContext();

  // Loop 3 (2026-04-30): trim header chrome at <1024px so Search + Create
  // still fit alongside the external mobile hamburger overlay (rendered by
  // CatalystShell). At isNarrow we hide AskCaty, ThemeToggle, and Settings
  // — they remain reachable via the drawer / profile menu. Desktop ≥1024
  // is byte-identical: the early-narrow branch is the only thing changing.
  const { isNarrow, isMobile } = useNavBreakpoint();

  // Chevron POSITION/ICON: right edge (x=240) only when sidebar is fully
  // expanded with labels. Icon-only rail (sidebarExpanded=false) and hidden
  // both put the chevron at the leading left corner (x≈12).
  const isPinnedOpen = sidebarPinned && !sidebarHidden && sidebarExpanded;
  const sidebarLabel = isPinnedOpen ? 'Collapse sidebar' : 'Expand sidebar';
  const shortcutLabel = isMacPlatform() ? '⌘ [' : 'Ctrl [';
  const sidebarTooltip = `${sidebarLabel} (${shortcutLabel})`;

  // Click-only sidebar (April 2026, final): hover handlers removed. The
  // chevron toggles state via onClick={cycleSidebarState} only. Empty
  // no-op handlers retained as variables purely so JSX below doesn't need
  // to change shape — both fire nothing.
  const handleChevronEnter = () => {};
  const handleChevronLeave = () => {};

  // Divider visibility — show whenever the sidebar body is visible on
  // screen (pinned OR hover-peek), so the ceiling extension aligns with
  // either the solid sidebar panel or its overlay preview.
  const sidebarOnScreen = isPinnedOpen || sidebarHoverOpen;

  return (
    <header
      data-catalyst-top-nav
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        height: '56px',
        paddingInline: '12px',
        gap: '8px',
        // 2026-04-30 Jira parity: header rides at elevation.surface
        // (raised), matching the sidebar so the entire shell chrome
        // reads as one continuous surface above the canvas.
        // 2026-06-18 (Vikram): use --cp-bg-elevated so it actually resolves to
        // the raised var(--ds-surface, #22272B) (the sidebar's --ds-surface-raised), not --ds-surface
        // which mis-resolves to var(--ds-surface-sunken, #1D2125) in this theme. Uniform shell in both modes.
        background: 'var(--cp-bg-elevated)',
        borderBottom: '1px solid var(--ds-border, var(--cp-ink-1, #2E2E2E))',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Ceiling-extension divider REMOVED (2026-04-30, Vikram critique).
          Jira does NOT extend the sidebar's right border up through the top
          nav — the header reads as one continuous chrome surface with only
          a horizontal bottom border separating it from the canvas. Drawing
          a vertical seam at x=240 made the logo zone look "boxed in" and
          violated ADS one-surface principle for the global shell. */}
      {/* LEFT cluster — in Jira parity, this column mirrors the sidebar's
          footprint (screen x=0 → x=240) when expanded, so the chevron right-
          anchors on the sidebar edge and lines up with the ceiling-extension
          divider at x=240. Header has paddingInline:12px, so the grid track
          starts at x=12 — the inner cluster width is therefore 240 - 12 =
          228px to make its right edge land exactly on x=240 (chevron inside
          the line, not past it). When collapsed, width:auto so the chevron
          sits on the left at x≈12 before the HubSwitcher. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifySelf: 'start',
          justifyContent: 'space-between',
          width: isPinnedOpen && !isNarrow ? '228px' : 'auto',
          transition: 'width 200ms cubic-bezier(0, 0, 0.2, 1)',
          // Reserve room for the external mobile hamburger (rendered by
          // CatalystShell at left:8 / 36px wide) so HubSwitcher doesn't
          // sit underneath it on iPhone/iPad.
          paddingLeft: isNarrow ? '44px' : 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Brand cluster — HubSwitcher + wordmark. When NOT pinned-open
            (collapsed, hidden, or hover-peek), the chevron is injected IN
            FRONT of this group so it stays at the top-nav's leading edge
            (x≈12). When pinned-open, the chevron moves to the trailing
            slot below, anchored to the sidebar's right edge (x=240). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          {!isPinnedOpen && !isNarrow && (
            <div
              onMouseEnter={handleChevronEnter}
              onMouseLeave={handleChevronLeave}
              style={{ display: 'inline-flex' }}
            >
              <Tooltip content={sidebarTooltip} position="bottom">
                <IconButton
                  label={sidebarLabel}
                  appearance="subtle"
                  onClick={cycleSidebarState}
                  icon={SidebarExpandIcon}
                  aria-expanded={false}
                  aria-controls="catalyst-sidebar"
                />
              </Tooltip>
            </div>
          )}
          <HubSwitcher />
          {!isMobile && (
            <Link
              to="/"
              aria-label="Catalyst home"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', opacity: 1, gap: '4px' }}
            >
              <img
                src={isDark ? logoMarkDark : logoMarkLight}
                alt="Catalyst"
                style={{ height: '24px', width: '24px', flexShrink: 0 }}
              />
              <span style={{
                fontSize: '16px',
                fontWeight: 500,
                fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                color: isDark ? '#CECFD2' : '#101214',
                letterSpacing: '-0.4px'
              }}>
                Catalyst
              </span>
            </Link>
          )}
        </div>
        {isPinnedOpen && !isNarrow && (
          <div
            onMouseEnter={handleChevronEnter}
            onMouseLeave={handleChevronLeave}
            style={{ display: 'inline-flex' }}
          >
            <Tooltip content={sidebarTooltip} position="bottom">
              <IconButton
                label={sidebarLabel}
                appearance="subtle"
                onClick={cycleSidebarState}
                icon={SidebarCollapseIcon}
                aria-expanded={true}
                aria-controls="catalyst-sidebar"
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* CENTER: flex row so the Popup trigger div gets a definite containing-block width.
          minWidth:0 on the wrapper is REQUIRED — without it, the grid's 1fr track resolves
          to min-content (Search + Create + gap), pushing past its own track and OVERLAPPING
          the right cluster (visible as Ask Caty white pill rendering on top of Create
          button). RCA 2026-04-30. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        {/* 2026-06-16: ContextSwitcher moved OFF the top nav into the left
            sidebar header (ProductHub/ProjectHub/Tasks sidebars) to reclaim
            top-nav width and remove the double-render of the active context. */}
        <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '560px' }}>
          <GlobalSearch />
        </div>
        <div style={{ flexShrink: 0 }}>
          <CreateDropdown />
        </div>
      </div>

      {/* RIGHT cluster — justifySelf:end pins it to the right screen edge.
          ThemeToggle sits left of NotificationsPanel so the moon/sun lives
          inside the natural reading order before the alert/settings/avatar
          stack. The toggle and ProfileMenu's Theme submenu share state
          via useThemeMode() — clicking either flips both. (2026-04-28).
          2026-05-31: AskCatalystPill REMOVED from global top nav per Vikram —
          AI should only appear in context (per-mention card, per-ticket, etc.).
          Top-nav global AI was too generic and duplicated contextual entry points.
          Component file retained at /components/layout/AskCatalystPill.tsx for
          potential re-use in other surfaces. 2026-06-15: Caty toggle REMOVED —
          FAB hide/show affordance moved to the card itself (X button in header
          of CatyWhyCard) so control sits on controlled element, making the
          relationship visually obvious. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        justifySelf: 'end',
        flexShrink: 0,
        minWidth: 'max-content',
      }} data-theme-toggle-cluster>
        {!isNarrow && <ThemeToggle />}
        <NotificationsPanel />
        {!isNarrow && <SettingsMenu />}
        <ProfileMenu />
      </div>
    </header>
  );
}

export default CatalystHeader;
