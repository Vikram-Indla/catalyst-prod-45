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
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useMigrateLegacyFavorites } from '@/hooks/useMigrateLegacyFavorites';
import { sidebarStarType } from '@/lib/starType';
import { useTheme } from '@/hooks/useTheme';
import { ProjectIcon } from '@/components/shared/ProjectIcon';

// Hub registry — mirrors AppSwitcher.tsx (which is being retired). Tone
// colors come from Atlassian Design System accent palette; we render the
// icon inside a 16px tinted square so the section reads as "app launcher"
// rather than nav links.
//
// Block A rule 7 (2026-05-01): canonical hub label casing matches HubSwitcher.
// Block A rule 1 (2026-05-01): canonical URL prefix '/product-hub' (not /producthub).
const HUB_ITEMS = [
  { label: 'Home',         href: '/for-you',                    Icon: HomeIcon,            tone: 'var(--ds-icon-subtle)' },
  { label: 'Strategy Hub', href: '/strategyhub',                Icon: OfficeBuildingIcon,  tone: 'var(--ds-icon-accent-purple)' },
  { label: 'Product Hub',  href: '/product-hub',                Icon: PortfolioIcon,       tone: 'var(--ds-icon-brand)' },
  { label: 'Project Hub',  href: '/project-hub',                Icon: FolderIcon,          tone: 'var(--ds-icon-accent-teal)' },
  { label: 'Release Hub',  href: '/release-hub/overview', Icon: ShipIcon,            tone: 'var(--ds-icon-accent-orange)' },
  { label: 'Test Hub',     href: '/testhub/dashboard',          Icon: CheckCircleIcon,     tone: 'var(--ds-icon-accent-green)' },
  { label: 'Incident Hub', href: '/incident-hub',               Icon: WarningIcon,         tone: 'var(--ds-icon-accent-red)' },
  { label: 'Tasks',     href: '/tasks/overview',          Icon: TaskIcon,            tone: 'var(--ds-icon-accent-yellow)' },
  { label: 'Plan Hub',     href: '/planhub',                    Icon: CalendarIcon,        tone: 'var(--ds-icon-accent-magenta)' },
  { label: 'Wiki Hub',     href: '/wiki',                       Icon: BookIcon,            tone: 'var(--ds-icon-accent-lime)' },
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
  '/testhub': () => import('../../pages/testhub/DashboardPage'),
  '/planhub': () => import('../../components/planhub/PlanHubShell'),
  '/tasks': () => import('../../modules/tasks/PlannerPage'),
  '/incidenthub': () => import('../../pages/incidenthub/IncidentListPage'),
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
   * Optional handler for the row's star button. When provided, overrides the
   * built-in star toggle. The built-in default now writes `user_starred_items`
   * (the same store the For You "Starred" tab reads) via `useToggleStar` —
   * item_id = the row's path, item_type = `sidebarStarType(path)`. Provide this
   * only when a row needs custom toggle behaviour (e.g. HomeSidebar "Pinned"
   * rows that resolve their own typed star, or openDetail-backed rows).
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
  /**
   * Plain-string tooltip shown in collapsed rail mode instead of the
   * ReactNode `title`. Allows Recent items to show "Dashboard — BAU"
   * rather than rendering the full LocationRowTitle JSX in the tooltip.
   * Added 2026-06-14: H6 collapsed-mode disambiguation fix.
   */
  tooltip?: string;
}

export interface SidebarSection {
  title: string;
  /**
   * Optional rich header node rendered in place of the plain 11px micro-label.
   * Used by HomeSidebar's space-grouped Recents to render a project avatar
   * (ProjectIcon) + project name as the group header. When set, the default
   * micro-label span is bypassed entirely. `title` is still required as the
   * React key and collapsed-mode fallback. Added 2026-06-17.
   */
  titleNode?: React.ReactNode;
  items: SidebarMenuItem[];
}

