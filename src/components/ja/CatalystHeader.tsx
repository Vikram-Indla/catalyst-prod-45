import { Box, Flex, Text, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import catalystLogoMark2 from '@/assets/catalyst-logo-mark-2.svg';

// Jira parity dimensions: header 48px, controls 32px, product mark 32px, inner glyph 24px.
const headerStyles = xcss({
  minHeight: '48px',
  height: '48px',
  paddingInline: 'space.200',
  backgroundColor: 'elevation.surface',
  borderBlockEnd: 'border.width',
  borderColor: 'color.border',
});

const productMarkStyles = xcss({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
          <Flex alignItems="center" gap="space.100" grow="hug">
            <AppSwitcher />
            <Box as="a" href="/for-you" xcss={productMarkStyles} aria-label="Catalyst home">
              <img src={catalystLogoMark2} alt="" width="24" height="24" />
            </Box>
            <Box as="a" href="/for-you" style={{ textDecoration: 'none' }}>
              <Text size="medium" weight="semibold" color="color.text">Catalyst</Text>
            </Box>
          </Flex>

          <Flex alignItems="center" justifyContent="center" grow="fill">
            <GlobalSearch />
          </Flex>

          <Flex alignItems="center" gap="space.100" grow="hug">
            <CreateDropdown />
            <NotificationsPanel />
            <SettingsMenu />
            <ProfileMenu />
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}

export default CatalystHeader;