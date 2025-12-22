/**
 * Toolbar component with search, filters, grouping, and actions
 * Enterprise-grade styling with Catalyst colors
 */

import React from 'react';
import { 
  Search, 
  Filter, 
  Group, 
  Download, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { RoadmapFilters, TimelineZoom, GroupingField } from '../types/roadmap';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';

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
  filters,
  onFiltersChange,
  grouping,
  onGroupingChange,
  zoom,
  onZoomChange,
  onNavigate,
  onOpenFilterDialog,
  onOpenCreateDialog,
  onOpenExportDialog,
  itemCount,
  activeFilterCount,
}: RoadmapToolbarProps) {
  const { tokens, brand } = useRoadmapTheme();
  
  return (
    <div 
      className="flex items-center justify-between gap-4 p-3"
      style={{
        backgroundColor: tokens.surface.card,
        borderBottom: `1px solid ${tokens.border.default}`,
      }}
    >
      {/* Left side - Search & Filters */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: tokens.text.muted }}
          />
          <Input
            type="text"
            placeholder="Search demands..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 w-64 h-9"
            data-roadmap-search
            style={{
              borderColor: tokens.border.default,
            }}
          />
        </div>

        {/* Filter button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenFilterDialog}
              className="gap-2"
              style={{
                borderColor: tokens.border.default,
                color: tokens.text.primary,
              }}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 px-1.5 min-w-[20px]"
                  style={{
                    backgroundColor: brand.primary,
                    color: '#ffffff',
                  }}
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open filter panel</TooltipContent>
        </Tooltip>

        {/* Grouping dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  style={{
                    borderColor: tokens.border.default,
                    color: tokens.text.primary,
                  }}
                >
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
              <DropdownMenuItem
                key={option.value ?? 'none'}
                onClick={() => onGroupingChange(option.value)}
                className={grouping === option.value ? 'bg-accent' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Item count */}
        <span 
          className="text-sm ml-2"
          style={{ color: tokens.text.muted }}
        >
          {itemCount} {itemCount === 1 ? 'demand' : 'demands'}
        </span>
      </div>

      {/* Right side - Timeline controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Timeline navigation */}
        <div 
          className="flex items-center rounded-md"
          style={{ border: `1px solid ${tokens.border.default}` }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-none rounded-l-md"
                onClick={() => onNavigate('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous period</TooltipContent>
          </Tooltip>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 rounded-none"
            onClick={() => onNavigate('today')}
            style={{
              borderLeft: `1px solid ${tokens.border.default}`,
              borderRight: `1px solid ${tokens.border.default}`,
            }}
          >
            Today
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-none rounded-r-md"
                onClick={() => onNavigate('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next period</TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom control */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 min-w-[100px]"
                  style={{
                    borderColor: tokens.border.default,
                  }}
                >
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
              <DropdownMenuItem
                key={option.value}
                onClick={() => onZoomChange(option.value)}
                className={zoom === option.value ? 'bg-accent' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div 
          className="w-px h-6 mx-1"
          style={{ backgroundColor: tokens.border.default }}
        />

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onOpenExportDialog}
              style={{
                borderColor: tokens.border.default,
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export roadmap</TooltipContent>
        </Tooltip>

        {/* Create button - prominent brand CTA */}
        <button
          onClick={onOpenCreateDialog}
          className="inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-colors shadow-sm"
          style={{
            backgroundColor: brand.primary,
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = brand.primaryHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = brand.primary;
          }}
          data-create-button
        >
          <Plus className="w-4 h-4" />
          Add Demand
        </button>
      </div>
    </div>
  );
}
