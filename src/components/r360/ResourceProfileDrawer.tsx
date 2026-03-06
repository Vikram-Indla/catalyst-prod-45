/**
 * ResourceProfileDrawer — 700px profile drawer with 4 tabs
 */

import { useEffect, useCallback } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useR360Resources } from '@/hooks/useR360Profile';
import type { R360ActiveTab } from '@/pages/R360ProfilePage';
import { OverviewTab } from './ResourceProfileDrawer.tabs/OverviewTab';
import { BehaviouralTab } from './ResourceProfileDrawer.tabs/BehaviouralTab';
import { WeeklyStoryTab } from './ResourceProfileDrawer.tabs/WeeklyStoryTab';
import { WorkItemsTab } from './ResourceProfileDrawer.tabs/WorkItemsTab';

interface ResourceProfileDrawerProps {
  selectedResourceId: string | null;
  onClose: () => void;
  activeTab: R360ActiveTab;
  onTabChange: (tab: R360ActiveTab) => void;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
}

const TABS: { key: R360ActiveTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'behavioural', label: 'Behavioural Patterns' },
  { key: 'weekly-story', label: 'Weekly Story' },
  { key: 'work-items', label: 'Work Items' },
];

export function ResourceProfileDrawer({
  selectedResourceId,
  onClose,
  activeTab,
  onTabChange,
  weekOffset,
  onWeekOffsetChange,
}: ResourceProfileDrawerProps) {
  const { data: resources = [] } = useR360Resources();
  const resource = resources.find((r) => r.id === selectedResourceId);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  if (!resource) return null;

  return (
    <div className="r3p-drawer">
      {/* Topbar */}
      <div className="r3p-drawer-topbar">
        <button className="r3p-back-btn" onClick={onClose}>
          <ChevronLeft size={16} />
          Resources
        </button>
        <div className="r3p-topbar-right">
          <span className="r3p-data-age">Data: 1h ago</span>
          <button className="r3p-close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="r3p-profile-header">
        <div className="r3p-profile-top">
          <div
            className="r3p-avatar r3p-avatar--lg"
            style={{
              background: `linear-gradient(135deg, ${resource.avatarGradientStart}, ${resource.avatarGradientEnd})`,
            }}
          >
            {resource.avatarInitials}
          </div>
          <div>
            <div className="r3p-profile-name">{resource.fullName}</div>
            <div className="r3p-profile-meta">
              <span>{resource.role}</span>
              <span>·</span>
              <span>{resource.department}</span>
              <span>·</span>
              <span className="r3p-rid-badge">{resource.resourceKey}</span>
              <div className={`r3p-avail-dot r3p-avail-dot--${resource.availability}`} />
            </div>
          </div>
        </div>
        {resource.skills.length > 0 && (
          <div className="r3p-skills-row">
            {resource.skills.map((s) => (
              <span key={s} className="r3p-skill-chip">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="r3p-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className="r3p-tab"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="r3p-body" role="tabpanel">
        {activeTab === 'overview' && (
          <OverviewTab
            resourceId={selectedResourceId!}
            resource={resource}
            weekOffset={weekOffset}
            onTabChange={onTabChange}
          />
        )}
        {activeTab === 'behavioural' && (
          <BehaviouralTab resource={resource} />
        )}
        {activeTab === 'weekly-story' && (
          <WeeklyStoryTab
            resourceId={selectedResourceId!}
            weekOffset={weekOffset}
            onWeekOffsetChange={onWeekOffsetChange}
          />
        )}
        {activeTab === 'work-items' && (
          <WorkItemsTab resourceId={selectedResourceId!} />
        )}
      </div>
    </div>
  );
}
