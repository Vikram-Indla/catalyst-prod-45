/**
 * R360 Profile Page — Resource 360° Profile Module
 * Route: /resources
 * Shell only — Stage A
 */

import { useState } from 'react';
import { ResourceSidebar } from '@/components/r360/ResourceSidebar';
import { ResourceMainArea } from '@/components/r360/ResourceMainArea';
import { ResourceProfileDrawer } from '@/components/r360/ResourceProfileDrawer';

export type R360ActiveTab = 'overview' | 'behavioural' | 'weekly-story' | 'work-items';

export default function R360ProfilePage() {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<R360ActiveTab>('overview');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  // weekOffset 0 = current week, -1 = previous week, etc. Range: 0 to -7

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ResourceSidebar
        selectedResourceId={selectedResourceId}
        onSelectResource={setSelectedResourceId}
      />
      <ResourceMainArea
        selectedResourceId={selectedResourceId}
      />
      <ResourceProfileDrawer
        selectedResourceId={selectedResourceId}
        onClose={() => setSelectedResourceId(null)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        weekOffset={weekOffset}
        onWeekOffsetChange={setWeekOffset}
      />
    </div>
  );
}
