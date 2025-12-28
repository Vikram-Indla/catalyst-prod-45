/**
 * Kanban Breadcrumb Navigation
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const KanbanBreadcrumb = memo(function KanbanBreadcrumb() {
  return (
    <div 
      className="px-4 sm:px-6 py-2"
      style={{
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: '#fafafa',
      }}
    >
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          to="/release" 
          className="font-medium hover:underline transition-colors"
          style={{ color: '#2563eb' }}
        >
          Release
        </Link>
        <ChevronRight className="h-3.5 w-3.5" style={{ color: '#737373' }} />
        <Link 
          to="/release/incidents" 
          className="font-medium hover:underline transition-colors"
          style={{ color: '#2563eb' }}
        >
          Incidents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" style={{ color: '#737373' }} />
        <span style={{ color: '#404040' }}>Kanban</span>
      </nav>
    </div>
  );
});

export default KanbanBreadcrumb;
