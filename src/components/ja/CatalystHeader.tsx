import { Box, Flex, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { IconButton } from '@atlaskit/button/new';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import MenuExpandIcon from '@atlaskit/icon/glyph/menu-expand';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { AskCatalystPill } from '@/components/layout/AskCatalystPill';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useCatalystContext } from '@/contexts/CatalystContext';
import catalystBlueWordmark from '@/assets/catalyst-logo-blue-wordmark.png';

// Jira parity dimensions:
//  - Header: 48px tall (compact mode — Jira uses 56, we run slightly tighter)
//  - Controls (icon buttons): 32px square, 16px icons
//  - Wordmark: rendered at 24px tall, aspect-preserved (source is 136x64 → 51x24).
//    Previously 103x48 which made the mark fill the entire header top-to-bottom,
//    the "beaten apart" look Vikram flagged on 2026-04-21.
//  - Search: fixed max-width 680px centered in the flex region so it doesn't
//    bleed across the whole viewport at 1920 (was w=1629px before).
const headerStyles = xcss({
  minHeight: '48px',
  height: '48px',
  paddingInline: 'space.200',
  backgroundColor: 'elevation.surface',
  borderBlockEnd: 'border.width',
  borderColor: 'color.border',
});

const productLogoStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

// Jira parity: search sits left-of-center with a fixed max-width (~720px).
// The remaining space becomes a flexible spacer that pushes the right-hand
// action cluster (Ask, Bell, Help, Settings, Avatar) to the far edge — this
// is what gives Jira's top-nav its characteristic "search left, controls far
// right" feel that Catalyst was missing.
const searchRegionStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  maxWidth: '720px',
  minWidth: '0',
  marginInlineStart: 'space.200',
});

const flexSpacerStyles = xcss({
  flex: '1 1 auto',
  minWidth: 'space.200',
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
              appearance="subtle"
              onClick={cycleSidebarState}
              icon={sidebarHidden || !sidebarExpanded ? MenuExpandIcon : ChevronLeftIcon}
            />
            <AppSwitcher />
            <a href="/for-you" aria-label="Catalyst home" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              <Box xcss={productLogoStyles}>
                <img
                  src={catalystBlueWordmark}
                  alt="Catalyst"
                  height={24}
                  style={{ height: '24px', width: 'auto', display: 'block', filter: 'saturate(1.12) contrast(1.06)' }}
                />
              </Box>
            </a>
          </Box>

          <Box xcss={searchRegionStyles}>
            <GlobalSearch />
          </Box>

          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px'), flex: '0 0 auto' }}>
            <AskCatalystPill />
            <CreateDropdown />
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
