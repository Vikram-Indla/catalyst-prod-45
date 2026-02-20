/**
 * SidebarBase — Shared sidebar component with consistent token-based styling
 * 
 * Used by all non-admin sidebars (Product, Release, Enterprise, Program, etc.)
 * All styling uses CSS custom properties for dark/light mode compatibility.
 * 
 * CATALYST V9.5 NAVIGATION SHELL — Research-Driven Design
 * Based on analysis of 27 enterprise apps (Linear, Stripe, Figma, Vercel, etc.)
 * 
 * Key patterns implemented:
 * - Module badges: NEUTRAL color (#3F3F46) not content colors
 * - Active state: LEFT ACCENT BAR (3px) + subtle background (Linear/Notion pattern)
 * - Text contrast: AAA compliant (15:1 primary, 8.5:1 secondary)
 * - Section labels: 10px UPPERCASE with tracking
 * - Collapsed state: Icon rail with tooltips (Grafana/Datadog pattern)
 * - Item height: 44px for proper touch targets
 * - Icons: 18×18 with strokeWidth 1.75
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Star, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFavorites } from '@/hooks/useFavorites';
import { useTheme } from '@/hooks/useTheme';

export interface SidebarMenuItem {
  id: string;
  title: string | React.ReactNode;
  path: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
  /** Optional badge count to display */
  badge?: number;
  /** Badge variant for color styling */
  badgeVariant?: 'info' | 'danger' | 'purple';
  /** Text badge (e.g., "NEW", "BETA") - takes precedence over numeric badge */
  textBadge?: string;
  /** Text badge variant for color styling */
  textBadgeVariant?: 'new' | 'beta' | 'info';
}

export interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

export interface SidebarConfig {
  /** Badge text shown in the header (e.g., "PR", "EN", "RL") */
  badge: string;
  /** Section label shown when expanded (e.g., "Product", "Enterprise") */
  label: string;
  /** Menu sections to display with headers */
  sections?: SidebarSection[];
  /** Flat menu items (legacy support) */
  items?: SidebarMenuItem[];
  /** Footer item (e.g., Settings) - optional */
  footerItem?: SidebarMenuItem;
  /** Whether to show favorites section */
  showFavorites?: boolean;
}

interface SidebarBaseProps {
  config: SidebarConfig;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  /** Custom icon resolver for menu items */
  iconResolver?: (itemId: string) => React.ComponentType<{ className?: string }> | undefined;
}

