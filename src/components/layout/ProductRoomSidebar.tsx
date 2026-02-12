/**
 * ProductRoomSidebar — Product module sidebar inheriting SidebarBase styling
 * 
 * Uses the same token-based styling as EnterpriseSidebar (Strategy Room)
 * with custom collapsible Ideas group.
 * 
 * CATALYST V9.5 NAVIGATION SHELL — Research-Driven Design
 */

import React from 'react';
import { Lock, ChevronDown, ChevronsLeft, ChevronsRight, Lightbulb, LayoutDashboard, List, Layers, Grid3X3, Sparkles, BarChart3, History, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarMenuItem } from './SidebarBase';
import { PRODUCT_ROOM_NAV_ICONS } from '@/components/icons/ProductRoomNavIcons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFavorites } from '@/hooks/useFavorites';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Ideas submenu items
const IDEAS_MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'Ideas Hub', title: 'Ideas Hub', path: '/industry/ideas/hub', exact: true },
  { id: 'All Ideas', title: 'All Ideas', path: '/industry/ideas/all', exact: false },
  { id: 'Initiatives', title: 'Initiatives', path: '/industry/ideas/initiatives', exact: false },
  { id: 'Priority Matrix', title: 'Priority Matrix', path: '/industry/ideas/matrix', exact: true },
  { id: 'AI Insights', title: 'AI Insights', path: '/industry/ideas/insights', exact: true },
  { id: 'Analytics', title: 'Analytics', path: '/industry/ideas/analytics', exact: true },
];

// Icons for Ideas submenu
const IDEAS_NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Ideas Hub': LayoutDashboard,
  'All Ideas': List,
  'Initiatives': Layers,
  'Priority Matrix': Grid3X3,
  'AI Insights': Sparkles,
  'Analytics': BarChart3,
};

// Main menu items (before Ideas)
const MAIN_MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'Product Backlog', title: 'Product Backlog', path: '/industry/backlog', exact: false },
  { id: 'Product Kanban', title: 'Product Kanban', path: '/industry/kanban', exact: true },
  { id: 'Product Roadmap', title: 'Product Roadmap', path: '/industry/roadmaps-v1', exact: false },
];

