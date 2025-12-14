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
          background: 'var(--surface-1)',
          borderRight: '1px solid var(--divider)',
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
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {config.items.map((item) => {
            const active = isActive(item.path, item.exact);
            const CustomIcon = iconResolver?.(item.id) || item.icon;

            const menuButton = (
              <button
                onClick={() => handleNavigation(item.path)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: expanded ? '0 12px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  marginBottom: '2px',
                  position: 'relative',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  background: active ? 'var(--nav-active-bg)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { 
                  if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = active ? 'var(--nav-active-bg)' : 'transparent'; 
                }}
              >
                {/* Left indicator bar for active state */}
                {active && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      bottom: '8px',
                      width: '2px',
                      background: 'var(--brand-active)',
                      borderRadius: '0 1px 1px 0',
                    }}
                  />
                )}
                {CustomIcon && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: active ? 'var(--text-1)' : 'var(--icon-default)',
                    flexShrink: 0,
                  }}>
                    <CustomIcon className="h-5 w-5" />
                  </span>
                )}
                {expanded && (
                  <span style={{ fontSize: '13px' }}>{item.title}</span>
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
          <div style={{ borderTop: '1px solid var(--divider)', padding: '8px' }}>
            {(() => {
              const item = config.footerItem;
              const active = isActive(item.path, item.exact);
              const CustomIcon = iconResolver?.(item.id) || item.icon;

              const footerButton = (
                <button
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: expanded ? '0 12px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    position: 'relative',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    background: active ? 'var(--nav-active-bg)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { 
                    if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = active ? 'var(--nav-active-bg)' : 'transparent'; 
                  }}
                >
                  {active && (
                    <span 
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        background: 'var(--brand-active)',
                        borderRadius: '0 1px 1px 0',
                      }}
                    />
                  )}
                  {CustomIcon && (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: active ? 'var(--text-1)' : 'var(--icon-muted)',
                      flexShrink: 0,
                    }}>
                      <CustomIcon className="h-5 w-5" />
                    </span>
                  )}
                  {expanded && (
                    <span style={{ fontSize: '13px' }}>{item.title}</span>
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
