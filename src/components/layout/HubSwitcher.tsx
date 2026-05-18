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

const RECENT_KEY = 'catalyst-recent-hubs';
const RECENT_MAX = 3;

/**
 * Hubs excluded from the Recent list.
 *
 * `home` is the ambient state every user returns to — having it occupy
 * one of the 3 Recent slots wastes the slot on a non-informational signal
 * (design-critique 2026-05-17 H8 P0). The Home hub is always one tap away
 * via the app's home affordance, so it never needs to be a Recent shortcut.
 */
const RECENT_EXCLUDE = new Set(['home']);

function readRecentHubs(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Filter at READ time too — pre-existing localStorage that already
    // contains "home" would otherwise persist across the fix until the
    // user visits 3 non-home hubs. Read-time exclusion makes the change
    // visible on next page load.
    return Array.isArray(list)
      ? list.filter((x) => typeof x === 'string' && !RECENT_EXCLUDE.has(x))
      : [];
  } catch {
    return [];
  }
}

function recordRecentHub(key: string) {
  // Don't record excluded hubs — keeps the store clean from this point on.
  if (RECENT_EXCLUDE.has(key)) return;
  try {
    const prev = readRecentHubs().filter((k) => k !== key);
    const next = [key, ...prev].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be unavailable in private mode — silent fail */
  }
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { HubIcon, type HubName } from '@/components/navigation/HubIcon';

type SectionKey = 'discover' | 'build_ship' | 'knowledge';

interface HubEntry {
  key: HubName;
  label: string;
  href: string;
  section: SectionKey;
  /** ADS accent token suffix — drives both tile bg and glyph color. */
  tone:
    | 'blue'
    | 'purple'
    | 'orange'
    | 'teal'
    | 'green'
    | 'magenta'
    | 'lime'
    | 'red'
    | 'yellow'
    | 'gray';
  /** Keyboard shortcut suffix bound to Cmd/Ctrl. '1'–'9', '0', '-'. */
  shortcut: string;
}

const HUBS: HubEntry[] = [
  { key: 'home',     label: 'Home',     href: '/home',                   section: 'discover',   tone: 'blue',    shortcut: '1' },
  { key: 'strategy', label: 'Strategy', href: '/strategy',               section: 'discover',   tone: 'purple',  shortcut: '2' },
  { key: 'ideation', label: 'Ideation', href: '/ideation/backlog',       section: 'discover',   tone: 'orange',  shortcut: '3' },
  { key: 'product',  label: 'Product',  href: '/product',                section: 'build_ship', tone: 'teal',    shortcut: '4' },
  { key: 'project',  label: 'Project',  href: '/project',                section: 'build_ship', tone: 'green',   shortcut: '5' },
  { key: 'release',  label: 'Release',  href: '/release/command-center', section: 'build_ship', tone: 'magenta', shortcut: '6' },
  { key: 'test',     label: 'Test',     href: '/test/dashboard',         section: 'build_ship', tone: 'lime',    shortcut: '7' },
  { key: 'incident', label: 'Incident', href: '/incident',               section: 'build_ship', tone: 'red',     shortcut: '8' },
  { key: 'task',     label: 'Task',     href: '/task/boards',            section: 'build_ship', tone: 'yellow',  shortcut: '9' },
  { key: 'plan',     label: 'Plan',     href: '/plan',                   section: 'build_ship', tone: 'gray',    shortcut: '0' },
  { key: 'wiki',     label: 'Wiki',     href: '/wiki',                   section: 'knowledge',  tone: 'gray',    shortcut: '-' },
];

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'discover',   title: 'Discover' },
  { key: 'build_ship', title: 'Build & Ship' },
  { key: 'knowledge',  title: 'Knowledge' },
];

// Phase A (council 2026-05-08): bump default tier from `-subtler` → `-subtle`.
// `-subtler` was too pale to carry information — Project / Test / Plan tiles
// read as transparent. `-subtle` is the next ADS step up, still canonical,
// noticeably more saturated. Wiki keeps `-subtler` so it stays distinguishable
// from Plan (both share the gray family — only one of two hubs that shares
// since the ADS accent palette is 10 tokens vs 11 hubs).
const toneToTileBg = (tone: HubEntry['tone'], hubKey: HubEntry['key']) => {
  if (hubKey === 'wiki') return 'var(--ds-background-accent-gray-subtler)';
  return `var(--ds-background-accent-${tone}-subtle)`;
};
const toneToGlyphColor = (tone: HubEntry['tone'], hubKey: HubEntry['key']) => {
  if (hubKey === 'wiki') return 'var(--ds-text-subtle)';
  return `var(--ds-text-accent-${tone})`;
};

interface HubTileProps {
  hub: HubEntry;
}

function HubTile({ hub }: HubTileProps) {
  return (
    <span
      data-hub-tile={hub.key}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 6,
        background: toneToTileBg(hub.tone, hub.key),
        color: toneToGlyphColor(hub.tone, hub.key),
        flexShrink: 0,
      }}
    >
      <HubIcon name={hub.key} size={20} />
    </span>
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
  // Lazy-init reads localStorage once on mount — tests that pre-seed the
  // store before render see the recents immediately, no useEffect timing.
  const [recentKeys, setRecentKeys] = useState<string[]>(() => readRecentHubs());
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();
  const searchRef = useRef<HTMLInputElement>(null);

  // Re-read recents whenever the popover re-opens — keeps the list fresh
  // across cross-tab updates without polling. Also clears the query.
  useEffect(() => {
    if (open) {
      setRecentKeys(readRecentHubs());
      setQuery('');
    }
  }, [open]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const shortcutNavigate = useCallback(
    (href: string) => {
      if (href !== '/home') {
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
    recordRecent: recordRecentHub,
  });

  const handleNavClick = (e: ReactMouseEvent<HTMLElement>, hub: HubEntry) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    recordRecentHub(hub.key);
    setOpen(false);
    if (hub.href !== '/home') {
      setSidebarHidden(false);
      setSidebarExpanded(true);
      setSidebarPinned(true);
    }
    navigate(hub.href);
  };

  const hubsByKey = useMemo(() => {
    const map = new Map<string, HubEntry>();
    for (const h of HUBS) map.set(h.key, h);
    return map;
  }, []);

  const normalisedQuery = query.trim().toLowerCase();
  const matches = (hub: HubEntry) =>
    !normalisedQuery || hub.label.toLowerCase().includes(normalisedQuery);

  const recentHubs: HubEntry[] = recentKeys
    .map((k) => hubsByKey.get(k))
    .filter((h): h is HubEntry => Boolean(h && matches(h)))
    .slice(0, RECENT_MAX);

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
                color: 'var(--cp-text-secondary, #44546F)',
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
          background: 'var(--ds-surface-overlay, #FFFFFF)',
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
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
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
              color: 'var(--ds-text, #172B4D)',
            }}
          />
        </div>

        <MenuGroup>
          {recentHubs.length > 0 && (
            <Section title="Recent">
              {recentHubs.map((hub) => (
                <LinkItem
                  key={`recent-${hub.key}`}
                  href={hub.href}
                  isSelected={isActive(hub.href)}
                  iconBefore={<HubTile hub={hub} />}
                  onClick={(e) => handleNavClick(e, hub)}
                >
                  {hub.label}
                </LinkItem>
              ))}
            </Section>
          )}

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
                    iconBefore={<HubTile hub={hub} />}
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
