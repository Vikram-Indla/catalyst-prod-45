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
    <div className="flex flex-col" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Row 1: Title - with border-b to align with sidebar */}
      <div 
        className="flex items-center h-12 px-4 sm:px-6" 
        style={{ borderBottom: '1px solid var(--divider)' }}
      >
        <span 
          className="text-[20px] font-semibold whitespace-nowrap"
          style={{ color: 'var(--text-1)' }}
        >
          Program Backlog
        </span>
      </div>

      {/* Row 2: Controls Bar - Search left, actions right */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Left - Search */}
        <div className="relative w-full max-w-md">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
            style={{ color: 'var(--icon-muted)' }}
          />
          <Input
            placeholder="Search epics..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-9"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)',
            }}
          />
        </div>

        {/* Right - View Toggle and Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div 
            className="flex items-center rounded-md overflow-hidden"
            style={{ 
              backgroundColor: 'var(--surface-1)', 
              border: '1px solid var(--border-color)' 
            }}
          >
            <button
              onClick={() => setView('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                view === 'list' 
                  ? "bg-brand-gold text-white" 
                  : ""
              )}
              style={view !== 'list' ? { color: 'var(--text-2)' } : undefined}
              onMouseOver={(e) => {
                if (view !== 'list') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
              }}
              onMouseOut={(e) => {
                if (view !== 'list') e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                  : ""
              )}
              style={view !== 'state' ? { color: 'var(--text-2)' } : undefined}
              onMouseOver={(e) => {
                if (view !== 'state') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
              }}
              onMouseOut={(e) => {
                if (view !== 'state') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onOpenFilters}
            className="h-8 w-8"
            style={{ 
              backgroundColor: 'var(--surface-1)', 
              borderColor: 'var(--border-color)',
              color: 'var(--icon-default)'
            }}
            title="Filters"
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            className="h-8 w-8"
            style={{ 
              backgroundColor: 'var(--surface-1)', 
              borderColor: 'var(--border-color)',
              color: 'var(--icon-default)'
            }}
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