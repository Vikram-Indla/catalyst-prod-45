/**
 * AdminSidebarV2 — Admin navigation shell.
 *
 * ADS-compliant: all colors use var(--ds-*) tokens. No Tailwind color classes.
 * Nav data lives in admin-nav.ts (single source of truth, parity-tested).
 * Hover states use onMouseEnter/onMouseLeave + ADS token inline styles.
 *
 * Atlaskit primitives used:
 *  - @atlaskit/textfield (search input)
 *  - @atlaskit/icon via lucide bridge (icons)
 *  - @atlaskit/tooltip (collapsed icon tooltips)
 */
import { Link, useLocation } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import { Tooltip } from '@/components/ads';
import { useState, useMemo } from 'react';
import { adminPockets } from './admin-nav';
import BoardIcon from '@atlaskit/icon/core/board';
import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import DatabaseIcon from '@atlaskit/icon/core/database';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import PinIcon from '@atlaskit/icon/core/pin';
import SearchIcon from '@atlaskit/icon/core/search';
import SettingsIcon from '@atlaskit/icon/core/settings';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import BranchIcon from '@atlaskit/icon/core/branch';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

/** Maps iconName strings (stored in admin-nav.ts) to ADS icon components. */
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard: BoardIcon,
  Users: PeopleGroupIcon,
  Settings: SettingsIcon,
  Database: DatabaseIcon,
  GitBranch: BranchIcon,
  Cable: AngleBracketsIcon,
  Code2: AngleBracketsIcon,
};

