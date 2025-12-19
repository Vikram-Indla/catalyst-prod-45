/**
 * SidebarBase — Shared sidebar component with consistent token-based styling
 * 
 * Used by all non-admin sidebars (Product, Release, Enterprise, Program, etc.)
 * All styling uses CSS custom properties for dark/light mode compatibility.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SidebarMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Optional badge count to display */
  badge?: number;
}

export interface SidebarConfig {
  /** Badge text shown in the header (e.g., "PR", "EN", "RL") */
  badge: string;
  /** Section label shown when expanded (e.g., "Product", "Enterprise") */
  label: string;
  /** Menu items to display */
  items: SidebarMenuItem[];
  /** Footer item (e.g., Settings) - optional */
  footerItem?: SidebarMenuItem;
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

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (expanded) onToggle(); // Collapse on navigation when expanded
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

        {/* Section Header */}
        <div 
          style={{ 
            height: '52px',
            padding: expanded ? '0 12px' : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderBottom: expanded ? '1px solid var(--divider)' : 'none',
            flexShrink: 0,
          }}
        >
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--brand-active)',
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
          {config.items.map((item) => {
            const active = isActive(item.path, item.exact);
            const CustomIcon = iconResolver?.(item.id) || item.icon;

            const menuButton = (
              <button
                onClick={() => handleNavigation(item.path)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  marginBottom: '2px',
                  position: 'relative',
                  background: active ? 'rgba(92,124,92,0.12)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { 
                  if (!active) e.currentTarget.style.background = 'rgba(92,124,92,0.08)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = active ? 'rgba(92,124,92,0.12)' : 'transparent'; 
                }}
              >
                {/* Left indicator bar for active state - vertically centered, matches row height */}
                {active && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      bottom: '6px',
                      width: '3px',
                      background: 'var(--brand-active)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                {/* Icon container - fixed 32px width, centered */}
                <span style={{ 
                  width: '32px',
                  height: '44px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: expanded ? '8px' : '14px',
                }}>
                  {CustomIcon && (
                    <CustomIcon 
                      className="h-[18px] w-[18px]" 
                      style={{ color: active ? 'var(--text-1)' : 'var(--icon-default)' }}
                    />
                  )}
                </span>
                {expanded && (
                  <span style={{ 
                    flex: 1, 
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    height: '44px',
                  }}>{item.title}</span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span 
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      background: 'var(--brand-active)',
                      color: 'var(--text-inverse, #ffffff)',
                      minWidth: '18px',
                      textAlign: 'center',
                      marginRight: expanded ? '10px' : '0',
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
                    style={{ 
                      background: 'var(--surface-2)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-1)',
                    }}
                  >
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.id}>{menuButton}</React.Fragment>;
          })}
        </nav>

        {/* Footer Item (e.g., Settings) */}
        {config.footerItem && (
          <div style={{ borderTop: '1px solid var(--divider)', padding: '6px' }}>
            {(() => {
              const item = config.footerItem;
              const active = isActive(item.path, item.exact);
              const CustomIcon = iconResolver?.(item.id) || item.icon;

              const footerButton = (
                <button
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    position: 'relative',
                    background: active ? 'rgba(92,124,92,0.12)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { 
                    if (!active) e.currentTarget.style.background = 'rgba(92,124,92,0.08)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = active ? 'rgba(92,124,92,0.12)' : 'transparent'; 
                  }}
                >
                  {active && (
                    <span 
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '6px',
                        bottom: '6px',
                        width: '3px',
                        background: 'var(--brand-active)',
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                  {/* Icon container - fixed 32px width, centered */}
                  <span style={{ 
                    width: '32px',
                    height: '44px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: expanded ? '8px' : '14px',
                  }}>
                    {CustomIcon && (
                      <CustomIcon 
                        className="h-[18px] w-[18px]" 
                        style={{ color: active ? 'var(--text-1)' : 'var(--icon-muted)' }}
                      />
                    )}
                  </span>
                  {expanded && (
                    <span style={{ 
                      flex: 1, 
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      height: '44px',
                    }}>{item.title}</span>
                  )}
                </button>
              );

              if (!expanded) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {footerButton}
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      style={{ 
                        background: 'var(--surface-2)', 
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                      }}
                    >
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return footerButton;
            })()}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
