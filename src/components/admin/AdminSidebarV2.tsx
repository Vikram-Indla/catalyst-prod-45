/**
 * AdminSidebarV2 — Admin navigation rail, ADS-grade.
 *
 * Built on @atlaskit/side-navigation primitives (SideNavigation,
 * NavigationHeader, NavigationContent, Section, ButtonItem, LinkItem) so the
 * surface matches every other Atlassian product's settings rail out of the
 * box: ADS-native typography, hover/focus rings, dark mode, and ARIA
 * semantics — no hand-rolled CSS chrome.
 *
 * Contracts pinned by:
 *  - admin-sidebar-single-chevron-contract.test.ts — the collapse chevron
 *    lives ONLY in CatalystHeader. No local toggle here. No chevron-left/
 *    chevron-right glyph imports (we rotate chevron-down for group state).
 *  - admin-sidebar-ads-redesign.test.ts — no avatar badge, search uses
 *    elemBeforeInput, pinned section uses ADS Section title, nav rows use
 *    side-navigation primitives, "/" focuses the search input.
 *
 * Data source: admin-nav.ts (single source of truth, parity-tested).
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import {
  SideNavigation,
  NavigationHeader,
  NavigationContent,
  Section,
  ButtonItem,
  LinkItem,
} from '@atlaskit/side-navigation';
import SearchIcon from '@atlaskit/icon/core/search';
import BoardIcon from '@atlaskit/icon/core/board';
import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import DatabaseIcon from '@atlaskit/icon/core/database';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import SettingsIcon from '@atlaskit/icon/core/settings';
import BranchIcon from '@atlaskit/icon/core/branch';
import PaintPaletteIcon from '@atlaskit/icon/core/paint-palette';
import CurlyBracketsIcon from '@atlaskit/icon/core/curly-brackets';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { adminPockets } from './admin-nav';

/** Map iconName strings (stored in admin-nav.ts) to ADS icon components. */
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard: BoardIcon,
  Users: PeopleGroupIcon,
  Settings: SettingsIcon,
  Database: DatabaseIcon,
  GitBranch: BranchIcon,
  Palette: PaintPaletteIcon,
  Cable: AngleBracketsIcon,
  Code2: CurlyBracketsIcon,
};

