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

// 3-column grid header:
//   [auto]  LEFT  — sidebar toggle, HubSwitcher, wordmark
//   [1fr]   CENTER — Search (flex-grow, max 780px) + Create (adjacent, not in right cluster)
//   [auto]  RIGHT  — AskCatalystPill | Notifications | Settings | Profile
//
// The 1fr center column absorbs remaining width. Search fills up to 780px;
// leftover space sits between Create and the right cluster, making the
// two regions visually distinct. No dead-zone spacer needed.

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;
  const sidebarLabel = isCollapsed ? 'Expand sidebar' : 'Hide sidebar';
  const shortcutLabel = isMacPlatform() ? '⌘ [' : 'Ctrl [';
  const sidebarTooltip = `${sidebarLabel} (${shortcutLabel})`;

  return (
    <header
      data-catalyst-top-nav
      style={{
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
      {/* LEFT cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* CENTER: Search (grows to 780px max) + Create (pinned right of search) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '780px' }}>
          <GlobalSearch />
        </div>
        <div style={{ flexShrink: 0 }}>
          <CreateDropdown />
        </div>
      </div>

      {/* RIGHT cluster: AskCatalystPill | Notifications | Settings | Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <AskCatalystPill />
        <NotificationsPanel />
        <SettingsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

export default CatalystHeader;
