import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import SidebarCollapseIcon from '@atlaskit/icon/core/sidebar-collapse';

import { AskCatalystPill } from '@/components/layout/AskCatalystPill';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { ThemeToggle } from '@/components/ads';
import { HubSwitcher } from '@/components/layout/HubSwitcher';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useCatalystContext } from '@/contexts/CatalystContext';
import catalystWordmark from '@/assets/catalyst-wordmark-3.svg';

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

// 3-column inline grid: auto | 1fr | auto
// Center column is a definite 1fr — flex-grow inside works correctly and
// the Popup trigger div gets a real containing-block width for Popper.js.
// justifyContent:center on the flex wrapper visually centres search+create.

export function CatalystHeader() {
  const {
    sidebarHidden, sidebarPinned, sidebarHoverOpen,
    cycleSidebarState,
  } = useCatalystContext();

  // The chevron's POSITION/ICON is driven by stickiness (sidebarPinned),
  // NOT by visibility. Pinned-visible → chevron at right edge (x=240) with
  // Collapse icon. Otherwise → chevron at left (x=12) with Expand icon.
  const isPinnedOpen = sidebarPinned && !sidebarHidden;
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
        background: 'var(--ds-surface, var(--cp-bg, #fff))',
        borderBottom: '1px solid var(--ds-border, var(--cp-bd, #e2e8f0))',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Ceiling-extension divider — mirrors Jira's ::after pattern. Draws a
          1px vertical line at the sidebar's right edge (x=240) spanning the
          full 56px of the top-nav so the sidebar border reads as one
          continuous line from viewport top to bottom. Shown when the sidebar
          is visible (pinned OR hover-peek overlay); hidden in edge-reveal
          state so there's no orphan line when the sidebar isn't on screen. */}
      {sidebarOnScreen && (
        <div
          aria-hidden="true"
          data-catalyst-sidebar-ceiling
          style={{
            position: 'absolute',
            left: '240px',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'var(--ds-border, var(--cp-bd, #DFE1E6))',
            pointerEvents: 'none',
          }}
        />
      )}
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
          width: isPinnedOpen ? '228px' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand cluster — HubSwitcher + wordmark. When NOT pinned-open
            (collapsed, hidden, or hover-peek), the chevron is injected IN
            FRONT of this group so it stays at the top-nav's leading edge
            (x≈12). When pinned-open, the chevron moves to the trailing
            slot below, anchored to the sidebar's right edge (x=240). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          {!isPinnedOpen && (
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
          <a
            href="/for-you"
            aria-label="Catalyst home"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            <img
              src={catalystWordmark}
              alt=""
              height={28}
              style={{ height: '28px', width: 'auto', display: 'block' }}
            />
          </a>
        </div>
        {isPinnedOpen && (
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

      {/* CENTER: flex row so the Popup trigger div gets a definite containing-block width */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
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
          HMR-nudge marker: phase-0-1-v2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifySelf: 'end' }} data-theme-toggle-cluster>
        <AskCatalystPill />
        <ThemeToggle />
        <NotificationsPanel />
        <SettingsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

export default CatalystHeader;
