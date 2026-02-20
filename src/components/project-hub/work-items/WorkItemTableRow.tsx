import React, { useRef, useState } from 'react';
import { ChevronRight, Flag, MessageSquare, Calendar, ArrowUp, ArrowDown, ArrowRight, ChevronsUp } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import type { ColumnDef } from '@/hooks/useWorkItemListState';
import { InlineSummaryEditor, InlineStatusPicker, InlinePriorityPicker, InlineAssigneePicker, InlineDatePicker } from './inline/InlineEditors';

const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED', Feature: '#2563EB', Story: '#0D9488',
  Bug: '#DC2626', Task: '#D97706', Subtask: '#94A3B8',
};

function getStatusStyle(category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: '#DBEAFE', color: '#2563EB' };
    case 'done': return { bg: '#F0FDF4', color: '#16A34A' };
    case 'terminal': return { bg: '#FEF2F2', color: '#DC2626' };
    default: return { bg: '#F1F5F9', color: '#64748B' };
  }
}

function PriorityIcon({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  if (p === 'critical') return <ChevronsUp size={13} style={{ color: '#DC2626' }} />;
  if (p === 'high') return <ArrowUp size={13} style={{ color: '#D97706' }} />;
  if (p === 'medium') return <ArrowRight size={13} style={{ color: '#2563EB' }} />;
  return <ArrowDown size={13} style={{ color: '#94A3B8' }} />;
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
  // Inline edit
  onInlineUpdate: (id: string, changes: Record<string, any>) => void;
  statuses: { id: string; name: string; category: string }[];
  profiles: { id: string; name: string }[];
}

export function WorkItemTableRow({
  item, depth, hasChildren, isExpanded, onToggle, onClick, visibleColumns,
  isSelected, isHighlighted, onSelect, onContextMenu,
  onInlineUpdate, statuses, profiles,
}: WorkItemTableRowProps) {
  const typeColor = TYPE_COLORS[item.type_name] ?? item.type_color;
  const statusStyle = getStatusStyle(item.status_category);
  const overdue = isOverdue(item.due_date);

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);

  const handleCellClick = (field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField(field);
  };

  const renderCell = (col: ColumnDef) => {
    switch (col.key) {
      case 'checkbox':
        return (
          <td key={col.key} className="w-[34px] text-center" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={onSelect}
              className="w-3.5 h-3.5 rounded accent-[#2563EB]"
            />
          </td>
        );
      case 'type':
        return (
          <td key={col.key} className="w-[46px]" style={{ borderLeft: `3px solid ${typeColor}` }}>
            <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 24 }}>
              {hasChildren ? (
                <button
                  onClick={e => { e.stopPropagation(); onToggle(); }}
                  className="w-4 h-4 flex items-center justify-center text-[#94A3B8] hover:text-[#475569] transition-transform"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                >
                  <ChevronRight size={14} />
                </button>
              ) : <span className="w-4" />}
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: typeColor }} title={item.type_name} />
            </div>
          </td>
        );
      case 'key':
        return (
          <td key={col.key} className="w-[70px] px-1">
            <span className="text-[10px] whitespace-nowrap" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
              {item.item_key}
            </span>
          </td>
        );
      case 'summary':
        return (
          <td key={col.key} className="px-2 max-w-0" onClick={e => handleCellClick('summary', e)}>
            {editingField === 'summary' ? (
              <InlineSummaryEditor
                value={item.title || item.summary}
                onSave={v => { onInlineUpdate(item.id, { title: v, summary: v }); setEditingField(null); }}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px] font-medium truncate" style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
                  {item.title || item.summary}
                </span>
                {item.is_flagged && <Flag size={12} className="shrink-0" style={{ color: '#DC2626' }} />}
              </div>
            )}
          </td>
        );
      case 'status':
        return (
          <td key={col.key} className="w-[102px] px-1" onClick={e => handleCellClick('status', e)}>
            <span
              ref={statusRef}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer hover:opacity-80"
              style={{ background: statusStyle.bg, color: statusStyle.color, letterSpacing: '0.02em' }}
            >
              {item.status_name}
            </span>
            {editingField === 'status' && (
              <InlineStatusPicker
                currentStatusId={item.status_id}
                statuses={statuses}
                anchorRef={statusRef}
                onSelect={id => { onInlineUpdate(item.id, { status_id: id }); setEditingField(null); }}
                onClose={() => setEditingField(null)}
              />
            )}
          </td>
        );
      case 'comments':
        return (
          <td key={col.key} className="w-[60px] px-1">
            <div className="flex items-center gap-1 text-[#CBD5E1]">
              <MessageSquare size={12} /><span className="text-[10px]">0</span>
            </div>
          </td>
        );
      case 'assignee':
        return (
          <td key={col.key} className="w-[136px] px-1" onClick={e => handleCellClick('assignee', e)}>
            <div ref={assigneeRef} className="cursor-pointer">
              {item.assignee_name ? (
                <div className="flex items-center gap-1.5 min-w-0 hover:opacity-80">
                  <AssigneeAvatar name={item.assignee_name} />
                  <span className="text-[11px] truncate" style={{ fontFamily: 'Inter, sans-serif', color: '#334155' }}>
                    {item.assignee_name}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-[#CBD5E1] hover:text-[#94A3B8]">Unassigned</span>
              )}
            </div>
            {editingField === 'assignee' && (
              <InlineAssigneePicker
                currentId={item.assignee_id}
                profiles={profiles}
                anchorRef={assigneeRef}
                onSelect={id => { onInlineUpdate(item.id, { assignee_id: id }); setEditingField(null); }}
                onClose={() => setEditingField(null)}
              />
            )}
          </td>
        );
      case 'dueDate':
        return (
          <td key={col.key} className="w-[100px] px-1" onClick={e => handleCellClick('dueDate', e)}>
            <div ref={dueDateRef} className="cursor-pointer">
              {item.due_date ? (
                <div className="flex items-center gap-1 hover:opacity-80">
                  <Calendar size={11} style={{ color: overdue ? '#DC2626' : '#94A3B8' }} />
                  <span className="text-[10px]" style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: overdue ? '#DC2626' : '#64748B',
                    fontWeight: overdue ? 600 : 400,
                  }}>{formatDue(item.due_date)}</span>
                </div>
              ) : (
                <span className="text-[10px] text-[#CBD5E1] hover:text-[#94A3B8]">—</span>
              )}
            </div>
            {editingField === 'dueDate' && (
              <InlineDatePicker
                current={item.due_date}
                anchorRef={dueDateRef}
                onSelect={d => { onInlineUpdate(item.id, { due_date: d }); setEditingField(null); }}
                onClose={() => setEditingField(null)}
              />
            )}
          </td>
        );
      case 'priority':
        return (
          <td key={col.key} className="w-[84px] px-1" onClick={e => handleCellClick('priority', e)}>
            <div ref={priorityRef} className="flex items-center gap-1 cursor-pointer hover:opacity-80">
              <PriorityIcon priority={item.priority} />
              <span className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: '#475569' }}>
                {priorityLabel(item.priority)}
              </span>
            </div>
            {editingField === 'priority' && (
              <InlinePriorityPicker
                current={item.priority}
                anchorRef={priorityRef}
                onSelect={p => { onInlineUpdate(item.id, { priority: p }); setEditingField(null); }}
                onClose={() => setEditingField(null)}
              />
            )}
          </td>
        );
      case 'labels':
        return <td key={col.key} className="w-[74px] px-1" />;
      default:
        return <td key={col.key} />;
    }
  };

  return (
    <tr
      className="group cursor-pointer transition-colors"
      style={{
        height: 36,
        borderBottom: '1px solid #F1F5F9',
        background: isSelected ? '#EFF6FF' : isHighlighted ? '#F8FAFC' : undefined,
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {visibleColumns.map(col => renderCell(col))}
    </tr>
  );
}
