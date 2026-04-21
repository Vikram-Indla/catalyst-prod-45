/**
 * SidebarBase — Shared sidebar component with consistent token-based styling
 * 
 * Used by all non-admin sidebars (Product, Release, Enterprise, Program, etc.)
 * All styling uses CSS custom properties for dark/light mode compatibility.
 * 
 * CATALYST V9.5 NAVIGATION SHELL — Research-Driven Design
 * Based on analysis of 27 enterprise apps (Linear, Stripe, Figma, Vercel, etc.)
 * 
 * ECLIPSE D8-R3: Full dark mode parity using --cp-t1/t2/t3 tokens.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Star, LucideIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';
import { useFavorites } from '@/hooks/useFavorites';
import { useTheme } from '@/hooks/useTheme';

// Hub registry — mirrors AppSwitcher.tsx (which is being retired). Tone
// colors come from Atlassian Design System accent palette; we render the
// icon inside a 16px tinted square so the section reads as "app launcher"
// rather than nav links.
const HUB_ITEMS = [
  { label: 'Home',        href: '/for-you',                 Icon: HomeIcon,            tone: '#42526E' },
  { label: 'StrategyHub', href: '/strategyhub',             Icon: OfficeBuildingIcon,  tone: '#8270DB' },
  { label: 'ProductHub',  href: '/producthub',              Icon: PortfolioIcon,       tone: '#0052CC' },
  { label: 'ProjectHub',  href: '/project-hub',             Icon: FolderIcon,          tone: '#00A3BF' },
  { label: 'ReleaseHub',  href: '/release-hub/command-center', Icon: ShipIcon,         tone: '#FF8B00' },
  { label: 'TestHub',     href: '/testhub/dashboard',       Icon: CheckCircleIcon,     tone: '#36B37E' },
  { label: 'IncidentHub', href: '/incident-hub',            Icon: WarningIcon,         tone: '#DE350B' },
  { label: 'TaskHub',     href: '/taskhub/boards',          Icon: TaskIcon,            tone: '#FFAB00' },
  { label: 'PlanHub',     href: '/planhub',                 Icon: CalendarIcon,        tone: '#E774BB' },
  { label: 'WikiHub',     href: '/wiki',                    Icon: BookIcon,            tone: '#65BA43' },
] as const;

/**
 * Route-to-chunk prefetch map — preload lazy page chunks on sidebar hover
 * so navigation feels instant. Each entry maps a route prefix to the
 * dynamic import() that Vite will resolve to the same chunk as the lazy().
 */
const ROUTE_PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  '/project-hub/projects': () => import('../../pages/project-hub/AllProjectsPage'),
  '/project-hub/resources': () => import('../../pages/ResourceListingPage'),
  '/producthub/kanban': () => import('../../pages/producthub/KanbanPage'),
  '/releasehub': () => import('../../pages/releasehub/AllReleasesPage'),
  '/testhub': () => import('../../pages/testhub/TestHubPage'),
  '/planhub': () => import('../../components/planhub/PlanHubShell'),
  '/taskhub': () => import('../../modules/planner/PlannerPage'),
  '/incidenthub': () => import('../../pages/incidenthub/IncidentListPage'),
  '/strategyhub': () => import('../../pages/strategyhub/StrategicThemesPage'),
};

const prefetchedRoutes = new Set<string>();

function prefetchRoute(path: string) {
  const matchKey = Object.keys(ROUTE_PREFETCH_MAP).find(prefix => path.startsWith(prefix));
  if (!matchKey || prefetchedRoutes.has(matchKey)) return;
  prefetchedRoutes.add(matchKey);
  ROUTE_PREFETCH_MAP[matchKey]().catch(() => {
    prefetchedRoutes.delete(matchKey);
  });
}

export interface SidebarMenuItem {
  id: string;
  title: string | React.ReactNode;
  path: string;
  activeMatchPaths?: string[];
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
  badge?: number;
  badgeVariant?: 'info' | 'danger' | 'purple';
  textBadge?: string;
  textBadgeVariant?: 'new' | 'beta' | 'info';
  alwaysStarred?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

export interface SidebarConfig {
  badge: string;
  label: string;
  sections?: SidebarSection[];
  items?: SidebarMenuItem[];
  footerItem?: SidebarMenuItem;
  showFavorites?: boolean;
}

interface SidebarBaseProps {
  config: SidebarConfig;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  iconResolver?: (itemId: string) => React.ComponentType<{ className?: string }> | undefined;
  children?: React.ReactNode;
}

/** Dark mode token set — passed to renderMenuItem */
interface DarkTokens {
  isDark: boolean;
  itemText: string;
  activeText: string;
  activeBg: string;
  hoverBg: string;
  hoverText: string;
  iconOpacityInactive: number;
  badgeBg: string;
  badgeText: string;
}

export function SidebarBase({ 
  config, 
  expanded, 
  onToggle, 
  className,
  iconResolver,
  children,
}: SidebarBaseProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isDark } = useTheme();

