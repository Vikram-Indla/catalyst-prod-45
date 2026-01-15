/**
 * SidebarBase — Shared sidebar component with consistent token-based styling
 * 
 * Used by all non-admin sidebars (Product, Release, Enterprise, Program, etc.)
 * All styling uses CSS custom properties for dark/light mode compatibility.
 * 
 * CATALYST V5 HARDENED:
 * - Section headers: Sentence case, text-xs font-medium
 * - Item height: 44px (h-11) for proper touch targets
 * - Icons: 18×18 with strokeWidth 1.75
 * - Active state: 3px left border, bg-blue-50/60, text-brand-primary
 * - Footer separator: border-t border-divider
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

export interface SidebarMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
  /** Optional badge count to display */
  badge?: number;
  /** Badge variant for color styling */
  badgeVariant?: 'info' | 'danger';
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
          'transition-all duration-200 ease-in-out',
          className
        )}
        style={{ 
          width: expanded ? '240px' : '64px',
          background: 'var(--surface-elevated, var(--surface-1))',
          borderRight: '1px solid var(--divider)',
          boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.03)',
          // GPU layer promotion to prevent flicker when portals mount
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Header with collapse toggle */}
        <div 
          className="h-[52px] flex items-center justify-between border-b flex-shrink-0"
          style={{ 
            borderColor: 'var(--divider)',
            padding: expanded ? '0 12px' : '0',
            justifyContent: expanded ? 'space-between' : 'center',
          }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div 
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--brand-primary-hex, #2563eb)',
                color: 'var(--text-inverse, #ffffff)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {config.badge}
            </div>
            {expanded && (
              <span 
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-1)' }}
              >
                {config.label}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
            style={{
              color: 'var(--text-tertiary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--nav-hover-bg)';
              e.currentTarget.style.color = 'var(--text-1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? (
              <ChevronsLeft size={16} />
            ) : (
              <ChevronsRight size={16} />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
          {/* Favorites Section */}
          {config.showFavorites !== false && favoritedItems.length > 0 && !expanded && null}
          {config.showFavorites !== false && favoritedItems.length > 0 && expanded && (
            <div className="mb-4">
              <div className="px-3 pt-3 pb-1">
                <span 
                  className="text-xs font-medium tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
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
              // Don't render empty sections
              if (section.items.length === 0) return null;
              
              return (
                <div key={section.title} className={sectionIndex > 0 ? 'mt-4' : ''}>
                  {/* Section Header - sentence case, only show when expanded */}
                  {expanded && (
                    <div className="px-3 pt-3 pb-1">
                      <span 
                        className="text-xs font-medium tracking-wide"
                        style={{ color: 'var(--text-tertiary)' }}
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
              borderColor: 'var(--divider)', 
              padding: '8px' 
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

  const menuButton = (
    <button
      onClick={() => handleNavigation(item.path)}
      className="group"
      style={{
        width: '100%',
        height: '44px', // 44px = h-11 for proper touch targets
        padding: expanded ? '0 12px' : '0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderRadius: '8px', // rounded-lg
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
        marginBottom: '2px',
        position: 'relative',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent', // bg-blue-50/60 equivalent
        color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground))',
        fontWeight: active ? 500 : 400,
        fontSize: '13px',
        fontFamily: 'inherit',
        outline: 'none',
      }}
      onMouseEnter={(e) => { 
        if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.background = active ? 'rgba(37, 99, 235, 0.08)' : 'transparent'; 
      }}
    >
      {/* Left indicator bar for active state - 3px */}
      {active && (
        <span 
          style={{
            position: 'absolute',
            left: 0,
            top: expanded ? '8px' : '12px',
            bottom: expanded ? '8px' : '12px',
            width: '3px',
            background: 'hsl(var(--brand-primary))',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      {/* Icon container - 18×18 icons */}
      <span 
        className="flex items-center justify-center flex-shrink-0"
        style={{ 
          width: '18px',
          height: '18px',
        }}
      >
        {CustomIcon && (
          <CustomIcon 
            className="h-[18px] w-[18px]" 
            style={{ 
              color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground) / 0.7)',
              strokeWidth: 1.75,
            }}
          />
        )}
      </span>
      {expanded && (
        <>
          <span 
            className="flex-1 text-left truncate"
            style={{ lineHeight: '44px' }}
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
      {/* Text Badge (NEW, BETA, etc.) */}
      {item.textBadge && (
        <span 
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            background: item.textBadgeVariant === 'new' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : item.textBadgeVariant === 'beta'
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'hsl(var(--brand-primary))',
            color: '#ffffff',
            marginRight: expanded ? '0' : '0',
            position: expanded ? 'relative' : 'absolute',
            top: expanded ? 'auto' : '4px',
            right: expanded ? 'auto' : '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {item.textBadge}
        </span>
      )}
      {/* Numeric Badge */}
      {!item.textBadge && item.badge !== undefined && item.badge > 0 && (
        <span 
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '9999px',
            background: item.badgeVariant === 'danger' 
              ? 'hsl(var(--destructive))' 
              : 'hsl(var(--brand-primary))',
            color: item.badgeVariant === 'danger'
              ? 'hsl(var(--destructive-foreground))'
              : 'hsl(var(--primary-foreground))',
            minWidth: '20px',
            height: '20px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: expanded ? '0' : '0',
            position: expanded ? 'relative' : 'absolute',
            top: expanded ? 'auto' : '6px',
            right: expanded ? 'auto' : '6px',
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
          sideOffset={8}
          className="z-[100] bg-popover text-popover-foreground border border-border shadow-md"
        >
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <React.Fragment key={item.id}>{menuButton}</React.Fragment>;
}
