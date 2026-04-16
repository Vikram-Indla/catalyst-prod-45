/**
 * Story Backlog Page — CatalystTable pattern (pb-table, ResizableTableHeader, useTableColumns)
 * With Jira-style Group By dropdown + Filter
 */
import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { STORY_STATUS_LOZENGE, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';

import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, BookOpen, Search, X, Star } from 'lucide-react';
import { GroupByPopover as SharedGroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogStory } from '../types/backlog.types';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import '@/styles/product-backlog.css';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

// ── Column definitions (CatalystTable pattern) ──
const STORY_COLUMNS: TColDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 36, minWidth: 36, locked: true },
  { key: 'type', label: 'TYPE', defaultWidth: 56, minWidth: 44, locked: true },
  { key: 'key', label: 'KEY', defaultWidth: 120, minWidth: 80 },
  { key: 'summary', label: 'SUMMARY', defaultWidth: 380, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'parent', label: 'PARENT', defaultWidth: 200, minWidth: 100 },
  { key: 'assignee', label: 'ASSIGNEE', defaultWidth: 160, minWidth: 100 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 80, minWidth: 50 },
  { key: 'updated', label: 'UPDATED', defaultWidth: 90, minWidth: 60 },
];

const SORTABLE_KEYS = new Set(['key', 'summary', 'status', 'parent', 'assignee', 'priority', 'updated']);

// ── Group By options ──
type GroupByKey = 'none' | 'status' | 'priority' | 'assignee' | 'parent';
const GROUP_OPTIONS: GroupByOption<GroupByKey>[] = [
  { key: 'status', label: 'Status', icon: 'status' },
  { key: 'priority', label: 'Priority', icon: 'priority' },
  { key: 'assignee', label: 'Assignee', icon: 'assignee' },
  { key: 'parent', label: 'Parent', icon: 'parent' },
];

const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  critical: <PriorityBars priority="critical" />,
  highest: <PriorityBars priority="critical" />,
  high: <PriorityBars priority="high" />,
  medium: <PriorityBars priority="medium" />,
  low: <PriorityBars priority="low" />,
  lowest: <PriorityBars priority="low" />,
};

function getSortValue(s: BacklogStory, colKey: string): string | number {
  switch (colKey) {
    case 'key': return s.story_key || '';
    case 'summary': return (s.title || '').toLowerCase();
    case 'status': return (s.status || '').toLowerCase();
    case 'parent': return s.feature?.epic?.name?.toLowerCase() || '';
    case 'assignee': return (s.assignee_name || '').toLowerCase();
    case 'priority': {
      const idx = PRIORITY_ORDER.indexOf(s.priority || '');
      return idx >= 0 ? idx : 999;
    }
    case 'updated': return s.jira_updated_at || '';
    default: return '';
  }
}

function sortStories(items: BacklogStory[], sortKey: string | null, sortDir: SortDir): BacklogStory[] {
  if (!sortKey || !sortDir) return items;
  return [...items].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function groupStories(items: BacklogStory[], groupBy: GroupByKey): { label: string; items: BacklogStory[] }[] {
  if (groupBy === 'none') return [{ label: '', items }];

  const map = new Map<string, BacklogStory[]>();
  items.forEach(s => {
    let key: string;
    switch (groupBy) {
      case 'status': key = s.status || 'No Status'; break;
      case 'priority': key = s.priority || 'No Priority'; break;
      case 'assignee': key = s.assignee_name || 'Unassigned'; break;
      case 'parent': key = s.feature?.epic?.name || 'No Parent'; break;
      default: key = 'Other';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  // Sort groups
  const entries = Array.from(map.entries());
  if (groupBy === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a[0].toLowerCase());
      const bi = PRIORITY_ORDER.indexOf(b[0].toLowerCase());
      return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    });
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }

  return entries.map(([label, items]) => ({ label, items }));
}



      {editStoryId && <EditStoryDialog isOpen={!!editStoryId} onClose={() => setEditStoryId(null)} storyId={editStoryId} projectId={projectId || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })} />}
      <DeleteConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} itemType="Story" itemKey={deleteTarget?.story_key || null} itemName={deleteTarget?.title || ''} isPending={deleteMutation.isPending} />
      {!panelMode && detailItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter isOpen={!!detailItemId} onClose={() => setDetailItemId(null)} itemId={detailItemId} projectId={projectId || ''} projectKey={projectKey || ''} onOpenItem={(id) => setDetailItemId(id)} onTogglePanelMode={handleTogglePanelMode} />
        </Suspense>
      )}

      {/* Jira-style bulk action bar */}
      {selectedIds.size > 0 && (() => {
        const selectedItems = flatItems.filter(s => selectedIds.has(s.id));
        const catItems = selectedItems.filter(s => (s as any).source === 'catalyst');
        const jiraItems = selectedItems.filter(s => (s as any).source === 'jira');
        return (
          <JiraBulkActionBar
            selectedIds={Array.from(selectedIds)}
            items={selectedItems.map(s => ({ id: s.id, issue_key: s.story_key, title: s.title, summary: s.title, status: s.status, priority: s.priority ?? undefined, assignee_name: s.assignee_name ?? undefined }))}
            onClear={() => setSelectedIds(new Set())}
            onDelete={catItems.length > 0 ? async (ids) => {
              // Only delete Catalyst-native items
              const catIds = catItems.map(s => s.id);
              const { error } = await supabase.from('catalyst_issues').delete().in('id', catIds);
              if (error) throw error;
              const skipped = jiraItems.length;
              const deleted = catIds.length;
              if (skipped > 0) {
                toast.success(`${deleted} item${deleted !== 1 ? 's' : ''} deleted. ${skipped} Jira-synced item${skipped !== 1 ? 's' : ''} skipped (delete in Jira).`);
              } else {
                toast.success(`${deleted} item${deleted !== 1 ? 's' : ''} deleted`);
              }
              setSelectedIds(new Set());
              queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
            } : async () => {
              toast.info('Jira-synced items cannot be deleted from Catalyst. Delete them in Jira instead.');
            }}
            entityLabel="work item"
          />
        );
      })()}
    </div>
  );
}