  // Dark mode token helpers — ECLIPSE D8-R3 + Enterprise polish
  const tokens: DarkTokens = {
    isDark,
    itemText: isDark ? 'var(--cp-t1)' : '#42526E',
    activeText: isDark ? '#7DB8FC' : '#0052CC',
    activeBg: isDark ? 'rgba(0,82,204,0.08)' : '#E9F2FF',
    hoverBg: isDark ? 'rgba(59,130,246,0.06)' : '#F4F5F7',
    hoverText: isDark ? 'var(--cp-t1)' : '#172B4D',
    iconOpacityInactive: isDark ? 0.72 : 0.75,
    badgeBg: isDark ? '#2E2E2E' : '#EBECF0',
    badgeText: isDark ? 'var(--cp-t2)' : '#6B778C',
  };

  // Chevron critique (2026-04-19): brand-blue (#0052CC / --cp-blue) violated
  // the CLAUDE.md colour reservation — blue is reserved for the +Create CTA
  // only. Pulled the toggle to neutral muted tokens so the primary blue cue
  // stays unique to the primary action. Hover lifts to text-primary for an
  // affordance pop without reintroducing brand colour.
  const chevronColor = isDark ? 'var(--cp-t2, #A1A1A1)' : '#6B778C';
  const chevronHoverColor = isDark ? 'var(--cp-t1, #EDEDED)' : '#172B4D';
  const sidebarBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const sidebarBorder = isDark ? '#2E2E2E' : '#DFE1E6';
  const dividerColor = isDark ? '#2E2E2E' : '#DFE1E6';
  const sectionLabel = isDark ? 'var(--cp-t2)' : '#6B778C';
  const hubLabel = isDark ? 'var(--cp-t1)' : '#172B4D';

