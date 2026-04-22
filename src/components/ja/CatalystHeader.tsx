import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import SidebarCollapseIcon from '@atlaskit/icon/core/sidebar-collapse';

import { AskCatalystPill } from '@/components/layout/AskCatalystPill';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { HubSwitcher } from '@/components/layout/HubSwitcher';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useCatalystContext } from '@/contexts/CatalystContext';
import catalystWordmark from '@/assets/catalyst-wordmark-3.svg';

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

// 3-column grid header (responsive via [data-catalyst-top-nav] CSS in index.css):
//   mobile  : auto 1fr auto
//   ≥1216px : minmax(min-content,1fr)  auto  minmax(min-content,1fr)
//             — equal 1fr sides → center is geometrically centred on screen
//
// CENTER is a flex row, NOT a CSS Grid.
// Using a CSS Grid for the center caused width:100% on the Popup trigger div
// to resolve to 0 (percentage widths contribute 0 to grid track max-content
// intrinsic sizing → minmax(0,780px) collapses to 0). Popper.js then used a
// zero-width reference and anchored the popup at x=0.
// A flex wrapper with flex:1 1 0 / maxWidth:780px gives the trigger div a
// definite containing-block width, guaranteeing correct getBoundingClientRect().

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;
  const sidebarLabel = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const shortcutLabel = isMacPlatform() ? '⌘ [' : 'Ctrl [';
  const sidebarTooltip = `${sidebarLabel} (${shortcutLabel})`;

  return (
    <header
      data-catalyst-top-nav
      style={{
        display: 'grid',
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
      {/* LEFT cluster — justifySelf:start keeps it pinned to the left screen edge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifySelf: 'start' }}>
        <Tooltip content={sidebarTooltip} position="bottom">
          <IconButton
            label={sidebarLabel}
            appearance="subtle"
            onClick={cycleSidebarState}
            icon={isCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
          />
        </Tooltip>
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

      {/* CENTER: flex row so the Popup trigger div gets a definite containing-block width */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '780px' }}>
          <GlobalSearch />
        </div>
        <div style={{ flexShrink: 0 }}>
          <CreateDropdown />
        </div>
      </div>

      {/* RIGHT cluster — justifySelf:end pins it to the right screen edge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifySelf: 'end' }}>
        <AskCatalystPill />
        <NotificationsPanel />
        <SettingsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

export default CatalystHeader;
