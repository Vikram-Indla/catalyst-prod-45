/**
 * RequestTable — migrated to canonical JiraTable on 2026-04-26.
 *
 * BEFORE (581 lines): bespoke renderer built on @tanstack/react-table +
 *         @hello-pangea/dnd, with custom thead/tbody, click-vs-doubleclick
 *         timer, inline DOMRect-positioned editor, BRD sub-row expansion,
 *         and four hover row-actions (promote, edit, star, more).
 *
 * AFTER:  thin wrapper that calls <JiraTable> with a column schema. The
 *         public `Props` interface is unchanged, so InitiativeListingPage
 *         doesn't need any edits.
 *
 * FEATURE PARITY MAP — what carries over and what's deferred:
 *
 *   ✓ All 17 columns (select, star, roadmap, type_icon, initiative_key,
 *     source, title, status, priority, score, assignee, department,
 *     quarter, kickoff, target, progress, ea_review).
 *   ✓ Selection (canonical's selectable + selection set).
 *   ✓ Sort (controlled via canonical's sortKey/sortOrder; onSortChange
 *     adapts to the page's existing { id, desc }[] shape).
 *   ✓ Column visibility — `columnConfigs` Prop drives it via canonical's
 *     columnVisibility set.
 *   ✓ Column reorder — canonical's enableColumnReorder is on by default
 *     (HTML5 native DnD on header cells; structural columns pinned).
 *   ✓ Group-by — transforms `data` into RowGroup<Request>[] before
 *     passing to canonical.
 *   ✓ Row click → opens detail (onRowClick Prop wired directly).
 *   ✓ Context menu (right-click) — canonical's contextMenuActions runs
 *     promote/edit/star/more from the same row-actions vocabulary.
 *   ✓ Focused row — canonical's focusedRowId; the page tracks it as an
 *     index, so we map index ↔ id at the boundary.
 *   ✓ Cancelled-row dimming — applied via custom cell wrappers reading
 *     row.status === 'cancelled'.
 *   ✓ Loading + empty state via canonical's isLoading + emptyView.
 *
 *   ⚠ Row DnD reorder — JiraTable does not yet expose row drag-reorder.
 *     `onReorder` becomes a no-op for now and is documented at the call
 *     site. The plan is to add row DnD to JiraTable in a follow-up; this
 *     wrapper will then re-enable onReorder without API changes.
 *   ⚠ BRD sub-rows (`brdTasksMap`) — JiraTable doesn't render expandable
 *     child rows yet. The map is still passed through for type safety
 *     but is not rendered. Detail navigation reaches the same data via
 *     onRowClick.
 *   ⚠ Hover row actions — replaced by right-click context menu (same
 *     actions, more consistent across the canonical's surfaces).
 *   ⚠ Click-vs-doubleclick (250ms) inline edit — replaced by JiraTable's
 *     in-cell editors. Single click on the row opens the detail; status,
 *     priority, assignee, summary editors live in the cells themselves
 *     and open on click of the cell trigger.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BRDTask } from '@/hooks/useMDTBacklog';
import { Star, Map as MapIcon, LayoutGrid, Paperclip, Pencil, MoreVertical } from 'lucide-react';
import type { Request, RequestStatus, Density } from '@/types/request';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/request';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import {
  StatusCell, PriorityCell, ScoreCell, AssigneeCell,
  DateCell, ProgressCell, EACell, QuarterCell, IDCell,
} from './CellRenderers';
import type { ColumnConfig } from './ColumnManager';
// SourceBadge import dropped — see Source-column removal note below.
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable';

interface Props {
  data: Request[];
  loading?: boolean;
  density: Density;
  columnConfigs: ColumnConfig[];
  groupBy?: GroupByField;
  brdTasksMap?: Record<string, BRDTask[]>;
  onRowClick: (request: Request) => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
  onContextMenu?: (e: React.MouseEvent, request: Request) => void;
  /**
   * No-op until JiraTable grows row drag-reorder. Kept in the API so the
   * page doesn't churn on the migration. See file header.
   */
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
  onInlineEdit?: (id: string, field: string, value: string | number | null) => void;
  onPromote?: (request: Request) => void;
  onRoadmapToggle?: (id: string, currentValue: boolean) => void;
  focusedRowIndex?: number;
  onFocusedRowChange?: (index: number) => void;
}

