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
        "border-b border-[var(--ds-border)] dark:border-[var(--ds-text)]",
        "bg-[var(--ds-surface-sunken)] dark:bg-[var(--ds-surface-overlay,var(--cp-ink-1))]"
      )}
    >
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          to="/release" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]"
        >
          Release
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-disabled)]" />
        <Link 
          to="/release/incidents" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]"
        >
          Incidents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-disabled)]" />
        <span className="text-[var(--ds-text-subtle)] dark:text-[var(--ds-background-neutral-hovered)]">Kanban</span>
      </nav>
    </div>
  );
});

export default KanbanBreadcrumb;
