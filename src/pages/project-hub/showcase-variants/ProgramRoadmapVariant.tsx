/**
 * Variant 4 — pages/program/ProgramRoadmapPage
 * Gantt for program-level epics. Uses ProgramPageLayout wrapper — pass a dummy programId.
 */
import React from 'react';
import ProgramRoadmapPage from '@/pages/program/ProgramRoadmapPage';

export default function ProgramRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <ProgramRoadmapPage />
    </div>
  );
}
