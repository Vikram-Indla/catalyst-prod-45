/**
 * Variant 6 — pages/project/TimelineView (Roadmaps.tsx)
 * PI-based Gantt timeline with sprint filter sidebar, status colours, progress bars.
 */
import React from 'react';
import Roadmaps from '@/pages/Roadmaps';

export default function TimelineViewVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Roadmaps />
    </div>
  );
}
