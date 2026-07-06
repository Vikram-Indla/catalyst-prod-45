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
import { useModuleAccess } from '@/hooks/useModuleAccess';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCatalystContext } from '@/contexts/CatalystContext';
import type { HubKey } from '@/components/icons';
import { HUB_ICON_REGISTRY } from '@/components/icons';
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
  /** admin_nav_modules.module_key used for role-based visibility (useModuleAccess). Mirrors MobileNavigationMenu HUB_ITEMS. */
  moduleKey: string;
}

interface DeprecatedHubEntry extends HubEntry {
  /** Mark as deprecated and non-navigable (dead option) */
  deprecated?: boolean;
}

const HUBS: DeprecatedHubEntry[] = [
  { key: 'home',     label: 'Home',     href: '/for-you',                    section: 'discover',   tone: 'blue',    shortcut: '1', moduleKey: 'home' },
  { key: 'strategy', label: 'Strategy', href: '/strategyhub',                section: 'discover',   tone: 'gray',    shortcut: '2', moduleKey: 'enterprise', deprecated: true },
  { key: 'ideation', label: 'Ideation', href: '/ideation/backlog',           section: 'discover',   tone: 'gray',    shortcut: '3', moduleKey: 'product', deprecated: true },
  { key: 'product',  label: 'Product',  href: '/product-hub',                section: 'build_ship', tone: 'teal',    shortcut: '4', moduleKey: 'product' },
  { key: 'project',  label: 'Project',  href: '/project-hub',                section: 'build_ship', tone: 'green',   shortcut: '5', moduleKey: 'workhub' },
  { key: 'release',  label: 'Release',  href: '/release-hub/overview', section: 'build_ship', tone: 'magenta', shortcut: '6', moduleKey: 'releases' },
  { key: 'test',     label: 'Test',     href: '/testhub/dashboard',          section: 'build_ship', tone: 'lime',    shortcut: '7', moduleKey: 'testhub' },
  { key: 'incident', label: 'Incident', href: '/incident-hub',               section: 'build_ship', tone: 'red',     shortcut: '8', moduleKey: 'operations' },
  { key: 'task',     label: 'Tasks',    href: '/tasks/overview',             section: 'build_ship', tone: 'yellow',  shortcut: '9', moduleKey: 'planner' },
  { key: 'plan',     label: 'Plan',     href: '/planhub',                    section: 'build_ship', tone: 'gray',    shortcut: '0', moduleKey: 'planner', deprecated: true },
  { key: 'docex',    label: 'Folio',    href: '/folio',                      section: 'knowledge',  tone: 'blue',    shortcut: '-', moduleKey: 'docex' },
];

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'discover',   title: 'Discover' },
  { key: 'build_ship', title: 'Build & Ship' },
  { key: 'knowledge',  title: 'Knowledge' },
];


function LockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

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
      {/* Explicit readable color: Atlaskit LinkItem was rendering the label at
          ~7% alpha (rgba(206,206,217,0.07)) in dark mode → invisible. Force the
          theme-aware text token so labels are readable in light AND dark. */}
      <span data-hub-label={hub.key} style={{ color: 'var(--ds-text)' }}>{hub.label}</span>
      <span
        data-hub-shortcut={hub.key}
        style={{
          fontSize: 'var(--ds-font-size-100)',
          color: 'var(--ds-text-subtlest)',
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
  const { canViewInNav, isLoading: accessLoading } = useModuleAccess();
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

  // A hub is accessible when the user's role(s)/override grant it (or while
  // access is still loading, to avoid a flash). Inaccessible hubs are still
  // SHOWN (grayed-out) so users always see the full Catalyst catalogue.
  const isAccessible = (hub: HubEntry) => accessLoading || canViewInNav(hub.moduleKey);

  const shortcutTargets = useMemo(
    () => HUBS.filter((h) => accessLoading || canViewInNav(h.moduleKey)).map((h) => ({ key: h.shortcut, hubKey: h.key, href: h.href })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessLoading, canViewInNav],
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

  // Show ALL hubs (subject only to the search filter) — the full module
  // catalogue is always visible; inaccessible hubs render grayed-out below.
  const hubsBySection = (key: SectionKey) =>
    HUBS.filter((h) => h.section === key && matches(h));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* Suppress the tooltip while the menu is open — otherwise the
          position="bottom" tooltip renders over the dropdown's search row and
          clips the "Search hubs" placeholder to "h hubs". Empty content =
          no tooltip popup. */}
      <Tooltip content={open ? '' : 'Switch hub'} position="bottom">
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
                  ? 'var(--ds-background-neutral-pressed)'
                  : 'transparent',
                cursor: 'pointer',
                color: 'var(--ds-icon)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!open)
                  e.currentTarget.style.background =
                    'var(--ds-background-neutral-subtle-hovered)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = open
                  ? 'var(--ds-background-neutral-pressed)'
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
        className="z-[1000]"
        style={{
          width: 343,
          background: 'var(--ds-surface-overlay)',
          border: '1px solid var(--ds-border)',
          boxShadow: 'var(--ds-shadow-overlay)',
          borderRadius: 8,
          padding: 0,
          maxHeight: 'none',
          overflow: 'visible',
        }}
      >
        <style>{`
          [data-hub-switcher-section] [class*="SectionTitle"] {
            color: var(--ds-text-subtle) !important;
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <span style={{ color: 'var(--ds-text-subtlest)', display: 'inline-flex' }}>
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
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
            }}
          />
        </div>

        <MenuGroup data-hub-switcher-section>
          {SECTIONS.map(({ key, title }) => {
            const rows = hubsBySection(key);
            if (rows.length === 0) return null;
            return (
              <Section key={key} title={title}>
                {rows.map((hub) => {
                  // Deprecated hub: visually identical to active rows — dead CTA, ships within 1 week.
                  if (hub.deprecated) {
                    return (
                      <LinkItem
                        key={hub.key}
                        href={hub.href}
                        isDisabled
                        iconBefore={
                          <img
                            src={HUB_ICON_REGISTRY[hub.key]}
                            alt={hub.label}
                            style={{ width: 24, height: 24, display: 'block' }}
                          />
                        }
                      >
                        <HubRowLabel hub={hub} />
                      </LinkItem>
                    );
                  }
                  // Inaccessible hub: shown but grayed-out, non-navigable, locked.
                  if (!isAccessible(hub)) {
                    return (
                      <div
                        key={hub.key}
                        role="menuitem"
                        aria-disabled="true"
                        data-hub-locked={hub.key}
                        title="You don't have access to this module — ask an admin"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          cursor: 'not-allowed',
                          opacity: 0.55,
                          userSelect: 'none',
                          borderRadius: 4,
                          background: 'var(--ds-surface)',
                          border: '1px solid var(--ds-border)',
                          boxShadow: 'var(--ds-shadow-raised)',
                          marginBottom: 4,
                          outline: 'none',
                        }}
                      >
                        <img
                          src={HUB_ICON_REGISTRY[hub.key]}
                          alt={hub.label}
                          style={{ width: 24, height: 24, display: 'block', filter: 'grayscale(1)' }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 1 }}>
                          <span data-hub-label={hub.key} style={{ color: 'var(--ds-text-subtlest)' }}>{hub.label}</span>
                          <span data-hub-locked-icon={hub.key} style={{ color: 'var(--ds-text-subtlest)', display: 'inline-flex' }}>
                            <LockGlyph />
                          </span>
                        </span>
                      </div>
                    );
                  }
                  return (
                    <LinkItem
                      key={hub.key}
                      href={hub.href}
                      isSelected={isActive(hub.href)}
                      iconBefore={
                        <img
                          src={HUB_ICON_REGISTRY[hub.key]}
                          alt={hub.label}
                          style={{
                            width: 24,
                            height: 24,
                            display: 'block',
                          }}
                        />
                      }
                      onClick={(e) => handleNavClick(e, hub)}
                    >
                      <HubRowLabel hub={hub} />
                    </LinkItem>
                  );
                })}
              </Section>
            );
          })}
        </MenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
