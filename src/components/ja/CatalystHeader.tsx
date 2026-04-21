import { Box, Flex, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { IconButton } from '@atlaskit/button/new';
import SidebarExpandIcon from '@atlaskit/icon/core/sidebar-expand';
import SidebarCollapseIcon from '@atlaskit/icon/core/sidebar-collapse';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { AskCatalystPill } from '@/components/layout/AskCatalystPill';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useCatalystContext } from '@/contexts/CatalystContext';
import catalystWordmark from '@/assets/catalyst-wordmark-3.svg';

// Jira parity dimensions:
//  - Header: 48px tall, content flex-centered vertically (no top-hug).
//  - Controls (icon buttons): 32px square, 16px icons, 3px radius.
//  - Wordmark: SVG at 28px tall, aspect-preserved (native 320x80 → 112x28).
//    Previously a downsampled PNG (246x84 → 70x24, ~3.5x downscale) which
//    Vikram flagged as "dying with dilute" — PNG text legibility collapses
//    below 1x density. SVG renders crisp at any size.
//  - First two icons use @atlaskit/icon/core (Jira's modern glyph set):
//    * sidebar-expand / sidebar-collapse (panel icon, not hamburger)
//    * AppSwitcher internally uses core/app-switcher (2x2 grid, not 3x3 dots)
//  - Sidebar now uses a 2-state toggle (expanded ↔ hidden); `isCollapsed`
//    covers both "hidden" and the legacy 56px rail so the icon still flips
//    correctly.
const headerStyles = xcss({
  minHeight: '48px',
  height: '48px',
  paddingInline: 'space.200',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'elevation.surface',
  borderBlockEnd: 'border.width',
  borderColor: 'color.border',
});

const navStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  height: '100%',
});

const flexRowStyles = xcss({
  width: '100%',
});

const productLogoStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

// Jira parity: search sits left-of-center with a fixed max-width.
// The remaining space becomes a flexible spacer that pushes the right-hand
// action cluster (Create, Ask, Bell, Help, Settings, Avatar) to the far edge —
// this is what gives Jira's top-nav its characteristic "search left, controls
// far right" feel that Catalyst was missing.
const searchRegionStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flex: '1 1 auto',
  minWidth: 0,
  maxWidth: '680px',
  marginInlineStart: 'space.800',
  marginInlineEnd: 'space.200',
});

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;

  return (
    <Box
      as="header"
      xcss={headerStyles}
      style={{ boxShadow: token('elevation.shadow.raised', 'none') }}
      data-catalyst-top-nav="jira-parity"
    >
      <Box as="nav" xcss={navStyles} aria-label="Global navigation">
        <Flex alignItems="center" gap="space.100" xcss={flexRowStyles}>
          {/* Left cluster: sidebar toggle + app switcher + wordmark */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flex: '0 0 auto' }}>
            <IconButton
              label={isCollapsed ? 'Expand sidebar' : 'Hide sidebar'}
              appearance="subtle"
              onClick={cycleSidebarState}
              icon={isCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
            />
            <AppSwitcher />
            <a
              href="/for-you"
              aria-label="Catalyst home"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              <Box xcss={productLogoStyles}>
                <img
                  src={catalystWordmark}
                  alt="Catalyst"
                  height={28}
                  style={{ height: '28px', width: 'auto', display: 'block' }}
                />
              </Box>
            </a>
          </Box>

          {/* Search — fixed max-width, left-of-center */}
          <Box xcss={searchRegionStyles}>
            <GlobalSearch />
          </Box>

          {/* Right cluster: Create | Ask Catalyst | Bell | Help | Settings | Avatar */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px'), flex: '0 0 auto' }}>
            <CreateDropdown />
            <AskCatalystPill />
            <NotificationsPanel />
            <IconButton
              label="Help"
              appearance="subtle"
              icon={QuestionCircleIcon}
              onClick={() => window.open('/wiki', '_self')}
            />
            <SettingsMenu />
            <ProfileMenu />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default CatalystHeader;
