/**
 * IndustryHeaderToolbarV2 - Unified Toolbar Component
 * Ported exactly from catalyst-header-toolbar-v2.html
 * Used for both /industry/backlog and /industry/kanban routes
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { IndustryViewSwitchButton } from '@/components/industry/IndustryViewSwitchButton';

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
}: IndustryHeaderToolbarV2Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
      {/* Left: Single view switch (only shows the OTHER view) */}
      <div className="flex items-center">
        <IndustryViewSwitchButton currentView={activeView === 'board' ? 'kanban' : 'list'} />
      </div>

      {/* Center: Search (unified styling) */}
      <div className="flex justify-center">
        <div
          className="w-full max-w-[480px] h-10 flex items-center gap-2 px-3 rounded-lg bg-muted/50"
          style={{ border: '1px solid var(--border-visible)' }}
        >
          <div className="w-4 h-4 text-muted-foreground">
            <Icons.Search />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="flex-1 border-none outline-none text-sm bg-transparent text-foreground placeholder:text-muted-foreground"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="border-none bg-transparent cursor-pointer text-muted-foreground p-0.5"
              title="Clear search"
            >
              <div className="w-4 h-4">
                <Icons.X />
              </div>
            </button>
          )}
          <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">
            {shortcutKey}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-2">
        {showAvatarFilter && (
          <div className="flex items-center gap-1">
            {avatars.slice(0, 4).map((a, idx) => {
              const initials = a.initials || getInitials(a.name);
              const isActive = selectedAvatarIds.includes(a.id);
              const bg = a.color || AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <button
                  key={a.id}
                  onClick={() => onToggleAvatar?.(a.id)}
                  title={a.name}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold text-white ${idx > 0 ? '-ml-1.5' : ''}`}
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
            className="w-9 h-9 flex items-center justify-center rounded-lg border bg-background border-border text-muted-foreground hover:bg-muted transition-colors"
            title={`Density: ${densityMode[0].toUpperCase()}${densityMode.slice(1)}`}
          >
            <div className="w-4 h-4">
              <Icons.Density />
            </div>
          </button>
        )}

        {onColumnsConfig && (
          <button
            onClick={onColumnsConfig}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
            title="Columns"
          >
            <div className="w-4 h-4">
              <Icons.Columns />
            </div>
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
            title="Export"
          >
            <div className="w-4 h-4">
              <Icons.Export />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