// Items after Ideas group
const AFTER_IDEAS_ITEMS: SidebarMenuItem[] = [
  { id: 'Requirement Assist', title: 'Requirement Assist™', path: '/product/requirement-assist', exact: true },
  { id: 'Generation History', title: 'Generation History', path: '/generation-history', exact: true, icon: History },
];

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Check if any Ideas route is active
  const isIdeasRouteActive = location.pathname.includes('/industry/ideas') || 
                              location.pathname.includes('/ideas/');

  // Check if specific item is active
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

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
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Header — V10 styling with circular badge */}
        <div 
          className={cn(
            "border-b flex-shrink-0",
            expanded
              ? "flex items-center justify-between"
              : "flex flex-col items-center justify-center"
          )}
          style={{ 
            height: expanded ? '56px' : '64px',
            borderColor: 'var(--divider)',
            padding: expanded ? '0 12px' : '8px 0',
            gap: expanded ? undefined : '6px',
            background: 'transparent',
          }}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              expanded ? "overflow-hidden min-w-0" : "w-full justify-center overflow-visible"
            )}
          >
            {/* Module Badge — 28×28 circular (V10) */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
              }}
            >
              PR
            </div>
            {expanded && (
              <span 
                className="text-[13px] font-semibold truncate tracking-tight"
                style={{ color: 'var(--text-1)' }}
              >
                Product Hub
              </span>
            )}
          </div>
          {/* Collapse button — V10 sizing */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center justify-center rounded-md transition-all flex-shrink-0 border bg-transparent hover:bg-white/5 dark:hover:bg-white/10",
              expanded ? "w-6 h-6 ml-2" : "w-5 h-5"
            )}
            style={{
              borderColor: 'var(--divider)',
              color: 'var(--text-3)',
            }}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? (
              <ChevronsLeft size={13} />
            ) : (
              <ChevronsRight size={13} />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
          {/* Main menu items before Ideas */}
          {MAIN_MENU_ITEMS.map((item) => (
            <MenuItemButton 
              key={item.id}
              item={item}
              isActive={isActive(item.path, item.exact)}
              expanded={expanded}
              onClick={() => handleNavigation(item.path)}
              iconResolver={(id) => PRODUCT_ROOM_NAV_ICONS[id]}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          ))}

          {/* IDEAS COLLAPSIBLE GROUP — V10 styling */}
          <Collapsible defaultOpen={isIdeasRouteActive}>
            {/* Group Header */}
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "group w-full flex items-center rounded-md border-none cursor-pointer transition-all relative",
                  expanded ? "px-3 justify-start" : "justify-center",
                  isIdeasRouteActive 
                    ? "bg-blue-500/12 text-blue-600 font-medium" 
                    : "bg-transparent text-foreground hover:bg-blue-500/6 font-normal"
                )}
                style={{
                  height: '36px',
                  gap: '12px',
                  marginBottom: '1px',
                  marginTop: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                {isIdeasRouteActive && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: expanded ? '4px' : '6px',
                      bottom: expanded ? '4px' : '6px',
                      width: '3px',
                      background: 'var(--nav-accent-bar, #2563eb)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <span 
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: '17px', height: '17px' }}
                >
                  <Lightbulb 
                    className="h-[17px] w-[17px]" 
                    style={{ 
                      color: isIdeasRouteActive ? '#2563EB' : 'var(--nav-text-secondary, #3F3F46)',
                      strokeWidth: 1.4,
                    }}
                  />
                </span>
                {expanded && (
                  <>
                    <span className="flex-1 text-left" style={{ lineHeight: '36px' }}>
                      Ideas
                    </span>
                    <ChevronDown 
                      className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" 
                      style={{ color: 'var(--text-4)' }}
                    />
                  </>
                )}
              </button>
            </CollapsibleTrigger>

            {/* Collapsible Content - Ideas submenu */}
            <CollapsibleContent>
              <div style={{ paddingLeft: expanded ? '12px' : '0' }}>
                {IDEAS_MENU_ITEMS.map((item) => (
                  <MenuItemButton
                    key={item.id}
                    item={item}
                    isActive={isActive(item.path, item.exact)}
                    expanded={expanded}
                    onClick={() => handleNavigation(item.path)}
                    iconResolver={(id) => IDEAS_NAV_ICONS[id]}
                    isChild
                    isFavorite={isFavorite}
                    toggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Items after Ideas (Requirement Assist, Generation History) */}
          <div style={{ marginTop: '8px' }}>
            {AFTER_IDEAS_ITEMS.map((item) => (
              <MenuItemButton 
                key={item.id}
                item={item}
                isActive={isActive(item.path, item.exact)}
                expanded={expanded}
                onClick={() => handleNavigation(item.path)}
                iconResolver={(id) => PRODUCT_ROOM_NAV_ICONS[id] || item.icon}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </nav>

        {/* Footer Item (Settings for admins) */}
        {isAdmin && (
          <div 
            className="border-t pt-2 mt-2"
            style={{ 
              borderColor: 'var(--divider)', 
              padding: '8px' 
            }}
          >
            <MenuItemButton
              item={{
                id: 'product-settings',
                title: 'Product Settings',
                path: '#',
                icon: Lock,
                exact: true,
              }}
              isActive={false}
              expanded={expanded}
              onClick={() => toast.info('Product Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
              iconResolver={() => Lock}
              isFooter
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

// Menu item button component — matching SidebarBase renderMenuItem
function MenuItemButton({
  item,
  isActive,
  expanded,
  onClick,
  iconResolver,
  isChild = false,
  isFooter = false,
  isFavorite,
  toggleFavorite,
}: {
  item: SidebarMenuItem;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
  iconResolver: (id: string) => React.ComponentType<{ className?: string; style?: React.CSSProperties }> | undefined;
  isChild?: boolean;
  isFooter?: boolean;
  isFavorite: (path: string) => boolean;
  toggleFavorite: (path: string) => void;
}) {
  const CustomIcon = iconResolver(item.id) || item.icon;
  const starred = isFavorite(item.path);

  const menuButton = (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center rounded-md border-none cursor-pointer transition-all relative",
        expanded ? "px-3 justify-start" : "justify-center",
        isActive 
          ? "bg-blue-500/12 text-blue-600 font-medium" 
          : "bg-transparent text-foreground hover:bg-blue-500/6 font-normal"
      )}
      style={{
        height: isChild ? '32px' : '36px',
        gap: '12px',
        marginBottom: '1px',
        fontSize: isChild ? '12px' : '13px',
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      {/* Left Accent Bar — V10: 3px */}
      {isActive && (
        <span 
          style={{
            position: 'absolute',
            left: 0,
            top: expanded ? '4px' : '6px',
            bottom: expanded ? '4px' : '6px',
            width: '3px',
            background: 'var(--nav-accent-bar, #2563eb)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      {/* Icon container - V10: 17×17 icons */}
      <span 
        className="flex items-center justify-center flex-shrink-0"
        style={{ 
          width: isChild ? '15px' : '17px',
          height: isChild ? '15px' : '17px',
        }}
      >
        {CustomIcon && (
          <CustomIcon 
            className={cn("h-[17px] w-[17px]", isChild && "h-[15px] w-[15px]")}
            style={{ 
              color: isActive ? '#2563EB' : 'var(--nav-text-secondary, #3F3F46)',
              strokeWidth: 1.4,
            }}
          />
        )}
      </span>
      {expanded && (
        <>
          <span 
            className="flex-1 text-left truncate"
            style={{ lineHeight: isChild ? '32px' : '36px' }}
          >
            {item.title}
          </span>
          {/* Star button - show on hover (hide for footer items) */}
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

export default ProductRoomSidebar;