interface AdminSidebarV2Props {
  /** Controlled by CatalystShell via cycleSidebarState — single-chevron contract. */
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

interface FlatPath {
  label: string;
  path: string;
  parent?: string;
}

/** Pinned admin item paths — hardcoded for now; user-customisable is a follow-up. */
const PINNED_PATHS = ['/admin/users', '/admin/workhub/sync-logs'] as const;

function getAllPaths(): FlatPath[] {
  const paths: FlatPath[] = [];
  adminPockets.forEach(pocket => {
    paths.push({ label: pocket.label, path: pocket.path });
    pocket.children?.forEach(child => {
      paths.push({ label: child.label, path: child.path, parent: pocket.label });
    });
  });
  return paths;
}

export function AdminSidebarV2({ expanded, onToggle: _onToggle, className }: AdminSidebarV2Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  // Open sections that have an active child by default.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    adminPockets.forEach(pocket => {
      if (pocket.children?.some(c => location.pathname === c.path)) {
        initial.add(pocket.id);
      }
    });
    return initial;
  });

  const allPaths = useMemo(() => getAllPaths(), []);

  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const normalized = searchQuery.toLowerCase().replace(/[-_]/g, ' ').trim();
    const parts = normalized.split(/\s+/);
    return allPaths.filter(p => {
      const label = p.label.toLowerCase();
      const parent = p.parent?.toLowerCase() ?? '';
      return parts.every(part => label.includes(part) || parent.includes(part));
    });
  }, [searchQuery, allPaths]);

  const pinnedItems = useMemo(
    () =>
      PINNED_PATHS.map(path => allPaths.find(p => p.path === path))
        .filter((p): p is FlatPath => Boolean(p)),
    [allPaths],
  );

  // "/" focuses the search input (Jira parity). Guarded against editable elements.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapsed-state rendering is owned by CatalystShell (it sets wrapper
  // width to 0 when sidebarVisuallyOpen is false). When this component
  // renders, it always renders at the full 240px expanded layout — matches
  // SidebarBase's behaviour on non-admin hubs.
  if (!expanded) return null;

  return (
    <aside
      className={className}
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        borderRight: '1px solid var(--ds-border-layout, #EBECF0)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <SideNavigation label="Admin">
        <NavigationHeader>
          <div
            style={{
              padding: '8px 12px 8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ds-text, #292A2E)',
              letterSpacing: '-0.3px',
            }}
          >
            Admin
          </div>
        </NavigationHeader>

        <NavigationContent>
          {/* Search — ADS canonical: icon inside the input via elemBeforeInput. */}
          <div style={{ padding: '4px 12px 8px' }}>
            <Textfield
              ref={searchInputRef}
              placeholder="Search"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              elemBeforeInput={
                <div style={{ paddingLeft: 8, display: 'flex', alignItems: 'center' }}>
                  <SearchIcon label="" size="small" />
                </div>
              }
              isCompact
            />
          </div>

          {/* Filtered results take over the body while a query is active. */}
          {searchQuery.trim() ? (
            filteredPaths.length > 0 ? (
              <Section title={`Results (${filteredPaths.length})`}>
                {filteredPaths.map(item => (
                  <LinkItem
                    key={item.path}
                    href={item.path}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setSearchQuery('');
                      navigate(item.path);
                    }}
                    isSelected={location.pathname === item.path}
                    description={item.parent}
                  >
                    {item.label}
                  </LinkItem>
                ))}
              </Section>
            ) : (
              <Section title="No matches">
                <div
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
                  }}
                >
                  Try a different search term.
                </div>
              </Section>
            )
          ) : (
            <>
              {/* Pinned — ADS Section heading, sentence case, no glyph. */}
              {pinnedItems.length > 0 && (
                <Section title="Pinned">
                  {pinnedItems.map(item => (
                    <LinkItem
                      key={item.path}
                      href={item.path}
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        navigate(item.path);
                      }}
                      isSelected={location.pathname === item.path}
                    >
                      {item.label}
                    </LinkItem>
                  ))}
                </Section>
              )}

              {/* Pockets — leaf paths render as LinkItem, parents as expandable ButtonItem. */}
              {adminPockets.map(pocket => {
                const Icon = ICON_MAP[pocket.iconName];
                const iconBefore = Icon ? <Icon label="" size="small" /> : null;
                const hasChildren = !!pocket.children && pocket.children.length > 0;

                if (!hasChildren) {
                  return (
                    <Section key={pocket.id}>
                      <LinkItem
                        href={pocket.path}
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          navigate(pocket.path);
                        }}
                        iconBefore={iconBefore}
                        isSelected={location.pathname === pocket.path}
                      >
                        {pocket.label}
                      </LinkItem>
                    </Section>
                  );
                }

                const isOpen = expandedSections.has(pocket.id);
                const childActive = pocket.children!.some(c => location.pathname === c.path);

                return (
                  <Section key={pocket.id}>
                    <ButtonItem
                      iconBefore={iconBefore}
                      iconAfter={
                        <span
                          style={{
                            display: 'inline-flex',
                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 120ms ease',
                          }}
                        >
                          <ChevronDownIcon label="" size="small" />
                        </span>
                      }
                      onClick={() => toggleSection(pocket.id)}
                      isSelected={childActive && !isOpen}
                      aria-expanded={isOpen}
                    >
                      {pocket.label}
                    </ButtonItem>

                    {isOpen && (
                      <div style={{ paddingLeft: 24 }}>
                        {pocket.children!.map(child => (
                          <LinkItem
                            key={child.path}
                            href={child.path}
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              navigate(child.path);
                            }}
                            isSelected={location.pathname === child.path}
                          >
                            {child.label}
                          </LinkItem>
                        ))}
                      </div>
                    )}
                  </Section>
                );
              })}
            </>
          )}
        </NavigationContent>
      </SideNavigation>
    </aside>
  );
}
