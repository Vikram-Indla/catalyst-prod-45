/**
 * HubSwitcher — Atlassian-app-switcher-parity popover.
 *
 * 2026-05-08 rewrite (council-pass):
 *   - Rows migrated from custom <button>+CSS to @atlaskit/menu LinkItem.
 *   - LinkItem renders <a href> for native middle-click / Cmd-click / "open
 *     in new tab" semantics; click handler intercepts plain clicks for SPA
 *     navigation and preserves sidebar pin behaviour.
 *   - Atlaskit primitives (MenuGroup + Section + LinkItem with iconBefore)
 *     drive the active state via `isSelected`; LinkItem itself renders
 *     `aria-current="page"` when selected (no manual accent bar).
 *   - "Hub" suffix dropped from labels; description column dropped.
 *   - Glyphs from @atlaskit/icon/glyph/* (verified against v24.1.1 install).
 *   - Popover dimensions match probed Atlassian baseline (343px, 8px radius).
 *
 * Shell remains Radix DropdownMenu — @atlaskit/popup v4.16 has the empty-
 * portal bug noted in CLAUDE.md (2026-04-28).
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react';
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import { MenuGroup, LinkItem, Section } from '@atlaskit/menu';
import HomeIcon from '@atlaskit/icon/glyph/home';
import BoardIcon from '@atlaskit/icon/glyph/board';
import LightbulbIcon from '@atlaskit/icon/glyph/lightbulb';
import MarketplaceIcon from '@atlaskit/icon/glyph/marketplace';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import DocumentIcon from '@atlaskit/icon/glyph/document';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCatalystContext } from '@/contexts/CatalystContext';

type GlyphComponent = ComponentType<{ label: string; primaryColor?: string }>;

interface HubEntry {
  label: string;
  href: string;
  Icon: GlyphComponent;
}

// Verified against @atlaskit/icon v24.1.1 (2026-05-08). Glyph mapping locked
// by council pass: marketplace covers the original "package" intent for
// Product, ship covers the "shipping" intent for Release.
const HUBS: HubEntry[] = [
  { label: 'Home',     href: '/for-you',                    Icon: HomeIcon },
  { label: 'Strategy', href: '/strategyhub',                Icon: BoardIcon },
  { label: 'Ideation', href: '/ideation/backlog',           Icon: LightbulbIcon },
  { label: 'Product',  href: '/product-hub',                Icon: MarketplaceIcon },
  { label: 'Project',  href: '/project-hub',                Icon: FolderIcon },
  { label: 'Release',  href: '/release-hub/command-center', Icon: ShipIcon },
  { label: 'Test',     href: '/testhub/dashboard',          Icon: CheckCircleOutlineIcon },
  { label: 'Incident', href: '/incident-hub',               Icon: WarningIcon },
  { label: 'Task',     href: '/taskhub/boards',             Icon: CheckIcon },
  { label: 'Plan',     href: '/planhub',                    Icon: CalendarIcon },
  { label: 'Wiki',     href: '/wiki',                       Icon: DocumentIcon },
];

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const handleNavClick = (e: ReactMouseEvent<HTMLElement>, href: string) => {
    // Honour browser shortcuts: Cmd/Ctrl-click, Shift-click, middle-click
    // open in new tab/window. Only intercept plain primary-button clicks
    // for SPA navigation.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false);
    if (href !== '/for-you') {
      setSidebarHidden(false);
      setSidebarExpanded(true);
      setSidebarPinned(true);
    }
    navigate(href);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip content="Switch hub" position="bottom">
        {(tooltipProps) => (
          <DropdownMenuTrigger asChild>
            <button
              {...tooltipProps}
              type="button"
              data-hub-switcher="true"
              aria-label="Switch hub"
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 3,
                background: open
                  ? 'var(--ds-background-neutral-pressed, rgba(9,30,66,0.14))'
                  : 'transparent',
                cursor: 'pointer',
                color: 'var(--cp-text-secondary, #44546F)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!open) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = open
                  ? 'var(--ds-background-neutral-pressed, rgba(9,30,66,0.14))'
                  : 'transparent';
              }}
            >
              <AppSwitcherIcon label="" color="currentColor" />
            </button>
          </DropdownMenuTrigger>
        )}
      </Tooltip>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        alignOffset={-8}
        avoidCollisions={false}
        className="z-[1000] p-0"
        // Dimensions match the live probe of Atlassian's "Switch sites or
        // apps" panel (digital-transformation.atlassian.net 2026-05-08):
        // 343px wide, 8px radius, ADS surface-overlay, no manual border.
        style={{
          width: 343,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          borderRadius: 8,
          fontFamily: 'var(--cp-font-body)',
          padding: 0,
          maxHeight: 'none',
          overflow: 'visible',
        }}
      >
        <MenuGroup>
          <Section>
            {HUBS.map(({ label, href, Icon }) => (
              <LinkItem
                key={href}
                href={href}
                isSelected={isActive(href)}
                iconBefore={<Icon label="" />}
                onClick={(e) => handleNavClick(e, href)}
              >
                {label}
              </LinkItem>
            ))}
          </Section>
        </MenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
