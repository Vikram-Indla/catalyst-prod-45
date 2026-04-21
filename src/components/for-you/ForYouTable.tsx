/**
 * CatalystTable — Source-of-truth table component
 * V12 Hybrid Precision · pb-table styling
 * Column resize + drag reorder + Jira-style sort + attachment indicator
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Star, Paperclip, ChevronRight, ChevronDown } from 'lucide-react';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { Checkbox } from '@/components/ui/checkbox';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
import '@/styles/product-backlog.css';
import type { WorkItem, WorkGroup } from '@/hooks/useForYouData';

interface CatalystTableProps {
  groupedItems: Record<WorkGroup, WorkItem[]>;
  customGroups?: { label: string; items: WorkItem[] }[];
  onRowClick: (itemId: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onStarToggle?: (itemId: string) => void;
  isInitialLoad?: boolean;
}

const GROUP_LABELS: Record<WorkGroup, string> = {
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This Week',
  EARLIER: 'Earlier',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical',
};

const HUB_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Project:  { bg: 'var(--cp-blue-wash)', color: 'var(--cp-blue-text)', border: 'var(--cp-blue)' },
  Product:  { bg: 'var(--cp-blue-wash)', color: 'var(--cp-blue-text)', border: 'var(--cp-blue)' },
  Task:     { bg: 'var(--cp-warn-bg)', color: 'var(--cp-warn)', border: 'var(--cp-warn)' },
  Incident: { bg: 'var(--cp-err-bg)', color: 'var(--cp-err)', border: 'var(--cp-err)' },
  Release:  { bg: 'var(--cp-ok-bg)', color: 'var(--cp-ok)', border: 'var(--cp-ok)' },
  Test:     { bg: 'var(--cp-hover)', color: 'var(--cp-t3)', border: 'var(--cp-t3)' },
};

const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];

const FORYOU_COLUMNS: TColDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 36, minWidth: 36, locked: true },
  { key: 'type', label: 'TYPE', defaultWidth: 32, minWidth: 32, locked: true },
  { key: 'key', label: 'KEY', defaultWidth: 120, minWidth: 80 },
  { key: 'summary', label: 'SUMMARY', defaultWidth: 400, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'project', label: 'PROJECT', defaultWidth: 120, minWidth: 80 },
  { key: 'hub', label: 'HUB', defaultWidth: 80, minWidth: 60 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 65, minWidth: 50 },
  { key: 'updated', label: 'UPDATED', defaultWidth: 90, minWidth: 60 },
  { key: 'reporter', label: 'REPORTED BY', defaultWidth: 150, minWidth: 100 },
];

// Sortable column keys (columns that support click-to-sort)
const SORTABLE_KEYS = new Set(['key', 'summary', 'status', 'project', 'hub', 'priority', 'updated', 'reporter']);

function getSortValue(item: WorkItem, colKey: string): string | number {
  switch (colKey) {
    case 'key': return item.key;
    case 'summary': return item.summary.toLowerCase();
    case 'status': return item.status.toLowerCase();
    case 'project': return item.project.toLowerCase();
    case 'hub': return item.hubLabel.toLowerCase();
    case 'priority': return item.priorityLevel;
    case 'updated': return item.updatedAt;
    case 'reporter': return (item.reporter || item.assignee.name).toLowerCase();
    default: return '';
  }
}

function sortItems(items: WorkItem[], sortKey: string | null, sortDir: SortDir): WorkItem[] {
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

/** @deprecated Use CatalystTable instead */
export const ForYouTable = CatalystTable;

