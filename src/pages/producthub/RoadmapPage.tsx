// =====================================================
// PRODUCT ROADMAP PAGE — Initiative Timeline (Gantt)
// =====================================================

import React from 'react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { TimelineShell } from '@/components/producthub/timeline/TimelineShell';

export const RoadmapPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <CommandCenterHeader
        title="Product Roadmap"
        subtitle="Initiative timeline & delivery planning"
      />
      <TimelineShell />
    </div>
  );
};

export default RoadmapPage;