export function SidebarBase({ 
  config, 
  expanded, 
  onToggle, 
  className,
  iconResolver 
}: SidebarBaseProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isDark } = useTheme();

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Get all items for favorites lookup
  const allItems = config.sections 
    ? config.sections.flatMap(s => s.items)
    : config.items || [];

  // Favorited items
  const favoritedItems = allItems.filter(item => favorites.includes(item.path));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-full flex-shrink-0 relative flex flex-col overflow-visible',
          className
        )}
        style={{ 
          width: expanded ? '240px' : '64px',
          background: 'var(--sidebar-bg, #FFFFFF)',
          borderRight: '1px solid var(--sidebar-border, #E2E8F0)',
          boxShadow: 'var(--sidebar-shadow, 1px 0 0 rgba(15, 23, 42, 0.06))',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          scrollbarWidth: 'thin' as any,
          scrollbarColor: '#E2E8F0 transparent',
        }}
      >
        {/* V10 Header with collapse toggle */}
        <div 
          className={cn(
            "border-b flex-shrink-0",
            expanded
              ? "flex items-center justify-between"
              : "flex flex-col items-center justify-center"
          )}
          style={{ 
            minHeight: '54px',
            borderColor: 'var(--sidebar-border, #E2E8F0)',
            padding: expanded ? '14px 14px 14px 16px' : '14px 0',
            gap: expanded ? undefined : '4px',
            background: 'transparent',
          }}
        >
          {!expanded ? (
            /* Collapsed: Badge centered + toggle below */
            <>
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {config.badge}
              </div>
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-[26px] h-[26px] rounded transition-all flex-shrink-0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }}
                aria-label="Expand sidebar"
              >
                <ChevronsRight size={15} />
              </button>
            </>
          ) : (
            /* Expanded: Badge + Label + Toggle */
            <>
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                {/* V10: Circular badge (borderRadius 50%) — 28×28 */}
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  {config.badge}
                </div>
                <span 
                  className="truncate"
                  style={{ 
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {config.label}
                </span>
              </div>
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-[26px] h-[26px] rounded transition-all flex-shrink-0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }}
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft size={15} />
              </button>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
          {/* Favorites Section */}
          {config.showFavorites !== false && favoritedItems.length > 0 && !expanded && null}
          {config.showFavorites !== false && favoritedItems.length > 0 && expanded && (
            <div className="mb-4">
              {/* Section Label — 10px UPPERCASE per Linear/Stripe pattern */}
              <div className="px-3 pt-3 pb-1.5">
                <span 
                  style={{ 
                    fontFamily: "'Sora', sans-serif",
                    color: 'var(--sidebar-section-label, #94A3B8)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase' as const,
                    lineHeight: 1,
                  }}
                >
                  Favorites
                </span>
              </div>
              <div>
                {favoritedItems.map((item) => renderMenuItem(
                  item, 
                  isActive, 
                  iconResolver, 
                  expanded, 
                  handleNavigation, 
                  false,
                  isFavorite,
                  toggleFavorite
                ))}
              </div>
            </div>
          )}

          {/* Render sections if provided, otherwise render flat items */}
          {config.sections ? (
            config.sections.map((section, sectionIndex) => {
              if (section.items.length === 0) return null;
              
              return (
                <div key={section.title}>
                  {/* Collapsed: section divider between groups */}
                  {!expanded && sectionIndex > 0 && (
                    <div style={{ borderTop: '1px solid var(--sidebar-divider, #F1F5F9)', marginTop: '4px', paddingTop: '4px' }} />
                  )}
                  {/* Section Header — V11: Sora, 10px, uppercase, #94A3B8 */}
                  {expanded && section.title && (
                    <div 
                      style={{ 
                        padding: '14px 10px 6px 10px',
                        lineHeight: 1,
                        marginTop: sectionIndex > 0 ? '8px' : '0',
                      }}
                    >
                      <span 
                        style={{ 
                          fontFamily: "'Sora', sans-serif",
                          color: 'var(--sidebar-section-label, #94A3B8)',
                          fontSize: '10px',
                          fontWeight: 600,
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase' as const,
                        }}
                      >
                        {section.title}
                      </span>
                    </div>
                  )}
                  {section.items.map((item) => renderMenuItem(
                    item, 
                    isActive, 
                    iconResolver, 
                    expanded, 
                    handleNavigation, 
                    false,
                    isFavorite,
                    toggleFavorite
                  ))}
                </div>
              );
            })
          ) : (
            config.items?.map((item) => renderMenuItem(
              item, 
              isActive, 
              iconResolver, 
              expanded, 
              handleNavigation, 
              false,
              isFavorite,
              toggleFavorite
            ))
          )}
        </nav>

        {/* Footer Item (e.g., Settings) - with separator */}
        {config.footerItem && (
          <div 
            className="border-t pt-2 mt-2"
            style={{ 
              borderColor: 'var(--sidebar-divider, #F1F5F9)', 
              padding: '6px 8px' 
            }}
          >
            {renderMenuItem(
              config.footerItem, 
              isActive, 
              iconResolver, 
              expanded, 
              handleNavigation, 
              true,
              isFavorite,
              toggleFavorite
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

// Helper function to render a menu item
function renderMenuItem(
  item: SidebarMenuItem,
  isActive: (path: string, exact?: boolean) => boolean,
  iconResolver: ((itemId: string) => React.ComponentType<{ className?: string }> | undefined) | undefined,
  expanded: boolean,
  handleNavigation: (path: string) => void,
  isFooter: boolean = false,
  isFavorite: (path: string) => boolean,
  toggleFavorite: (path: string) => void
) {
  const active = isActive(item.path, item.exact);
  const CustomIcon = iconResolver?.(item.id) || item.icon;
  const starred = isFavorite(item.path);

  // V10: Calculate hover/active states
  const getBgColor = (isActive: boolean, isHovered: boolean) => {
    if (isActive) return 'rgba(37, 99, 235, 0.12)'; // ~12% opacity
    if (isHovered) return 'rgba(37, 99, 235, 0.06)'; // ~6% opacity
    return 'transparent';
  };

  const menuButton = (
    <button
      onClick={() => handleNavigation(item.path)}
      className="group w-full flex items-center border-none cursor-pointer transition-all relative"
      style={{
        height: '36px',
        padding: expanded ? '0 10px' : '0',
        gap: '10px',
        marginBottom: '2px',
        fontSize: '13px',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--sidebar-item-active-text, #2563EB)' : 'var(--sidebar-item-text, #334155)',
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active ? 'var(--sidebar-item-active-bg, #EFF6FF)' : 'transparent',
        lineHeight: 1,
        borderRadius: '6px',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
          e.currentTarget.style.color = '#0F172A';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? 'var(--sidebar-item-active-bg, #EFF6FF)' : 'transparent';
        e.currentTarget.style.color = active ? 'var(--sidebar-item-active-text, #2563EB)' : 'var(--sidebar-item-text, #334155)';
      }}
    >
      {/* V11: Left Accent Bar — 3px, inset, only when expanded and active */}
      {active && expanded && (
        <span 
          style={{
            position: 'absolute',
            left: 0,
            top: '5px',
            bottom: '5px',
            width: '3px',
            background: 'var(--sidebar-accent-bar, #2563EB)',
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
      {/* V10: Icon container - 17×17 icons */}
      <span 
        className="flex items-center justify-center flex-shrink-0"
        style={{ 
          width: '17px',
          height: '17px',
          opacity: active ? 1.0 : 0.65,
          transition: 'opacity 150ms ease',
        }}
      >
        {CustomIcon && (
          <CustomIcon 
            className="h-[17px] w-[17px]" 
            style={{ 
              color: active ? 'var(--sidebar-item-active-text, #2563EB)' : 'var(--sidebar-item-text, #334155)',
              strokeWidth: 1.4,
            }}
          />
        )}
      </span>
      {expanded && (
        <>
          <span 
            className="flex-1 text-left"
            style={{ lineHeight: '44px', whiteSpace: 'nowrap' }}
          >
            {item.title}
          </span>
          {/* Star button - show on hover */}
          {!isFooter && (
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
        </>
      )}
      {/* Text Badge (AI, NEW, BETA, etc.) — V11 AI badge styling */}
      {item.textBadge && (
        <span 
          style={{
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '10px',
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
      {/* Numeric Badge — V11: JetBrains Mono, contextual colors */}
      {!item.textBadge && item.badge !== undefined && item.badge > 0 && (
        <span 
          style={{
            fontSize: '10px',
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            padding: '1px 6px',
            borderRadius: '10px',
            background: active 
              ? '#DBEAFE'
              : item.badgeVariant === 'danger' 
              ? 'hsl(var(--destructive))' 
              : item.badgeVariant === 'purple'
              ? '#F5F3FF'
              : '#F1F5F9',
            color: active 
              ? '#2563EB'
              : item.badgeVariant === 'danger'
              ? 'hsl(var(--destructive-foreground))'
              : item.badgeVariant === 'purple'
              ? '#7C3AED'
              : '#94A3B8',
            minWidth: expanded ? '20px' : '0',
            height: '20px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: expanded ? 'relative' : 'absolute',
            top: expanded ? 'auto' : '6px',
            right: expanded ? 'auto' : '6px',
            opacity: expanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'opacity 80ms ease',
          }}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </button>
  );

  if (!expanded) {
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          {menuButton}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          sideOffset={10}
          className="z-[200]"
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.06)',
          }}
        >
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <React.Fragment key={item.id}>{menuButton}</React.Fragment>;
}
