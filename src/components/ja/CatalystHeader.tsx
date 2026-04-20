import { Box, Flex, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
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
  width: '102px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

export function CatalystHeader() {
  return (
    <Box
      as="header"
      xcss={headerStyles}
      style={{ boxShadow: token('elevation.shadow.raised', 'none') }}
      data-catalyst-top-nav="jira-parity"
    >
      <Box as="nav" aria-label="Global navigation">
        <Flex alignItems="center" justifyContent="space-between" gap="space.300">
          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flex: '0 0 auto' }}>
            <AppSwitcher />
            <a href="/for-you" aria-label="Catalyst home" style={{ textDecoration: 'none' }}>
              <Box xcss={productLogoStyles}>
                <img src={catalystBlueWordmark} alt="Catalyst" width="102" height="48" />
              </Box>
            </a>
          </Box>

          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 auto', minWidth: 0 }}>
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