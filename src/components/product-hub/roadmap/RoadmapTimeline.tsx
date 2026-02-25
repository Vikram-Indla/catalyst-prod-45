/**
 * Product Roadmap — Split panel container (List + Gantt)
 */
import React from 'react';
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
  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#FFFFFF' }}>
      <RoadmapInitiativeList
        groups={groups}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
        onAddClick={onAddClick}
      />
      <RoadmapGanttChart
        groups={groups}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        zoom={zoom}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
      />
    </div>
  );
}
