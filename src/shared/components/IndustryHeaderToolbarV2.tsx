/**
 * IndustryHeaderToolbarV2 - Unified Toolbar Component
 * Used for both /industry/backlog and /industry/kanban routes
 * 
 * Layout: [List | Board toggle] [Search] [Filters (count)] [Export] [+ Create]
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type DensityMode = 'compact' | 'regular' | 'relaxed';

// Avatar type
export interface ToolbarAvatar {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  color?: string;
}

// Props interface
export interface IndustryHeaderToolbarV2Props {
  title: string;
  countText: string;
  activeView: 'list' | 'board';
  searchValue: string;
  onSearchChange: (value: string) => void;
  avatars?: ToolbarAvatar[];
  selectedAvatarIds?: string[];
  onToggleAvatar?: (id: string) => void;
  onSelectAllAvatars?: () => void;
  // Scoring filter
  scoringFilter?: 'all' | 'scored' | 'unscored';
  onScoringFilterChange?: (filter: 'all' | 'scored' | 'unscored') => void;

  /** Kanban density mode (compact/regular/relaxed) */
  densityMode?: DensityMode;
  onDensityModeChange?: (mode: DensityMode) => void;

  onExport?: () => void;
  onColumnsConfig?: () => void;
  onOpenFilters?: () => void;
  activeFiltersCount?: number;
  onCreateRequest?: () => void;
}

// Icons - inline SVGs (tree-shakeable)
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Density: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Export: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Columns: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Kanban: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1"/>
      <rect x="10" y="3" width="5" height="12" rx="1"/>
      <rect x="17" y="3" width="5" height="15" rx="1"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

// Default avatar colors
const AVATAR_COLORS = [
  'hsl(var(--secondary-green))',
  'hsl(var(--secondary-bronze))',
  'hsl(var(--brand-primary))',
  'hsl(var(--palette-champagne))',
];

export function IndustryHeaderToolbarV2({
  title,
  countText,
  activeView,
  searchValue,
  onSearchChange,
  avatars = [],
  selectedAvatarIds = [],
  onToggleAvatar,
  onSelectAllAvatars,
  scoringFilter = 'all',
  onScoringFilterChange,
  densityMode = 'regular',
  onDensityModeChange,
  onExport,
  onColumnsConfig,
  onOpenFilters,
  activeFiltersCount = 0,
  onCreateRequest,
}: IndustryHeaderToolbarV2Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };
  
  // Detect Mac for shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

  const cycleDensity = useCallback(() => {
    if (!onDensityModeChange) return;
    const order: DensityMode[] = ['compact', 'regular', 'relaxed'];
    const idx = Math.max(0, order.indexOf(densityMode));
    const next = order[(idx + 1) % order.length];
    onDensityModeChange(next);
  }, [densityMode, onDensityModeChange]);

  const showAvatarFilter = avatars.length > 0 && !!onToggleAvatar;

  const handleViewChange = (view: 'list' | 'board') => {
    if (view === 'list') {
      navigate('/industry/backlog');
    } else {
      navigate('/industry/kanban');
    }
  };

  return (
    <div className="w-full flex items-center justify-between gap-4">
      {/* Left Section: View Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => handleViewChange('list')}
            className={cn(
              'h-8 px-3 flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
              activeView === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="w-4 h-4">
              <Icons.List />
            </div>
            <span>List</span>
          </button>
          <button
            onClick={() => handleViewChange('board')}
            className={cn(
              'h-8 px-3 flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
              activeView === 'board'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="w-4 h-4">
              <Icons.Kanban />
            </div>
            <span>Board</span>
          </button>
        </div>
      </div>

      {/* Center Section: Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
            <Icons.Search />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search requests..."
            className="w-full h-9 pl-9 pr-16 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <div className="w-3 h-3">
                <Icons.X />
              </div>
            </button>
          )}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            {shortcutKey}
          </kbd>
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        {showAvatarFilter && (
          <div className="flex items-center gap-1 mr-2">
            {avatars.slice(0, 4).map((a, idx) => {
              const initials = a.initials || getInitials(a.name);
              const isActive = selectedAvatarIds.includes(a.id);
              const bg = a.color || AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <button
                  key={a.id}
                  onClick={() => onToggleAvatar?.(a.id)}
                  title={a.name}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold text-white',
                    idx > 0 && '-ml-1.5'
                  )}
                  style={{
                    backgroundColor: bg,
                    borderColor: isActive ? 'hsl(var(--secondary-green))' : 'hsl(var(--background))',
                  }}
                >
                  {initials}
                </button>
              );
            })}
          </div>
        )}

        {onDensityModeChange && (
          <button
            onClick={cycleDensity}
            className="h-9 w-9 flex items-center justify-center rounded-lg border bg-background border-border text-muted-foreground hover:bg-muted transition-colors"
            title={`Density: ${densityMode[0].toUpperCase()}${densityMode.slice(1)}`}
          >
            <div className="w-4 h-4">
              <Icons.Density />
            </div>
          </button>
        )}

        {/* Filter Button with Label & Count */}
        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            className={cn(
              'h-9 px-3 flex items-center gap-2 rounded-lg border bg-background text-sm font-medium transition-colors',
              activeFiltersCount > 0
                ? 'border-[#c69c6d] text-[#c69c6d]'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <div className="w-4 h-4">
              <Icons.Filter />
            </div>
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#c69c6d] text-[10px] font-semibold text-white flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        {onColumnsConfig && (
          <button
            onClick={onColumnsConfig}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
            title="Columns"
          >
            <div className="w-4 h-4">
              <Icons.Columns />
            </div>
          </button>
        )}

        {/* Export Button with Label */}
        {onExport && (
          <button
            onClick={onExport}
            className="h-9 px-3 flex items-center gap-2 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            title="Export to CSV"
          >
            <div className="w-4 h-4">
              <Icons.Export />
            </div>
            <span>Export</span>
          </button>
        )}

        {/* Create Button - Primary CTA (Gold) */}
        {onCreateRequest && (
          <button
            onClick={onCreateRequest}
            className="h-9 px-4 flex items-center gap-2 rounded-lg bg-[#c69c6d] hover:bg-[#b8894d] text-white text-sm font-medium transition-colors"
          >
            <div className="w-4 h-4">
              <Icons.Plus />
            </div>
            <span>Create Request</span>
          </button>
        )}
      </div>
    </div>
  );
}
