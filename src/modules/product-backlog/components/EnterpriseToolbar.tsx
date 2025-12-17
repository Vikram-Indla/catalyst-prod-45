/**
 * EnterpriseToolbar - Structured enterprise-grade toolbar
 * Left: View toggle, Filter button
 * Center: Search input (primary, full width)
 * Right: Columns, Export, Create
 */

import React, { useState } from 'react';
import { IndustryViewSwitchButton } from '@/components/industry/IndustryViewSwitchButton';
import { cn } from '@/lib/utils';

interface EnterpriseToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onColumnsClick: () => void;
  onExportClick: () => void;
  onCreateClick: () => void;
  activeFilterCount?: number;
  densityMode?: 'compact' | 'regular' | 'relaxed';
  onDensityChange?: (mode: 'compact' | 'regular' | 'relaxed') => void;
}

// Icons
const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  ),
  Columns: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Density: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

export function EnterpriseToolbar({
  searchValue,
  onSearchChange,
  onFilterClick,
  onColumnsClick,
  onExportClick,
  onCreateClick,
  activeFilterCount = 0,
  densityMode = 'regular',
  onDensityChange,
}: EnterpriseToolbarProps) {
  const [densityOpen, setDensityOpen] = useState(false);
  
  // Detect Mac for shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

  const cycleDensity = () => {
    if (!onDensityChange) return;
    const order: ('compact' | 'regular' | 'relaxed')[] = ['compact', 'regular', 'relaxed'];
    const idx = Math.max(0, order.indexOf(densityMode));
    const next = order[(idx + 1) % order.length];
    onDensityChange(next);
  };

  return (
    <div 
      className="h-14 flex items-center px-5 gap-4 border-b"
      style={{ 
        backgroundColor: 'var(--surface-1)',
        borderColor: 'var(--divider)',
      }}
    >
      {/* Left Cluster: View Toggle + Filter */}
      <div className="flex items-center gap-2">
        <IndustryViewSwitchButton currentView="list" />
        
        <button
          onClick={onFilterClick}
          className={cn(
            "h-9 px-3 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors",
            "border focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          )}
          style={{
            backgroundColor: activeFilterCount > 0 ? 'var(--accent-muted)' : 'var(--surface-1)',
            borderColor: activeFilterCount > 0 ? 'var(--accent-color)' : 'var(--border-color)',
            color: activeFilterCount > 0 ? 'var(--accent-color)' : 'var(--text-2)',
          }}
          aria-label={`Filter${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        >
          <Icons.Filter />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span 
              className="min-w-[18px] h-[18px] px-1 rounded-full text-xs font-semibold flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--accent-color)',
                color: 'var(--text-inverse)',
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Center: Search (expanded) */}
      <div className="flex-1 flex justify-center">
        <div 
          className="w-full max-w-[520px] h-10 flex items-center gap-2 px-3 rounded-lg"
          style={{ 
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-visible)',
          }}
        >
          <div className="text-muted-foreground">
            <Icons.Search />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search requests..."
            className="flex-1 border-none outline-none text-sm bg-transparent"
            style={{ color: 'var(--text-1)' }}
            aria-label="Search business requests"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="border-none bg-transparent cursor-pointer p-1 rounded hover:bg-muted/50 transition-colors"
              style={{ color: 'var(--text-3)' }}
              aria-label="Clear search"
            >
              <Icons.X />
            </button>
          )}
          <span 
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: 'var(--surface-3)',
              color: 'var(--text-3)',
            }}
          >
            {shortcutKey}
          </span>
        </div>
      </div>

      {/* Right Cluster: Density, Columns, Export, Create */}
      <div className="flex items-center gap-2">
        {/* Density Toggle */}
        {onDensityChange && (
          <button
            onClick={cycleDensity}
            className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-2)',
            }}
            title={`Density: ${densityMode.charAt(0).toUpperCase()}${densityMode.slice(1)}`}
            aria-label="Toggle row density"
          >
            <Icons.Density />
          </button>
        )}

        {/* Columns */}
        <button
          onClick={onColumnsClick}
          className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-2)',
          }}
          title="Manage columns"
          aria-label="Manage table columns"
        >
          <Icons.Columns />
        </button>

        {/* Export */}
        <button
          onClick={onExportClick}
          className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-2)',
          }}
          title="Export to CSV"
          aria-label="Export data to CSV"
        >
          <Icons.Download />
        </button>

        {/* Create - Primary Action */}
        <button
          onClick={onCreateClick}
          className="h-9 px-4 flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors border-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{
            backgroundColor: 'hsl(var(--brand-primary))',
            color: 'var(--text-inverse)',
          }}
          aria-label="Create new business request"
        >
          <Icons.Plus />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
}
