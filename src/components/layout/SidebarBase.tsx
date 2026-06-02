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
import { token } from '@atlaskit/tokens';
import { useLocation, useNavigate } from 'react-router-dom';
import { hubAccentToken } from '@/lib/hub-tone';
import { PanelLeftClose, PanelLeftOpen, Star, LucideIcon } from '@/lib/atlaskit-icons';
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
//
// Block A rule 7 (2026-05-01): canonical hub label casing matches HubSwitcher.
// Block A rule 1 (2026-05-01): canonical URL prefix '/product-hub' (not /producthub).
const HUB_ITEMS = [
  { label: 'Home',         href: '/for-you',                    Icon: HomeIcon,            tone: 'var(--ds-icon-subtle, #42526E)' },
  { label: 'Strategy Hub', href: '/strategyhub',                Icon: OfficeBuildingIcon,  tone: 'var(--ds-icon-accent-purple, #8270DB)' },
  { label: 'Product Hub',  href: '/product-hub',                Icon: PortfolioIcon,       tone: 'var(--ds-icon-brand, #0052CC)' },
  { label: 'Project Hub',  href: '/project-hub',                Icon: FolderIcon,          tone: 'var(--ds-icon-accent-teal, #00A3BF)' },
  { label: 'Release Hub',  href: '/release-hub/command-center', Icon: ShipIcon,            tone: 'var(--ds-icon-accent-orange, #FF8B00)' },
  { label: 'Test Hub',     href: '/testhub/dashboard',          Icon: CheckCircleIcon,     tone: 'var(--ds-icon-accent-green, #36B37E)' },
  { label: 'Incident Hub', href: '/incident-hub',               Icon: WarningIcon,         tone: 'var(--ds-icon-accent-red, #DE350B)' },
  { label: 'Task Hub',     href: '/tasks/board',             Icon: TaskIcon,            tone: 'var(--ds-icon-accent-yellow, #FFAB00)' },
  { label: 'Plan Hub',     href: '/planhub',                    Icon: CalendarIcon,        tone: 'var(--ds-icon-accent-magenta, #E774BB)' },
  { label: 'Wiki Hub',     href: '/wiki',                       Icon: BookIcon,            tone: 'var(--ds-icon-accent-lime, #65BA43)' },
] as const;

/**
 * Route-to-chunk prefetch map — preload lazy page chunks on sidebar hover
 * so navigation feels instant. Each entry maps a route prefix to the
 * dynamic import() that Vite will resolve to the same chunk as the lazy().
 */
const ROUTE_PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  '/project-hub/projects': () => import('../../pages/project-hub/AllProjectsPage'),
  '/admin/resources': () => import('../../pages/ResourceListingPage'),
  '/releasehub': () => import('../../pages/releasehub/AllReleasesPage'),
  '/testhub': () => import('../../modules-dormant/testhub/TestHubPage'),
  '/planhub': () => import('../../components/planhub/PlanHubShell'),
  '/tasks': () => import('../../modules/tasks/PlannerPage'),
  '/incidenthub': () => import('../../pages/incidenthub/IncidentListPage'),
  '/strategyhub': () => import('../../modules-dormant/strategyhub/StrategicThemesPage'),
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
  /**
   * Optional click handler — when provided, takes precedence over the
   * default `handleNavigation(item.path)`. Added April 2026 so HomeSidebar
   * "Pinned" rows can call `openDetail()` (drawer) instead of navigating
   * to a route. Existing consumers ignore this prop and keep their
   * navigation-by-path behaviour.
   */
  onClick?: () => void;
  /**
   * Optional handler for the row's star button. When provided, overrides
   * the built-in path-based `toggleFavorite` (which writes to the
   * SidebarBase favorites store / localStorage). Added April 2026 so
   * HomeSidebar's "Pinned" rows — which represent rows in the
   * `user_starred_items` Supabase table, NOT the path-based favorite
   * system — can call `useToggleStar.mutate` to unpin themselves. Other
   * consumers ignore this prop and keep their existing toggleFavorite
   * behaviour.
   */
  onStarClick?: () => void;
  /**
   * Optional project/hub accent color for the persistent left identity bar.
   * When set, a 3px colored bar renders on the left edge of the row at all
   * times (not just active state) — giving each Recent item a distinct
   * project identity. Value comes from ph_projects.color (data-driven,
   * not a hardcoded design token). Falls back to transparent when null.
   * Added 2026-05-28: HomeSidebar Recent items identity redesign.
   */
  accentColor?: string;
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
  /** When provided, the header badge+label area becomes a clickable switcher trigger */
  onHeaderClick?: () => void;
}

