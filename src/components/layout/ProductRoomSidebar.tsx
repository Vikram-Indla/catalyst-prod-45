import { Lock, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, LayoutDashboard, List, Layers, Grid3X3, Sparkles, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from './SidebarBase';
import { PRODUCT_ROOM_NAV_ICONS } from '@/components/icons/ProductRoomNavIcons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const productSidebarConfig: SidebarConfig = {
  badge: 'PR',
  label: 'Product',
  items: [
    { id: 'Product Backlog', title: 'Product Backlog', path: '/industry/backlog', exact: false },
    { id: 'Product Kanban', title: 'Product Kanban', path: '/industry/kanban', exact: true },
    { id: 'Product Roadmap', title: 'Product Roadmap', path: '/industry/roadmaps-v1', exact: false },
    // Ideas items removed - now rendered as collapsible group
    { id: 'Requirement Assist', title: 'Requirement Assist™', path: '/product/requirement-assist', exact: true },
  ],
};

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if any Ideas route is active
  const isIdeasRouteActive = location.pathname.includes('/industry/ideas') || 
                              location.pathname.includes('/ideas/');

  // Check if specific item is active
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Add settings footer for admins
  const configWithSettings: SidebarConfig = {
    ...productSidebarConfig,
    footerItem: isAdmin ? {
      id: 'product-settings',
      title: 'Product Settings',
      path: '#',
      icon: Lock,
      exact: true,
    } : undefined,
  };

  return (
    <ProductSidebarWithCollapsible 
      config={configWithSettings}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      isIdeasRouteActive={isIdeasRouteActive}
      isActive={isActive}
      navigate={navigate}
    />
  );
}

