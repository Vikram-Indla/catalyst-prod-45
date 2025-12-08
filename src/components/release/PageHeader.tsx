/**
 * FIX B: PageHeader Height Consistency
 * Uses CSS variable --pagehdr-h (56px) as single source of truth
 * No hardcoded 72px values
 */
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div 
      className="border-b border-border bg-card flex-shrink-0"
      style={{ height: 'var(--pagehdr-h, 56px)' }}
    >
      <div className="h-full flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
