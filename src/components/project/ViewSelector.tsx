// =====================================================
// VIEW SELECTOR COMPONENT
// Toggle between Map, Board, Timeline views
// =====================================================

import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Map, Kanban, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  projectId: string;
}

type ViewType = 'feature-map' | 'board' | 'timeline';

const VIEWS: Array<{
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  path: string;
}> = [
  { id: 'feature-map', label: 'Map', icon: <Map className="w-4 h-4" />, path: 'feature-map' },
  { id: 'board', label: 'Board', icon: <Kanban className="w-4 h-4" />, path: 'board' },
  { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" />, path: 'timeline' },
];

export function ViewSelector({ projectId }: ViewSelectorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine current view from URL
  const getCurrentView = (): ViewType => {
    const path = location.pathname;
    if (path.includes('/board')) return 'board';
    if (path.includes('/timeline')) return 'timeline';
    if (path.includes('/feature-map')) return 'feature-map';
    return 'board'; // Default
  };

  const currentView = getCurrentView();

  const handleViewChange = (viewId: ViewType) => {
    const view = VIEWS.find(v => v.id === viewId);
    if (view) {
      // Preserve existing query params
      const params = new URLSearchParams(searchParams);
      navigate(`/projects/${projectId}/${view.path}?${params.toString()}`);
      
      // Persist last view selection
      localStorage.setItem(`catalyst-project-${projectId}-view`, viewId);
    }
  };

  return (
    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => handleViewChange(view.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
            'border-r last:border-r-0',
            currentView === view.id
              ? 'bg-[#2563eb] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          {view.icon}
          {view.label}
        </button>
      ))}
    </div>
  );
}
