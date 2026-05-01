/**
 * Kanban Breadcrumb Navigation
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const KanbanBreadcrumb = memo(function KanbanBreadcrumb() {
  return (
    <div 
      className={cn(
        "px-4 sm:px-6 py-2",
        "border-b border-[#e8e8e8] dark:border-[#333]",
        "bg-[#fafafa] dark:bg-[#0f0f0f]"
      )}
    >
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          to="/release" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]"
        >
          Release
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3]" />
        <Link 
          to="/release/incidents" 
          className="font-medium hover:underline transition-colors text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #60a5fa)]"
        >
          Incidents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3]" />
        <span className="text-[#404040] dark:text-[#d4d4d4]">Kanban</span>
      </nav>
    </div>
  );
});

export default KanbanBreadcrumb;