export interface SidebarConfig {
  badge: string;
  label: string;
  sections?: SidebarSection[];
  items?: SidebarMenuItem[];
  footerItem?: SidebarMenuItem;
  showFavorites?: boolean;
  /**
   * When true, suppresses the 1px divider drawn between sections. HomeSidebar's
   * space-grouped Recents separates groups with generous whitespace + an avatar
   * header instead of a hairline rule, for a cleaner enterprise read. Other
   * consumers omit this and keep the divider. Added 2026-06-17.
   */
  hideSectionDividers?: boolean;
  /**
   * Optional overline rendered once above ALL sections (expanded only). Used by
   * HomeSidebar to label the space-grouped Recents as "Recent" so they read as
   * recently-visited pages, not nav items. 11px/600/subtlest — the ADS section-
   * label spec. Added 2026-06-18.
   */
  sectionsHeading?: string;
  /** Collapsed-rail icon — pass projectKey so ProjectIcon resolves the bundled avatar */
  badgeProjectKey?: string | null;
  badgeProjectColor?: string | null;
  badgeProjectAvatarUrl?: string | null;
  /** Hub-level icon URL (from HUB_ICON_REGISTRY) shown in header instead of text badge */
  badgeHubIconUrl?: string;
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
  /**
   * When provided, REPLACES the static badge+label header with a custom
   * switcher trigger (e.g. <ContextSwitcher variant="sidebar" />). Receives
   * the current expanded state so the trigger can render icon-only on the
   * collapsed rail. 2026-06-16: product/project/tasks hubs pass this to host
   * the context switcher in the sidebar header instead of the top nav.
   */
  renderHeaderSwitcher?: (expanded: boolean) => React.ReactNode;
  /**
   * Optional custom node pinned to the very bottom of the rail (below the
   * scrollable nav and any footerItem). Unlike footerItem this is free-form,
   * not a nav link — used by HomeSidebar for the dual-zone clock. Other
   * consumers omit it (undefined = nothing rendered). Added 2026-06-18.
   */
  footerSlot?: React.ReactNode;
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
  renderHeaderSwitcher,
  footerSlot,
}: SidebarBaseProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // Sidebar row stars are backed by `user_starred_items` (the SAME store the
  // For You "Starred" tab reads), NOT localStorage. A row starred here surfaces
  // in the Starred hub and vice-versa — single source of truth (2026-06-18).
  const { data: starredIds } = useStarredItemIds();
  const toggleStar = useToggleStar();
  // One-time bridge of legacy localStorage favorites → user_starred_items.
  useMigrateLegacyFavorites();
  const isStarred = React.useCallback(
    (path: string) => !!starredIds?.has(path),
    [starredIds],
  );
  const onStarToggle = React.useCallback(
    (item: SidebarMenuItem) => {
      // Consumer override wins (e.g. HomeSidebar "Pinned" rows that toggle
      // their own user_starred_items row, or openDetail-backed rows).
      if (item.onStarClick) { item.onStarClick(); return; }
      toggleStar.mutate({
        itemId: item.path,
        itemType: sidebarStarType(item.path),
        isCurrentlyStarred: !!starredIds?.has(item.path),
        metadata: { label: plainSidebarLabel(item), route: item.path },
      });
    },
    [starredIds, toggleStar],
  );
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
    itemText: 'var(--cp-text-secondary)',
    activeText: 'var(--cp-text-link, var(--cp-primary-60))',
    activeBg: isDark ? 'var(--ds-background-selected)' : 'var(--ds-background-selected)',
    hoverBg: isDark ? 'var(--ds-background-neutral-subtle-hovered)' : 'var(--ds-surface-sunken, var(--cp-bg-sunken))',
    iconOpacityInactive: isDark ? 0.85 : 0.75,
    badgeBg: isDark ? 'var(--ds-background-neutral-subtle)' : 'var(--ds-background-neutral)',
    badgeText: 'var(--cp-text-tertiary, var(--cp-text-secondary))',
  };

  // Chevron critique (2026-04-19): brand-blue (var(--cp-primary-60) / --cp-blue) violated
  // the CLAUDE.md colour reservation — blue is reserved for the +Create CTA
  // only. Pulled the toggle to neutral muted tokens so the primary blue cue
  // stays unique to the primary action. Hover lifts to text-primary for an
  // affordance pop without reintroducing brand colour.
  const chevronColor = 'var(--cp-text-tertiary, var(--cp-text-secondary))';
  const chevronHoverColor = 'var(--cp-text-primary, var(--cp-text-primary, var(--cp-text-inverse)))';
  // ADS canonical: side-nav uses --ds-surface-raised (rail surface lifts above
  // page bg --ds-background-neutral). Was incorrectly using page bg token.
  const sidebarBg = 'var(--ds-surface-raised, var(--cp-bg-elevated))';
  // ADS canonical: --ds-border is translucent (#a6c5e229 dark / #0b120e24 light)
  const sidebarBorder = 'var(--ds-border, var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral))))';
  const dividerColor = 'var(--ds-border, var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral))))';
  const sectionLabel = 'var(--cp-text-tertiary, var(--cp-text-secondary))';
  const hubLabel = 'var(--cp-text-primary, var(--cp-text-primary, var(--cp-text-inverse)))';

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

  const favoritedItems = allItems.filter(item => item.alwaysStarred || isStarred(item.path));

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
          transition: 'width 200ms cubic-bezier(0, 0, 0.2, 1)',
          willChange: 'width',
          contain: 'layout style',
          scrollbarWidth: 'thin' as any,
          scrollbarColor: isDark ? 'var(--ds-border) transparent' : 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral)) transparent',
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
          style={{
            minHeight: expanded ? '32px' : '40px',
            padding: expanded ? '8px 12px 8px 16px' : '8px 0',
            gap: expanded ? '8px' : '2px',
            background: 'transparent',
            flexDirection: expanded ? 'row' : 'column',
          }}
        >
          {renderHeaderSwitcher ? (
            /* Switcher hosts the badge+label itself (icon-only when collapsed). */
            renderHeaderSwitcher(expanded)
          ) : expanded ? (
            /* Expanded: project icon (if project) + label, optionally clickable */
            onHeaderClick ? (
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
                {config.badgeProjectKey && (
                  <ProjectIcon
                    projectKey={config.badgeProjectKey}
                    avatarUrl={config.badgeProjectAvatarUrl}
                    color={config.badgeProjectColor}
                    size="small"
                  />
                )}
                <span
                  className="truncate"
                  style={{
                    fontFamily: 'var(--cp-font-heading)',
                    fontSize: token('font.size.100', '14px'),
                    fontWeight: 600,
                    color: 'var(--ds-text)',
                    letterSpacing: '-0.3px',
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  {config.label}
                </span>
              </button>
            ) : (
              <React.Fragment>
                {config.badgeProjectKey && (
                  <ProjectIcon
                    projectKey={config.badgeProjectKey}
                    avatarUrl={config.badgeProjectAvatarUrl}
                    color={config.badgeProjectColor}
                    size="small"
                  />
                )}
                {!config.badgeProjectKey && config.badgeHubIconUrl && (
                  <img src={config.badgeHubIconUrl} alt={config.label} style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }} />
                )}
                <span
                  className="truncate"
                  style={{
                    fontFamily: 'var(--cp-font-heading)',
                    fontSize: token('font.size.100', '14px'),
                    fontWeight: 600,
                    color: 'var(--ds-text)',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {config.label}
                </span>
              </React.Fragment>
            )
          ) : (
            /* Icon-only rail: project icon + key stacked vertically */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                width: '100%',
              }}
            >
              {config.badgeProjectKey ? (
                <ProjectIcon
                  projectKey={config.badgeProjectKey}
                  avatarUrl={config.badgeProjectAvatarUrl}
                  color={config.badgeProjectColor}
                  size="medium"
                />
              ) : config.badgeHubIconUrl ? (
                <img src={config.badgeHubIconUrl} alt={config.label} style={{ width: 24, height: 24, display: 'block' }} />
              ) : null}
              {config.badge && !config.badgeHubIconUrl ? (
                <span
                  style={{
                    fontFamily: 'var(--ds-font-family-code, monospace)',
                    fontSize: 'var(--ds-font-size-50)',
                    fontWeight: 700,
                    color: 'var(--ds-text-subtlest)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase' as const,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {config.badge}
                </span>
              ) : null}
            </div>
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
                    color: 'var(--ds-text-subtlest)',
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
                  false, isStarred, onStarToggle, tokens
                ))}
              </div>
            </div>
          )}

          {/* Sections overline — labels the group list (e.g. "Recent") once,
              above all space groups. */}
          {expanded && config.sectionsHeading && config.sections && config.sections.length > 0 && (
            <div style={{ padding: '4px 12px 2px 12px', lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: 'var(--cp-font-body)',
                  color: 'var(--ds-text-subtlest)',
                  fontSize: token('font.size.050', '11px'),
                  fontWeight: 600,
                  letterSpacing: '0',
                  textTransform: 'none' as const,
                  lineHeight: '16px',
                }}
              >
                {config.sectionsHeading}
              </span>
            </div>
          )}

          {config.sections ? (
            config.sections.map((section, sectionIndex) => {
              // A collapsed space group (HomeSidebar) has 0 items but a rich
              // titleNode header that must stay visible so the user can re-expand
              // it. Only drop a section when it has neither rows nor a header.
              if (section.items.length === 0 && !section.titleNode) return null;
              
              return (
                <div key={section.title}>
                  {sectionIndex > 0 && !config.hideSectionDividers && (
                    <div style={{ borderTop: `1px solid ${dividerColor}`, margin: '8px 12px' }} />
                  )}
                  {/* Section header. Rich `titleNode` (e.g. project avatar +
                      name for HomeSidebar's space groups) wins over the plain
                      micro-label. Default micro-label spec: 11px/600/
                      color.text.subtlest — matches Jira admin sidebar section
                      headers (probed 2026-05-19).
                      Source: https://atlassian.design/foundations/typography */}
                  {expanded && section.titleNode ? (
                    section.titleNode
                  ) : expanded && section.title ? (
                    <div
                      style={{
                        padding: '8px 12px 4px 12px',
                        lineHeight: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--cp-font-body)',
                          color: 'var(--ds-text-subtlest)',
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
                  ) : null}
                  {section.items.map((item) => renderMenuItem(
                    item, isActive, iconResolver, expanded, handleNavigation, 
                    false, isStarred, onStarToggle, tokens
                  ))}
                </div>
              );
            })
          ) : (
            config.items?.map((item) => renderMenuItem(
              item, isActive, iconResolver, expanded, handleNavigation, 
              false, isStarred, onStarToggle, tokens
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
              true, isStarred, onStarToggle, tokens
            )}
          </div>
        )}

        {/* Footer slot — free-form pinned node (e.g. HomeSidebar dual-zone
            clock). Sits below the scrollable nav and footerItem. */}
        {footerSlot && (
          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${dividerColor}`,
              padding: '8px 0',
            }}
          >
            {footerSlot}
          </div>
        )}
      </aside>
  );
}

// Plain display label for a star written from a sidebar row. The Starred hub
// renders metadata.label, so derive a real string: prefer the row's plain-text
// tooltip, then a string title, else humanise the path tail. Never a guessed
// domain value — just the literal nav label.
function plainSidebarLabel(item: SidebarMenuItem): string {
  if (item.tooltip) return item.tooltip;
  if (typeof item.title === 'string') return item.title;
  const tail = item.path.split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean).pop();
  if (!tail) return item.path;
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

// Helper function to render a menu item — now receives DarkTokens
function renderMenuItem(
  item: SidebarMenuItem,
  isActive: (path: string, exact?: boolean, activeMatchPaths?: string[]) => boolean,
  iconResolver: ((itemId: string) => React.ComponentType<{ className?: string }> | undefined) | undefined,
  expanded: boolean,
  handleNavigation: (path: string) => void,
  isFooter: boolean = false,
  isStarred: (path: string) => boolean,
  onStarToggle: (item: SidebarMenuItem) => void,
  tk: DarkTokens
) {
  const active = isActive(item.path, item.exact, item.activeMatchPaths);
  const CustomIcon = iconResolver?.(item.id) || item.icon;
  const starred = item.alwaysStarred || isStarred(item.path);

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
      {/* Collapsed rail — active hub left bar. The rail is monochrome
          (neutral hub glyphs); the ACTIVE hub is the only color, expressed as
          a single brand-blue bar + the selected pill. Enterprise mental model:
          color on persistent chrome = "where am I", not per-destination
          identity (2026-06-18 rail color lockdown). */}
      {active && !expanded && !tk.isDark && (
        <span
          data-hub-active-collapsed
          style={{
            position: 'absolute',
            left: 0,
            top: '6px',
            bottom: '6px',
            width: '3px',
            background: 'var(--ds-text-selected)',
            borderRadius: '0 3px 3px 0',
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
            top: '6px',
            bottom: '6px',
            width: '3px',
            background: item.accentColor,
            borderRadius: '0 3px 3px 0',
            opacity: 1,
          }}
        />
      )}
      {/* Icon container — ADS icon color tokens:
          active  → color.icon.brand (var(--ds-link)) — council-approved 2026-05-28
          inactive → color.icon.subtle (var(--ds-text-subtlest))
          Source: https://atlassian.design/foundations/color */}
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '20px',
          height: '20px',
          opacity: 1,
          flexShrink: 0,
          transition: 'color 150ms cubic-bezier(0.15,1,0.3,1)',
        }}
      >
        {CustomIcon && (
          <CustomIcon
            className="h-[20px] w-[20px]"
            style={{
              color: active
                ? 'var(--ds-icon-brand)'
                : 'var(--ds-icon)',
              strokeWidth: 2,
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
            ? 'opacity 120ms ease 40ms, max-width 200ms cubic-bezier(0, 0, 0.2, 1)'
            : 'opacity 80ms ease, max-width 200ms cubic-bezier(0, 0, 0.2, 1)',
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
            onStarToggle(item);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onStarToggle(item);
            }
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded transition-opacity",
            starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={{
            color: starred ? 'var(--ds-text-warning)' : 'var(--text-4)',
          }}
          onMouseEnter={(e) => {
            if (!starred) {
              e.currentTarget.style.color = 'var(--ds-text-warning)';
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
              ? 'var(--ds-background-success-bold)'
              : item.textBadgeVariant === 'beta'
              ? 'linear-gradient(135deg, var(--ds-text-warning) 0%, var(--ds-text-warning) 100%)'
              : 'hsl(var(--brand-primary))',
            color: item.textBadge === 'AI'
              ? 'var(--cp-purple-60)'
              : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
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
      <Tooltip key={item.id} content={item.tooltip ?? item.title} position="right">
        {menuButton}
      </Tooltip>
    );
  }

  return <React.Fragment key={item.id}>{menuButton}</React.Fragment>;
}
