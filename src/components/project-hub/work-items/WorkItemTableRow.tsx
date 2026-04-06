import React, { useRef, useState } from 'react';
import { ChevronRight, Flag, Calendar, ArrowUp, ArrowDown, ArrowRight, ChevronsUp } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import type { ColumnDef } from '@/hooks/useWorkItemListState';
import { InlineSummaryEditor, InlineStatusPicker, InlinePriorityPicker, InlineAssigneePicker, InlineDatePicker } from './inline/InlineEditors';
import { SourceBadge } from '../source-badge/SourceBadge';
import { SyncStatusDot } from '../source-badge/SyncStatusDot';

// Canonical Jira work item type SVGs — NOT Lucide
const WORK_ITEM_ICONS: Record<string, string> = {
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M15.6470004,19.5152539 L16.9369996,17.9868881 L12.0001502,13.8199984 L7.06117589,17.98674 C7.03905703,18.0054091 7,17.9917347 7,18.1534919 L7,6.68807648 C7,6.34797522 7.41227423,6 8,6 L16,6 C16.5865377,6 17,6.34873697 17,6.68807648 L17,18.1534919 C17,17.9913444 16.9591854,18.0056137 16.9369996,17.9868881 L15.6470004,19.5152539 Z"/></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#6554C0" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M18.1875,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.80261507 14.3098441,3 13.3125,3 C12.786559,3 12.3057802,3.22820418 11.9641282,3.60847767 L11.7684218,3.8182425 C11.6727284,3.93237073 11.4437645,4.21475964 10.706343,5.12646288 C9.94345588,6.0712692 9.18052942,7.02081922 8.4681962,7.91397549 L8.37483685,8.03107544 C5.18814094,12.029567 5,12.2744886 5,12.8 C5,13.8104178 5.81859781,14.5 6.8125,14.5 L9.875,14.5744 L9.875,19.2 C9.875,20.1973849 10.6901559,21 11.6875,21 L13.125,11.4 L17.6195191,11.4 Z"/></svg>`,
  improvement: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,7.42194829 L16.2836227,10.7069575 C16.6740646,11.0975642 17.3072295,11.0976979 17.6978362,10.707256 C18.0884429,10.3168142 18.0885766,9.68364921 17.6981347,9.29304249 L12.7002451,4.29304249 C12.3096867,3.90231917 11.6762915,3.90231917 11.2857331,4.29304249 L6.28784344,9.29304249 C5.89740159,9.68364921 5.89753524,10.3168142 6.28814196,10.707256 C6.67874867,11.0976979 7.31191364,11.0975642 7.70235549,10.7069575 L11,7.40792056 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,7.42194829 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  new_feature: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,11 L13,5 C13,4.44771525 12.5522847,4 12,4 C11.4477153,4 11,4.44771525 11,5 L11,11 L5,11 C4.44771525,11 4,11.4477153 4,12 C4,12.5522847 4.44771525,13 5,13 L11,13 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,13 L19,13 C19.5522847,13 20,12.5522847 20,12 C20,11.4477153 19.5522847,11 19,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  feature: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,11 L13,5 C13,4.44771525 12.5522847,4 12,4 C11.4477153,4 11,4.44771525 11,5 L11,11 L5,11 C4.44771525,11 4,11.4477153 4,12 C4,12.5522847 4.44771525,13 5,13 L11,13 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,13 L19,13 C19.5522847,13 20,12.5522847 20,12 C20,11.4477153 19.5522847,11 19,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  subtask: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
};

function getTypeIcon(typeName: string): string | null {
  const key = typeName.toLowerCase().replace(/\s+/g, '_');
  return WORK_ITEM_ICONS[key] || null;
}

// StatusLozenge — GUARDRAIL: 3-color only
function getStatusStyle(category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: '#0C66E4', color: '#FFFFFF' };
    case 'done': return { bg: '#1B7F37', color: '#FFFFFF' };
    case 'terminal': return { bg: '#DFE1E6', color: '#42526E' };
    default: return { bg: '#DFE1E6', color: '#42526E' };
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
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
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

