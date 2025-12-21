/**
 * Kanban Breadcrumb Navigation
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const KanbanBreadcrumb = memo(function KanbanBreadcrumb() {
  return (
    <div className="px-4 sm:px-6 py-2 border-b border-border bg-muted/30">
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          to="/release" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Release
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Link 
          to="/release/incidents" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Incidents
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">Kanban</span>
      </nav>
    </div>
  );
});

export default KanbanBreadcrumb;
