/**
 * ResourceProfileDrawer — 700px profile drawer overlay
 * Stage A: Shell only
 */

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

export function ResourceProfileDrawer({
  selectedResourceId,
  onClose,
  activeTab,
  onTabChange,
  weekOffset,
  onWeekOffsetChange,
}: ResourceProfileDrawerProps) {
  return <div data-component="ResourceProfileDrawer" />;
}