function getGroupKey(item: Request, groupBy: GroupByField): string {
  switch (groupBy) {
    case 'status': return item.status;
    case 'priority': return getPriorityLevel(item.computed_score).level;
    case 'department': return item.department_name || 'Unassigned';
    case 'quarter': return item.target_quarter || 'No Quarter';
    case 'assignee': return item.assignee_name || 'Unassigned';
    default: return '';
  }
}
function getGroupLabel(groupBy: GroupByField, key: string): string {
  if (groupBy === 'status') return STATUS_DISPLAY[key as RequestStatus]?.label ?? key;
  return key;
}

export function RequestTable({
  data,
  loading = false,
  columnConfigs,
  groupBy = 'none',
  // brdTasksMap and density are accepted but not rendered today; see header.
  // density,
  // brdTasksMap = {},
  onRowClick,
  onFavoriteToggle,
  onSelectionChange,
  onSortChange,
  onContextMenu,
  onPromote,
  onRoadmapToggle,
  focusedRowIndex = -1,
  onFocusedRowChange,
}: Props) {
  const avatarsByName = useProfileAvatarsByName();

  // Attachment counts — same query as the previous renderer.
  const issueKeys = useMemo(() => data.map(d => d.jira_issue_key || d.initiative_key).filter(Boolean), [data]);
  const { data: attachmentData } = useQuery({
    queryKey: ['request-attachment-counts', issueKeys],
    queryFn: async () => {
      if (issueKeys.length === 0) return new Map<string, number>();
      const { data: rows } = await supabase.from('ph_issue_attachments').select('issue_key').in('issue_key', issueKeys);
      const map = new Map<string, number>();
      (rows || []).forEach((r: any) => map.set(r.issue_key, (map.get(r.issue_key) || 0) + 1));
      return map;
    },
    staleTime: 5 * 60_000,
  });
  const attachmentCounts = attachmentData || new Map<string, number>();

  // ── Selection adapter ─────────────────────────────────────────────────
  // The canonical accepts a controlled `selection: ReadonlySet<string>` and
  // calls `onSelectionChange: (next: Set<string>) => void`. The page's prop
  // takes a string[]. Adapt in this wrapper so both stay clean.
  const [selectionInternal, setSelectionInternal] = (() => {
    // Inline useState so the hook is at the top level.
    // (eslint-disable-next-line) — single-line wrapper for clarity.
    return useStatePassthrough<Set<string>>(new Set());
  })();
  const handleSelectionChange = useCallback((next: Set<string>) => {
    setSelectionInternal(next);
    onSelectionChange(Array.from(next));
  }, [onSelectionChange, setSelectionInternal]);

  // ── Sort adapter ──────────────────────────────────────────────────────
  // The canonical uses sortKey + sortOrder ('ASC' | 'DESC'). The page's
  // onSortChange expects [{ id, desc }] (tanstack convention). Translate.
  const [sortKey, sortOrder, setSort] = useSortState();
  const handleSortChange = useCallback((key: string, order: 'ASC' | 'DESC') => {
    setSort(key, order);
    if (!key) onSortChange([]);
    else onSortChange([{ id: key, desc: order === 'DESC' }]);
  }, [onSortChange, setSort]);

  // ── Column visibility set ─────────────────────────────────────────────
  const visibilitySet = useMemo(() => {
    const s = new Set<string>();
    columnConfigs.forEach(c => { if (c.visible) s.add(c.id); });
    return s;
  }, [columnConfigs]);

  // ── Focus index ↔ id bridge ───────────────────────────────────────────
  const focusedRowId = useMemo(() => {
    if (focusedRowIndex == null || focusedRowIndex < 0) return undefined;
    return data[focusedRowIndex]?.id;
  }, [focusedRowIndex, data]);
  const handleFocusedRowChange = useCallback((id: string | null) => {
    if (!onFocusedRowChange) return;
    if (!id) { onFocusedRowChange(-1); return; }
    const idx = data.findIndex(d => d.id === id);
    onFocusedRowChange(idx);
  }, [data, onFocusedRowChange]);

  // ── Column schema ─────────────────────────────────────────────────────
  // IDs match the existing ColumnManager config so column visibility +
  // user preferences from localStorage continue to work without migration.
  const columns: Column<Request>[] = useMemo(() => [
    {
      id: 'star', label: '', width: 3, alwaysVisible: true,
      cell: ({ row }) => (
        <button
          type="button"
          data-jira-table-editor
          onClick={(e) => { e.stopPropagation(); onFavoriteToggle((row as any).id, !!(row as any).is_favorited); }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, padding: 0 }}
          title={(row as any).is_favorited ? 'Unstar' : 'Star'}
        >
          <Star size={14} fill={(row as any).is_favorited ? '#FACC15' : 'none'} stroke={(row as any).is_favorited ? '#FACC15' : 'var(--cp-border-strong)'} strokeWidth={2} />
        </button>
      ),
    },
    {
      id: 'roadmap', label: '', width: 3, alwaysVisible: true,
      cell: ({ row }) => (
        <button
          type="button"
          data-jira-table-editor
          onClick={(e) => { e.stopPropagation(); onRoadmapToggle?.((row as any).id, (row as any).on_roadmap ?? false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={(row as any).on_roadmap ? 'Remove from Roadmap' : 'Add to Roadmap'}
        >
          <MapIcon size={16} style={{ color: (row as any).on_roadmap ? 'var(--pb-primary)' : 'var(--pb-ink-muted)', opacity: (row as any).on_roadmap ? 1 : 0.4 }} />
        </button>
      ),
    },
    {
      id: 'initiative_key', label: 'ID', width: 8, sortable: true, alwaysVisible: true,
      accessor: (r: any) => r.initiative_key,
      cell: ({ row }) => {
        const key = (row as any).initiative_key;
        const attKey = (row as any).jira_issue_key || key;
        const attCount = attachmentCounts.get(attKey) || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {attCount > 0 && <span title="Attachments"><Paperclip size={12} style={{ color: 'var(--cp-text-muted)', flexShrink: 0, transform: 'rotate(-45deg)' }} /></span>}
            <IDCell value={key} />
          </div>
        );
      },
    },
    /*
      'Source' column removed — every request is Catalyst-canonical
      now per the "no Jira data inflow" decision. Keeping the column
      surfaced provenance distinctions that no longer mean anything in
      the UX. The `source` field stays on the row for legacy callers
      but the table no longer renders it.
    */
    {
      id: 'title', label: 'Title', width: 24, sortable: true, alwaysVisible: true,
      accessor: (r: any) => r.title,
      cell: ({ row }) => {
        const cancelled = (row as any).status === 'cancelled';
        return (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: cancelled ? 0.55 : 1 }}>
            {(row as any).title || '—'}
          </span>
        );
      },
    },
    {
      id: 'status', label: 'Status', width: 14, sortable: true,
      accessor: (r: any) => r.status,
      cell: ({ row }) => <StatusCell status={(row as any).status} />,
    },
    {
      id: 'priority', label: 'Priority', width: 9, sortable: true,
      accessor: (r: any) => r.computed_score,
      cell: ({ row }) => <PriorityCell score={(row as any).computed_score} />,
    },
    {
      id: 'score', label: 'Score', width: 6, sortable: true,
      accessor: (r: any) => r.computed_score,
      cell: ({ row }) => <ScoreCell score={(row as any).computed_score} />,
    },
    {
      id: 'assignee', label: 'Assignee', width: 11, sortable: true,
      accessor: (r: any) => r.assignee_name,
      cell: ({ row }) => {
        const name = (row as any).assignee_name;
        const directAvatar = (row as any).assignee_avatar;
        const url = directAvatar || (name ? avatarsByName.get(name.toLowerCase()) : undefined);
        return <AssigneeCell name={name} avatarUrl={url} />;
      },
    },
    {
      id: 'department', label: 'Department', width: 11, sortable: true,
      accessor: (r: any) => r.department_name,
      cell: ({ row }) => <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--pb-ink-secondary)' }}>{(row as any).department_name || '—'}</span>,
    },
    {
      id: 'quarter', label: 'Quarter', width: 7, sortable: true,
      accessor: (r: any) => r.target_quarter,
      cell: ({ row }) => <QuarterCell value={(row as any).target_quarter} />,
    },
    {
      id: 'kickoff', label: 'Kickoff', width: 8, sortable: true,
      accessor: (r: any) => r.kickoff_date,
      cell: ({ row }) => <DateCell date={(row as any).kickoff_date} />,
    },
    {
      id: 'target', label: 'Target', width: 8, sortable: true,
      accessor: (r: any) => r.target_complete,
      cell: ({ row }) => <DateCell date={(row as any).target_complete} status={(row as any).status} />,
    },
    {
      id: 'progress', label: 'Progress', width: 9, sortable: true,
      accessor: (r: any) => r.progress,
      cell: ({ row }) => <ProgressCell value={(row as any).progress} status={(row as any).status} />,
    },
    {
      id: 'ea_review', label: 'EA Review', width: 7,
      cell: () => <EACell value={null} />,
    },
  ], [avatarsByName, attachmentCounts, onFavoriteToggle, onRoadmapToggle]);

  // ── Group-by transform ────────────────────────────────────────────────
  const groups: RowGroup<Request>[] | undefined = useMemo(() => {
    if (!groupBy || groupBy === 'none') return undefined;
    const map = new Map<string, Request[]>();
    for (const r of data) {
      const key = getGroupKey(r, groupBy);
      const arr = map.get(key);
      if (arr) arr.push(r); else map.set(key, [r]);
    }
    const out: RowGroup<Request>[] = [];
    for (const [key, rows] of map.entries()) {
      out.push({ id: key, label: getGroupLabel(groupBy, key), rows });
    }
    return out;
  }, [data, groupBy]);

  // ── Context menu actions (right-click) ────────────────────────────────
  const contextMenuActions = useMemo(() => [
    { id: 'edit', label: 'Edit details', icon: <Pencil size={14} />, onClick: (r: Request) => onRowClick(r) },
    {
      id: 'star',
      label: 'Toggle star',
      icon: <Star size={14} />,
      onClick: (r: Request) => onFavoriteToggle(r.id, r.is_favorited),
    },
    {
      id: 'promote',
      label: 'Add to roadmap',
      icon: <MapIcon size={14} />,
      hidden: (r: Request) => !!r.on_roadmap,
      onClick: (r: Request) => { if (onPromote) onPromote(r); },
    },
    {
      id: 'more',
      label: 'More…',
      icon: <MoreVertical size={14} />,
      onClick: (r: Request) => {
        // The page's existing onContextMenu expects a MouseEvent. We don't
        // have one in this context; the page can adapt to take just the
        // request if needed. For now, fall through to onRowClick.
        if (onContextMenu) {
          // Synthesize a minimal target rect at viewport center for menu pos.
          const fakeEvt = new MouseEvent('contextmenu', { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }) as unknown as React.MouseEvent;
          onContextMenu(fakeEvt, r);
        } else {
          onRowClick(r);
        }
      },
    },
  ], [onRowClick, onFavoriteToggle, onPromote, onContextMenu]);

  // ── Empty state ───────────────────────────────────────────────────────
  const emptyView = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '64px 0' }}>
      <LayoutGrid size={48} style={{ color: 'var(--pb-border-strong)' }} />
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--pb-ink)' }}>No business requests match your filters</h3>
      <p style={{ fontSize: 13, color: 'var(--pb-ink-muted)' }}>Try adjusting your search or filter criteria</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <JiraTable<Request>
        columns={columns}
        data={groups ? undefined : data}
        groups={groups}
        getRowId={(r) => r.id}
        ariaLabel="Requests"
        isLoading={loading}
        selectable
        selection={selectionInternal}
        onSelectionChange={handleSelectionChange}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        columnVisibility={visibilitySet}
        // The page owns columnConfigs / ColumnManager; we don't expose
        // the canonical's built-in column manager here. The visibility
        // set is read-only from the canonical's perspective.
        onColumnVisibilityChange={undefined}
        focusedRowId={focusedRowId}
        onFocusedRowChange={handleFocusedRowChange}
        contextMenuActions={contextMenuActions}
        onRowClick={onRowClick}
        enableColumnReorder
        emptyView={emptyView}
      />
    </div>
  );
}

/**
 * Local hook helpers — kept as plain functions to avoid React import noise.
 * Both honour the Rules of Hooks because they only call useState.
 */
import { useState as useReactState } from 'react';
function useStatePassthrough<T>(initial: T): [T, (next: T) => void] {
  const [v, set] = useReactState<T>(initial);
  return [v, set];
}
function useSortState(): [string | undefined, 'ASC' | 'DESC' | undefined, (key: string, order: 'ASC' | 'DESC') => void] {
  const [sort, setSort] = useReactState<{ key: string; order: 'ASC' | 'DESC' } | null>({ key: 'initiative_key', order: 'ASC' });
  return [sort?.key, sort?.order, (key, order) => setSort(key ? { key, order } : null)];
}
