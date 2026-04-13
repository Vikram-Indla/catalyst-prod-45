/**
 * ProjectListView — List tab using canonical CatalystTable
 * Adapts ph_issues data to ForYou WorkItem shape for table parity with /for-you
 */
import React, { useState, useMemo, useCallback } from 'react';
import { CatalystTable } from '@/components/for-you/ForYouTable';
import { useProjectListItems } from '@/hooks/useProjectListItems';
import type { WorkItem as PhWorkItem } from '@/types/workItem.types';
import type { WorkItem as ForYouWorkItem, WorkGroup, WorkMode, HubType } from '@/hooks/useForYouData';

interface Props {
  projectKey: string;
  projectId?: string;
}

const AVATAR_COLORS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];
function pickColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

const PRIORITY_MAP: Record<string, number> = {
  highest: 4, high: 3, medium: 2, low: 1, lowest: 0,
};

function computeGroup(updatedAt: string): WorkGroup {
  const now = new Date();
  const updated = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (updated >= yesterday) return 'YESTERDAY';
  if (updated >= weekAgo) return 'THIS_WEEK';
  return 'EARLIER';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function adaptToForYouItem(item: PhWorkItem, projectKey: string): ForYouWorkItem {
  const assigneeName = item.assignee?.name || 'Unassigned';
  return {
    id: item.id,
    key: item.jiraKey,
    summary: item.summary || '(No title)',
    projectKey,
    project: projectKey,
    mode: 'DEL' as WorkMode,
    level: item.type === 'epic' ? 'epic' : item.type === 'story' ? 'story' : 'task',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    updatedAt: formatRelativeTime(item.updatedAt),
    createdAt: item.createdAt,
    assignee: {
      id: item.assigneeId || assigneeName,
      name: assigneeName,
      initials: getInitials(assigneeName),
      avatarColor: pickColor(assigneeName),
    },
    reporter: item.reporter?.name,
    issueType: item.type,
    group: computeGroup(item.updatedAt),
    status: item.statusName || item.status,
    priority: item.priority,
    priorityLevel: PRIORITY_MAP[item.priority] ?? 2,
    storyPoints: item.storyPoints ?? undefined,
    labels: item.labels,
    fixVersion: item.fixVersion ?? undefined,
    description: item.description ?? undefined,
    parentKey: item.parentKey ?? undefined,
    parentSummary: item.parentSummary ?? undefined,
    sprint: item.sprintName ?? undefined,
  };
}

export default function ProjectListView({ projectKey, projectId }: Props) {
  const { data: items = [], isLoading } = useProjectListItems(projectKey);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const forYouItems = useMemo(() =>
    items.map(item => adaptToForYouItem(item, projectKey)),
    [items, projectKey]
  );

  const groupedItems = useMemo(() => {
    const groups: Record<WorkGroup, ForYouWorkItem[]> = {
      YESTERDAY: [], THIS_WEEK: [], EARLIER: [],
    };
    forYouItems.forEach(item => groups[item.group].push(item));
    return groups;
  }, [forYouItems]);

  const handleRowClick = useCallback((itemId: string) => {
    // TODO: open detail panel
    console.log('Row clicked:', itemId);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: 36, borderRadius: 4,
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
      <CatalystTable
        groupedItems={groupedItems}
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
