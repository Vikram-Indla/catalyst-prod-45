/**
 * AdminSidebarV2 — Admin navigation rail.
 *
 * Uses SidebarBase for consistent border, collapsed rail, and tooltip behavior —
 * same pattern as HomeSidebar, ProjectHubSidebar, etc.
 *
 * Collapsed (56px): one glyph icon per section with tooltip on right.
 * Expanded (220px): "Admin" 16px/653 header + search + flat-expanded sections.
 *
 * Icon map (one per adminPockets entry):
 *   users-access  → PeopleIcon   (people group)
 *   design-system → DiscoverIcon (compass / explore)
 *   workflows     → RoadmapIcon  (flow / sequence)
 *   release-ops   → ShipIcon     (ship / deploy)
 *   connections   → LinkIcon     (link / integration)
 *   ai-governance → LockIcon     (lock / governance)
 *
 * Contracts pinned by:
 *   - admin-sidebar-single-chevron-contract.test.ts — no local collapse chevron.
 *   - admin-sidebar-ads-redesign.test.ts — SidebarBase import; / key handler;
 *     elemBeforeInput search; no hand-rolled hover state.
 *   - admin-sidebar-parity.test.ts — every leaf path in adminPockets resolves.
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import PeopleIcon from '@atlaskit/icon/glyph/people';
import DiscoverIcon from '@atlaskit/icon/glyph/discover';
import RoadmapIcon from '@atlaskit/icon/glyph/roadmap';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import LinkIcon from '@atlaskit/icon/glyph/link';
import LockIcon from '@atlaskit/icon/glyph/lock';
import SearchIcon from '@atlaskit/icon/core/search';
import Textfield from '@atlaskit/textfield';
import {
  SidebarBase,
  type SidebarConfig,
  type SidebarMenuItem,
  type SidebarSection,
} from '../layout/SidebarBase';
import { adminPockets } from './admin-nav';

// ---------------------------------------------------------------------------
// Glyph icon adapter
// SidebarBase passes the active/inactive ADS color via `style.color`; glyph
// icons use `primaryColor` instead of CSS color. This adapter bridges them so
// icons turn brand-blue when their row is active.
// ---------------------------------------------------------------------------
type SBIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function adaptGlyph(
  Glyph: React.ComponentType<{ label: string; size?: string; primaryColor?: string }>,
): SBIcon {
  // Named function (not arrow) so React DevTools can identify the component.
  function GlyphAdapter({ style }: { className?: string; style?: React.CSSProperties } = {}) {
    return (
      <Glyph
        label=""
        size="small"
        primaryColor={style?.color ?? 'var(--ds-icon, #172B4D)'}
      />
    );
  }
  return GlyphAdapter;
}

// One icon per adminPockets id — adapt at module level so each component is
// stable across renders (no recreation on every useMemo invocation).
const POCKET_ICONS: Record<string, SBIcon> = {
  'users-access':  adaptGlyph(PeopleIcon),
  'design-system': adaptGlyph(DiscoverIcon),
  'workflows':     adaptGlyph(RoadmapIcon),
  'release-ops':   adaptGlyph(ShipIcon),
  'connections':   adaptGlyph(LinkIcon),
  'ai-governance': adaptGlyph(LockIcon),
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AdminSidebarV2Props {
  /** Controlled by CatalystShell via cycleSidebarState — single-chevron contract. */
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AdminSidebarV2({ expanded, onToggle, className }: AdminSidebarV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchInputRef = useRef<any>(null);

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

  // Flat list of all leaves — stable reference (adminPockets never changes).
  const allLeaves = useMemo(
    () =>
      adminPockets.flatMap(pocket =>
        pocket.children && pocket.children.length > 0
          ? pocket.children.map(c => ({ pocket, child: c }))
          : [{ pocket, child: { label: pocket.label, path: pocket.path } }],
      ),
    [],
  );

  const config: SidebarConfig = useMemo(() => {
    // -----------------------------------------------------------------------
    // COLLAPSED RAIL — one icon per section
    // -----------------------------------------------------------------------
    if (!expanded) {
      const items: SidebarMenuItem[] = adminPockets.map(pocket => ({
        id: pocket.id,
        title: pocket.label,
        tooltip: pocket.label,
        // Navigate to first child on click; active when any child matches.
        path: pocket.children?.[0]?.path ?? pocket.path,
        activeMatchPaths: [
          pocket.path,
          ...(pocket.children?.map(c => c.path) ?? []),
        ],
        icon: POCKET_ICONS[pocket.id],
      }));
      return { badge: '', label: 'Admin', items, showFavorites: false };
    }

    // -----------------------------------------------------------------------
    // EXPANDED — search node + flat-expanded section tree
    // -----------------------------------------------------------------------

    // Search section: titleNode renders the Textfield; zero items so the
    // section body is empty (only the titleNode header renders, per SidebarBase
    // null-check: sections with titleNode are kept even when items.length === 0).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchSection: SidebarSection = {
      title: '__admin_search__',
      titleNode: (
        <div style={{ padding: '4px 4px 8px' }}>
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
      ),
      items: [],
    };

    const q = searchQuery.trim().toLowerCase().replace(/[-_]/g, ' ');

    if (q) {
      const parts = q.split(/\s+/);
      const matched = allLeaves.filter(({ pocket, child }) => {
        const text = (pocket.label + ' ' + child.label).toLowerCase();
        return parts.every(p => text.includes(p));
      });

      return {
        badge: '',
        label: 'Admin',
        sections: [
          searchSection,
          {
            title: `Results (${matched.length})`,
            items: matched.map(({ pocket, child }) => ({
              id: `search-${child.path}`,
              title: child.label,
              tooltip: `${pocket.label} › ${child.label}`,
              path: child.path,
              icon: POCKET_ICONS[pocket.id],
            })),
          },
        ],
        showFavorites: false,
        hideSectionDividers: true,
      };
    }

    // Normal tree: one SidebarSection per pocket.
    const treeSections: SidebarSection[] = adminPockets.map(pocket => {
      const items: SidebarMenuItem[] =
        pocket.children && pocket.children.length > 0
          ? pocket.children.map(child => ({
              id: `${pocket.id}-${child.path}`,
              title: child.label,
              path: child.path,
              icon: POCKET_ICONS[pocket.id],
            }))
          : [
              {
                id: pocket.id,
                title: pocket.label,
                path: pocket.path,
                icon: POCKET_ICONS[pocket.id],
              },
            ];

      return { title: pocket.label, items };
    });

    return {
      badge: '',
      label: 'Admin',
      sections: [searchSection, ...treeSections],
      showFavorites: false,
      hideSectionDividers: true,
    };
  }, [expanded, searchQuery, allLeaves]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      renderHeaderSwitcher={(exp) =>
        exp ? (
          <span
            style={{
              fontFamily:
                'var(--ds-font-family-heading, var(--cp-font-heading))',
              fontSize: 16,
              fontWeight: 653,
              color: 'var(--ds-text, #292A2E)',
              letterSpacing: 'normal',
            }}
          >
            Admin
          </span>
        ) : null
      }
    />
  );
}
