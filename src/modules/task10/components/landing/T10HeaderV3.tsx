// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderV3
// Purpose: Landing page header matching Workstreams style
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface T10HeaderV3Props {
  onNewList: () => void;
  listCount?: number;
  activeWeekCount?: number;
  onShowArchived?: () => void;
}

export function T10HeaderV3({ 
  onNewList, 
  listCount = 0, 
  activeWeekCount = 0,
  onShowArchived 
}: T10HeaderV3Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Task<sup>10</sup>
        </h1>
        <p className="text-sm text-muted-foreground">
          {listCount} {listCount === 1 ? 'list' : 'lists'} · {activeWeekCount} active {activeWeekCount === 1 ? 'week' : 'weeks'}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {onShowArchived && (
          <Button
            variant="outline"
            onClick={onShowArchived}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            Archived
          </Button>
        )}
        <Button
          onClick={onNewList}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 gap-2"
        >
          <Plus className="w-4 h-4" />
          New List
        </Button>
      </div>
    </div>
  );
}

export default T10HeaderV3;
