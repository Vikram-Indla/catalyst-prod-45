/**
 * For You Work Items Table - V12 Hybrid Precision · pb-table styling
 * With column resize + drag reorder via useTableColumns
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import '@/styles/product-backlog.css';
import type { WorkItem, WorkGroup } from '@/hooks/useForYouData';

interface ForYouTableProps {
  groupedItems: Record<WorkGroup, WorkItem[]>;
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
  1: 'Lowest', 2: 'Low', 3: 'Medium', 4: 'High',
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
  { key: 'key', label: 'KEY', defaultWidth: 120, minWidth: 80 },
  { key: 'summary', label: 'SUMMARY', defaultWidth: 400, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'project', label: 'PROJECT', defaultWidth: 120, minWidth: 80 },
  { key: 'hub', label: 'HUB', defaultWidth: 80, minWidth: 60 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 65, minWidth: 50 },
  { key: 'updated', label: 'UPDATED', defaultWidth: 90, minWidth: 60 },
  { key: 'reporter', label: 'REPORTED BY', defaultWidth: 150, minWidth: 100 },
];

export function ForYouTable({ 
  groupedItems, onRowClick, selectedIds = new Set(),
  onSelectionChange, onStarToggle, isInitialLoad = false,
}: ForYouTableProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);
  const nameAvatarMap = useProfileAvatarsByName();

  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('for-you', FORYOU_COLUMNS);

  const flatItems = React.useMemo(() => {
    const groups: WorkGroup[] = ['YESTERDAY', 'THIS_WEEK', 'EARLIER'];
    const items: WorkItem[] = [];
    groups.forEach(group => { groupedItems[group].forEach(item => items.push(item)); });
    return items;
  }, [groupedItems]);

  const groups = (['YESTERDAY', 'THIS_WEEK', 'EARLIER'] as const).filter(g => groupedItems[g].length > 0);

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

  if (groups.length === 0) {
    return (
      <div className="fy-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: '0.555556px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF' }}>
        <span style={{ fontSize: 24, marginBottom: 12 }}>📋</span>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No work items found</p>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>Try adjusting your filters or search</p>
      </div>
    );
  }

  let rowIndex = -1;

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
      case 'key':
        return (
          <td key={colKey} style={{ width: columnWidths.key }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <JiraIssueTypeIcon issueType={item.issueType} size={16} />
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
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4].map(i => {
                const filled = i <= item.priorityLevel;
                const fillColor = item.priorityLevel >= 4 ? '#E5484D' : item.priorityLevel >= 3 ? '#F59E0B' : '#22C55E';
                return <div key={i} style={{ width: 4, height: 14, borderRadius: 1, background: filled ? fillColor : '#E2E8F0' }} />;
              })}
            </div>
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
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <React.Fragment key={group}>
                <tr>
                  <td colSpan={orderedColumns.length} style={{
                    height: 36, padding: '0 12px',
                    background: '#F7F8F9',
                    borderBottom: '0.75px solid #E2E8F0',
                    borderTop: '0.75px solid #E2E8F0',
                    fontSize: 11, fontWeight: 700, color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    verticalAlign: 'middle',
                  }}>
                    {GROUP_LABELS[group]}
                  </td>
                </tr>

                {groupedItems[group].map((item) => {
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}