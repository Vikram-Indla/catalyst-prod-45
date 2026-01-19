/**
 * CatalystSidebar — Platform-Wide Navigation Sidebar (V5 Spec)
 * 
 * Dark slate theme (#1e293b) with blue accents (#3b82f6)
 * Follows Catalyst V5 Design System specification
 * 
 * Features:
 * - Contextual navigation based on current module
 * - Collapsible with smooth transitions
 * - Badge support (count + variants)
 * - Hover micro-interactions
 * - Full accessibility support (ARIA, keyboard nav)
 * - Responsive behavior
 */

import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SidebarContext {
  id: string;           // e.g., "releases", "testing", "strategy"
  label: string;        // e.g., "Releases"
  abbreviation: string; // e.g., "RL"
  color: string;        // e.g., "#2563eb"
}

export interface SidebarBadge {
  count: number;
  variant: 'primary' | 'danger' | 'warning' | 'success';
}

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: SidebarBadge;
  exact?: boolean;
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

export interface CatalystSidebarProps {
  context: SidebarContext;
  sections: SidebarSection[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS TOKENS (V5 Spec)
// ═══════════════════════════════════════════════════════════════════════════

const sidebarTokens = {
  // Colors
  bg: '#1e293b',              // slate-800
  bgHover: '#334155',         // slate-700
  bgActive: '#3b82f6',        // blue-500
  bgActiveSubtle: 'rgba(59, 130, 246, 0.15)',
  text: '#94a3b8',            // slate-400
  textHover: '#e2e8f0',       // slate-200
  textActive: '#ffffff',
  border: '#334155',          // slate-700
  sectionText: '#64748b',     // slate-500
  
  // Badge colors
  badgePrimary: '#2563eb',
  badgeDanger: '#ef4444',
  badgeWarning: '#d97706',
  badgeSuccess: '#0d9488',
  
  // Dimensions
  widthExpanded: 240,
  widthCollapsed: 64,
  headerHeight: 56,
  
  // Spacing
  paddingX: 12,
  paddingY: 16,
  itemPaddingX: 12,
  itemPaddingY: 8,
  itemGap: 12,
  sectionGap: 24,
  iconSize: 20,
  
  // Radii
  radiusItem: 8,
  radiusBadge: 9999,
  radiusContext: 6,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function CatalystSidebar({
  context,
  sections,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
}: CatalystSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  
  const location = useLocation();
  const navigate = useNavigate();

  const handleToggle = useCallback(() => {
    const newValue = !collapsed;
    setInternalCollapsed(newValue);
    onCollapsedChange?.(newValue);
  }, [collapsed, onCollapsedChange]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        role="navigation"
        aria-label={`${context.label} navigation`}
        data-collapsed={collapsed}
        className={cn(
          'h-screen flex flex-col flex-shrink-0 overflow-hidden font-sans',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          className
        )}
        style={{
          width: collapsed ? sidebarTokens.widthCollapsed : sidebarTokens.widthExpanded,
          backgroundColor: sidebarTokens.bg,
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <SidebarHeader
          context={context}
          collapsed={collapsed}
          onToggle={handleToggle}
        />
        
        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden"
          aria-label={`${context.label} navigation`}
          style={{
            padding: `${sidebarTokens.paddingY}px ${sidebarTokens.paddingX}px`,
          }}
        >
          {sections.map((section, index) => (
            <SidebarSectionComponent
              key={section.id}
              section={section}
              collapsed={collapsed}
              isActive={isActive}
              onNavigate={handleNavigation}
              isFirst={index === 0}
            />
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarHeaderProps {
  context: SidebarContext;
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarHeader({ context, collapsed, onToggle }: SidebarHeaderProps) {
  const [hoverToggle, setHoverToggle] = useState(false);
  
  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{
        height: sidebarTokens.headerHeight,
        padding: `0 ${sidebarTokens.paddingX}px`,
        borderBottom: `1px solid ${sidebarTokens.border}`,
      }}
    >
      {/* Context indicator */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: sidebarTokens.radiusContext,
            backgroundColor: context.color,
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {context.abbreviation}
        </div>
        
        {!collapsed && (
          <span
            className="text-sm font-medium truncate transition-opacity duration-200"
            style={{ color: sidebarTokens.textActive }}
          >
            {context.label}
          </span>
        )}
      </div>
      
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setHoverToggle(true)}
        onMouseLeave={() => setHoverToggle(false)}
        className="flex items-center justify-center flex-shrink-0 transition-all duration-150"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: hoverToggle ? sidebarTokens.bgHover : 'transparent',
          color: hoverToggle ? sidebarTokens.textHover : sidebarTokens.text,
          border: 'none',
          cursor: 'pointer',
        }}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronsRight size={20} style={{ transition: 'transform 0.3s ease' }} />
        ) : (
          <ChevronsLeft size={20} style={{ transition: 'transform 0.3s ease' }} />
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarSectionComponentProps {
  section: SidebarSection;
  collapsed: boolean;
  isActive: (href: string, exact?: boolean) => boolean;
  onNavigate: (href: string) => void;
  isFirst: boolean;
}

function SidebarSectionComponent({
  section,
  collapsed,
  isActive,
  onNavigate,
  isFirst,
}: SidebarSectionComponentProps) {
  return (
    <div
      role="group"
      aria-labelledby={`section-${section.id}`}
      style={{
        marginTop: isFirst ? 0 : sidebarTokens.sectionGap,
      }}
    >
      {/* Section header - only show when expanded */}
      {!collapsed && (
        <div
          id={`section-${section.id}`}
          className="uppercase tracking-wider"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: sidebarTokens.sectionText,
            padding: `0 ${sidebarTokens.itemPaddingX}px`,
            marginBottom: 8,
            letterSpacing: '0.05em',
          }}
        >
          {section.label}
        </div>
      )}
      
      {/* Section items */}
      <div>
        {section.items.map((item) => (
          <SidebarItemComponent
            key={item.id}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href, item.exact)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarItemComponentProps {
  item: SidebarItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate: (href: string) => void;
}

function SidebarItemComponent({
  item,
  collapsed,
  isActive,
  onNavigate,
}: SidebarItemComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;
  
  const getBackgroundStyle = () => {
    if (isActive) {
      return `linear-gradient(90deg, ${sidebarTokens.bgActive} 0%, ${sidebarTokens.bgActiveSubtle} 100%)`;
    }
    if (isHovered) {
      return sidebarTokens.bgHover;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (isActive) return sidebarTokens.textActive;
    if (isHovered) return sidebarTokens.textHover;
    return sidebarTokens.text;
  };

  const getBadgeColor = (variant: SidebarBadge['variant']) => {
    switch (variant) {
      case 'danger': return sidebarTokens.badgeDanger;
      case 'warning': return sidebarTokens.badgeWarning;
      case 'success': return sidebarTokens.badgeSuccess;
      default: return sidebarTokens.badgePrimary;
    }
  };

  const button = (
    <button
      onClick={() => onNavigate(item.href)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center w-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2"
      style={{
        gap: sidebarTokens.itemGap,
        padding: collapsed 
          ? `${sidebarTokens.itemPaddingY}px 0` 
          : `${sidebarTokens.itemPaddingY}px ${sidebarTokens.itemPaddingX + (isHovered && !isActive ? 4 : 0)}px`,
        paddingLeft: isHovered && !isActive && !collapsed 
          ? sidebarTokens.itemPaddingX + 4 
          : collapsed ? 0 : sidebarTokens.itemPaddingX,
        borderRadius: sidebarTokens.radiusItem,
        background: getBackgroundStyle(),
        color: getTextColor(),
        fontSize: 14,
        fontWeight: isActive ? 500 : 400,
        textDecoration: 'none',
        cursor: 'pointer',
        border: 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        // @ts-ignore - ring color
        '--tw-ring-color': sidebarTokens.bgActive,
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon */}
      {Icon && (
        <span
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: sidebarTokens.iconSize,
            height: sidebarTokens.iconSize,
          }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: getTextColor() }}
          />
        </span>
      )}
      
      {/* Label */}
      {!collapsed && (
        <span className="flex-1 text-left truncate">
          {item.label}
        </span>
      )}
      
      {/* Badge */}
      {item.badge && (
        <span
          style={{
            minWidth: collapsed ? 16 : 20,
            height: collapsed ? 16 : 20,
            padding: collapsed ? '0 4px' : '0 6px',
            borderRadius: sidebarTokens.radiusBadge,
            fontSize: collapsed ? 10 : 11,
            fontWeight: 500,
            backgroundColor: getBadgeColor(item.badge.variant),
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: collapsed ? 'absolute' : 'relative',
            top: collapsed ? 4 : 'auto',
            right: collapsed ? 4 : 'auto',
          }}
        >
          {item.badge.count > 99 ? '99+' : item.badge.count}
        </span>
      )}
    </button>
  );

  // Show tooltip when collapsed
  if (collapsed) {
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="z-[100] bg-slate-800 text-slate-100 border-slate-700"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export default CatalystSidebar;
