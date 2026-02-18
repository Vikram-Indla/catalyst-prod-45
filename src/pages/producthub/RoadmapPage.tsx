// =====================================================
// PRODUCT ROADMAP PAGE — Initiative Timeline (Gantt)
// =====================================================

import React, { useState } from 'react';
import { TimelineShell } from '@/components/producthub/timeline/TimelineShell';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';

export const RoadmapPage: React.FC = () => {
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-card">
        <h1 className="text-2xl font-bold text-zinc-900">Product Roadmap</h1>
        <p className="text-sm text-zinc-500 mt-1">Initiative timeline &amp; delivery planning</p>
      </div>
      <TimelineShell />
      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default RoadmapPage;
