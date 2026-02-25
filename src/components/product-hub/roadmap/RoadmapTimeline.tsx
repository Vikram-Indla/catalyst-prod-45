/**
 * Product Roadmap — Split panel container (List + Gantt)
 * Features: resizable left panel, synced vertical scroll
 */
import React, { useState, useRef, useCallback } from 'react';
import { RoadmapInitiativeList } from './RoadmapInitiativeList';
import { RoadmapGanttChart } from './RoadmapGanttChart';
import type { RoadmapGroup, ZoomLevel } from './types/roadmap.types';

interface RoadmapTimelineProps {
  groups: RoadmapGroup[];
  zoom: ZoomLevel;
  timelineStart: Date;
  timelineEnd: Date;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAddClick: () => void;
}

export function RoadmapTimeline({
  groups, zoom, timelineStart, timelineEnd, selectedId, hoveredId, onSelect, onHover, onAddClick,
}: RoadmapTimelineProps) {
  const [listWidth, setListWidth] = useState(380);
  const isDragging = useRef(false);

  // ── Scroll sync refs ──
  const listScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const scrollingFrom = useRef<'list' | 'gantt' | null>(null);

  const handleListScroll = useCallback(() => {
    if (scrollingFrom.current === 'gantt') return;
    scrollingFrom.current = 'list';
    if (listScrollRef.current && ganttScrollRef.current) {
      ganttScrollRef.current.scrollTop = listScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => { scrollingFrom.current = null; });
  }, []);

  const handleGanttScroll = useCallback(() => {
    if (scrollingFrom.current === 'list') return;
    scrollingFrom.current = 'gantt';
    if (listScrollRef.current && ganttScrollRef.current) {
      listScrollRef.current.scrollTop = ganttScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => { scrollingFrom.current = null; });
  }, []);

  // ── Resize drag handle ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = listWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newW = Math.min(600, Math.max(260, startWidth + (ev.clientX - startX)));
      setListWidth(newW);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [listWidth]);

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#FFFFFF' }}>
      {/* Left panel — resizable */}
      <RoadmapInitiativeList
        groups={groups}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
        onAddClick={onAddClick}
        width={listWidth}
        scrollRef={listScrollRef}
        onScroll={handleListScroll}
      />

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex-shrink-0 flex items-center justify-center group"
        style={{ width: 6, cursor: 'col-resize', zIndex: 20, position: 'relative' }}
      >
        <div
          className="group-hover:bg-blue-400 transition-colors"
          style={{ width: 2, height: 32, borderRadius: 1, background: '#E2E8F0' }}
        />
      </div>

      {/* Right panel — Gantt */}
      <RoadmapGanttChart
        groups={groups}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        zoom={zoom}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
        scrollRef={ganttScrollRef}
        onScroll={handleGanttScroll}
      />
    </div>
  );
}
