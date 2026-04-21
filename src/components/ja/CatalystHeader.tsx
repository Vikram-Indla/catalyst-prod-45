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
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
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
//
// Responsive collapse tiers (Jira parity — via useNavBreakpoint):
//  - ≥1280 (default):  all full-width pills + labels.
//  - <1280 (compact):  AskCatalystPill collapses to icon-only.
//  - <1024 (narrow):   CreateDropdown collapses to "+" icon, GlobalSearch
//                      collapses to a magnifying-glass toggle (click expands
//                      over the search region). Help icon hides — it lives
//                      inside the SettingsMenu already.
//  - <768  (mobile):   MobileNavigationMenu / MobileBottomNav take over.
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

// Jira parity: search sits left-of-center with a fixed max-width at desktop,
// and drops to a zero-width icon slot at narrow widths (the search component
// itself renders as an icon in that mode).
//
// IMPORTANT: the search region is a FIXED-WIDTH slot — it never grows past
// 680px and never owns the leftover row width. A dedicated spacer AFTER the
// search consumes the rest of the row, pinning the right cluster to the
// trailing edge at every viewport. Previously the right cluster floated
// mid-nav with dead space to its right at widths > ~1300px (Vikram flagged:
// "crystal clear that top nav is wrong in terms of icons spacing").
const searchRegionStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flex: '0 1 680px',
  minWidth: 0,
  maxWidth: '680px',
  marginInlineStart: 'space.800',
  marginInlineEnd: 'space.200',
});

const searchRegionNarrowStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flex: '0 0 auto',
  marginInlineStart: 'space.200',
  marginInlineEnd: 'space.100',
});

// Spacer — rendered in every mode. Eats remaining row space so the right
// cluster always hugs the trailing edge.
const spacerStyles = xcss({
  flex: '1 1 auto',
  minWidth: 0,
});

export function CatalystHeader() {
  const { sidebarExpanded, sidebarHidden, cycleSidebarState } = useCatalystContext();
  const isCollapsed = sidebarHidden || !sidebarExpanded;
  const { isCompact, isNarrow } = useNavBreakpoint();

  return (
    <Box
      as="header"
      xcss={headerStyles}
      style={{ boxShadow: token('elevation.shadow.raised', 'none') }}
      data-catalyst-top-nav="jira-parity"
      data-nav-breakpoint={isNarrow ? 'narrow' : isCompact ? 'compact' : 'default'}
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

          {/* Search — full bar at ≥1024, icon-toggle at <1024. Spacer after
              either variant pushes the right cluster to the trailing edge. */}
          {isNarrow ? (
            <Box xcss={searchRegionNarrowStyles}>
              <GlobalSearch collapsed />
            </Box>
          ) : (
            <Box xcss={searchRegionStyles}>
              <GlobalSearch />
            </Box>
          )}
          <Box xcss={spacerStyles} />

          {/* Right cluster: Create | Ask Catalyst | Bell | Help | Settings | Avatar */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px'), flex: '0 0 auto' }}>
            <CreateDropdown iconOnly={isNarrow} />
            <AskCatalystPill iconOnly={isCompact} />
            <NotificationsPanel />
            {!isNarrow && (
              <IconButton
                label="Help"
                appearance="subtle"
                icon={QuestionCircleIcon}
                onClick={() => window.open('/wiki', '_self')}
              />
            )}
            <SettingsMenu />
            <ProfileMenu />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default CatalystHeader;
