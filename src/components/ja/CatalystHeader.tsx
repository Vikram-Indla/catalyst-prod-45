import { Box, Flex, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { IconButton } from '@atlaskit/atlassian-navigation';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import MenuExpandIcon from '@atlaskit/icon/glyph/menu-expand';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useCatalystContext } from '@/contexts/CatalystContext';
import catalystBlueWordmark from '@/assets/catalyst-logo-blue-wordmark.png';

// Jira parity dimensions: header 48px, controls 32px, uploaded Catalyst wordmark 136x64 source rendered at 102x48.
const headerStyles = xcss({
  minHeight: '48px',
  height: '48px',
  paddingInline: 'space.200',
  backgroundColor: 'elevation.surface',
  borderBlockEnd: 'border.width',
  borderColor: 'color.border',
});

const productLogoStyles = xcss({
  width: '103px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();

  return (
    <Box
      as="header"
      xcss={headerStyles}
      style={{ boxShadow: token('elevation.shadow.raised', 'none') }}
      data-catalyst-top-nav="jira-parity"
    >
      <Box as="nav" aria-label="Global navigation">
        <Flex alignItems="center" gap="space.100">
          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flex: '0 0 auto' }}>
            <IconButton
              label={sidebarHidden || !sidebarExpanded ? 'Expand sidebar' : 'Collapse sidebar'}
              tooltip={sidebarHidden || !sidebarExpanded ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={cycleSidebarState}
              icon={sidebarHidden || !sidebarExpanded ? <MenuExpandIcon label="" /> : <ChevronLeftIcon label="" />}
            />
            <AppSwitcher />
            <a href="/for-you" aria-label="Catalyst home" style={{ textDecoration: 'none' }}>
              <Box xcss={productLogoStyles}>
                <img src={catalystBlueWordmark} alt="Catalyst" width="103" height="48" style={{ filter: 'saturate(1.12) contrast(1.06)' }} />
              </Box>
            </a>
          </Box>

          <Box style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: 0, marginInlineStart: token('space.200', '16px') }}>
            <GlobalSearch />
          </Box>

          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flex: '0 0 auto' }}>
            <CreateDropdown />
            <NotificationsPanel />
            <SettingsMenu />
            <ProfileMenu />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default CatalystHeader;