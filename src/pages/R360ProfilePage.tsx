/**
 * R360 Profile Page — Resource 360° Profile Module
 * Route: /resources
 */

import { useState } from 'react';
import { ResourceSidebar } from '@/components/r360/ResourceSidebar';
import { ResourceMainArea } from '@/components/r360/ResourceMainArea';
import { ResourceProfileDrawer } from '@/components/r360/ResourceProfileDrawer';
import '@/styles/r360-profile.css';

export type R360ActiveTab = 'overview' | 'behavioural' | 'weekly-story' | 'work-items';

export default function R360ProfilePage() {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<R360ActiveTab>('overview');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  return (
    <div className="r360-profile-root">
      <ResourceSidebar
        selectedResourceId={selectedResourceId}
        onSelectResource={setSelectedResourceId}
      />
      {selectedResourceId ? (
        <ResourceProfileDrawer
          selectedResourceId={selectedResourceId}
          onClose={() => setSelectedResourceId(null)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
        />
      ) : (
        <ResourceMainArea selectedResourceId={selectedResourceId} />
      )}
    </div>
  );
}
