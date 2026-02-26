/**
 * Toolbar component with search, filters, grouping, view mode, print, HC, and actions
 * Enterprise-grade styling with Catalyst colors
 */

import React, { useState } from 'react';
import { 
  Search, Filter, Group, Download, Plus, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Printer, Contrast,
} from 'lucide-react';
import { TimelineFilterPopover, TimelineFilterState, DEFAULT_TIMELINE_FILTER } from '@/components/roadmap/TimelineFilterPopover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { RoadmapFilters, TimelineZoom, GroupingField } from '../types/roadmap';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';

export type ViewMode = 'gantt' | 'swimlane';

interface RoadmapToolbarProps {
  filters: RoadmapFilters;
  onFiltersChange: (filters: RoadmapFilters) => void;
  grouping: GroupingField;
  onGroupingChange: (field: GroupingField) => void;
  zoom: TimelineZoom;
  onZoomChange: (zoom: TimelineZoom) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onOpenFilterDialog: () => void;
  onOpenCreateDialog: () => void;
  onOpenExportDialog: () => void;
  itemCount: number;
  activeFilterCount: number;
  timelineFilter?: TimelineFilterState;
  onTimelineFilterChange?: (filter: TimelineFilterState) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // V9 additions
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrint: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

const GROUPING_OPTIONS: { value: GroupingField; label: string }[] = [
  { value: null, label: 'No Grouping' },
  { value: 'product', label: 'By Product' },
  { value: 'status', label: 'By Status' },
  { value: 'priority', label: 'By Priority' },
  { value: 'assignee', label: 'By Assignee' },
];

const ZOOM_OPTIONS: { value: TimelineZoom; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

export function RoadmapToolbar({
  filters, onFiltersChange, grouping, onGroupingChange, zoom, onZoomChange,
  onNavigate, onOpenFilterDialog, onOpenCreateDialog, onOpenExportDialog,
  itemCount, activeFilterCount, timelineFilter, onTimelineFilterChange,
  isFullscreen, onToggleFullscreen,
  viewMode, onViewModeChange, onPrint, highContrast, onToggleHighContrast,
}: RoadmapToolbarProps) {
  const { tokens, brand } = useRoadmapTheme();
  const [localTimelineFilter, setLocalTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
  const effectiveTimelineFilter = timelineFilter ?? localTimelineFilter;
  const handleTimelineFilterChange = onTimelineFilterChange ?? setLocalTimelineFilter;

  const hc = highContrast;
  const borderColor = hc ? '#09090B' : tokens.border.default;

  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3"
      style={{
        backgroundColor: tokens.surface.card,
        borderBottom: `${hc ? 2 : 1}px solid ${borderColor}`,
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: tokens.text.muted }} />
          <Input
            type="text"
            placeholder="Search demands..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 w-full sm:w-48 md:w-64 h-9"
            data-roadmap-search
            style={{ borderColor }}
          />
        </div>

        {/* Filter button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onOpenFilterDialog} className="gap-2" style={{ borderColor, color: tokens.text.primary }}>
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px]" style={{ backgroundColor: brand.primary, color: '#ffffff' }}>
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open filter panel</TooltipContent>
        </Tooltip>

        {/* Grouping */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" style={{ borderColor, color: tokens.text.primary }}>
                  <Group className="w-4 h-4" />
                  {grouping ? GROUPING_OPTIONS.find(o => o.value === grouping)?.label : 'Group'}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Group demands</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {GROUPING_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value ?? 'none'} onClick={() => onGroupingChange(option.value)} className={grouping === option.value ? 'bg-accent' : ''}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle — Gantt / Swimlane */}
        <div className="flex items-center rounded-md overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
          {([['gantt', 'Gantt'], ['swimlane', 'Swimlane']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => onViewModeChange(k)}
              style={{
                height: 32, padding: '0 10px', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: viewMode === k ? 600 : 500,
                color: viewMode === k ? '#2563EB' : (hc ? '#3F3F46' : '#71717A'),
                background: viewMode === k ? '#EFF6FF' : (hc ? '#F0F0F0' : '#fff'),
                borderRight: k === 'gantt' ? `1px solid ${borderColor}` : 'none',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Item count */}
        <span className="text-sm ml-2" style={{ color: hc ? '#3F3F46' : tokens.text.muted }}>
          {itemCount} {itemCount === 1 ? 'demand' : 'demands'}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Timeline nav */}
        <div className="flex items-center rounded-md" style={{ border: `1px solid ${borderColor}` }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md" onClick={() => onNavigate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous period</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" className="h-8 px-2 rounded-none" onClick={() => onNavigate('today')} style={{ borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }}>
            Today
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={() => onNavigate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next period</TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[100px]" style={{ borderColor }}>
                  {ZOOM_OPTIONS.find(o => o.value === zoom)?.label}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Timeline scale</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Timeline Scale</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ZOOM_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => onZoomChange(option.value)} className={zoom === option.value ? 'bg-accent' : ''}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Timeline Filter */}
        <TimelineFilterPopover value={effectiveTimelineFilter} onChange={handleTimelineFilterChange} />

        {/* High Contrast toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleHighContrast}
              className="h-9 gap-1.5"
              style={{
                border: `${hc ? 2 : 1}px solid ${hc ? '#09090B' : borderColor}`,
                background: hc ? '#09090B' : '#fff',
                color: hc ? '#fff' : '#3F3F46',
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              <Contrast className="w-3.5 h-3.5" />
              {hc ? 'HC ●' : 'HC'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hc ? 'Disable high contrast' : 'Enable high contrast (WCAG AAA)'}</TooltipContent>
        </Tooltip>

        {/* Print */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onPrint} style={{ borderColor }}>
              <Printer className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Print / PDF (⌘P)</TooltipContent>
        </Tooltip>

        {/* Fullscreen */}
        {onToggleFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={onToggleFullscreen} style={{ borderColor }}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen view'}</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 mx-1" style={{ backgroundColor: borderColor }} />

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onOpenExportDialog} style={{ borderColor }}>
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export roadmap</TooltipContent>
        </Tooltip>

        {/* Create */}
        <button
          onClick={onOpenCreateDialog}
          className="inline-flex items-center gap-2 h-9 px-4 font-medium text-sm rounded-lg transition-colors shadow-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          data-create-button
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create request</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>
    </div>
  );
}
