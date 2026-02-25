/**
 * Product Roadmap — Toolbar (Zoom, Group, Today, View Switcher)
 * Polish: focus-visible, transitions
 */
import React from 'react';
import {
  ZoomIn, ZoomOut, Calendar,
  LayoutList, Columns3, GanttChart, LayoutGrid,
} from 'lucide-react';
import type { ZoomLevel, GroupBy, ViewMode } from './types/roadmap.types';
import { SURFACE, INK } from './constants/roadmap.constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoadmapToolbarProps {
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onToday: () => void;
}

const ZOOM_OPTIONS: ZoomLevel[] = ['Week', 'Month', 'Quarter'];
const VIEW_OPTIONS: { key: ViewMode; icon: React.ElementType; label: string }[] = [
  { key: 'Table', icon: LayoutList, label: 'Table' },
  { key: 'Board', icon: Columns3, label: 'Board' },
  { key: 'Timeline', icon: GanttChart, label: 'Timeline' },
  { key: 'Cards', icon: LayoutGrid, label: 'Cards' },
];

export function RoadmapToolbar({ zoom, onZoomChange, groupBy, onGroupByChange, viewMode, onViewModeChange, onToday }: RoadmapToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}
    >
      <div className="flex items-center gap-2">
        {/* Zoom pills */}
        <div className="inline-flex items-center" style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, overflow: 'hidden' }}>
          {ZOOM_OPTIONS.map(z => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className="h-8 px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
              style={{
                background: zoom === z ? '#2563EB' : SURFACE.card,
                color: zoom === z ? '#FFFFFF' : INK[2],
                borderRight: `1px solid ${SURFACE.border}`,
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Group dropdown */}
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
          <SelectTrigger
            className="h-8 w-auto min-w-[130px] text-xs font-medium border-border bg-card text-muted-foreground"
            style={{ borderRadius: 6 }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="type">Group: Type</SelectItem>
            <SelectItem value="priority">Group: Priority</SelectItem>
            <SelectItem value="owner">Group: Owner</SelectItem>
            <SelectItem value="none">Group: None</SelectItem>
          </SelectContent>
        </Select>

        {/* Zoom +/- */}
        <button
          className="h-8 w-8 inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
          style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, transition: 'background-color 0.15s ease' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ZoomIn className="w-3.5 h-3.5" style={{ color: INK[3] }} />
        </button>
        <button
          className="h-8 w-8 inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
          style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, transition: 'background-color 0.15s ease' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ZoomOut className="w-3.5 h-3.5" style={{ color: INK[3] }} />
        </button>

        {/* Today */}
        <button
          onClick={onToday}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
          style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2], transition: 'background-color 0.15s ease' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Calendar className="w-3.5 h-3.5" /> Today
        </button>
      </div>

      {/* View switcher removed — roadmap is timeline-only */}
    </div>
  );
}
