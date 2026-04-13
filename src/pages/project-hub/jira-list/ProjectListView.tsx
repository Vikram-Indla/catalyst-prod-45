/**
 * ProjectListView — List tab with Table / Split toggle
 * Table mode: flat CatalystTable (same as /for-you)
 * Split mode: scrollable card list (left) + detail panel (right)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { CatalystTable } from '@/components/for-you/ForYouTable';
import { WorkItemDetailPanel } from './components/WorkItemDetailPanel';
import { useProjectListItems } from '@/hooks/useProjectListItems';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { LayoutGrid, Columns } from 'lucide-react';
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
const PRIORITY_MAP: Record<string, number> = { highest: 4, high: 3, medium: 2, low: 1, lowest: 0 };

function computeGroup(updatedAt: string): WorkGroup {
  const now = new Date();
  const updated = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
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

type ViewMode = 'table' | 'split';

function SplitListCard({ item, isActive, onClick }: { item: PhWorkItem; isActive: boolean; onClick: () => void }) {
  const isRTL = /[\u0600-\u06FF]/.test(item.summary);
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderBottom: '0.75px solid #E2E8F0',
        cursor: 'pointer',
        background: isActive ? 'rgba(37,99,235,0.06)' : 'transparent',
        borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = 'rgba(0,0,0,0.02)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <WorkItemTypeIcon type={item.type} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              fontSize: 13, fontWeight: 500, color: '#0F172A',
              lineHeight: 1.4, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {item.summary || '(No title)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2563EB' }}>
              {item.jiraKey}
            </span>
            {item.assignee && (
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: item.assignee.color || '#6554C0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff',
                marginLeft: 'auto', flexShrink: 0,
              }}>
                {item.assignee.initials}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectListView({ projectKey, projectId }: Props) {
  const { data: items = [], isLoading } = useProjectListItems(projectKey);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

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

  const activeItem = useMemo(() =>
    activeItemId ? items.find(i => i.id === activeItemId) ?? null : (items[0] ?? null),
    [activeItemId, items]
  );

  const handleRowClick = useCallback((itemId: string) => {
    if (viewMode === 'split') {
      setActiveItemId(itemId);
    }
  }, [viewMode]);

  const handleNavigate = useCallback((id: string) => {
    setActiveItemId(id);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 16px',
        borderBottom: '0.75px solid #E2E8F0',
        background: '#FAFBFC',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          {items.length} items
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button
            onClick={() => setViewMode('table')}
            title="Table view"
            style={{
              width: 30, height: 28, border: '1px solid',
              borderColor: viewMode === 'table' ? '#2563EB' : '#E2E8F0',
              borderRadius: '4px 0 0 4px',
              background: viewMode === 'table' ? 'rgba(37,99,235,0.08)' : '#fff',
              color: viewMode === 'table' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => { setViewMode('split'); if (!activeItemId && items.length) setActiveItemId(items[0].id); }}
            title="Split view"
            style={{
              width: 30, height: 28, border: '1px solid',
              borderColor: viewMode === 'split' ? '#2563EB' : '#E2E8F0',
              borderRadius: '0 4px 4px 0',
              background: viewMode === 'split' ? 'rgba(37,99,235,0.08)' : '#fff',
              color: viewMode === 'split' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: -1,
            }}
          >
            <Columns size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CatalystTable
            groupedItems={groupedItems}
            onRowClick={handleRowClick}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: '0.75px solid #E2E8F0',
            overflowY: 'auto',
            background: '#fff',
          }}>
            <div style={{
              padding: '8px 12px', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#64748B', background: '#F7F8F9',
              borderBottom: '0.75px solid #E2E8F0',
              fontFamily: 'Inter, sans-serif',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              {items.length} of {items.length}
            </div>
            {items.map(item => (
              <SplitListCard
                key={item.id}
                item={item}
                isActive={activeItem?.id === item.id}
                onClick={() => setActiveItemId(item.id)}
              />
            ))}
          </div>
          {activeItem ? (
            <WorkItemDetailPanel
              item={activeItem}
              allItems={items}
              onNavigate={handleNavigate}
              onClose={() => setActiveItemId(null)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              Select an item to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