// ── ADS token constants ─────────────────────────────────────────────────────
const T = {
  surface:        'var(--ds-surface, #FFFFFF)',
  surfaceOverlay: 'var(--ds-surface-overlay, #FFFFFF)',
  border:         'var(--ds-border-layout, #EBECF0)',
  borderFocused:  'var(--ds-border-focused, #388BFF)',
  textTitle:      'var(--ds-text, #172B4D)',
  textSubtle:     'var(--ds-text-subtle, #44546F)',
  textSubtlest:   'var(--ds-text-subtlest, #626F86)',
  textSelected:   'var(--ds-text-selected, #0C66E4)',
  textDisabled:   'var(--ds-text-disabled, #8590A2)',
  bgNeutral:      'var(--ds-background-neutral, #F7F8F9)',
  bgNeutralHover: 'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgSelected:     'var(--ds-background-selected, #E9F2FF)',
  bgSelectedHover:'var(--ds-background-selected-hovered, #CCE0FF)',
  bgBrandBold:    'var(--ds-background-brand-bold, #0C66E4)',
  iconSelected:   'var(--ds-icon-selected, #0C66E4)',
  iconSubtle:     'var(--ds-icon-subtle, #44546F)',
} as const;

interface AdminSidebarV2Props {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Flatten all paths for search — derived from canonical admin-nav.ts source
const getAllPaths = () => {
  const paths: { label: string; path: string; parent?: string }[] = [];
  adminPockets.forEach(pocket => {
    paths.push({ label: pocket.label, path: pocket.path });
    pocket.children?.forEach(child => {
      paths.push({ label: child.label, path: child.path, parent: pocket.label });
    });
  });
  return paths;
};

export function AdminSidebarV2({ expanded, onToggle, className }: AdminSidebarV2Props) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  // Pinned items — must be valid registered routes (no dead links)
  const [pinnedItems] = useState<string[]>(['/admin/users', '/admin/workhub/sync-logs']);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Track which sections are expanded — open sections that have active children by default
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
    const normalizedQuery = searchQuery.toLowerCase().replace(/[-_]/g, ' ').trim();
    const queryParts = normalizedQuery.split(/\s+/);
    return allPaths.filter(p => {
      const normalizedLabel = p.label.toLowerCase();
      const normalizedParent = p.parent?.toLowerCase() || '';
      return queryParts.every(part =>
        normalizedLabel.includes(part) || normalizedParent.includes(part)
      );
    });
  }, [searchQuery, allPaths]);

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children?: { path: string }[]) =>
    children?.some(c => location.pathname === c.path);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sidebarWidth = expanded ? 240 : 64;

  return (
    <aside
      className={className}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100%',
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        transition: 'width 200ms ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: expanded ? 56 : 64,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'space-between' : 'center',
          padding: expanded ? '0 12px' : '8px 0',
          gap: expanded ? undefined : 6,
          flexShrink: 0,
          flexDirection: expanded ? 'row' : 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', minWidth: 0 }}>
          {/* Admin badge */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: `linear-gradient(135deg, ${T.bgBrandBold} 0%, var(--ds-background-brand-bold-hovered, #0055CC) 100%)`,
              color: 'var(--ds-text-inverse, #FFFFFF)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            AD
          </div>
          {expanded && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.textTitle,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}
            >
              Admin
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onMouseEnter={() => setHoveredPath('__toggle')}
          onMouseLeave={() => setHoveredPath(null)}
          style={{
            width: expanded ? 24 : 20,
            height: expanded ? 24 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            background: hoveredPath === '__toggle' ? T.bgNeutralHover : 'transparent',
            color: T.textSubtlest,
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: expanded ? 8 : 0,
            transition: 'background 120ms ease',
          }}
        >
          {expanded
            ? <ChevronLeftIcon label="" size="small" />
            : <ChevronRightIcon label="" size="small" />}
        </button>
      </div>

      {/* Search — only when expanded */}
      {expanded && (
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <SearchIcon label="" size="small" />
            {/* @atlaskit/textfield — ADS-canonical search input */}
            <div style={{ paddingLeft: 24 }}>
              <Textfield
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                elemBeforeInput={null}
                isCompact
              />
            </div>
          </div>

          {/* Search results dropdown */}
          {filteredPaths.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
              {filteredPaths.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSearchQuery('')}
                  onMouseEnter={() => setHoveredPath(`sr:${item.path}`)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 4,
                    textDecoration: 'none',
                    fontSize: 13,
                    color: T.textSubtle,
                    background: hoveredPath === `sr:${item.path}` ? T.bgNeutralHover : 'transparent',
                    transition: 'background 120ms ease',
                    marginBottom: 1,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  {item.parent && (
                    <span style={{ fontSize: 10, color: T.textSubtlest, flexShrink: 0 }}>
                      in {item.parent}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pinned items */}
      {expanded && pinnedItems.length > 0 && !searchQuery && (
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: T.textSubtlest,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            <PinIcon label="" size="small" />
            <span>Pinned</span>
          </div>
          {pinnedItems.map(path => {
            const item = allPaths.find(p => p.path === path);
            if (!item) return null;
            const active = isActive(path);
            const hovered = hoveredPath === `pin:${path}`;
            return (
              <Link
                key={path}
                to={path}
                onMouseEnter={() => setHoveredPath(`pin:${path}`)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? T.textSelected : T.textSubtle,
                  background: active ? T.bgSelected : hovered ? T.bgNeutralHover : 'transparent',
                  position: 'relative',
                  marginBottom: 1,
                  transition: 'background 120ms ease',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 4,
                      bottom: 4,
                      width: 3,
                      background: T.bgBrandBold,
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Navigation — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <nav style={{ padding: '4px 8px' }}>
          {adminPockets.map((pocket) => {
            const Icon = ICON_MAP[pocket.iconName] ?? Settings;
            const active = isActive(pocket.path) || isChildActive(pocket.children);
            const hasChildren = pocket.children && pocket.children.length > 0;
            const isOpen = expandedSections.has(pocket.id);
            const hovered = hoveredPath === `nav:${pocket.id}`;

            // Collapsed sidebar — icon-only with tooltip
            if (!expanded) {
              return (
                <Tooltip key={pocket.id} content={pocket.label} position="right">
                  <Link
                    to={pocket.children?.[0]?.path || pocket.path}
                    onMouseEnter={() => setHoveredPath(`nav:${pocket.id}`)}
                    onMouseLeave={() => setHoveredPath(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 50,
                      borderRadius: 6,
                      position: 'relative',
                      margin: '0 auto 1px',
                      textDecoration: 'none',
                      background: active ? T.bgSelected : hovered ? T.bgNeutralHover : 'transparent',
                      transition: 'background 120ms ease',
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          background: T.bgBrandBold,
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}
                    <Icon
                      style={{
                        width: 17,
                        height: 17,
                        strokeWidth: 1.4,
                        color: active ? T.iconSelected : T.iconSubtle,
                      }}
                    />
                  </Link>
                </Tooltip>
              );
            }

            // Pocket with no children — direct link
            if (!hasChildren) {
              return (
                <Link
                  key={pocket.id}
                  to={pocket.path}
                  onMouseEnter={() => setHoveredPath(`nav:${pocket.id}`)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 12px',
                    height: 50,
                    borderRadius: 6,
                    position: 'relative',
                    marginBottom: 1,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? T.textSelected : T.textTitle,
                    background: active ? T.bgSelected : hovered ? T.bgNeutralHover : 'transparent',
                    transition: 'background 120ms ease',
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 4,
                        bottom: 4,
                        width: 3,
                        background: T.bgBrandBold,
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                  <Icon
                    style={{
                      width: 17,
                      height: 17,
                      strokeWidth: 1.4,
                      flexShrink: 0,
                      color: active ? T.iconSelected : T.iconSubtle,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {pocket.label}
                  </span>
                </Link>
              );
            }

            // Pocket with children — collapsible section
            return (
              <div key={pocket.id} style={{ marginBottom: 1 }}>
                <button
                  onClick={() => toggleSection(pocket.id)}
                  onMouseEnter={() => setHoveredPath(`nav:${pocket.id}`)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 12px',
                    height: 50,
                    borderRadius: 6,
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? T.textSelected : T.textTitle,
                    background: active ? T.bgSelected : hovered ? T.bgNeutralHover : 'transparent',
                    textAlign: 'left',
                    transition: 'background 120ms ease',
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 4,
                        bottom: 4,
                        width: 3,
                        background: T.bgBrandBold,
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                  <Icon
                    style={{
                      width: 17,
                      height: 17,
                      strokeWidth: 1.4,
                      flexShrink: 0,
                      color: active ? T.iconSelected : T.iconSubtle,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {pocket.label}
                  </span>
                  <ChevronDownIcon label="" size="small" />
                </button>

                {/* Children — animated open/close */}
                {isOpen && (
                  <div style={{ marginLeft: 20, marginTop: 2 }}>
                    {pocket.children?.map(child => {
                      const childActive = isActive(child.path);
                      const childHovered = hoveredPath === `child:${child.path}`;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onMouseEnter={() => setHoveredPath(`child:${child.path}`)}
                          onMouseLeave={() => setHoveredPath(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            height: 32,
                            borderRadius: 4,
                            position: 'relative',
                            marginBottom: 1,
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: childActive ? 500 : 400,
                            color: childActive ? T.textSelected : T.textSubtle,
                            background: childActive ? T.bgSelected : childHovered ? T.bgNeutralHover : 'transparent',
                            transition: 'background 120ms ease',
                          }}
                        >
                          {childActive && (
                            <span
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 4,
                                bottom: 4,
                                width: 3,
                                background: T.bgBrandBold,
                                borderRadius: '0 2px 2px 0',
                              }}
                            />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {child.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
