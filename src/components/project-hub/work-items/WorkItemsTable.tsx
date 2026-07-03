import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, ChevronRight, ArrowUp, ArrowDown, ArrowRight, ChevronsUp, FileText, SearchX, Link2, Flag, Calendar } from '@/lib/atlaskit-icons';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import type { SortColumn, ColumnDef, GroupedItems } from '@/hooks/useWorkItemListState';
import { BulkActionsBar } from './BulkActionsBar';
import { SourceBadge } from '../source-badge/SourceBadge';
import { SyncStatusDot } from '../source-badge/SyncStatusDot';
import { InlineSummaryEditor, InlineStatusPicker, InlinePriorityPicker, InlineAssigneePicker, InlineDatePicker } from './inline/InlineEditors';
import { catalystToast } from '@/lib/catalystToast';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable/types';

interface WorkItemsTableProps {
  items: WorkItemRow[];
  onRowClick: (id: string) => void;
  onCreateClick?: () => void;
  sorts: SortColumn[];
  onToggleSort: (field: keyof WorkItemRow, multi: boolean) => void;
  columns: ColumnDef[];
  grouped: GroupedItems[] | null;
  // Inline editing + bulk
  onInlineUpdate: (id: string, changes: Record<string, any>) => void;
  onBulkUpdate: (ids: string[], changes: Record<string, any>) => void;
  onBulkDelete: (ids: string[]) => void;
  onCloneItem: (id: string) => void;
  statuses: { id: string; name: string; category: string }[];
  profiles: { id: string; name: string }[];
  hasSearchOrFilter: boolean;
  onClearFilters: () => void;
  sourceFilter?: 'all' | 'catalyst' | 'jira';
}

