// @ts-nocheck
/**
 * HubSwitcher v2 — sectioned popover with bespoke colored hub tiles.
 *
 * 2026-05-08 (Step 7.2, council-pass v2):
 *   The grid icon opens a structured popover (not the global search
 *   palette — that stays on Cmd+K and the top-bar Search bar). The
 *   popover renders 11 hubs grouped by SDLC phase:
 *     DISCOVER     → Home, Strategy, Ideation
 *     BUILD & SHIP → Product, Project, Release, Test, Incident, Task, Plan
 *     KNOWLEDGE    → Wiki
 *
 *   Each row carries a 32x32 colored tile (ADS accent token), a bespoke
 *   24x24 hub glyph (HubIcon), the bare label (no "Hub" suffix), and on
 *   the active row Atlaskit's LinkItem renders aria-current="page".
 *
 *   Future steps wired by the same component:
 *     7.3 — Recent + search-to-filter
 *     7.4 — ⌘1–⌘0 shortcut chips
 *
 *   Shell stays Radix DropdownMenu (Atlaskit popup empty-portal bug,
 *   CLAUDE.md 2026-04-28).
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { MenuGroup, LinkItem, Section } from '@atlaskit/menu';
import { useHubShortcuts } from '@/hooks/useHubShortcuts';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { HubIcon } from '@/components/navigation/HubIcon';
import type { HubKey } from '@/components/icons';
import type { HubTone } from '@/lib/hub-tone';

type SectionKey = 'discover' | 'build_ship' | 'knowledge';

interface HubEntry {
  key: HubKey;
  label: string;
  href: string;
  section: SectionKey;
  tone: HubTone;
  /** Keyboard shortcut suffix bound to Cmd/Ctrl. '1'–'9', '0', '-'. */
  shortcut: string;
}

const HUBS: HubEntry[] = [
  { key: 'home',     label: 'Home',     href: '/for-you',                    section: 'discover',   tone: 'blue',    shortcut: '1' },
  { key: 'strategy', label: 'Strategy', href: '/strategyhub',                section: 'discover',   tone: 'purple',  shortcut: '2' },
  { key: 'ideation', label: 'Ideation', href: '/ideation/backlog',           section: 'discover',   tone: 'orange',  shortcut: '3' },
  { key: 'product',  label: 'Product',  href: '/product-hub',                section: 'build_ship', tone: 'teal',    shortcut: '4' },
  { key: 'project',  label: 'Project',  href: '/project-hub',                section: 'build_ship', tone: 'green',   shortcut: '5' },
  { key: 'release',  label: 'Release',  href: '/release-hub/command-center', section: 'build_ship', tone: 'magenta', shortcut: '6' },
  { key: 'test',     label: 'Test',     href: '/testhub/dashboard',          section: 'build_ship', tone: 'lime',    shortcut: '7' },
  { key: 'incident', label: 'Incident', href: '/incident-hub',               section: 'build_ship', tone: 'red',     shortcut: '8' },
  { key: 'task',     label: 'Tasks',    href: '/tasks/board',                section: 'build_ship', tone: 'yellow',  shortcut: '9' },
  { key: 'plan',     label: 'Plan',     href: '/planhub',                    section: 'build_ship', tone: 'gray',    shortcut: '0' },
  { key: 'wiki',     label: 'Wiki',     href: '/wiki',                       section: 'knowledge',  tone: 'gray',    shortcut: '-' },
];

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'discover',   title: 'Discover' },
  { key: 'build_ship', title: 'Build & Ship' },
  { key: 'knowledge',  title: 'Knowledge' },
];


function HubRowLabel({ hub }: { hub: HubEntry }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flex: 1,
      }}
    >
      <span data-hub-label={hub.key}>{hub.label}</span>
      <span
        data-hub-shortcut={hub.key}
        style={{
          fontSize: 11,
          color: 'var(--ds-text-subtlest, #626F86)',
          fontFamily: 'var(--ds-font-family-code, ui-monospace, SFMono-Regular, monospace)',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        ⌘{hub.shortcut}
      </span>
    </span>
  );
}

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const shortcutNavigate = useCallback(
    (href: string) => {
      if (href !== '/for-you') {
        setSidebarHidden(false);
        setSidebarExpanded(true);
        setSidebarPinned(true);
      }
      navigate(href);
      setOpen(false);
    },
    [navigate, setSidebarHidden, setSidebarExpanded, setSidebarPinned],
  );

  const shortcutTargets = useMemo(
    () => HUBS.map((h) => ({ key: h.shortcut, hubKey: h.key, href: h.href })),
    [],
  );

  useHubShortcuts({
    targets: shortcutTargets,
    navigate: shortcutNavigate,
    recordRecent: () => {},
  });

  const handleNavClick = (e: ReactMouseEvent<HTMLElement>, hub: HubEntry) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false);
    if (hub.href !== '/for-you') {
      setSidebarHidden(false);
      setSidebarExpanded(true);
      setSidebarPinned(true);
    }
    navigate(hub.href);
  };

  const normalisedQuery = query.trim().toLowerCase();
  const matches = (hub: HubEntry) =>
    !normalisedQuery || hub.label.toLowerCase().includes(normalisedQuery);

  const hubsBySection = (key: SectionKey) =>
    HUBS.filter((h) => h.section === key && matches(h));

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
                color: 'var(--cp-text-secondary, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!open)
                  e.currentTarget.style.background =
                    'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
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
        style={{
          width: 343,
          background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          borderRadius: 8,
          padding: 0,
          maxHeight: 'none',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderBottom: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
          }}
        >
          <span style={{ color: 'var(--ds-text-subtlest, #626F86)', display: 'inline-flex' }}>
            <SearchIcon label="" size="small" />
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hubs"
            aria-label="Search hubs"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
            }}
          />
        </div>

        <MenuGroup>
          {SECTIONS.map(({ key, title }) => {
            const rows = hubsBySection(key);
            if (rows.length === 0) return null;
            return (
              <Section key={key} title={title}>
                {rows.map((hub) => (
                  <LinkItem
                    key={hub.key}
                    href={hub.href}
                    isSelected={isActive(hub.href)}
                    iconBefore={
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 6,
                          background: `var(--ds-background-accent-${hub.tone}-subtler, transparent)`,
                          color: `var(--ds-text-accent-${hub.tone}, #172B4D)`,
                        }}
                      >
                        <HubIcon name={hub.key as any} size={24} />
                      </div>
                    }
                    onClick={(e) => handleNavClick(e, hub)}
                  >
                    <HubRowLabel hub={hub} />
                  </LinkItem>
                ))}
              </Section>
            );
          })}
        </MenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
