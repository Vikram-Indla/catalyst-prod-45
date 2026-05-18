/**
 * AdminSidebarV2 — Admin navigation rail, Jira-admin-parity.
 *
 * Mirrors Jira's admin settings sidebar pattern probed live from
 * https://digital-transformation.atlassian.net/jira/settings/issues/issue-types
 * on 2026-05-19:
 *   - Every pocket is flat-expanded (no collapse). The pocket label is a
 *     small section header (12px / 653 / sentence case) and the children
 *     render as nav links directly inline beneath it.
 *   - Active item: blue text, faint blue background, blue left-rail.
 *
 * Why: Vikram directive 2026-05-19 — Design Governance and every other
 * leaf must be directly clickable in the admin sidebar without expanding
 * a parent pocket. The collapsed ButtonItem pattern hid leaves and made
 * the IA invisible at a glance.
 *
 * Contracts pinned by:
 *   - admin-sidebar-single-chevron-contract.test.ts — no chevron-left/right
 *     imports (we removed all collapse chevrons; only the global header
 *     chevron remains).
 *   - admin-sidebar-ads-redesign.test.ts — imports from
 *     @atlaskit/side-navigation; uses Section + LinkItem primitives.
 *   - admin-sidebar-parity.test.ts — every leaf path in adminPockets
 *     resolves through admin-nav.ts (single source of truth).
 *
 * Data source: admin-nav.ts.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import {
  SideNavigation,
  NavigationHeader,
  NavigationContent,
  Section,
  LinkItem,
} from '@atlaskit/side-navigation';
import SearchIcon from '@atlaskit/icon/core/search';
import { adminPockets } from './admin-nav';

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

  // "/" focuses the search input (Jira parity).
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

  if (!expanded) return null;

  const handleNav = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
    setSearchQuery('');
  };

  return (
    <aside
      className={className}
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: 'var(--cp-bg-elevated, #ffffff)',
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
              padding: '12px 16px 4px',
              fontSize: 16,
              fontWeight: 653,
              color: 'var(--ds-text, #292A2E)',
              letterSpacing: 'normal',
            }}
          >
            Admin
          </div>
        </NavigationHeader>

        <NavigationContent>
          {/* Search — Jira parity. Leading icon via elemBeforeInput. */}
          <div style={{ padding: '4px 12px 8px' }}>
            <Textfield
              ref={searchInputRef}
              placeholder="Search"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
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
                    onClick={handleNav(item.path)}
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
                    color: 'var(--ds-text-subtle, #6B6E76)',
                  }}
                >
                  Try a different search term.
                </div>
              </Section>
            )
          ) : (
            <>
              {pinnedItems.length > 0 && (
                <Section title="Pinned">
                  {pinnedItems.map(item => (
                    <LinkItem
                      key={item.path}
                      href={item.path}
                      onClick={handleNav(item.path)}
                      isSelected={location.pathname === item.path}
                    >
                      {item.label}
                    </LinkItem>
                  ))}
                </Section>
              )}

              {/* Jira admin pattern: every pocket renders flat-expanded.
                  Section header (small subtle text) + children listed
                  directly as LinkItems beneath. No collapse, no icon-before
                  on section headers, no ButtonItem chevron. */}
              {adminPockets.map(pocket => {
                const hasChildren = !!pocket.children && pocket.children.length > 0;
                if (!hasChildren) {
                  // Leaf-only pockets (e.g. Overview) render as a single
                  // top-level LinkItem with no section header.
                  return (
                    <Section key={pocket.id}>
                      <LinkItem
                        href={pocket.path}
                        onClick={handleNav(pocket.path)}
                        isSelected={location.pathname === pocket.path}
                      >
                        {pocket.label}
                      </LinkItem>
                    </Section>
                  );
                }
                return (
                  <Section key={pocket.id} title={pocket.label}>
                    {pocket.children!.map(child => (
                      <LinkItem
                        key={child.path}
                        href={child.path}
                        onClick={handleNav(child.path)}
                        isSelected={location.pathname === child.path}
                      >
                        {child.label}
                      </LinkItem>
                    ))}
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
