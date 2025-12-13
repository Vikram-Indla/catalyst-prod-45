/**
 * IndustryViewSwitchButton - Single button to switch between List and Kanban views
 * Shows ONLY the "switch to other view" button, hides the current view button
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'kanban';

interface IndustryViewSwitchButtonProps {
  currentView: ViewMode;
}

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const KanbanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1"/>
    <rect x="10" y="3" width="5" height="12" rx="1"/>
    <rect x="17" y="3" width="5" height="15" rx="1"/>
  </svg>
);

export function IndustryViewSwitchButton({ currentView }: IndustryViewSwitchButtonProps) {
  const navigate = useNavigate();

  // Show the button for the OTHER view (not current)
  if (currentView === 'list') {
    // On List view: show Board/Kanban button to switch to Kanban
    return (
      <button
        onClick={() => navigate('/industry/kanban')}
        title="Board"
        className={cn(
          'h-10 w-10 flex items-center justify-center',
          'border border-border rounded-[10px]',
          'bg-background text-muted-foreground',
          'cursor-pointer hover:bg-muted transition-colors'
        )}
      >
        <KanbanIcon />
      </button>
    );
  }

  // On Kanban view: show List button to switch to List
  return (
    <button
      onClick={() => navigate('/industry/backlog')}
      title="List"
      className={cn(
        'h-10 w-10 flex items-center justify-center',
        'border border-border rounded-[10px]',
        'bg-background text-muted-foreground',
        'cursor-pointer hover:bg-muted transition-colors'
      )}
    >
      <ListIcon />
    </button>
  );
}
