/**
 * Atlassian-aligned Global Header Component
 * Compact 56px height with proper zone layout
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeaderZoneProps {
  className?: string;
  children: React.ReactNode;
}

// Left zone - branding, context, breadcrumbs
function HeaderLeft({ className, children }: HeaderZoneProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {children}
    </div>
  );
}

// Center zone - search, page context
function HeaderCenter({ className, children }: HeaderZoneProps) {
  return (
    <div className={cn('flex-1 flex items-center justify-center px-4', className)}>
      {children}
    </div>
  );
}

// Right zone - actions, notifications, avatar
function HeaderRight({ className, children }: HeaderZoneProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

interface AtlassianHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function AtlassianHeader({ className, children }: AtlassianHeaderProps) {
  return (
    <header
      data-ui="Header"
      className={cn(
        'h-14 px-4 flex items-center',
        'bg-card border-b border-border',
        'sticky top-0 z-40',
        className
      )}
    >
      {children}
    </header>
  );
}

// Page title component for consistent hierarchy
interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, subtitle, icon, className }: PageTitleProps) {
  return (
    <div data-ui="PageTitle" className={cn('flex items-center gap-3', className)}>
      {icon && (
        <div className="h-9 w-9 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-foreground leading-6 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Action button for header
interface HeaderActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: number;
  className?: string;
}

export function HeaderAction({ icon, label, onClick, badge, className }: HeaderActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative h-8 w-8 flex items-center justify-center rounded-md',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={label}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'absolute -top-0.5 -right-0.5',
          'h-4 min-w-4 px-1 rounded-full',
          'bg-destructive text-destructive-foreground',
          'text-[10px] font-bold flex items-center justify-center'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// Compose exports
AtlassianHeader.Left = HeaderLeft;
AtlassianHeader.Center = HeaderCenter;
AtlassianHeader.Right = HeaderRight;

export default AtlassianHeader;
