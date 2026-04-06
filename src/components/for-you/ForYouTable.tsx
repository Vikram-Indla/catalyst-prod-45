/**
 * For You Work Items Table - MARAM V3.1 spec · Theme-aware
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
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

// Hub badges — token-referenced for dark mode compatibility
const HUB_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Project:  { bg: 'var(--cp-blue-wash)', color: 'var(--cp-blue-text)', border: 'var(--cp-blue)' },
  Product:  { bg: 'var(--cp-blue-wash)', color: 'var(--cp-blue-text)', border: 'var(--cp-blue)' },
  Task:     { bg: 'var(--cp-warn-bg)', color: 'var(--cp-warn)', border: 'var(--cp-warn)' },
  Incident: { bg: 'var(--cp-err-bg)', color: 'var(--cp-err)', border: 'var(--cp-err)' },
  Release:  { bg: 'var(--cp-ok-bg)', color: 'var(--cp-ok)', border: 'var(--cp-ok)' },
  Test:     { bg: 'var(--cp-hover)', color: 'var(--cp-t3)', border: 'var(--cp-t3)' },
};

export function ForYouTable({ 
  groupedItems, onRowClick, selectedIds = new Set(),
  onSelectionChange, onStarToggle, isInitialLoad = false,
}: ForYouTableProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);
  const nameAvatarMap = useProfileAvatarsByName();

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
      <div className="fy-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: '1px solid var(--cp-bd)', borderRadius: 8, background: 'var(--cp-bg)' }}>
        <span style={{ fontSize: 24, marginBottom: 12 }}>📋</span>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-t1)', marginBottom: 4 }}>No work items found</p>
        <p style={{ fontSize: 11, color: 'var(--cp-t3)' }}>Try adjusting your filters or search</p>
      </div>
    );
  }

  let rowIndex = -1;

  const thStyle: React.CSSProperties = {
    height: 50, padding: '10px 12px',
    background: 'var(--cp-bg)', borderBottom: '1px solid var(--cp-bd)',
    fontSize: 11, fontWeight: 700, color: 'var(--cp-t3)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  return (
    <div ref={tableRef} tabIndex={0} className="fy-table" style={{ outline: 'none', border: '1px solid var(--cp-bd)', borderRadius: 6, overflowX: 'auto', overflowY: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 36 }}>
              <input type="checkbox" checked={isAllSelected} onChange={e => handleSelectAll(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--cp-blue)', cursor: 'pointer' }} />
            </th>
            <th style={{ ...thStyle, width: 28 }} />
            <th style={{ ...thStyle, width: 120 }}>Key</th>
            <th style={thStyle}>Summary</th>
            <th style={{ ...thStyle, width: 130, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, width: 120 }}>Project</th>
            <th style={{ ...thStyle, width: 80 }}>Hub</th>
            <th style={{ ...thStyle, width: 65 }}>Priority</th>
            <th style={{ ...thStyle, width: 90 }}>Updated</th>
            <th style={{ ...thStyle, width: 150 }}>Assigned to</th>
            <th style={{ ...thStyle, width: 150 }}>Reported by</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <React.Fragment key={group}>
              {/* Group header — zone borders, no fill in dark mode */}
              <tr>
                <td colSpan={11} style={{
                  height: 44, padding: '12px 12px',
                  background: 'var(--cp-bg)',
                  borderBottom: '1px solid var(--cp-bd-zone)',
                  borderTop: '1px solid var(--cp-bd-zone)',
                  fontSize: 11, fontWeight: 700, color: 'var(--cp-t2)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  verticalAlign: 'middle',
                }}>
                  {GROUP_LABELS[group]}
                </td>
              </tr>

              {groupedItems[group].map((item, idx) => {
                rowIndex++;
                const currentRowIndex = rowIndex;
                const isSelected = selectedIds.has(item.id);
                const isFocused = focusedIndex === currentRowIndex;
                const hubCfg = HUB_CFG[item.hubLabel] || HUB_CFG.Task;
                const priorityLabel = PRIORITY_LABELS[item.priorityLevel] || `Priority ${item.priorityLevel}`;

                return (
                  <tr
                    key={item.id}
                    onClick={() => { setFocusedIndex(currentRowIndex); onRowClick(item.id); }}
                    style={{
                      height: 44, borderBottom: '1px solid var(--cp-bd-table)', cursor: 'pointer',
                      background: isSelected ? 'var(--cp-blue-wash)' : isFocused ? 'var(--cp-hover)' : 'var(--cp-bg)',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isSelected && !isFocused) e.currentTarget.style.background = 'var(--cp-hover)'; }}
                    onMouseLeave={e => { if (!isSelected && !isFocused) e.currentTarget.style.background = 'var(--cp-bg)'; }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '8px 12px', width: 36 }}>
                      <input type="checkbox" checked={isSelected} onClick={e => e.stopPropagation()} onChange={e => handleSelectItem(item.id, e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--cp-blue)', cursor: 'pointer' }} />
                    </td>

                    {/* Star */}
                    <td style={{ padding: '8px 4px', width: 28 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onStarToggle?.(item.id); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4 }}
                        title={item.starred ? 'Unstar' : 'Star'}
                      >
                        <Star size={14} fill={item.starred ? '#FACC15' : 'none'} stroke={item.starred ? '#FACC15' : 'var(--cp-bd)'} strokeWidth={2} />
                      </button>
                    </td>

                    {/* Key */}
                    <td style={{ padding: '8px 12px', width: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <JiraIssueTypeIcon issueType={item.issueType} size={16} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--cp-blue-link)' }}>{item.key}</span>
                      </div>
                    </td>

                    {/* Summary */}
                    <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--cp-t1)', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.summary}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '8px 8px', width: 130, textAlign: 'center' }}>
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Project */}
                    <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--cp-t2)', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span title={item.project}>{item.project}</span>
                    </td>

                    {/* Hub */}
                    <td style={{ padding: '8px 12px', width: 80 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: hubCfg.bg, color: hubCfg.color, borderLeft: `3px solid ${hubCfg.border}` }}>
                        {item.hubLabel}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '8px 12px', width: 65 }} title={priorityLabel}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4].map(i => {
                          const filled = i <= item.priorityLevel;
                          const fillColor = item.priorityLevel >= 4 ? 'var(--cp-err-text)' : item.priorityLevel >= 3 ? 'var(--cp-warn)' : 'var(--cp-ok)';
                          return <div key={i} style={{ width: 4, height: 14, borderRadius: 1, background: filled ? fillColor : 'var(--cp-prg-bg)' }} />;
                        })}
                      </div>
                    </td>

                    {/* Updated */}
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--cp-t3)', width: 90 }}>
                      {item.updatedAt}
                    </td>

                    {/* Assigned to */}
                    <td style={{ padding: '8px 12px', width: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const assigneeName = item.assignee.name;
                          if (!assigneeName || assigneeName === 'Unassigned') return <span style={{ fontSize: 13, color: 'var(--cp-t3)' }}>—</span>;
                          const avatarUrl = nameAvatarMap.get(assigneeName.toLowerCase());
                          const ini = assigneeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                          const clr = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'][ini.charCodeAt(0) % 5];
                          return (
                            <>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={assigneeName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--cp-bd)' }} />
                              ) : (
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                              )}
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assigneeName}</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Reported by */}
                    <td style={{ padding: '8px 12px', width: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const reporterName = item.reporter || item.assignee.name;
                          const avatarUrl = nameAvatarMap.get(reporterName.toLowerCase());
                          const ini = reporterName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                          // Non-semantic avatar colors — preserved in both modes
                          const clr = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'][ini.charCodeAt(0) % 5];
                          return avatarUrl ? (
                            <img src={avatarUrl} alt={reporterName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--cp-bd)' }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                          );
                        })()}
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reporter || item.assignee.name}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
