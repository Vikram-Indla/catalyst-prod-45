/**
 * Product Roadmap — Toolbar (Zoom, Group, Today, View Switcher)
 */
import React from 'react';
import {
  ZoomIn, ZoomOut, Calendar, ChevronDown,
  LayoutList, Columns3, GanttChart, LayoutGrid,
} from 'lucide-react';
import type { ZoomLevel, GroupBy, ViewMode } from './types/roadmap.types';
import { SURFACE, INK } from './constants/roadmap.constants';

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
              className="h-8 px-3 text-xs font-medium transition-colors"
              style={{
                background: zoom === z ? '#2563EB' : SURFACE.card,
                color: zoom === z ? '#FFFFFF' : INK[2],
                borderRight: `1px solid ${SURFACE.border}`,
              }}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Group dropdown */}
        <div className="relative">
          <select
            value={groupBy}
            onChange={e => onGroupByChange(e.target.value as GroupBy)}
            className="h-8 pl-3 pr-7 text-xs font-medium appearance-none cursor-pointer"
            style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2], background: SURFACE.card }}
          >
            <option value="type">Group: Type</option>
            <option value="priority">Group: Priority</option>
            <option value="owner">Group: Owner</option>
            <option value="none">Group: None</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: INK[4] }} />
        </div>

        {/* Zoom +/- */}
        <button className="h-8 w-8 inline-flex items-center justify-center" style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6 }}>
          <ZoomIn className="w-3.5 h-3.5" style={{ color: INK[3] }} />
        </button>
        <button className="h-8 w-8 inline-flex items-center justify-center" style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6 }}>
          <ZoomOut className="w-3.5 h-3.5" style={{ color: INK[3] }} />
        </button>

        {/* Today */}
        <button
          onClick={onToday}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium"
          style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[2] }}
        >
          <Calendar className="w-3.5 h-3.5" /> Today
        </button>
      </div>

      {/* View switcher */}
      <div className="flex items-center gap-1">
        {VIEW_OPTIONS.map(v => (
          <button
            key={v.key}
            onClick={() => onViewModeChange(v.key)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors"
            style={{
              borderRadius: 6,
              background: viewMode === v.key ? '#EFF6FF' : 'transparent',
              color: viewMode === v.key ? '#2563EB' : INK[3],
              border: viewMode === v.key ? '1px solid #BFDBFE' : '1px solid transparent',
            }}
          >
            <v.icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
