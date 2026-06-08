/**
 * FIX B: PageHeader Height Consistency
 * Uses CSS variable --pagehdr-h (56px) as single source of truth
 * No hardcoded 72px values
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, toolbar, actions }: PageHeaderProps) {
  return (
    <div 
      className={cn(
        "border-b border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-900 flex-shrink-0"
      )}
      style={{ minHeight: 'var(--pagehdr-h, 56px)' }}
    >
      <div className="h-full flex items-center justify-between px-6 py-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {toolbar && (
          <div className="flex-1 ml-6">
            {toolbar}
          </div>
        )}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
