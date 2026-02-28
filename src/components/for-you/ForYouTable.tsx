/**
 * For You Work Items Table - MARAM V3.1 spec
 * Full columns: Key, Summary, Status, Project, Hub, Priority, Updated, Reported by
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
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

// Design tokens
const T = {
  ink: '#09090B', inkSecondary: '#18181B', inkTertiary: '#3F3F46',
  inkMuted: '#71717A',
  surfaceSecondary: '#FAFAFA', surfaceTertiary: '#F4F4F5',
  border: '#E4E4E7',
  primary: '#2563EB',
  teal: '#0D9488', tealText: '#0A8277', tealBg: '#F0FDFA',
  success: '#16A34A', successText: '#11853D', successBg: '#F0FDF4',
  warning: '#D97706', warningText: '#AF6003', warningBg: '#FFFBEB',
  danger: '#DC2626', dangerText: '#D92525', dangerBg: '#FEF2F2',
  primaryBg: '#EFF6FF',
};

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  'In Progress': { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'In Development': { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'Ready for Development': { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'Ready for Dev': { dot: T.teal, text: T.tealText, bg: T.tealBg },
  'To Do': { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'ToDo': { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'Planned': { dot: T.primary, text: T.primary, bg: T.primaryBg },
  'Backlog': { dot: '#6F6F78', text: '#6F6F78', bg: T.surfaceTertiary },
  'Done': { dot: T.success, text: T.successText, bg: T.successBg },
  'In Production': { dot: T.success, text: T.successText, bg: T.successBg },
  'In Review': { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'End to End Testing': { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'Ready for Review': { dot: T.warning, text: T.warningText, bg: T.warningBg },
  'Blocked': { dot: T.danger, text: T.dangerText, bg: T.dangerBg },
};

// Abbreviate long status names for table display
const STATUS_DISPLAY: Record<string, string> = {
  'Ready for Development': 'Ready for Dev',
  'End to End Testing': 'E2E Testing',
  'In Development': 'In Dev',
  'In Production': 'In Prod',
  'Ready for Review': 'Ready Review',
};

const HUB_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Project:  { bg: T.primaryBg, color: T.primary, border: T.primary },
  Product:  { bg: T.surfaceTertiary, color: T.inkTertiary, border: T.inkTertiary },
  Task:     { bg: T.surfaceTertiary, color: '#6F6F78', border: '#D4D4D8' },
  Incident: { bg: T.dangerBg, color: T.dangerText, border: T.danger },
  Release:  { bg: T.successBg, color: T.successText, border: T.success },
  Test:     { bg: T.surfaceTertiary, color: T.inkTertiary, border: T.inkTertiary },
};

export function ForYouTable({ 
  groupedItems, 
  onRowClick,
  selectedIds = new Set(),
  onSelectionChange,
  onStarToggle,
  isInitialLoad = false,
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
      <div className="fy-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <span style={{ fontSize: 24, marginBottom: 12 }}>📋</span>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>No work items found</p>
        <p style={{ fontSize: 11, color: T.inkMuted }}>Try adjusting your filters or search</p>
      </div>
    );
  }

  let rowIndex = -1;

  // Table header style
  const thStyle: React.CSSProperties = {
    height: 32, padding: '0 12px',
    background: T.surfaceSecondary, borderBottom: `1px solid ${T.border}`,
    fontSize: 11, fontWeight: 600, color: T.inkMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', whiteSpace: 'nowrap',
    position: 'sticky', top: 48, zIndex: 10,
  };

  return (
    <div ref={tableRef} tabIndex={0} className="fy-table" style={{ outline: 'none' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 36 }}>
              <input type="checkbox" checked={isAllSelected} onChange={e => handleSelectAll(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.primary, cursor: 'pointer' }} />
            </th>
            <th style={{ ...thStyle, width: 140 }}>Key</th>
            <th style={thStyle}>Summary</th>
            <th style={{ ...thStyle, width: 160, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, width: 140 }}>Project</th>
            <th style={{ ...thStyle, width: 95 }}>Hub</th>
            <th style={{ ...thStyle, width: 80 }}>Priority</th>
            <th style={{ ...thStyle, width: 110 }}>Updated</th>
            <th style={{ ...thStyle, width: 180 }}>Reported by</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <React.Fragment key={group}>
              {/* Group row */}
              <tr>
                <td colSpan={9} style={{ height: 28, padding: '0 12px', background: T.surfaceTertiary, borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.inkTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {GROUP_LABELS[group]}
                </td>
              </tr>

              {groupedItems[group].map((item) => {
                rowIndex++;
                const currentRowIndex = rowIndex;
                const isSelected = selectedIds.has(item.id);
                const isFocused = focusedIndex === currentRowIndex;
                const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES['In Progress'];
                const hubCfg = HUB_CFG[item.hubLabel] || HUB_CFG.Task;
                const displayStatus = STATUS_DISPLAY[item.status] || item.status;

                return (
                  <tr
                    key={item.id}
                    onClick={() => { setFocusedIndex(currentRowIndex); onRowClick(item.id); }}
                    style={{
                      height: 40, borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                      background: isSelected ? '#EFF6FF' : isFocused ? T.surfaceSecondary : 'transparent',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isSelected && !isFocused) e.currentTarget.style.background = T.surfaceSecondary; }}
                    onMouseLeave={e => { if (!isSelected && !isFocused) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0 12px', width: 36 }}>
                      <input type="checkbox" checked={isSelected} onClick={e => e.stopPropagation()} onChange={e => handleSelectItem(item.id, e.target.checked)} style={{ width: 16, height: 16, accentColor: T.primary, cursor: 'pointer' }} />
                    </td>

                    {/* Key */}
                    <td style={{ padding: '0 12px', width: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <JiraIssueTypeIcon issueType={item.issueType} size={16} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.primary }}>{item.key}</span>
                      </div>
                    </td>

                    {/* Summary */}
                    <td style={{ padding: '0 12px', fontSize: 13, fontWeight: 500, color: T.ink, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.summary}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0 8px', width: 160, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 10px', borderRadius: 9999, background: statusStyle.bg, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot, flexShrink: 0 }} />
                        <span style={{ color: statusStyle.text }}>{displayStatus}</span>
                      </span>
                    </td>

                    {/* Project */}
                    <td style={{ padding: '0 12px', fontSize: 13, fontWeight: 500, color: T.inkSecondary, width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.project}
                    </td>

                    {/* Hub */}
                    <td style={{ padding: '0 12px', width: 95 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: hubCfg.bg, color: hubCfg.color, borderLeft: `3px solid ${hubCfg.border}` }}>
                        {item.hubLabel}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '0 12px', width: 80 }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ width: 4, height: 14, borderRadius: 1, background: i <= item.priorityLevel ? T.inkMuted : T.border }} />
                        ))}
                      </div>
                    </td>

                    {/* Updated */}
                    <td style={{ padding: '0 12px', fontSize: 12, fontWeight: 500, color: T.inkTertiary, width: 110 }}>
                      {item.updatedAt}
                    </td>

                    {/* Reported by */}
                    <td style={{ padding: '0 12px', width: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const reporterName = item.reporter || item.assignee.name;
                          const avatarUrl = nameAvatarMap.get(reporterName.toLowerCase());
                          const ini = reporterName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                          const clr = [T.primary, T.teal, T.warning, T.danger, '#7C3AED'][ini.charCodeAt(0) % 5];
                          return avatarUrl ? (
                            <img src={avatarUrl} alt={reporterName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.border}` }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                          );
                        })()}
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reporter || item.assignee.name}</span>
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