interface WorkItemTableRowProps {
  item: WorkItemRow;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  visibleColumns: ColumnDef[];
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onInlineUpdate: (id: string, changes: Record<string, any>) => void;
  statuses: { id: string; name: string; category: string }[];
  profiles: { id: string; name: string }[];
  // Source provenance (mock data for Stage C)
  source?: 'catalyst' | 'jira';
  syncStatus?: 'synced' | 'stale' | 'conflict' | 'syncing' | 'pending';
  lastSyncedAt?: string | null;
  releaseLabel?: string;
}

export function WorkItemTableRow({
  item, depth, hasChildren, isExpanded, onToggle, onClick, visibleColumns,
  isSelected, isHighlighted, onSelect, onContextMenu,
  onInlineUpdate, statuses, profiles,
  source = 'catalyst', syncStatus, lastSyncedAt, releaseLabel,
}: WorkItemTableRowProps) {
  const statusStyle = getStatusStyle(item.status_category);
  const overdue = isOverdue(item.due_date);
  const isDone = item.status_category === 'done';
  const isConflict = syncStatus === 'conflict';

  const [editingField, setEditingField] = useState<string | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);

  const handleCellClick = (field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField(field);
  };

  const typeIconSvg = getTypeIcon(item.type_name);

  const renderCell = (col: ColumnDef) => {
    switch (col.key) {
      case 'checkbox':
        return (
          <td key={col.key} style={{ width: 34, textAlign: 'center', padding: '0 8px' }} onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={() => {}} onClick={onSelect}
              className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
          </td>
        );
      case 'type':
        return (
          <td key={col.key} style={{ width: 46, padding: '0 4px' }}>
            <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 24 }}>
              {hasChildren ? (
                <button
                  onClick={e => { e.stopPropagation(); onToggle(); }}
                  className="w-4 h-4 flex items-center justify-center transition-transform"
                  style={{ color: 'var(--fg-4)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                >
                  <ChevronRight size={14} />
                </button>
              ) : <span className="w-4" />}
              {typeIconSvg ? (
                <span dangerouslySetInnerHTML={{ __html: typeIconSvg }} className="flex items-center shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: item.type_color || 'var(--fg-4)' }} />
              )}
            </div>
          </td>
        );
      case 'key':
        return (
          <td key={col.key} style={{ width: 70, padding: '0 4px' }}>
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              color: isDone ? 'var(--fg-4)' : 'var(--fg-3)',
              textDecoration: isDone ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
            }}>
              {item.item_key}
            </span>
          </td>
        );
      case 'summary':
        return (
          <td key={col.key} style={{ padding: '0 8px', maxWidth: 0 }} onClick={e => handleCellClick('summary', e)}>
            {editingField === 'summary' ? (
              <InlineSummaryEditor
                value={item.title || item.summary}
                onSave={v => { onInlineUpdate(item.id, { title: v, summary: v }); setEditingField(null); }}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate" style={{
                  fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                  color: isDone ? 'var(--fg-4)' : 'var(--fg-1)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }} title={item.title || item.summary}>
                  {item.title || item.summary}
                </span>
                {item.is_flagged && <Flag size={12} className="shrink-0" style={{ color: 'var(--sem-danger)' }} />}
              </div>
            )}
          </td>
        );
      case 'source':
        return (
          <td key={col.key} style={{ width: 160, padding: '0 8px' }}>
            <div className="flex items-center gap-[5px]">
              <SourceBadge source={source} />
              {source === 'jira' && syncStatus && (
                <SyncStatusDot status={syncStatus} lastSyncedAt={lastSyncedAt} />
              )}
            </div>
          </td>
        );
      case 'status':
        return (
          <td key={col.key} style={{ width: 102, padding: '0 4px' }} onClick={e => handleCellClick('status', e)}>
            <span
              ref={statusRef}
              className="inline-block cursor-pointer"
              style={{
                height: 20, lineHeight: '20px',
                padding: '0 6px', borderRadius: 4,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                backgroundColor: statusStyle.bg, color: statusStyle.color,
                whiteSpace: 'nowrap',
              }}
            >
              {item.status_name}
            </span>
            {editingField === 'status' && (
              <InlineStatusPicker currentStatusId={item.status_id} statuses={statuses} anchorRef={statusRef}
                onSelect={id => { onInlineUpdate(item.id, { status_id: id }); setEditingField(null); }}
                onClose={() => setEditingField(null)} />
            )}
          </td>
        );
      case 'release':
        return (
          <td key={col.key} style={{ width: 100, padding: '0 4px' }}>
            {releaseLabel ? (
              <span style={{
                display: 'inline-block', height: 18, lineHeight: '18px',
                padding: '0 6px', borderRadius: 4,
                backgroundColor: 'var(--cp-bg-sunken, var(--cp-bd-zone))',
                border: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                fontSize: 10.5, fontWeight: 500, color: 'var(--cp-text-secondary, var(--fg-2))',
                fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              }}>
                {releaseLabel}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
            )}
          </td>
        );
      case 'assignee':
        return (
          <td key={col.key} style={{ width: 136, padding: '0 4px' }} onClick={e => handleCellClick('assignee', e)}>
            <div ref={assigneeRef} className="cursor-pointer">
              {item.assignee_name ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <AssigneeAvatar name={item.assignee_name} />
                  <span className="truncate" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--fg-2)' }}>
                    {item.assignee_name}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--divider)' }}>—</span>
              )}
            </div>
            {editingField === 'assignee' && (
              <InlineAssigneePicker currentId={item.assignee_id} profiles={profiles} anchorRef={assigneeRef}
                onSelect={id => { onInlineUpdate(item.id, { assignee_id: id }); setEditingField(null); }}
                onClose={() => setEditingField(null)} />
            )}
          </td>
        );
      case 'dueDate':
        return (
          <td key={col.key} style={{ width: 100, padding: '0 4px' }} onClick={e => handleCellClick('dueDate', e)}>
            <div ref={dueDateRef} className="cursor-pointer">
              {item.due_date ? (
                <div className="flex items-center gap-1">
                  <Calendar size={11} style={{ color: overdue ? 'var(--sem-danger)' : 'var(--fg-4)' }} />
                  <span style={{
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    color: overdue ? 'var(--sem-danger)' : 'var(--fg-3)', fontWeight: overdue ? 600 : 400,
                  }}>{formatDue(item.due_date)}</span>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
              )}
            </div>
            {editingField === 'dueDate' && (
              <InlineDatePicker current={item.due_date} anchorRef={dueDateRef}
                onSelect={d => { onInlineUpdate(item.id, { due_date: d }); setEditingField(null); }}
                onClose={() => setEditingField(null)} />
            )}
          </td>
        );
      case 'priority':
        return (
          <td key={col.key} style={{ width: 84, padding: '0 4px' }} onClick={e => handleCellClick('priority', e)}>
            <div ref={priorityRef} className="flex items-center gap-1 cursor-pointer">
              <PriorityIcon priority={item.priority} />
              <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: 'var(--fg-2)' }}>
                {priorityLabel(item.priority)}
              </span>
            </div>
            {editingField === 'priority' && (
              <InlinePriorityPicker current={item.priority} anchorRef={priorityRef}
                onSelect={p => { onInlineUpdate(item.id, { priority: p }); setEditingField(null); }}
                onClose={() => setEditingField(null)} />
            )}
          </td>
        );
      default:
        return <td key={col.key} />;
    }
  };

  return (
    <tr
      className={`group cursor-pointer ${isConflict ? 'bg-[rgba(220,38,38,0.03)]' : isSelected ? 'bg-[rgba(37,99,235,0.08)]' : isHighlighted ? 'bg-[rgba(15,23,42,0.04)]' : ''}`}
      style={{
        height: 36,
        maxHeight: 36,
        borderBottom: '0.75px solid rgba(15,23,42,0.07)',
        transition: 'background 80ms ease',
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {visibleColumns.map(col => renderCell(col))}
    </tr>
  );
}