// Canonical Jira work item type SVGs — NOT Lucide
const WORK_ITEM_ICONS: Record<string, string> = {
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-success-bold)" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M15.6470004,19.5152539 L16.9369996,17.9868881 L12.0001502,13.8199984 L7.06117589,17.98674 C7.03905703,18.0054091 7,17.9917347 7,18.1534919 L7,6.68807648 C7,6.34797522 7.41227423,6 8,6 L16,6 C16.5865377,6 17,6.34873697 17,6.68807648 L17,18.1534919 C17,17.9913444 16.9591854,18.0056137 16.9369996,17.9868881 L15.6470004,19.5152539 Z"/></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-danger-bold)" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-link)" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-discovery-bold)" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M18.1875,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.80261507 14.3098441,3 13.3125,3 C12.786559,3 12.3057802,3.22820418 11.9641282,3.60847767 L11.7684218,3.8182425 C11.6727284,3.93237073 11.4437645,4.21475964 10.706343,5.12646288 C9.94345588,6.0712692 9.18052942,7.02081922 8.4681962,7.91397549 L8.37483685,8.03107544 C5.18814094,12.029567 5,12.2744886 5,12.8 C5,13.8104178 5.81859781,14.5 6.8125,14.5 L9.875,14.5744 L9.875,19.2 C9.875,20.1973849 10.6901559,21 11.6875,21 L13.125,11.4 L17.6195191,11.4 Z"/></svg>`,
  improvement: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-success-bold)" fill-rule="evenodd" d="M13,7.42194829 L16.2836227,10.7069575 C16.6740646,11.0975642 17.3072295,11.0976979 17.6978362,10.707256 C18.0884429,10.3168142 18.0885766,9.68364921 17.6981347,9.29304249 L12.7002451,4.29304249 C12.3096867,3.90231917 11.6762915,3.90231917 11.2857331,4.29304249 L6.28784344,9.29304249 C5.89740159,9.68364921 5.89753524,10.3168142 6.28814196,10.707256 C6.67874867,11.0976979 7.31191364,11.0975642 7.70235549,10.7069575 L11,7.40792056 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,7.42194829 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  new_feature: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-success-bold)" fill-rule="evenodd" d="M13,11 L13,5 C13,4.44771525 12.5522847,4 12,4 C11.4477153,4 11,4.44771525 11,5 L11,11 L5,11 C4.44771525,11 4,11.4477153 4,12 C4,12.5522847 4.44771525,13 5,13 L11,13 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,13 L19,13 C19.5522847,13 20,12.5522847 20,12 C20,11.4477153 19.5522847,11 19,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  feature: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-background-success-bold)" fill-rule="evenodd" d="M13,11 L13,5 C13,4.44771525 12.5522847,4 12,4 C11.4477153,4 11,4.44771525 11,5 L11,11 L5,11 C4.44771525,11 4,11.4477153 4,12 C4,12.5522847 4.44771525,13 5,13 L11,13 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,13 L19,13 C19.5522847,13 20,12.5522847 20,12 C20,11.4477153 19.5522847,11 19,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  subtask: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="var(--ds-link)" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
};

function getTypeIcon(typeName: string): string | null {
  const key = typeName.toLowerCase().replace(/\s+/g, '_');
  return WORK_ITEM_ICONS[key] || null;
}

// StatusLozenge — GUARDRAIL: 3-color only
function getStatusStyle(category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: 'var(--ds-link)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' };
    case 'done': return { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' };
    default: return { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text-subtle)' };
  }
}

function PriorityIcon({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  if (p === 'critical') return <ChevronsUp size={13} style={{ color: 'var(--sem-danger)' }} />;
  if (p === 'high') return <ArrowUp size={13} style={{ color: 'var(--sem-warning)' }} />;
  if (p === 'medium') return <ArrowRight size={13} style={{ color: 'var(--cp-blue)' }} />;
  return <ArrowDown size={13} style={{ color: 'var(--fg-4)' }} />;
}

function priorityLabel(p: string) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }

function AssigneeAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', 'var(--cp-teal-60)', 'var(--cp-purple-60)', 'var(--ds-text-warning, var(--cp-warning))', 'var(--ds-text-danger, var(--cp-danger))', 'var(--ds-text-success, var(--cp-success))'];
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
      style={{ backgroundColor: colors[Math.abs(hash) % colors.length] }}>
      {initials}
    </div>
  );
}

function formatDue(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

function buildTree(items: WorkItemRow[]) {
  const childrenMap = new Map<string, WorkItemRow[]>();
  const roots: WorkItemRow[] = [];
  for (const item of items) {
    if (!item.parent_id) roots.push(item);
    else {
      const siblings = childrenMap.get(item.parent_id) || [];
      siblings.push(item);
      childrenMap.set(item.parent_id, siblings);
    }
  }
  return { roots, childrenMap };
}

export function WorkItemsTable({
  items, onRowClick, onCreateClick, sorts, onToggleSort, columns, grouped,
  onInlineUpdate, onBulkUpdate, onBulkDelete, onCloneItem,
  statuses, profiles, hasSearchOrFilter, onClearFilters, sourceFilter,
}: WorkItemsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  // Per-row editing state: `${rowId}:${field}` currently open, or null
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const anchorRefs = useRef<Map<string, HTMLElement>>(new Map());

  const visibleCols = columns.filter(c => c.visible);
  const childrenMapAll = useMemo(() => buildTree(items).childrenMap, [items]);

  // All flat visible rows for keyboard nav (respects group-collapse + expand state)
  const allFlatRows = useMemo(() => {
    const result: WorkItemRow[] = [];
    const addItems = (list: WorkItemRow[]) => {
      const { roots, childrenMap } = buildTree(list);
      const walk = (items: WorkItemRow[]) => {
        for (const item of items) {
          result.push(item);
          const children = childrenMap.get(item.id);
          if (children && expanded.has(item.id)) walk(children);
        }
      };
      walk(roots);
    };
    if (grouped) {
      for (const g of grouped) {
        if (!collapsedGroups.has(g.key)) addItems(g.items);
      }
    } else {
      addItems(items);
    }
    return result;
  }, [items, grouped, expanded, collapsedGroups]);

  // Rows actually rendered by JiraTable for a given list — flattens parent/child respecting expand state
  const flattenForRender = (rowItems: WorkItemRow[]) => {
    const { roots, childrenMap } = buildTree(rowItems);
    const rows: WorkItemRow[] = [];
    function walk(list: WorkItemRow[]) {
      for (const item of list) {
        rows.push(item);
        const children = childrenMap.get(item.id);
        if (children && expanded.has(item.id)) walk(children);
      }
    }
    walk(roots);
    return rows;
  };

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const selectAll = () => {
    if (selectedIds.size === allFlatRows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFlatRows.map(r => r.id)));
  };

  // Keyboard navigation (unchanged behavior)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search list"]');
        searchInput?.focus();
        return;
      }

      if (e.key === 'Escape') {
        setEditingCell(null);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        catalystToast.info('Coming in AI Assist phase');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx(prev => Math.min(prev + 1, allFlatRows.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && highlightedIdx >= 0 && highlightedIdx < allFlatRows.length) {
        onRowClick(allFlatRows[highlightedIdx].id);
      }
      if (e.key === ' ' && highlightedIdx >= 0 && highlightedIdx < allFlatRows.length) {
        e.preventDefault();
        const id = allFlatRows[highlightedIdx].id;
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightedIdx, allFlatRows, onRowClick]);

  const getAnchorRef = (key: string): React.RefObject<HTMLElement | null> => ({
    get current() { return anchorRefs.current.get(key) ?? null; },
    set current(el: HTMLElement | null) {
      if (el) anchorRefs.current.set(key, el);
      else anchorRefs.current.delete(key);
    },
  });

  // ─── Column schema ──────────────────────────────────────────
  const jiraColumns = useMemo(() => {
    const cols: Column<WorkItemRow>[] = [];

    for (const col of visibleCols) {
      switch (col.key) {
        case 'type':
          cols.push({
            id: 'type',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const hasChildren = childrenMapAll.has(row.id);
              const isExpanded = expanded.has(row.id);
              const typeIconSvg = getTypeIcon(row.type_name);
              return (
                <div className="flex items-center gap-0.5">
                  {hasChildren ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggle(row.id); }}
                      className="w-4 h-4 flex items-center justify-center transition-transform"
                      style={{ color: 'var(--fg-4)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  ) : <span className="w-4" />}
                  {typeIconSvg ? (
                    <span dangerouslySetInnerHTML={{ __html: typeIconSvg }} className="flex items-center shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: row.type_color || 'var(--fg-4)' }} />
                  )}
                </div>
              );
            },
          });
          break;
        case 'key':
          cols.push({
            id: 'key',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const isDone = row.status_category === 'done';
              return (
                <span style={{
                  fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-mono)',
                  color: isDone ? 'var(--fg-4)' : 'var(--fg-3)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {row.item_key}
                </span>
              );
            },
          });
          break;
        case 'summary':
          cols.push({
            id: 'summary',
            label: col.label,
            flex: true,
            sortable: col.sortable,
            alwaysVisible: true,
            cell: ({ row }) => {
              const isDone = row.status_category === 'done';
              const editKey = `${row.id}:summary`;
              const depth = (() => {
                // compute depth by walking parent chain within `items`
                let d = 0;
                let cur: WorkItemRow | undefined = row;
                const byId = new Map(items.map(i => [i.id, i]));
                while (cur?.parent_id && byId.has(cur.parent_id)) {
                  d += 1;
                  cur = byId.get(cur.parent_id);
                }
                return d;
              })();
              if (editingCell === editKey) {
                return (
                  <div style={{ paddingLeft: depth * 24 }}>
                    <InlineSummaryEditor
                      value={row.title || row.summary}
                      onSave={v => { onInlineUpdate(row.id, { title: v, summary: v }); setEditingCell(null); }}
                      onCancel={() => setEditingCell(null)}
                    />
                  </div>
                );
              }
              return (
                <div
                  className="flex items-center gap-1.5 min-w-0"
                  style={{ paddingLeft: depth * 24 }}
                  onClick={e => { e.stopPropagation(); setEditingCell(editKey); }}
                >
                  <span className="truncate" style={{
                    fontSize: 'var(--ds-font-size-200)', fontWeight: 500, fontFamily: 'var(--cp-font-body)',
                    color: isDone ? 'var(--fg-4)' : 'var(--fg-1)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }} title={row.title || row.summary}>
                    {row.title || row.summary}
                  </span>
                  {row.is_flagged && <Flag size={12} className="shrink-0" style={{ color: 'var(--sem-danger)' }} />}
                </div>
              );
            },
          });
          break;
        case 'source':
          cols.push({
            id: 'source',
            label: col.label,
            width: col.width,
            cell: ({ row }) => {
              const source = row.source || 'catalyst';
              return (
                <div className="flex items-center gap-[5px]">
                  <SourceBadge source={source} />
                  {source === 'jira' && row.sync_status && (
                    <SyncStatusDot status={row.sync_status as any} lastSyncedAt={row.last_synced_at} />
                  )}
                </div>
              );
            },
          });
          break;
        case 'status':
          cols.push({
            id: 'status',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const statusStyle = getStatusStyle(row.status_category);
              const editKey = `${row.id}:status`;
              const refKey = `status-${row.id}`;
              return (
                <>
                  <span
                    ref={el => { if (el) anchorRefs.current.set(refKey, el); else anchorRefs.current.delete(refKey); }}
                    className="inline-block cursor-pointer"
                    style={{
                      height: 20, lineHeight: '20px',
                      padding: '0 6px', borderRadius: 4,
                      fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                      backgroundColor: statusStyle.bg, color: statusStyle.color,
                      whiteSpace: 'nowrap',
                    }}
                    onClick={e => { e.stopPropagation(); setEditingCell(editKey); }}
                  >
                    {row.status_name}
                  </span>
                  {editingCell === editKey && (
                    <InlineStatusPicker currentStatusId={row.status_id} statuses={statuses} anchorRef={getAnchorRef(refKey)}
                      onSelect={id => { onInlineUpdate(row.id, { status_id: id }); setEditingCell(null); }}
                      onClose={() => setEditingCell(null)} />
                  )}
                </>
              );
            },
          });
          break;
        case 'release':
          cols.push({
            id: 'release',
            label: col.label,
            width: col.width,
            cell: ({ row }) => (
              row.release_name ? (
                <span style={{
                  display: 'inline-block', height: 18, lineHeight: '18px',
                  padding: '0 6px', borderRadius: 4,
                  backgroundColor: 'var(--cp-bg-sunken, var(--cp-bd-zone))',
                  border: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                  fontSize: 10.5, fontWeight: 500, color: 'var(--cp-text-secondary, var(--fg-2))',
                  fontFamily: 'var(--cp-font-body)', whiteSpace: 'nowrap',
                }}>
                  {row.release_name}
                </span>
              ) : (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--fg-4)' }}>—</span>
              )
            ),
          });
          break;
        case 'assignee':
          cols.push({
            id: 'assignee',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const editKey = `${row.id}:assignee`;
              const refKey = `assignee-${row.id}`;
              return (
                <>
                  <div
                    ref={el => { if (el) anchorRefs.current.set(refKey, el); else anchorRefs.current.delete(refKey); }}
                    className="cursor-pointer"
                    onClick={e => { e.stopPropagation(); setEditingCell(editKey); }}
                  >
                    {row.assignee_name ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AssigneeAvatar name={row.assignee_name} />
                        <span className="truncate" style={{ fontSize: 'var(--ds-font-size-100)', fontFamily: 'var(--cp-font-body)', color: 'var(--fg-2)' }}>
                          {row.assignee_name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--divider)' }}>—</span>
                    )}
                  </div>
                  {editingCell === editKey && (
                    <InlineAssigneePicker currentId={row.assignee_id} profiles={profiles} anchorRef={getAnchorRef(refKey)}
                      currentStatus={row.status_name}
                      onSelect={id => { onInlineUpdate(row.id, { assignee_id: id }); setEditingCell(null); }}
                      onClose={() => setEditingCell(null)} />
                  )}
                </>
              );
            },
          });
          break;
        case 'dueDate':
          cols.push({
            id: 'dueDate',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const overdue = isOverdue(row.due_date);
              const editKey = `${row.id}:dueDate`;
              const refKey = `dueDate-${row.id}`;
              return (
                <>
                  <div
                    ref={el => { if (el) anchorRefs.current.set(refKey, el); else anchorRefs.current.delete(refKey); }}
                    className="cursor-pointer"
                    onClick={e => { e.stopPropagation(); setEditingCell(editKey); }}
                  >
                    {row.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} style={{ color: overdue ? 'var(--sem-danger)' : 'var(--fg-4)' }} />
                        <span style={{
                          fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-mono)',
                          color: overdue ? 'var(--sem-danger)' : 'var(--fg-3)', fontWeight: overdue ? 600 : 400,
                        }}>{formatDue(row.due_date)}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--fg-4)' }}>—</span>
                    )}
                  </div>
                  {editingCell === editKey && (
                    <InlineDatePicker current={row.due_date} anchorRef={getAnchorRef(refKey)}
                      onSelect={d => { onInlineUpdate(row.id, { due_date: d }); setEditingCell(null); }}
                      onClose={() => setEditingCell(null)} />
                  )}
                </>
              );
            },
          });
          break;
        case 'priority':
          cols.push({
            id: 'priority',
            label: col.label,
            width: col.width,
            sortable: col.sortable,
            cell: ({ row }) => {
              const editKey = `${row.id}:priority`;
              const refKey = `priority-${row.id}`;
              return (
                <>
                  <div
                    ref={el => { if (el) anchorRefs.current.set(refKey, el); else anchorRefs.current.delete(refKey); }}
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={e => { e.stopPropagation(); setEditingCell(editKey); }}
                  >
                    <PriorityIcon priority={row.priority} />
                    <span style={{ fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-body)', color: 'var(--fg-2)' }}>
                      {priorityLabel(row.priority)}
                    </span>
                  </div>
                  {editingCell === editKey && (
                    <InlinePriorityPicker current={row.priority} anchorRef={getAnchorRef(refKey)}
                      onSelect={p => { onInlineUpdate(row.id, { priority: p }); setEditingCell(null); }}
                      onClose={() => setEditingCell(null)} />
                  )}
                </>
              );
            },
          });
          break;
        default:
          break;
      }
    }
    return cols;
  }, [visibleCols, childrenMapAll, expanded, editingCell, items, statuses, profiles, onInlineUpdate]);

  const isAllSelected = allFlatRows.length > 0 && selectedIds.size === allFlatRows.length;
  const isEmpty = items.length === 0 && !grouped;

  // Empty state (unchanged content, rendered as emptyView)
  const emptyView = (
    <>
      {hasSearchOrFilter ? (
        <div className="flex flex-col items-center justify-center py-16">
          <SearchX size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>No items match your search</p>
          <button
            onClick={onClearFilters}
            style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        </div>
      ) : sourceFilter === 'jira' ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Link2 size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>No Jira-sourced items in this project</p>
          <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-4)' }}>Connect Jira to start syncing.</p>
        </div>
      ) : sourceFilter === 'catalyst' ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>All items in this project come from Jira.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center justify-center mb-3 bg-[var(--cp-bd-zone)]" style={{ width: 56, height: 56, borderRadius: '50%' }}>
            <FileText size={28} style={{ color: 'var(--fg-4)' }} />
          </div>
          <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No work items yet</p>
          <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-4)', marginBottom: 12 }}>Create your first work item to get started</p>
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="bg-[var(--cp-blue)]"
              style={{ padding: '4px 16px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, borderRadius: 4, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: 'none', cursor: 'pointer' }}
            >
              Create work item
            </button>
          )}
        </div>
      )}
    </>
  );

  // Bottom "+ Create work item" row (unchanged content, rendered as bottomSlot)
  const bottomSlot = (!isEmpty && onCreateClick) ? (
    <button
      onClick={onCreateClick}
      className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium hover:bg-[var(--ds-surface-sunken)] transition-colors cursor-pointer"
      style={{ color: 'var(--fg-4)', height: 50, border: 'none', background: 'transparent' }}
    >
      <Plus size={14} />
      Create work item
    </button>
  ) : null;

  // Groups → JiraTable RowGroup schema
  const jiraGroups: RowGroup<WorkItemRow>[] | undefined = grouped
    ? grouped.map(g => ({
        id: g.key,
        label: g.label,
        rows: flattenForRender(g.items),
        isCollapsed: collapsedGroups.has(g.key),
      }))
    : undefined;

  const sortKey = sorts[0]?.field as string | undefined;
  const sortOrder = sorts[0]?.dir === 'desc' ? 'DESC' : 'ASC';

  const contextMenuActions = [
    {
      id: 'open-detail',
      label: 'Open detail',
      onClick: (row: WorkItemRow) => onRowClick(row.id),
    },
    {
      id: 'copy-key',
      label: 'Copy key',
      onClick: (row: WorkItemRow) => {
        navigator.clipboard.writeText(row.item_key);
        catalystToast.success(`Copied ${row.item_key}`);
      },
    },
    {
      id: 'clone',
      label: 'Clone item',
      onClick: (row: WorkItemRow) => onCloneItem(row.id),
    },
    {
      id: 'toggle-flag',
      label: 'Flag item',
      onClick: (row: WorkItemRow) => onInlineUpdate(row.id, { is_flagged: !row.is_flagged }),
    },
    {
      id: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (row: WorkItemRow) => onBulkDelete([row.id]),
    },
  ];

  return (
    <div>
      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={[...selectedIds]}
        items={allFlatRows}
        onClear={() => setSelectedIds(new Set())}
        onSetStatus={(statusId) => { onBulkUpdate([...selectedIds], { status_id: statusId }); setSelectedIds(new Set()); }}
        onSetPriority={(p) => { onBulkUpdate([...selectedIds], { priority: p }); setSelectedIds(new Set()); }}
        onFlag={() => { onBulkUpdate([...selectedIds], { is_flagged: true }); setSelectedIds(new Set()); }}
        onDelete={() => { onBulkDelete([...selectedIds]); setSelectedIds(new Set()); }}
        statuses={statuses}
      />

      <div className="border rounded-t-md overflow-hidden bg-[var(--cp-float)]" style={{
        borderColor: 'var(--divider)',
        borderTopLeftRadius: selectedIds.size > 0 ? 0 : undefined,
        borderTopRightRadius: selectedIds.size > 0 ? 0 : undefined,
      }}>
        <JiraTable<WorkItemRow>
          columns={jiraColumns}
          data={grouped ? undefined : (isEmpty ? [] : flattenForRender(items))}
          groups={jiraGroups}
          getRowId={row => row.id}
          onRowClick={row => onRowClick(row.id)}
          getRowDepth={row => {
            let d = 0;
            let cur: WorkItemRow | undefined = row;
            const byId = new Map(items.map(i => [i.id, i]));
            while (cur?.parent_id && byId.has(cur.parent_id)) {
              d += 1;
              cur = byId.get(cur.parent_id);
            }
            return d;
          }}
          selectable
          selection={selectedIds}
          onSelectionChange={setSelectedIds}
          sortKey={sortKey}
          sortOrder={sortOrder as 'ASC' | 'DESC'}
          onSortChange={(key, order) => {
            const col = visibleCols.find(c => c.key === key || c.field === key);
            if (col?.field) onToggleSort(col.field, false);
          }}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          getRowHasChildren={row => childrenMapAll.has(row.id)}
          expandedRowIds={expanded}
          onToggleRowExpanded={toggle}
          contextMenuActions={contextMenuActions}
          showRowCount={false}
          density="compact"
          ariaLabel="Work items table"
          emptyView={isEmpty ? emptyView : undefined}
          bottomSlot={bottomSlot}
        />
      </div>
    </div>
  );
}
