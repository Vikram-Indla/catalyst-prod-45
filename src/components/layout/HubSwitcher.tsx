/**
 * HubSwitcher — App-switcher-style trigger that lives next to the top-nav
 * chevron. Hovering EITHER the chevron OR this trigger opens the left
 * sidebar in temporary peek mode (handled by CatalystShell's hover-zone
 * detection, which matches `[data-hub-switcher]`). Clicking the trigger
 * opens a small popover listing every Hub for direct navigation — separate
 * from the sidebar peek so a single click jumps to a hub without first
 * pinning the sidebar.
 *
 * Visual: Atlaskit AppSwitcher glyph (the canonical "9-dot grid" Jira uses
 * for cross-product navigation) so the affordance reads as "switch app /
 * switch hub" rather than "open menu".
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/button/new';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import HomeIcon from '@atlaskit/icon/glyph/home';
import OfficeBuildingIcon from '@atlaskit/icon/glyph/office-building';
import PortfolioIcon from '@atlaskit/icon/glyph/portfolio';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import TaskIcon from '@atlaskit/icon/glyph/task';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import BookIcon from '@atlaskit/icon/glyph/book';
import { Box, xcss } from '@atlaskit/primitives';

// Mirror of HUB_ITEMS in SidebarBase. Kept inline (not re-exported) so this
// file stays self-contained and the popover can render even when the
// sidebar chunk hasn't loaded yet.
const HUBS = [
  { label: 'Home', href: '/for-you', Icon: HomeIcon, tone: '#42526E' },
  { label: 'StrategyHub', href: '/strategyhub', Icon: OfficeBuildingIcon, tone: '#8270DB' },
  { label: 'ProductHub', href: '/producthub', Icon: PortfolioIcon, tone: '#0052CC' },
  { label: 'ProjectHub', href: '/project-hub', Icon: FolderIcon, tone: '#00A3BF' },
  { label: 'ReleaseHub', href: '/release-hub/command-center', Icon: ShipIcon, tone: '#FF8B00' },
  { label: 'TestHub', href: '/testhub/dashboard', Icon: CheckCircleIcon, tone: '#36B37E' },
  { label: 'IncidentHub', href: '/incident-hub', Icon: WarningIcon, tone: '#DE350B' },
  { label: 'TaskHub', href: '/taskhub/boards', Icon: TaskIcon, tone: '#FFAB00' },
  { label: 'PlanHub', href: '/planhub', Icon: CalendarIcon, tone: '#E774BB' },
  { label: 'WikiHub', href: '/wiki', Icon: BookIcon, tone: '#65BA43' },
] as const;

const popupStyles = xcss({
  width: '280px',
  paddingBlock: 'space.100',
});

const gridStyles = xcss({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'space.050',
  paddingInline: 'space.100',
});

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      label="Hub switcher"
      content={() => (
        <Box xcss={popupStyles}>
          <Box xcss={gridStyles}>
            {HUBS.map((hub) => {
              const active = isActive(hub.href);
              return (
                <button
                  key={hub.href}
                  type="button"
                  onClick={() => go(hub.href)}
                  className="hub-switcher-tile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    background: active ? 'rgba(9,30,66,0.06)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    color: 'var(--cp-text-primary, #172B4D)',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(9,30,66,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = active ? 'rgba(9,30,66,0.06)' : 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: hub.tone,
                    }}
                  >
                    <hub.Icon label="" size="small" primaryColor={hub.tone} />
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {hub.label}
                  </span>
                </button>
              );
            })}
          </Box>
        </Box>
      )}
      trigger={(triggerProps) => (
        // data-hub-switcher: matched by CatalystShell's hover-zone detection so
        // hovering this trigger ALSO opens the sidebar peek. Keeping the
        // attribute on the wrapper ensures the entire 32x32 hit area counts,
        // not just the inner SVG.
        <span data-hub-switcher="true" style={{ display: 'inline-flex' }}>
          <Tooltip content="Switch hub" position="bottom">
            <IconButton
              {...triggerProps}
              label="Switch hub"
              appearance="subtle"
              isSelected={open}
              onClick={() => setOpen((v) => !v)}
              icon={AppSwitcherIcon}
            />
          </Tooltip>
        </span>
      )}
    />
  );
}