export function CatalystTable({
  groupedItems, customGroups, onRowClick, selectedIds = new Set(),
  onSelectionChange, onStarToggle, isInitialLoad = false,
}: CatalystTableProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const nameAvatarMap = useProfileAvatarsByName();
  const { isMobile } = useNavBreakpoint();

  const toggleGroup = useCallback((label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('for-you', FORYOU_COLUMNS);

  const handleSort = useCallback((colKey: string) => {
    if (!SORTABLE_KEYS.has(colKey)) return;
    setSortKey(prev => {
      if (prev !== colKey) { setSortDir('asc'); return colKey; }
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      return colKey;
    });
  }, []);

  // Sort items within each group
  const sortedGroupedItems = useMemo(() => {
    if (!sortKey || !sortDir) return groupedItems;
    return {
      YESTERDAY: sortItems(groupedItems.YESTERDAY, sortKey, sortDir),
      THIS_WEEK: sortItems(groupedItems.THIS_WEEK, sortKey, sortDir),
      EARLIER: sortItems(groupedItems.EARLIER, sortKey, sortDir),
    };
  }, [groupedItems, sortKey, sortDir]);

  // Resolve which rendering mode: customGroups or time-based
  const resolvedGroups = useMemo(() => {
    if (customGroups && customGroups.length > 0) {
      return customGroups.map(g => ({
        key: g.label,
        label: g.label,
        items: sortItems(g.items, sortKey, sortDir),
      }));
    }
    const timeGroups: WorkGroup[] = ['YESTERDAY', 'THIS_WEEK', 'EARLIER'];
    return timeGroups
      .filter(g => sortedGroupedItems[g].length > 0)
      .map(g => ({ key: g, label: GROUP_LABELS[g], items: sortedGroupedItems[g] }));
  }, [customGroups, sortedGroupedItems, sortKey, sortDir]);

  const flatItems = useMemo(() => {
    return resolvedGroups.flatMap(g => g.items);
  }, [resolvedGroups]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? new Set(flatItems.map(item => item.id)) : new Set());
  }, [flatItems, onSelectionChange]);

  const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (checked) newSelection.add(itemId); else newSelection.delete(itemId);
    onSelectionChange(newSelection);
  }, [selectedIds, onSelectionChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current?.contains(document.activeElement) && document.activeElement !== tableRef.current) return;
      switch (e.key) {
        case 'j': case 'ArrowDown': e.preventDefault(); setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1)); break;
        case 'k': case 'ArrowUp': e.preventDefault(); setFocusedIndex(prev => Math.max(prev - 1, 0)); break;
        case 'Enter': e.preventDefault(); if (focusedIndex >= 0 && focusedIndex < flatItems.length) onRowClick(flatItems[focusedIndex].id); break;
        case 'x': e.preventDefault(); if (focusedIndex >= 0 && focusedIndex < flatItems.length && onSelectionChange) { const item = flatItems[focusedIndex]; handleSelectItem(item.id, !selectedIds.has(item.id)); } break;
        case 's': e.preventDefault(); if (focusedIndex >= 0 && focusedIndex < flatItems.length && onStarToggle) onStarToggle(flatItems[focusedIndex].id); break;
        case 'Escape': e.preventDefault(); if (onSelectionChange) onSelectionChange(new Set()); setFocusedIndex(-1); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, focusedIndex, onRowClick, selectedIds, onSelectionChange, onStarToggle, handleSelectItem]);

  const isAllSelected = flatItems.length > 0 && flatItems.every(item => selectedIds.has(item.id));

  if (resolvedGroups.length === 0) {
    return (
      <div className="fy-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: '0.555556px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF' }}>
        <span style={{ fontSize: 24, marginBottom: 12 }}>📋</span>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No work items found</p>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>Try adjusting your filters or search</p>
      </div>
    );
  }

  let rowIndex = -1;

  // ─── Mobile card view (<768px) ──────────────────────────────────────
  // At phone widths the 11-column table is unusable. Render a stacked
  // card list instead — 4 rows per item: (select + type + key + paperclip
  // + star), (summary, 2-line clamp), (status + hub + priority), and
  // (avatar + project + updated). Groups still render their collapsible
  // header row so behaviour matches desktop.
  if (isMobile) {
    return (
      <div ref={tableRef} tabIndex={0} className="fy-table fy-table-mobile" style={{ outline: 'none' }}>
        {resolvedGroups.map(group => {
          const isCollapsed = !!collapsed[group.key];
          return (
            <React.Fragment key={group.key}>
              <div
                onClick={() => toggleGroup(group.key)}
                style={{
                  height: 36, padding: '0 12px', cursor: 'pointer', userSelect: 'none',
                  background: '#F7F8F9',
                  borderTop: '0.75px solid #E2E8F0',
                  borderBottom: '0.75px solid #E2E8F0',
                  fontSize: 11, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {isCollapsed
                  ? <ChevronRight size={14} style={{ color: '#475569', flexShrink: 0 }} />
                  : <ChevronDown size={14} style={{ color: '#475569', flexShrink: 0 }} />}
                {group.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 18, padding: '0 6px', borderRadius: 9,
                  background: '#DFE1E6', color: '#253858',
                  fontSize: 10, fontWeight: 700, marginLeft: 4,
                }}>
                  {group.items.length}
                </span>
              </div>

              {!isCollapsed && group.items.map((item) => {
                rowIndex++;
                const currentRowIndex = rowIndex;
                const isSelected = selectedIds.has(item.id);
                const hubCfg = HUB_CFG[item.hubLabel] || HUB_CFG.Task;
                const priorityLabel = PRIORITY_LABELS[item.priorityLevel] || `Priority ${item.priorityLevel}`;
                const reporterName = item.reporter || item.assignee.name;
                const avatarUrl = nameAvatarMap.get(reporterName.toLowerCase());
                const ini = reporterName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                const clr = AVATAR_COLOURS[ini.charCodeAt(0) % AVATAR_COLOURS.length];
                return (
                  <div
                    key={item.id}
                    onClick={() => { setFocusedIndex(currentRowIndex); onRowClick(item.id); }}
                    style={{
                      padding: '12px',
                      borderBottom: '0.75px solid #E2E8F0',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(37,99,235,0.08)' : '#FFFFFF',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                  >
                    {/* Row 1: checkbox + type + key + paperclip + star */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                        <Checkbox checked={isSelected} onCheckedChange={(v) => handleSelectItem(item.id, !!v)} />
                      </div>
                      <JiraIssueTypeIcon issueType={item.issueType} size={16} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{item.key}</span>
                      {(item.attachmentCount ?? 0) > 0 && (
                        <Paperclip size={12} style={{ color: '#94A3B8', transform: 'rotate(-45deg)' }} />
                      )}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={(e) => { e.stopPropagation(); onStarToggle?.(item.id); }}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, padding: 0 }}
                        title={item.starred ? 'Unstar' : 'Star'}
                      >
                        <Star size={16} fill={item.starred ? '#FACC15' : 'none'} stroke={item.starred ? '#FACC15' : '#CBD5E1'} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Row 2: summary (2-line clamp) */}
                    <div
                      style={{
                        fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.summary}
                    </div>

                    {/* Row 3: status + hub + priority */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={item.status} />
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: hubCfg.bg, color: hubCfg.color, borderLeft: `3px solid ${hubCfg.border}` }}>
                        {item.hubLabel}
                      </span>
                      <span title={priorityLabel} style={{ display: 'inline-flex' }}>
                        <PriorityBars priority={normalisePriority(priorityLabel)} />
                      </span>
                    </div>

                    {/* Row 4: avatar + project + updated */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B' }}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={reporterName} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: clr, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                      )}
                      <span style={{ fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.project}</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ flexShrink: 0 }}>{item.updatedAt}</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  const renderCell = (colKey: string, item: WorkItem, isSelected: boolean, isFocused: boolean) => {
    const hubCfg = HUB_CFG[item.hubLabel] || HUB_CFG.Task;
    const priorityLabel = PRIORITY_LABELS[item.priorityLevel] || `Priority ${item.priorityLevel}`;

    switch (colKey) {
      case 'checkbox':
        return (
          <td key={colKey} style={{ width: columnWidths.checkbox, overflow: 'visible', textOverflow: 'clip' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Checkbox checked={isSelected} onCheckedChange={(v) => handleSelectItem(item.id, !!v)} />
            </div>
          </td>
        );
      case 'star':
        return (
          <td key={colKey} style={{ width: columnWidths.star, overflow: 'visible', textOverflow: 'clip' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => onStarToggle?.(item.id)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, padding: 0 }}
                title={item.starred ? 'Unstar' : 'Star'}
              >
                <Star size={14} fill={item.starred ? '#FACC15' : 'none'} stroke={item.starred ? '#FACC15' : '#CBD5E1'} strokeWidth={2} />
              </button>
            </div>
          </td>
        );
      case 'type':
        return (
          <td key={colKey} style={{ width: columnWidths.type, overflow: 'visible', textOverflow: 'clip' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <JiraIssueTypeIcon issueType={item.issueType} size={16} />
            </div>
          </td>
        );
      case 'key':
        return (
          <td key={colKey} style={{ width: columnWidths.key }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {(item.attachmentCount ?? 0) > 0 && (
                <span title="Attachments"><Paperclip size={12} style={{ color: '#94A3B8', flexShrink: 0, transform: 'rotate(-45deg)' }} /></span>
              )}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{item.key}</span>
            </div>
          </td>
        );
      case 'summary':
        return (
          <td key={colKey} style={{ fontWeight: 500, width: columnWidths.summary, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.summary}
          </td>
        );
      case 'status':
        return (
          <td key={colKey} style={{ width: columnWidths.status, textAlign: 'center' }}>
            <StatusBadge status={item.status} />
          </td>
        );
      case 'project':
        return (
          <td key={colKey} style={{ width: columnWidths.project, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span title={item.project} style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{item.project}</span>
          </td>
        );
      case 'hub':
        return (
          <td key={colKey} style={{ width: columnWidths.hub }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: hubCfg.bg, color: hubCfg.color, borderLeft: `3px solid ${hubCfg.border}` }}>
              {item.hubLabel}
            </span>
          </td>
        );
      case 'priority':
        return (
          <td key={colKey} style={{ width: columnWidths.priority }} title={priorityLabel}>
            <PriorityBars priority={normalisePriority(priorityLabel)} />
          </td>
        );
      case 'updated':
        return (
          <td key={colKey} style={{ width: columnWidths.updated, fontSize: 12, fontWeight: 500, color: '#64748B' }}>
            {item.updatedAt}
          </td>
        );
      case 'reporter':
        return (
          <td key={colKey} style={{ width: columnWidths.reporter }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                const reporterName = item.reporter || item.assignee.name;
                const avatarUrl = nameAvatarMap.get(reporterName.toLowerCase());
                const ini = reporterName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                const clr = AVATAR_COLOURS[ini.charCodeAt(0) % AVATAR_COLOURS.length];
                return avatarUrl ? (
                  <img src={avatarUrl} alt={reporterName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                );
              })()}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reporter || item.assignee.name}</span>
            </div>
          </td>
        );
      default:
        return <td key={colKey} />;
    }
  };

  return (
    <div ref={tableRef} tabIndex={0} className="fy-table" style={{ outline: 'none', border: '0.555556px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
      {/* Scoped sticky — at tablet widths (768–1023px) the SUMMARY column
          (5th th/td after checkbox/star/type/key) pins to the left edge so
          the item summary stays readable while the right-hand columns
          horizontally scroll. Scoped to .fy-table .pb-table so no
          cascade into other tables on the page. */}
      <style>{`
        @media (max-width: 1023.98px) and (min-width: 768px) {
          .fy-table .pb-table thead th:nth-child(5),
          .fy-table .pb-table tbody td:nth-child(5) {
            position: sticky;
            left: 0;
            z-index: 2;
            background: inherit;
          }
          .fy-table .pb-table thead th:nth-child(5) {
            background: #F7F8F9;
          }
          .fy-table .pb-table tbody tr { background: #FFFFFF; }
          .fy-table .pb-table tbody tr.pb-row-selected { background: rgba(37,99,235,0.08); }
        }
      `}</style>
      <div style={{ overflowX: 'auto' }}>
        <table className="pb-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1100 }}>
          <colgroup>
            {orderedColumns.map(c => (
              <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr className="group/thead">
              {orderedColumns.map(c => {
                if (c.key === 'checkbox') {
                  return (
                    <th key={c.key} style={{ width: columnWidths.checkbox, overflow: 'visible', textOverflow: 'clip' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Checkbox checked={isAllSelected} onCheckedChange={(v) => handleSelectAll(!!v)} />
                      </div>
                    </th>
                  );
                }
                return (
                  <ResizableTableHeader
                    key={c.key}
                    colKey={c.key}
                    label={c.label}
                    width={columnWidths[c.key] || c.defaultWidth}
                    locked={c.locked}
                    isDragging={dragKey === c.key}
                    isDragOver={dragOverKey === c.key}
                    onResizeStart={onResizeStart}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    sortDirection={sortKey === c.key ? sortDir : null}
                    onSort={SORTABLE_KEYS.has(c.key) ? handleSort : undefined}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {resolvedGroups.map(group => {
              const isCollapsed = !!collapsed[group.key];
              // Check if this group is an assignee group — only when groupBy is 'assignee'
              const timeGroupLabels = ['Yesterday', 'This Week', 'Earlier'];
              const nonAssigneeLabels = ['No Status', 'No Priority', 'No Project', 'No Assignee', 'No Type', 'No Hub', 'Unassigned', ...timeGroupLabels];
              const isAssigneeGroup = group.label.includes(' ') && !nonAssigneeLabels.includes(group.label);
              const avatarUrl = isAssigneeGroup ? nameAvatarMap.get(group.label.toLowerCase()) : undefined;
              const initials = group.label.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

              return (
              <React.Fragment key={group.key}>
                <tr>
                  <td
                    colSpan={orderedColumns.length}
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      height: 36, padding: '0 12px', cursor: 'pointer', userSelect: 'none',
                      background: '#F7F8F9',
                      borderBottom: '0.75px solid #E2E8F0',
                      borderTop: '0.75px solid #E2E8F0',
                      fontSize: 11, fontWeight: 700, color: '#475569',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isCollapsed
                        ? <ChevronRight size={14} style={{ color: '#475569', flexShrink: 0 }} />
                        : <ChevronDown size={14} style={{ color: '#475569', flexShrink: 0 }} />
                      }
                      {isAssigneeGroup && (
                        avatarUrl ? (
                          <img src={avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} />
                        ) : (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: AVATAR_COLOURS[initials.charCodeAt(0) % AVATAR_COLOURS.length],
                            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700,
                          }}>
                            {initials}
                          </div>
                        )
                      )}
                      {group.label}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 20, height: 18, padding: '0 6px', borderRadius: 9,
                        background: '#DFE1E6', color: '#253858',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {group.items.length}
                      </span>
                    </div>
                  </td>
                </tr>

                {!isCollapsed && group.items.map((item) => {
                  rowIndex++;
                  const currentRowIndex = rowIndex;
                  const isSelected = selectedIds.has(item.id);
                  const isFocused = focusedIndex === currentRowIndex;

                  return (
                    <tr
                      key={item.id}
                      className={`group ${isSelected ? 'pb-row-selected' : ''}`}
                      onClick={() => { setFocusedIndex(currentRowIndex); onRowClick(item.id); }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(37,99,235,0.08)' : isFocused ? 'rgba(0,0,0,0.04)' : undefined,
                      }}
                    >
                      {orderedColumns.map(c => renderCell(c.key, item, isSelected, isFocused))}
                    </tr>
                  );
                })}
              </React.Fragment>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}