import { useState } from 'react';
import { useBacklogState } from '../hooks/useBacklogState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Download, Search, List, LayoutGrid, Plus } from 'lucide-react';
import { BacklogViewType } from '../types';
import { cn } from '@/lib/utils';

interface BacklogHeaderProps {
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onOpenPrioritize?: () => void;
  onExport?: () => void;
  onCreateEpic?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function BacklogHeader({ 
  onOpenFilters, 
  onOpenColumns, 
  onOpenPrioritize, 
  onExport,
  onCreateEpic,
  searchQuery = '',
  onSearchChange,
}: BacklogHeaderProps) {
  const {
    view,
    setView,
    isEpicBacklog,
  } = useBacklogState();

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export triggered');
    }
  };

  return (
    <div className="flex flex-col bg-card">
      {/* Row 1: Title - with border-b to align with sidebar */}
      <div className="flex items-center h-12 px-4 sm:px-6 border-b">
        <span className="text-[20px] font-semibold text-foreground whitespace-nowrap">Program Backlog</span>
      </div>

      {/* Row 2: Controls Bar - Search left, actions right */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Left - Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search epics..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-9 bg-white border-border"
          />
        </div>

        {/* Right - View Toggle and Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden bg-white">
            <button
              onClick={() => setView('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                view === 'list' 
                  ? "bg-brand-gold text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView('state')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                view === 'state' 
                  ? "bg-brand-gold text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onOpenFilters}
            className="h-8 w-8 border-border bg-white"
            title="Filters"
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            className="h-8 w-8 border-border bg-white"
            title="Export"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            onClick={onCreateEpic}
            size="icon"
            className="h-8 w-8 bg-brand-gold hover:bg-brand-gold-hover text-white"
            title="Create Epic"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}