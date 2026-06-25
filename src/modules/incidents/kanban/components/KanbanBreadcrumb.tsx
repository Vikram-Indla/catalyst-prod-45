/**
 * Kanban Breadcrumb Navigation
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';

export const KanbanBreadcrumb = memo(function KanbanBreadcrumb() {
  return (
    <div 
      className={cn(
        "px-4 sm:px-6 py-2",
        "border-b border-[var(--ds-border, #E8E8E8)] dark:border-[var(--ds-text, #172B4D)]",
        "bg-[var(--ds-surface-sunken, #FAFAFA)] dark:bg-[var(--ds-text, #172B4D)]"
      )}
    >
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          to="/release" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))] dark:text-[var(--ds-text-brand,#60a5fa)]"
        >
          Release
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--ds-text-subtlest, #626F86)] dark:text-[var(--ds-text-disabled, #8590A2)]" />
        <Link 
          to="/release/incidents" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))] dark:text-[var(--ds-text-brand,#60a5fa)]"
        >
          Incidents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--ds-text-subtlest, #626F86)] dark:text-[var(--ds-text-disabled, #8590A2)]" />
        <span className="text-[var(--ds-text-subtle, #44546F)] dark:text-[var(--ds-background-neutral-hovered, #D4D4D4)]">Kanban</span>
      </nav>
    </div>
  );
});

export default KanbanBreadcrumb;
