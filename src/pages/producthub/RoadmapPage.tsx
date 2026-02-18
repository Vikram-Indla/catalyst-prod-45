// =====================================================
// PRODUCT ROADMAP PAGE — Initiative Timeline (Gantt)
// =====================================================

import React from 'react';
import { TimelineShell } from '@/components/producthub/timeline/TimelineShell';

export const RoadmapPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-card">
        <h1 className="text-2xl font-bold text-zinc-900">Product Roadmap</h1>
        <p className="text-sm text-zinc-500 mt-1">Initiative timeline &amp; delivery planning</p>
      </div>
      <TimelineShell />
    </div>
  );
};

export default RoadmapPage;
