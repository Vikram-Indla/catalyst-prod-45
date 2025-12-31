/**
 * Roadmap Header - Logo + Toolbar
 */

import React from 'react';
import { 
  Undo2, Redo2, ZoomIn, ZoomOut, Magnet, Filter, Moon, Sun, 
  Presentation, FileText, HelpCircle, Calendar, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimesliceMode } from '@/types/roadmap';

interface RoadmapHeaderProps {
  slice: TimesliceMode;
  zoom: number;
  snap: boolean;
  dark: boolean;
  presentation: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeFiltersCount: number;
  onSliceChange: (slice: TimesliceMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSnap: () => void;
  onToggleFilter: () => void;
  onToggleDark: () => void;
  onTogglePresentation: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onScrollToToday: () => void;
  onExport: () => void;
  onShowHelp: () => void;
  // Mobile responsive props
  onToggleMobilePanel?: () => void;
  isMobilePanelOpen?: boolean;
}

export function RoadmapHeader({
  slice,
  zoom,
  snap,
  dark,
  canUndo,
  canRedo,
  activeFiltersCount,
  onSliceChange,
  onZoomIn,
  onZoomOut,
  onToggleSnap,
  onToggleFilter,
  onToggleDark,
  onTogglePresentation,
  onUndo,
  onRedo,
  onScrollToToday,
  onExport,
  onShowHelp,
  onToggleMobilePanel,
  isMobilePanelOpen,
}: RoadmapHeaderProps) {
  return (
    <header className="h-[52px] px-4 lg:px-6 flex items-center gap-2 lg:gap-3 bg-surface-0 border-b border-border shrink-0">
      {/* Mobile hamburger menu - only visible below 1024px */}
      {onToggleMobilePanel && (
        <button
          onClick={onToggleMobilePanel}
          className={cn(
            "lg:hidden h-[30px] w-[30px] flex items-center justify-center",
            "border border-border bg-surface-0 rounded-md",
            "text-text-secondary hover:border-border-strong hover:text-text-primary hover:bg-surface-1",
            "transition-all",
            isMobilePanelOpen && "bg-brand-primary/10 border-brand-primary text-brand-primary"
          )}
          title="Toggle objectives panel"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Page Title - matches PageChrome pattern */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden sm:inline">
          Enterprise
        </span>
        <span className="text-[14px] text-text-muted hidden sm:inline">/</span>
        <h1 className="text-[16px] lg:text-[18px] font-semibold text-text-primary truncate">
          Enterprise Roadmap
        </h1>
      </div>

      <div className="flex-1" />

      {/* Toolbar - hidden on very small screens, condensed on medium */}
      <div className="flex items-center gap-1 lg:gap-1.5">
        {/* Undo/Redo - hidden on small screens */}
        <div className="hidden md:flex items-center gap-1">
          <ToolbarButton onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={onRedo} disabled={!canRedo} title="Redo (⌘Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
        </div>

        {/* Timeslice Pills - condensed on small screens */}
        <div className="hidden sm:flex bg-surface-2 rounded-md p-0.5">
          {(['weekly', 'monthly', 'quarterly'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSliceChange(s)}
              className={cn(
                "px-2 lg:px-2.5 py-1 text-[10px] lg:text-[11px] font-medium rounded transition-all",
                slice === s 
                  ? "bg-surface-0 text-text-primary shadow-sm" 
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1, 3)}
            </button>
          ))}
        </div>

        <ToolbarDivider className="hidden sm:block" />

        {/* Zoom - hidden on small screens */}
        <div className="hidden lg:flex items-center gap-0.5">
          <ToolbarButton onClick={onZoomOut} title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </ToolbarButton>
          <span className="text-[11px] text-text-muted min-w-[36px] text-center">{zoom}%</span>
          <ToolbarButton onClick={onZoomIn} title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        <ToolbarDivider className="hidden lg:block" />

        {/* Snap Toggle - hidden on small screens */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Snap</span>
          <button
            onClick={onToggleSnap}
            className={cn(
              "w-7 h-4 rounded-full relative transition-colors",
              snap ? "bg-brand-primary" : "bg-border-strong"
            )}
          >
            <span 
              className={cn(
                "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform",
                snap ? "left-3.5" : "left-0.5"
              )}
            />
          </button>
        </div>

        <ToolbarDivider className="hidden xl:block" />

        {/* Filter */}
        <ToolbarButton onClick={onToggleFilter} title="Filters (F)" className="relative">
          <Filter className="w-3.5 h-3.5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </ToolbarButton>

        {/* Today */}
        <ToolbarButton onClick={onScrollToToday} title="Scroll to today (T)">
          <Calendar className="w-3.5 h-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Dark Mode */}
        <ToolbarButton onClick={onToggleDark} title="Toggle dark mode (D)">
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </ToolbarButton>

        {/* Presentation - hidden on small screens */}
        <ToolbarButton onClick={onTogglePresentation} title="Presentation mode (P)" className="hidden md:flex">
          <Presentation className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Export */}
        <ToolbarButton onClick={onExport} title="Export PDF (E)">
          <FileText className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Help - hidden on small screens */}
        <ToolbarButton onClick={onShowHelp} title="Keyboard shortcuts (?)" className="hidden md:flex">
          <HelpCircle className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
    </header>
  );
}

function ToolbarButton({ 
  children, 
  onClick, 
  disabled, 
  title,
  className 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-[30px] w-[30px] flex items-center justify-center",
        "border border-border bg-surface-0 rounded-md",
        "text-text-secondary hover:border-border-strong hover:text-text-primary hover:bg-surface-1",
        "transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider({ className }: { className?: string }) {
  return <div className={cn("w-px h-5 bg-border mx-1 lg:mx-1.5", className)} />;
}
