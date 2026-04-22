import { Box, xcss, Flex } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
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

// 3-column grid: [left=auto] [center=1fr] [right=auto]
//
// LEFT   — sidebar toggle + HubSwitcher + wordmark (auto-sized to content)
// CENTER — Search (flex-1, max 780px) + Create (flex-shrink:0), filling the
//          remaining 1fr. Extra space falls between Create and the right
//          cluster, making the two regions visually distinct. This matches
//          the Atlaskit navigation-system spec where Search and Create are
//          TopNavMiddle children and AskCaty onward are TopNavEnd children.
// RIGHT  — AskCatalystPill | Notifications | Settings | Profile (auto-sized)
const headerStyles = xcss({
  display: 'grid',
  // @ts-expect-error — xcss doesn't type gridTemplateColumns
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  height: '56px',
  paddingInline: 'space.150',
  backgroundColor: 'elevation.surface',
  borderBlockEnd: 'border.width',
  borderColor: 'color.border',
  flexShrink: 0,
});

const leftClusterStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.050',
});

// Center occupies the 1fr column. Search grows up to 780px; Create sits
// directly to its right. No spacer — the column's remaining width is simply
// left as white space between Create and the right cluster.
const centerStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
  minWidth: '0',
  overflow: 'hidden',
  paddingInline: 'space.150',
});

// Search stretches to fill available space, capped at 780px (Atlaskit spec).
const searchWrapperStyles = xcss({
  flexGrow: 1,
  flexShrink: 1,
  minWidth: '0',
  maxWidth: '780px',
});

const rightClusterStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.050',
});

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;
  const sidebarLabel = isCollapsed ? 'Expand sidebar' : 'Hide sidebar';
  const shortcutLabel = isMacPlatform() ? '⌘ [' : 'Ctrl [';
  const sidebarTooltip = `${sidebarLabel} (${shortcutLabel})`;

  return (
    <Box
      as="header"
      xcss={headerStyles}
      data-catalyst-top-nav="true"
    >
      {/* LEFT: sidebar toggle + HubSwitcher + wordmark */}
      <Box xcss={leftClusterStyles}>
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
      </Box>

      {/* CENTER: Search (grows to 780px) + Create (adjacent) */}
      <Box xcss={centerStyles}>
        <Box xcss={searchWrapperStyles}>
          <GlobalSearch />
        </Box>
        <CreateDropdown />
      </Box>

      {/* RIGHT: AskCatalystPill | Notifications | Settings | Profile */}
      <Box xcss={rightClusterStyles}>
        <AskCatalystPill />
        <NotificationsPanel />
        <SettingsMenu />
        <ProfileMenu />
      </Box>
    </Box>
  );
}

export default CatalystHeader;
