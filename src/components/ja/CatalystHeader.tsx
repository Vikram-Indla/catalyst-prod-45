import { TopNav, TopNavStart, TopNavMiddle, TopNavEnd } from '@atlaskit/navigation-system';
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

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;
  const sidebarLabel = isCollapsed ? 'Expand sidebar' : 'Hide sidebar';
  const shortcutLabel = isMacPlatform() ? '⌘ [' : 'Ctrl [';
  const sidebarTooltip = `${sidebarLabel} (${shortcutLabel})`;

  return (
    <TopNav testId="catalyst-top-nav">
      <TopNavStart
        sideNavToggleButton={
          <Tooltip content={sidebarTooltip} position="bottom">
            <IconButton
              label={sidebarLabel}
              appearance="subtle"
              onClick={cycleSidebarState}
              icon={isCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
            />
          </Tooltip>
        }
      >
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
      </TopNavStart>

      <TopNavMiddle>
        <GlobalSearch />
        <CreateDropdown />
      </TopNavMiddle>

      <TopNavEnd>
        <AskCatalystPill />
        <NotificationsPanel />
        <SettingsMenu />
        <ProfileMenu />
      </TopNavEnd>
    </TopNav>
  );
}

export default CatalystHeader;