  const isActive = (path: string, exact: boolean = false, activeMatchPaths: string[] = []) => {
    if (activeMatchPaths.some((matchPath) => location.pathname === matchPath || location.pathname.startsWith(matchPath + '/'))) {
      return true;
    }

    const [pathPart, queryPart] = path.split('?');
    if (queryPart) {
      return location.pathname === pathPart && location.search === `?${queryPart}`;
    }
    if (exact) {
      return location.pathname === pathPart && !location.search;
    }
    return location.pathname === pathPart || location.pathname.startsWith(pathPart + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const allItems = config.sections 
    ? config.sections.flatMap(s => s.items)
    : config.items || [];

  const favoritedItems = allItems.filter(item => favorites.includes(item.path));

  return (
    <aside
      className={cn(
        'h-full flex-shrink-0 relative flex flex-col overflow-visible',
        className
      )}
        style={{
          width: expanded ? '240px' : '56px',
          background: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
          boxShadow: 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          // 2026-04-19: Unified all sidebar-adjacent transitions on 180ms +
          // cubic-bezier(0.2, 0, 0, 1) (Material "emphasized decelerate").
          // Previously 220ms while CatalystHeader's logo zone ran at 200ms
          // with `ease` — the desync was a visible shear. willChange + CSS
          // containment give the browser paint-layer hints so the width
          // animation doesn't cascade a reflow into the main canvas every
          // frame. Labels crossfade via opacity+max-width transitions below
          // so they don't pop at the width midpoint.
          transition: 'width 180ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'width',
          contain: 'layout style',
          scrollbarWidth: 'thin' as any,
          scrollbarColor: isDark ? '#454545 transparent' : '#DFE1E6 transparent',
        }}
      >
        {/* Header with collapse toggle */}
        <div 
          className={cn(
            "border-b flex-shrink-0",
            expanded
              ? "flex items-center justify-between"
              : "flex flex-col items-center justify-center"
          )}
          style={{
            minHeight: '48px',
            borderColor: sidebarBorder,
            padding: expanded ? '12px 12px 12px 16px' : '12px 0',
            gap: expanded ? undefined : '4px',
            background: 'transparent',
          }}
        >
          {!expanded ? (
            // Chevron critique (2026-04-19): collapsed-mode order flipped so
            // the toggle button renders ABOVE the avatar. Combined with the
            // expanded-mode right-anchor, the chevron now lives at the
            // trailing/top edge of the header in both states — Jira-parity
            // anchor instead of the previous stack order that jumped the
            // chevron from right (expanded) to bottom (collapsed).
            <>
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-[26px] h-[26px] rounded transition-all flex-shrink-0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: chevronColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.hoverBg;
                  e.currentTarget.style.color = chevronHoverColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = chevronColor;
                }}
                aria-label="Expand sidebar (shortcut: [ )"
              >
                <PanelLeftOpen size={15} />
              </button>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--cp-blue)',
                  color: 'var(--bg-app)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {config.badge}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--cp-blue)',
                    color: 'var(--bg-app)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  {config.badge}
                </div>
                {/* Hub label — t1 in dark mode (NOT blue) per D8-R3 Fix 2 */}
                <span 
                  className="truncate"
                  style={{ 
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: hubLabel,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {config.label}
                </span>
              </div>
              {/* Collapse button removed 2026-04-21 (Vikram): the sidebar
                  toggle is now exclusively owned by the top-nav chevron in
                  CatalystHeader. Two-state architecture (expanded ↔ hidden). */}
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 6px' }}>
          {/* Favorites Section */}
          {config.showFavorites !== false && favoritedItems.length > 0 && !expanded && null}
          {config.showFavorites !== false && favoritedItems.length > 0 && expanded && (
            <div className="mb-3">
              <div style={{ padding: '16px 12px 4px' }}>
                <span
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    color: sectionLabel,
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase' as const,
                    lineHeight: 1,
                  }}
                >
                  Favorites
                </span>
              </div>
              <div>
                {favoritedItems.map((item) => renderMenuItem(
                  item, isActive, iconResolver, expanded, handleNavigation, 
                  false, isFavorite, toggleFavorite, tokens
                ))}
              </div>
            </div>
          )}

          {config.sections ? (
            config.sections.map((section, sectionIndex) => {
              if (section.items.length === 0) return null;
              
              return (
                <div key={section.title}>
                  {sectionIndex > 0 && (
                    <div style={{ borderTop: `1px solid ${dividerColor}`, margin: '8px 12px' }} />
                  )}
                  {/* Section Header — enterprise high-contrast labels */}
                  {expanded && section.title && (
                    <div
                      style={{
                        padding: '16px 12px 4px',
                        lineHeight: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Sora', sans-serif",
                          color: sectionLabel,
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase' as const,
                        }}
                      >
                        {section.title}
                      </span>
                    </div>
                  )}
                  {section.items.map((item) => renderMenuItem(
                    item, isActive, iconResolver, expanded, handleNavigation, 
                    false, isFavorite, toggleFavorite, tokens
                  ))}
                </div>
              );
            })
          ) : (
            config.items?.map((item) => renderMenuItem(
              item, isActive, iconResolver, expanded, handleNavigation, 
              false, isFavorite, toggleFavorite, tokens
            ))
          )}

          {/* Injected children (e.g. Recents section) */}
          {children}
        </nav>

        {/* Footer Item (e.g., Settings) — t2 in dark mode per D8-R3 Fix 7 */}
        {config.footerItem && (
          <div 
            className="border-t pt-2 mt-2"
            style={{ 
              borderColor: dividerColor, 
              padding: '6px 8px' 
            }}
          >
            {renderMenuItem(
              config.footerItem, isActive, iconResolver, expanded, handleNavigation, 
              true, isFavorite, toggleFavorite, tokens
            )}
          </div>
        )}
      </aside>
  );
}

// Helper function to render a menu item — now receives DarkTokens
function renderMenuItem(
  item: SidebarMenuItem,
  isActive: (path: string, exact?: boolean, activeMatchPaths?: string[]) => boolean,
  iconResolver: ((itemId: string) => React.ComponentType<{ className?: string }> | undefined) | undefined,
  expanded: boolean,
  handleNavigation: (path: string) => void,
  isFooter: boolean = false,
  isFavorite: (path: string) => boolean,
  toggleFavorite: (path: string) => void,
  tk: DarkTokens
) {
  const active = isActive(item.path, item.exact, item.activeMatchPaths);
  const CustomIcon = iconResolver?.(item.id) || item.icon;
  const starred = item.alwaysStarred || isFavorite(item.path);

  const menuButton = (
    <button
      onClick={() => handleNavigation(item.path)}
      className="group w-full flex items-center border-none cursor-pointer transition-all relative"
      style={{
        height: '32px',
        padding: expanded ? '0 12px' : '0',
        gap: '10px',
        marginBottom: '0',
        fontSize: '14px',
        fontWeight: active ? 600 : 500,
        color: active ? tk.activeText : tk.itemText,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active ? tk.activeBg : 'transparent',
        lineHeight: 1,
        borderRadius: '6px',
        letterSpacing: '0',
      }}
      onMouseEnter={(e) => {
        prefetchRoute(item.path);
        if (!active) {
          e.currentTarget.style.background = tk.hoverBg;
          e.currentTarget.style.color = tk.hoverText;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? tk.activeBg : 'transparent';
        e.currentTarget.style.color = active ? tk.activeText : tk.itemText;
      }}
    >
      {/* Left Accent Bar — 3px, only when expanded and active */}
      {active && expanded && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '4px',
            bottom: '4px',
            width: '3px',
            background: 'var(--cp-blue)',
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
      {/* Icon container */}
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '16px',
          height: '16px',
          opacity: active ? 1.0 : tk.iconOpacityInactive,
          transition: 'opacity 150ms ease',
        }}
      >
        {CustomIcon && (
          <CustomIcon
            className="h-[16px] w-[16px]"
            style={{
              color: active ? tk.activeText : tk.itemText,
              strokeWidth: active ? 2 : 1.5,
            }}
          />
        )}
      </span>
      {/* Label — always rendered, crossfaded via opacity+max-width so it
          doesn't pop at the width animation midpoint. The max-width transition
          collapses the span out of flow in lockstep with the sidebar width,
          opacity fades 40ms into the expand (and 0ms on collapse) so the text
          disappears before the sidebar contracts rather than snapping out. */}
      <span
        className="flex-1 text-left"
        style={{
          lineHeight: '20px',
          whiteSpace: 'nowrap',
          opacity: expanded ? 1 : 0,
          maxWidth: expanded ? '100%' : 0,
          overflow: 'hidden',
          transition: expanded
            ? 'opacity 120ms ease 40ms, max-width 180ms cubic-bezier(0.2, 0, 0, 1)'
            : 'opacity 80ms ease, max-width 180ms cubic-bezier(0.2, 0, 0, 1)',
          pointerEvents: expanded ? 'auto' : 'none',
        }}
      >
        {item.title}
      </span>
      {/* Star button — expanded state only. Default opacity is already 0
          (reveals on row hover), so not crossfading this one doesn't produce
          a visible pop. */}
      {expanded && !isFooter && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(item.path);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded transition-opacity",
            starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={{
            color: starred ? '#f59e0b' : 'var(--text-4)',
          }}
          onMouseEnter={(e) => {
            if (!starred) {
              e.currentTarget.style.color = '#f59e0b';
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!starred) {
              e.currentTarget.style.color = 'var(--text-4)';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <Star size={14} fill={starred ? "currentColor" : "none"} />
        </button>
      )}
      {/* Text Badge (AI, NEW, BETA, etc.) */}
      {item.textBadge && (
        <span 
          style={{
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '12px',
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            fontFamily: item.textBadge === 'AI' ? "'Sora', sans-serif" : "'Inter', sans-serif",
            background: item.textBadge === 'AI' 
              ? 'rgba(124, 58, 237, 0.06)'
              : item.textBadgeVariant === 'new' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : item.textBadgeVariant === 'beta'
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'hsl(var(--brand-primary))',
            color: item.textBadge === 'AI'
              ? '#7C3AED'
              : '#ffffff',
            border: item.textBadge === 'AI' ? '1px solid rgba(124, 58, 237, 0.12)' : 'none',
            position: expanded ? 'relative' : 'absolute',
            top: expanded ? 'auto' : '4px',
            right: expanded ? 'auto' : '4px',
            boxShadow: item.textBadge === 'AI' ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
            opacity: expanded ? 1 : 0,
            width: expanded ? 'auto' : '0',
            overflow: 'hidden',
            transition: 'opacity 80ms ease, width 80ms ease',
          }}
        >
          {item.textBadge}
        </span>
      )}
      {/* Numeric badges removed platform-wide per product directive */}
    </button>
  );

  if (!expanded) {
    return (
      <Tooltip key={item.id} content={item.title} position="right">
        {menuButton}
      </Tooltip>
    );
  }

  return <React.Fragment key={item.id}>{menuButton}</React.Fragment>;
}