/** Dark mode token set — passed to renderMenuItem */
interface DarkTokens {
  isDark: boolean;
  itemText: string;
  activeText: string;
  activeBg: string;
  hoverBg: string;
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
  onHeaderClick,
}: SidebarBaseProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isDark } = useTheme();

  // Dark mode token helpers — ADS Side-Nav Canonical Parity (2026-04-29)
  // Source of truth: @atlaskit/navigation-system side-nav.compiled.css and
  // @atlaskit/side-navigation button-item.compiled.css. Drift fixed:
  //   - Surface: was --ds-background-neutral (page bg), now --ds-surface (rail bg)
  //   - Border: was opaque #38414A, now translucent --ds-border
  //   - Inactive text: was --ds-text (loud), now --ds-text-subtle (ADS spec)
  //   - Hover: ADS does NOT promote text color on hover; only bg changes
  // Light-mode hex untouched ("do not touch light mode tokens. zero impact").
  const tokens: DarkTokens = {
    isDark,
    itemText: 'var(--cp-text-secondary, #42526E)',
    activeText: 'var(--cp-text-link, var(--cp-primary-60, #0052CC))',
    activeBg: isDark ? 'var(--ds-background-selected, #1C2B41)' : 'var(--ds-background-selected, #E9F2FF)',
    hoverBg: isDark ? 'var(--ds-background-neutral-subtle-hovered, #A1BDD914)' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))',
    iconOpacityInactive: isDark ? 0.85 : 0.75,
    badgeBg: isDark ? 'var(--ds-background-neutral-subtle, #22272B)' : 'var(--ds-background-neutral, #EBECF0)',
    badgeText: 'var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))',
  };

  // Chevron critique (2026-04-19): brand-blue (var(--cp-primary-60, #0052CC) / --cp-blue) violated
  // the CLAUDE.md colour reservation — blue is reserved for the +Create CTA
  // only. Pulled the toggle to neutral muted tokens so the primary blue cue
  // stays unique to the primary action. Hover lifts to text-primary for an
  // affordance pop without reintroducing brand colour.
  const chevronColor = 'var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))';
  const chevronHoverColor = 'var(--cp-text-primary, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))';
  // ADS canonical: side-nav uses --ds-surface-raised (rail surface lifts above
  // page bg --ds-background-neutral). Was incorrectly using page bg token.
  const sidebarBg = 'var(--ds-surface-raised, var(--cp-bg-elevated, #ffffff))';
  // ADS canonical: --ds-border is translucent (#a6c5e229 dark / #0b120e24 light)
  const sidebarBorder = 'var(--ds-border, var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))))';
  const dividerColor = 'var(--ds-border, var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))))';
  const sectionLabel = 'var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))';
  const hubLabel = 'var(--cp-text-primary, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))';

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
          width: expanded ? '220px' : '56px',
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
          scrollbarColor: isDark ? 'var(--ds-border, #454545) transparent' : 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)) transparent',
        }}
      >
        {/* Header — hub badge + label only. The collapse toggle now lives
            exclusively in CatalystHeader (top-nav) in BOTH sidebar states,
            so the chevron anchors on a fixed Y axis (Jira parity). Previously
            this header mounted a second chevron when expanded and the edge-
            reveal owned it when hidden, causing the chevron to "hop" 54px
            down on expand. Removed entirely — single source of truth. */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center",
            expanded ? "justify-start" : "justify-center"
          )}
          // May 2026: Badge (H) removed. Text-only header with ADS-compliant
          // typography. Header height reduced from 48px to 32px, reclaiming 16px
          // for nav items. Padding adjusted to 8px per ADS 4/8dp rhythm.
          style={{
            minHeight: '32px',
            padding: expanded ? '8px 12px 8px 16px' : '8px 0',
            gap: expanded ? '8px' : '4px',
            background: 'transparent',
          }}
        >
          {onHeaderClick ? (
            <button
              onClick={onHeaderClick}
              title={config.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                minWidth: 0,
                flex: 1,
              }}
            >
              {expanded && (
                <span
                  className="truncate"
                  style={{
                    fontFamily: 'var(--cp-font-heading)',
                    fontSize: token('font.size.100', '14px'),
                    fontWeight: 600,
                    color: 'var(--ds-text, #292A2E)',
                    letterSpacing: '-0.3px',
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  {config.label}
                </span>
              )}
            </button>
          ) : (
            <>
              {expanded && (
                <span
                  className="truncate"
                  style={{
                    fontFamily: 'var(--cp-font-heading)',
                    fontSize: token('font.size.100', '14px'),
                    fontWeight: 600,
                    color: 'var(--ds-text, #292A2E)',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {config.label}
                </span>
              )}
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
          {/* Hubs Section removed (Apr 2026): app launcher lives exclusively
              in the top-nav HubSwitcher popup. Sidebar no longer duplicates it. */}

          {/* Favorites Section */}
          {config.showFavorites !== false && favoritedItems.length > 0 && !expanded && null}
          {config.showFavorites !== false && favoritedItems.length > 0 && expanded && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ padding: '12px 12px 4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--cp-font-body)',
                    color: 'var(--ds-text-subtlest, #626F86)',
                    fontSize: token('font.size.050', '11px'),
                    fontWeight: 600,
                    letterSpacing: '0',
                    textTransform: 'none' as const,
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
                  {/* Section header — ADS rail micro-label spec:
                      11px/600/color.text.subtlest — matches Jira admin
                      sidebar section headers (probed 2026-05-19).
                      Previously 14px/400/color.text — no hierarchy vs items.
                      Source: https://atlassian.design/foundations/typography */}
                  {expanded && section.title && (
                    <div
                      style={{
                        padding: '8px 12px 4px 12px',
                        lineHeight: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--cp-font-body)',
                          color: 'var(--ds-text-subtlest, #626F86)',
                          fontSize: token('font.size.050', '11px'),
                          fontWeight: 600,
                          letterSpacing: '0',
                          textTransform: 'none' as const,
                          lineHeight: '16px',
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
            style={{
              borderTop: `1px solid ${dividerColor}`,
              marginTop: 8,
              padding: '8px',
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
      onClick={() => (item.onClick ? item.onClick() : handleNavigation(item.path))}
      aria-current={active ? 'page' : undefined}
      className="group w-full flex items-center border-none cursor-pointer transition-all relative"
      style={{
        // minHeight instead of height so 2-line titles (HomeSidebar Recent)
        // expand naturally without clipping. ADS interactive row: 40px min.
        // Single-line items visually sit at ~32px with 4px v-padding.
        minHeight: '40px',
        padding: expanded ? '4px 12px 4px 12px' : '4px 0',
        gap: '8px',
        marginBottom: '0',
        fontSize: token('font.size.100', '14px'),
        fontWeight: active ? 600 : 500,
        color: active ? tk.activeText : tk.itemText,
        fontFamily: 'var(--cp-font-body)',
        outline: 'none',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active ? tk.activeBg : 'transparent',
        lineHeight: 1,
        borderRadius: '4px',
        letterSpacing: '0',
        // ADS hover motion: cubic-bezier(0.15,1,0.3,1) 150ms
        // Source: https://atlassian.design/foundations/motion
        transition: 'background 150ms cubic-bezier(0.15,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        prefetchRoute(item.path);
        if (!active) {
          e.currentTarget.style.background = tk.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? tk.activeBg : 'transparent';
      }}
    >
      {/* Left Accent Bar — DARK ONLY. Removed in dark mode (2026-04-29) to
          match ADS canonical Item: Atlaskit's button-item ships zero left
          decoration; selection is conveyed by --ds-background-selected +
          --ds-text-selected only. Light mode keeps the Catalyst accent bar
          per the "do not touch light mode tokens" directive. */}
      {active && expanded && !tk.isDark && (
        <span
          data-hub-accent
          style={{
            position: 'absolute',
            left: 0,
            top: '4px',
            bottom: '4px',
            width: '3px',
            // Step 7.6 — sidebar accent bar echoes the active hub's tile
            // colour from the HubSwitcher. Turns "colourful popover" into
            // a navigation language that lives in two places.
            background: hubAccentToken(item.path),
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
      {/* Project identity bar — always-on, light mode only.
          Renders when item.accentColor is set (HomeSidebar Recent items).
          Color is data-driven from ph_projects.color — NOT a hardcoded
          design value. Each recent row gets its project's brand color as
          a persistent left spine, giving instant project recognition
          without avatars. ADS anchor: color.icon.brand pattern + hub-tone
          language (2026-05-28 identity redesign). */}
      {!active && item.accentColor && expanded && !tk.isDark && (
        <span
          data-project-accent
          style={{
            position: 'absolute',
            left: 0,
            top: '6px',
            bottom: '6px',
            width: '3px',
            background: item.accentColor,
            borderRadius: '0 3px 3px 0',
            opacity: 0.6,
            transition: 'opacity 150ms cubic-bezier(0.15,1,0.3,1)',
          }}
        />
      )}
      {/* Project identity bar — active state: full opacity */}
      {active && item.accentColor && expanded && !tk.isDark && (
        <span
          data-project-accent-active
          style={{
            position: 'absolute',
            left: 0,
            top: '4px',
            bottom: '4px',
            width: '3px',
            background: item.accentColor,
            borderRadius: '0 3px 3px 0',
            opacity: 1,
          }}
        />
      )}
      {/* Icon container — ADS icon color tokens:
          active  → color.icon.brand (#0052CC) — council-approved 2026-05-28
          inactive → color.icon.subtle (#6B778C)
          Source: https://atlassian.design/foundations/color */}
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '16px',
          height: '16px',
          opacity: 1,
          flexShrink: 0,
          transition: 'color 150ms cubic-bezier(0.15,1,0.3,1)',
        }}
      >
        {CustomIcon && (
          <CustomIcon
            className="h-[16px] w-[16px]"
            style={{
              // ADS canonical: color.icon.brand for active, color.icon.subtle
              // for inactive. Raw hex used as token() not available in this
              // file — values match ADS light-mode token resolution.
              color: active
                ? 'var(--ds-icon-brand, #0052CC)'
                : 'var(--ds-icon-subtle, #6B778C)',
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
          minWidth: 0,
          opacity: expanded ? 1 : 0,
          maxWidth: expanded ? '100%' : 0,
          transition: expanded
            ? 'opacity 120ms ease 40ms, max-width 180ms cubic-bezier(0.2, 0, 0, 1)'
            : 'opacity 80ms ease, max-width 180ms cubic-bezier(0.2, 0, 0, 1)',
          pointerEvents: expanded ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      >
        {item.title}
      </span>
      {/* Star button — expanded state only. Default opacity is already 0
          (reveals on row hover), so not crossfading this one doesn't produce
          a visible pop. */}
      {expanded && !isFooter && (
        /* jira-compare S-63 (2026-04-28): nested <button> inside the
           sidebar row's outer <button> violates HTML semantics. Use a
           span with role="button" + tabIndex so a11y stays intact. */
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.onStarClick) {
              item.onStarClick();
            } else {
              toggleFavorite(item.path);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (item.onStarClick) {
                item.onStarClick();
              } else {
                toggleFavorite(item.path);
              }
            }
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded transition-opacity",
            starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={{
            color: starred ? 'var(--ds-text-warning, #f59e0b)' : 'var(--text-4)',
          }}
          onMouseEnter={(e) => {
            if (!starred) {
              e.currentTarget.style.color = 'var(--ds-text-warning, #f59e0b)';
              e.currentTarget.style.background = 'var(--ds-background-warning-subtle, rgba(245,158,11,0.1))';
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
        </span>
      )}
      {/* Text Badge (AI, NEW, BETA, etc.) */}
      {item.textBadge && (
        <span
          style={{
            // ADS font.size.050 = 11px — smallest rail label token
            // Source: https://atlassian.design/foundations/typography
            fontSize: token('font.size.050', '11px'),
            fontWeight: 600,
            // ADS 4/8dp spacing grid — 0 vertical, 4px horizontal
            padding: '0 4px',
            borderRadius: '12px',
            letterSpacing: '0.3px',
            // UPPERCASE_LABEL banned (CLAUDE.md) — sentence case only
            textTransform: 'none' as const,
            fontFamily: item.textBadge === 'AI' ? 'var(--cp-font-heading)' : 'var(--cp-font-body)',
            background: item.textBadge === 'AI'
              // ADS color.background.accent.purple.subtlest
              ? 'var(--ds-background-accent-purple-subtlest, rgba(124,58,237,0.06))'
              : item.textBadgeVariant === 'new'
              // ADS color.background.success.bold
              ? 'var(--ds-background-success-bold, #1F845A)'
              : item.textBadgeVariant === 'beta'
              ? 'linear-gradient(135deg, var(--ds-text-warning, #f59e0b) 0%, var(--ds-text-warning, #d97706) 100%)'
              : 'hsl(var(--brand-primary))',
            color: item.textBadge === 'AI'
              ? 'var(--cp-purple-60, #7C3AED)'
              : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
            // ADS color.border.accent.purple
            border: item.textBadge === 'AI' ? '1px solid var(--ds-border-accent-purple, rgba(124,58,237,0.12))' : 'none',
            position: expanded ? 'relative' : 'absolute',
            top: expanded ? 'auto' : '4px',
            right: expanded ? 'auto' : '4px',
            // ADS elevation.shadow.raised
            boxShadow: item.textBadge === 'AI' ? 'none' : 'var(--ds-shadow-raised, 0 1px 2px rgba(0,0,0,0.1))',
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
