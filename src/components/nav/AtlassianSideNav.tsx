/**
 * Atlassian-aligned Side Navigation Component
 * Compact, consistent density with proper selected states
 */

import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  children?: NavItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

interface SideNavProps {
  sections: NavSection[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

interface NavItemComponentProps {
  item: NavItem;
  collapsed?: boolean;
  depth?: number;
}

function NavItemComponent({ item, collapsed = false, depth = 0 }: NavItemComponentProps) {
  const [expanded, setExpanded] = React.useState(false);
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? location.pathname === item.href || location.pathname.startsWith(item.href + '/') : false;
  
  const Icon = item.icon;
  const indent = depth * 12;
  
  const content = (
    <div
      data-ui="NavItem"
      className={cn(
        'group relative flex items-center gap-2 px-3 h-8 rounded-md',
        'text-sm font-medium transition-colors duration-150',
        'select-none cursor-pointer',
        isActive
          ? 'bg-brand-gold/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        depth > 0 && 'ml-3'
      )}
      style={{ paddingLeft: collapsed ? 12 : 12 + indent }}
      onClick={() => {
        if (hasChildren && !collapsed) {
          setExpanded(!expanded);
        }
        if (item.onClick) {
          item.onClick();
        }
      }}
    >
      {/* Left indicator bar for selected state */}
      {isActive && (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-brand-gold" />
      )}
      
      {/* Icon */}
      {Icon && (
        <Icon className={cn(
          'h-4 w-4 shrink-0',
          isActive ? 'text-brand-gold' : 'text-muted-foreground group-hover:text-foreground'
        )} />
      )}
      
      {/* Label */}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          
          {/* Badge */}
          {item.badge !== undefined && (
            <span className={cn(
              'h-5 min-w-5 px-1.5 rounded-full text-xs font-medium',
              'flex items-center justify-center',
              'bg-brand-gold/10 text-brand-gold'
            )}>
              {item.badge}
            </span>
          )}
          
          {/* Expand chevron for items with children */}
          {hasChildren && (
            <div className="shrink-0">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
  
  const navItem = item.href ? (
    <NavLink to={item.href} className="block">
      {content}
    </NavLink>
  ) : (
    content
  );
  
  if (collapsed && !hasChildren) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {navItem}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
            {item.badge !== undefined && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <>
      {navItem}
      {/* Render children if expanded */}
      {hasChildren && expanded && !collapsed && (
        <div className="mt-0.5">
          {item.children!.map(child => (
            <NavItemComponent
              key={child.id}
              item={child}
              collapsed={collapsed}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function AtlassianSideNav({
  sections,
  collapsed = false,
  header,
  footer,
  className,
}: SideNavProps) {
  return (
    <aside
      data-ui="SideNav"
      className={cn(
        'flex flex-col h-full bg-card border-r border-border',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-[56px]' : 'w-[240px]',
        className
      )}
    >
      {/* Header slot */}
      {header && (
        <div className="shrink-0 px-3 py-3 border-b border-border">
          {header}
        </div>
      )}
      
      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className={cn(sectionIndex > 0 && 'mt-4')}>
            {/* Section label */}
            {section.label && !collapsed && (
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.label}
              </div>
            )}
            
            {/* Section divider when collapsed */}
            {section.label && collapsed && sectionIndex > 0 && (
              <div className="my-2 mx-2 h-px bg-border" />
            )}
            
            {/* Section items */}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      {/* Footer slot */}
      {footer && (
        <div className="shrink-0 px-3 py-3 border-t border-border">
          {footer}
        </div>
      )}
    </aside>
  );
}

export default AtlassianSideNav;
