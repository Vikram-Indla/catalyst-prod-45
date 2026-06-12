/**
 * Variant 1 — catalyst-roadmap / RoadmapTimeline
 * Uses the filter-backed roadmap hooked up to "Viks Epics" (BAU Epics in Backlog).
 * Same data path as FilterRoadmapPage.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { RoadmapTimeline } from '@/components/catalyst-roadmap/RoadmapTimeline';
import { useFilterRoadmapGroups } from '@/components/catalyst-roadmap/adapters/filterRoadmapSource';
import Spinner from '@atlaskit/spinner';
import type { TimesliceMode, TimelineConfig } from '@/types/roadmap';

const JQL = 'project = "BAU" AND issuetype = "Epic" ORDER BY updated DESC';

function defaultTimelineConfig(): TimelineConfig {
  const today = new Date();
  return {
    start: new Date(today.getFullYear(), 0, 1),
    end: new Date(today.getFullYear() + 1, 11, 31),
    today,
  };
}

export default function CatalystRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  const roadmap = useFilterRoadmapGroups(JQL, { dateField: 'created', laneBy: 'status' });
  const [slice] = useState<TimesliceMode>('monthly');
  const [zoom] = useState(100);
  const [collapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const timelineConfig = useMemo(defaultTimelineConfig, []);
  const ref = useRef<HTMLDivElement>(null);

  if (roadmap.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (roadmap.groups.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--ds-text-subtle, #42526E)' }}>
        No BAU Epics found in ph_issues. The component renders correctly but needs synced data.
      </div>
    );
  }

  return (
    <RoadmapTimeline
      ref={ref}
      groups={roadmap.groups}
      deps={[]}
      collapsed={collapsed}
      selected={selected}
      editing={editing}
      slice={slice}
      zoom={zoom}
      timelineConfig={timelineConfig}
      onSelect={setSelected}
      onStartEdit={setEditing}
      onFinishEdit={() => setEditing(null)}
      onCancelEdit={() => setEditing(null)}
      onContextMenu={() => {}}
      onShowTooltip={() => {}}
      onHideTooltip={() => {}}
    />
  );
}
