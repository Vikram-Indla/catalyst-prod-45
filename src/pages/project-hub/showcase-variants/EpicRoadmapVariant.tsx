/**
 * Variant 10 — modules/program-epics/EpicRoadmap
 * Gantt timeline for program epics. Requires a programId — uses a BAU demo fallback.
 */
import React from 'react';
import { EpicRoadmap } from '@/modules/program-epics/components/EpicRoadmap';

export default function EpicRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <EpicRoadmap programId="demo-bau-program" />
    </div>
  );
}