// Custom sidebar component with collapsible Ideas group
function ProductSidebarWithCollapsible({
  config,
  expanded,
  onToggle,
  className,
  isIdeasRouteActive,
  isActive,
  navigate,
}: {
  config: SidebarConfig;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  isIdeasRouteActive: boolean;
  isActive: (path: string, exact?: boolean) => boolean;
  navigate: (path: string) => void;
}) {
  // ChevronLeft and ChevronRight imported from lucide-react at top
  
  // Separate items: before Ideas, and after Ideas (Requirement Assist)
  const itemsBeforeIdeas = config.items?.filter(item => 
    ['Product Backlog', 'Product Kanban', 'Product Roadmap'].includes(item.id)
  ) || [];
  const itemsAfterIdeas = config.items?.filter(item => 
    item.id === 'Requirement Assist'
  ) || [];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-full transition-all duration-300 flex-shrink-0 relative flex flex-col overflow-visible',
          className
        )}
        style={{ 
          width: expanded ? '220px' : '60px',
          background: 'var(--surface-elevated, var(--surface-1))',
          borderRight: '1px solid var(--divider)',
          boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Toggle Handle */}
        <button
          onClick={onToggle}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '24px',
            zIndex: 50,
            width: '24px',
            height: '24px',
            borderRadius: '9999px',
            background: 'var(--surface-1)',
            border: '1px solid var(--divider)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--icon-default)',
          }}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? (
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          ) : (
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          )}
        </button>

        {/* Header */}
        <div 
          style={{ 
            height: '52px',
            padding: expanded ? '0 12px' : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderBottom: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--brand-primary-hex, #2563eb)',
              color: 'var(--text-inverse, #ffffff)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {config.badge}
          </div>
          {expanded && (
            <div style={{ marginLeft: '10px' }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 700, 
                color: 'var(--text-1)' 
              }}>
                {config.label}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          {/* Items before Ideas */}
          {itemsBeforeIdeas.map((item) => (
            <MenuItemButton 
              key={item.id}
              item={item}
              isActive={isActive(item.path, item.exact)}
              expanded={expanded}
              onClick={() => handleNavigation(item.path)}
              iconResolver={(id) => PRODUCT_ROOM_NAV_ICONS[id]}
            />
          ))}

          {/* IDEAS COLLAPSIBLE GROUP */}
          <Collapsible defaultOpen={isIdeasRouteActive}>
            {/* Group Header */}
            <CollapsibleTrigger asChild>
              <button
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  marginBottom: '2px',
                  marginTop: '8px',
                  position: 'relative',
                  background: isIdeasRouteActive ? 'var(--nav-active-bg)' : 'transparent',
                  color: isIdeasRouteActive ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground))',
                  fontWeight: isIdeasRouteActive ? 600 : 500,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { 
                  if (!isIdeasRouteActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = isIdeasRouteActive ? 'var(--nav-active-bg)' : 'transparent'; 
                }}
              >
                {isIdeasRouteActive && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      bottom: '6px',
                      width: '3px',
                      background: 'hsl(var(--brand-primary))',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <span style={{ 
                  width: '32px',
                  height: '32px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: expanded ? '6px' : '14px',
                }}>
                  <Lightbulb 
                    className="h-[18px] w-[18px]" 
                    style={{ color: isIdeasRouteActive ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground) / 0.7)' }}
                  />
                </span>
                {expanded && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left', lineHeight: '44px' }}>
                      Ideas
                    </span>
                    <ChevronDown 
                      className="h-4 w-4 mr-3 transition-transform group-data-[state=open]:rotate-180" 
                      style={{ color: 'hsl(var(--foreground) / 0.5)' }}
                    />
                  </>
                )}
              </button>
            </CollapsibleTrigger>

            {/* Collapsible Content - Ideas submenu */}
            <CollapsibleContent>
              <div style={{ paddingLeft: expanded ? '16px' : '0' }}>
                {IDEAS_MENU_ITEMS.map((item) => (
                  <MenuItemButton
                    key={item.id}
                    item={item}
                    isActive={isActive(item.path, item.exact)}
                    expanded={expanded}
                    onClick={() => handleNavigation(item.path)}
                    iconResolver={(id) => IDEAS_NAV_ICONS[id]}
                    isChild
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Items after Ideas (Requirement Assist) */}
          <div style={{ marginTop: '8px' }}>
            {itemsAfterIdeas.map((item) => (
              <MenuItemButton 
                key={item.id}
                item={item}
                isActive={isActive(item.path, item.exact)}
                expanded={expanded}
                onClick={() => handleNavigation(item.path)}
                iconResolver={(id) => PRODUCT_ROOM_NAV_ICONS[id]}
              />
            ))}
          </div>
        </nav>

        {/* Footer Item (e.g., Settings) */}
        {config.footerItem && (
          <div style={{ borderTop: '1px solid var(--divider)', padding: '6px' }}>
            <MenuItemButton
              item={config.footerItem}
              isActive={false}
              expanded={expanded}
              onClick={() => toast.info('Product Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
              iconResolver={(id) => undefined}
            />
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

// Reusable menu item button component
function MenuItemButton({
  item,
  isActive,
  expanded,
  onClick,
  iconResolver,
  isChild = false,
}: {
  item: SidebarMenuItem;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
  iconResolver: (id: string) => React.ComponentType<{ className?: string }> | undefined;
  isChild?: boolean;
}) {
  const CustomIcon = iconResolver(item.id) || item.icon;

  const menuButton = (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: isChild ? '40px' : '44px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
        marginBottom: '2px',
        position: 'relative',
        background: isActive ? 'var(--nav-active-bg)' : 'transparent',
        color: isActive ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground))',
        fontWeight: isActive ? 600 : 500,
        fontSize: isChild ? '12px' : '13px',
        fontFamily: 'inherit',
        outline: 'none',
      }}
      onMouseEnter={(e) => { 
        if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; 
      }}
    >
      {isActive && (
        <span 
          style={{
            position: 'absolute',
            left: 0,
            top: '6px',
            bottom: '6px',
            width: '3px',
            background: 'hsl(var(--brand-primary))',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <span style={{ 
        width: '32px',
        height: '32px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0,
        marginLeft: expanded ? '6px' : '14px',
      }}>
        {CustomIcon && (
          <CustomIcon 
            className={cn("h-[18px] w-[18px]", isChild && "h-[16px] w-[16px]")}
            style={{ color: isActive ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground) / 0.7)' }}
          />
        )}
      </span>
      {expanded && (
        <span style={{ 
          flex: 1, 
          textAlign: 'left',
          lineHeight: isChild ? '40px' : '44px',
        }}>{item.title}</span>
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
          className="z-[100] bg-popover text-popover-foreground border border-border shadow-md"
        >
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuButton;
}
