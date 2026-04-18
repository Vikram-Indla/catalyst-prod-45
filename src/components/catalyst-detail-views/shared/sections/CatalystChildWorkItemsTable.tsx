/**
 * CatalystChildWorkItemsTable — Jira-parity child work items table.
 *
 * Canonical section for Epic (and potentially Feature) detail views.
 * Features: segmented progress bar, sortable columns, column picker,
 * inline status dropdown, inline create, choose-existing search.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Eye, EyeOff, ChevronDown, ChevronUp, Check, Loader2,
  CornerDownLeft, X, ArrowUpDown, MoreHorizontal, Search,
} from 'lucide-react';
import type { ColumnConfig, PhIssueRow, StatusCategory } from '../types';
import {
  DEFAULT_COLUMNS, WORK_ITEM_ICONS, STATUS_OPTION_GROUPS,
  PRIORITY_COLORS, LOZENGE,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  nextPos, getAvatarColor, formatDateShort,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import {
  SectionBlock, ColumnPicker, SkeletonRows, EmptyState,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import { ConfirmDialog } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/ConfirmDialog';
import { toast } from 'sonner';

/* ── Props ── */
export interface CatalystChildWorkItemsTableProps {
  /** The parent issue's issue_key (e.g. "MOIM-42") */
  parentKey: string;
  /** The parent issue's id (uuid) */
  parentId: string;
  /** Project key for new issues (e.g. "MOIM") */
  projectKey: string;
  /** Callback when a child issue key is clicked — opens that item */
  onOpenItem?: (itemId: string) => void;
}

/* ── Sort types ── */
type SortKey = 'work' | 'priority' | 'assignee' | 'status';
type SortDir = 'asc' | 'desc' | null;

const PRIORITY_ORDER: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
const STATUS_CAT_ORDER: Record<string, number> = { done: 0, in_progress: 1, todo: 2 };

/* ── Epic child type options (Jira parity — broader than Story subtasks) ── */
const TYPE_OPTIONS = [
  { key: 'Story', label: 'Story', icon: WORK_ITEM_ICONS.Story ?? WORK_ITEM_ICONS.story },
  { key: 'Bug', label: 'Bug', icon: WORK_ITEM_ICONS.Bug ?? WORK_ITEM_ICONS.bug },
  { key: 'task', label: 'Task', icon: WORK_ITEM_ICONS.task },
  { key: 'Production Incident', label: 'Production Incident', icon: WORK_ITEM_ICONS['Production Incident'] ?? WORK_ITEM_ICONS.incident },
  { key: 'Change Request', label: 'Change Request', icon: WORK_ITEM_ICONS['Change Request'] ?? WORK_ITEM_ICONS.changes },
  { key: 'New Feature', label: 'New Feature', icon: WORK_ITEM_ICONS['New Feature'] ?? WORK_ITEM_ICONS.Feature },
  { key: 'Improvement', label: 'Improvement', icon: WORK_ITEM_ICONS.Improvement ?? WORK_ITEM_ICONS.improvement },
];

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT — CatalystChildWorkItemsTable
   ══════════════════════════════════════════════════════════ */
export function CatalystChildWorkItemsTable({
  parentKey, parentId, projectKey, onOpenItem,
}: CatalystChildWorkItemsTableProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showDone, setShowDone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Story');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const createRef = useRef<HTMLInputElement>(null);

  /* Sort state */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey, sortDir]);

  /* ── Data query — all children of this parent ── */
  const QK = ['cv-child-work-items', parentKey];

  const { data: children = [], isLoading } = useQuery({
    queryKey: QK,
    enabled: !!parentKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', parentKey)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  /* ── Filter + sort ── */
  const sorted = useMemo(() => {
    let items = showDone ? children : children.filter(c => c.status_category !== 'done');
    if (sortKey && sortDir) {
      items = [...items].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'work':
            cmp = (a.summary ?? '').localeCompare(b.summary ?? '');
            break;
          case 'priority':
            cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
            break;
          case 'assignee':
            cmp = (a.assignee_display_name ?? 'zzz').localeCompare(b.assignee_display_name ?? 'zzz');
            break;
          case 'status':
            cmp = (STATUS_CAT_ORDER[a.status_category] ?? 99) - (STATUS_CAT_ORDER[b.status_category] ?? 99);
            break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return items;
  }, [children, showDone, sortKey, sortDir]);

  /* ── Counts ── */
  const doneCount = children.filter(c => c.status_category === 'done').length;
  const inProgressCount = children.filter(c => c.status_category === 'in_progress').length;
  const todoCount = children.length - doneCount - inProgressCount;

  /* ── Placeholder: mutations + subcomponents added in subsequent phases ── */

  return (
    <>
      <SectionBlock
        title="Child work items"
        count={children.length}
        doneCount={doneCount}
        defaultExpanded={true}
        headerRight={
          <>
            {doneCount > 0 && (
              <button className="sdm-visibility-btn" onClick={() => setShowDone(s => !s)}>
                {showDone ? <><Eye size={11} /> Hide done</> : <><EyeOff size={11} /> Show done ({doneCount})</>}
              </button>
            )}
            <ColumnPicker columns={columns} onChange={setColumns} />
            <button onClick={() => setCreating(true)} title="Add child work item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
              cursor: 'pointer', color: '#6B778C', transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.color = '#292A2E'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B778C'; }}
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </>
        }
      >
        {isLoading && <SkeletonRows />}
        {!isLoading && children.length === 0 && !creating && (
          <EmptyState heading="No child work items" sub="Add stories, tasks, and bugs to this epic" cta="+ Add work item" onCta={() => setCreating(true)} />
        )}

        {/* TODO 1e: SegmentedProgressBar */}
        {/* TODO 1d: SortableHeader row */}
        {/* TODO 1f: DynamicRow list */}
        {/* TODO Phase 2: Inline create + choose existing */}
      </SectionBlock>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.key ?? ''}?`}
        message="This item will be soft-deleted. It can be restored within 30 days."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { /* deleteMutation in Phase 2 */ } setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
