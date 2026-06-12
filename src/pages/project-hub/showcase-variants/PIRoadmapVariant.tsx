/**
 * Variant 7 — pages/project/TimelineView (the PI Gantt view)
 * Horizontal bars per PI/Sprint, toggle for committed vs stretch, status swimlanes.
 */
import React from 'react';
import TimelineView from '@/pages/project/TimelineView';

export default function PIRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <TimelineView />
    </div>
  );
}
