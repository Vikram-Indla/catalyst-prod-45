/**
 * Product Roadmap — Toolbar (Zoom, Group, Today)
 */
import React from 'react';
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import type { ZoomLevel, GroupBy, ViewMode } from './types/roadmap.types';
import { SURFACE, SURFACE_DARK, INK, INK_DARK } from './constants/roadmap.constants';
import { useTheme } from '@/hooks/useTheme';
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
  zoomScale: number;
  onZoomScaleChange: (s: number) => void;
}

const ZOOM_OPTIONS: ZoomLevel[] = ['Week', 'Month', 'Quarter'];
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function RoadmapToolbar({ zoom, onZoomChange, groupBy, onGroupByChange, viewMode, onViewModeChange, onToday, zoomScale, onZoomScaleChange }: RoadmapToolbarProps) {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}
    >
      <div className="flex items-center gap-2">
        {/* Segmented control */}
        <div className="inline-flex items-center" style={{ border: `1.5px solid ${surface.border}`, borderRadius: 6, overflow: 'hidden' }}>
          {ZOOM_OPTIONS.map(z => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className="h-[30px] px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
              style={{
                background: zoom === z ? '#2563EB' : surface.card,
                color: zoom === z ? '#FFFFFF' : ink[2],
                fontWeight: zoom === z ? 600 : 500,
                borderRight: `1px solid ${surface.border}`,
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { if (zoom !== z) e.currentTarget.style.background = isDark ? '#292929' : surface.page; }}
              onMouseLeave={e => { if (zoom !== z) e.currentTarget.style.background = surface.card; }}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Group dropdown */}
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
          <SelectTrigger
            className="h-[30px] w-auto min-w-[140px] text-xs font-medium border-border bg-card"
            style={{ borderRadius: 6, borderWidth: '1.5px', color: ink[2] }}
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

        {/* Zoom buttons */}
        <button
          onClick={() => onZoomScaleChange(Math.max(MIN_SCALE, zoomScale - SCALE_STEP))}
          disabled={zoomScale <= MIN_SCALE}
          className="h-[30px] w-[30px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: `1.5px solid ${surface.border}`, borderRadius: 6, transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#292929' : surface.page; e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = surface.border; }}
        >
          <ZoomOut className="w-3.5 h-3.5" style={{ color: ink[2] }} />
        </button>
        <button
          onClick={() => onZoomScaleChange(Math.min(MAX_SCALE, zoomScale + SCALE_STEP))}
          disabled={zoomScale >= MAX_SCALE}
          className="h-[30px] w-[30px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: `1.5px solid ${surface.border}`, borderRadius: 6, transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#292929' : surface.page; e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = surface.border; }}
        >
          <ZoomIn className="w-3.5 h-3.5" style={{ color: ink[2] }} />
        </button>

        {/* Today button */}
        <button
          onClick={onToday}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
          style={{
            border: '1.5px solid #EF4444',
            borderRadius: 6,
            color: '#DC2626',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Calendar className="w-3.5 h-3.5" /> Today
        </button>
      </div>
    </div>
  );
}
