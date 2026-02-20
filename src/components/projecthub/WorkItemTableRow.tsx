import React from 'react';
import { ChevronRight, Flag, MessageSquare, Calendar, Link2, ArrowUp, ArrowDown, ArrowRight, ChevronsUp } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/usePhWorkItems';

// ─── Constants ──────────────────────────────────────────
const TYPE_BORDER: Record<string, string> = {
  Epic: '#7C3AED', Feature: '#2563EB', Story: '#0D9488',
  Bug: '#DC2626', Task: '#D97706', Subtask: '#94A3B8',
};

const TYPE_SYMBOL: Record<string, string> = {
  Epic: '◆', Feature: '▲', Story: '●',
  Bug: '⬡', Task: '■', Subtask: '○',
};

function getStatusLozenge(name: string, category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: '#DBEAFE', color: '#2563EB' };
    case 'done': return { bg: '#DCFCE7', color: '#16A34A' };
    case 'terminal': return { bg: '#FEE2E2', color: '#DC2626' };
    default: {
      const n = name.toLowerCase();
      if (n.includes('review')) return { bg: '#FEF3C7', color: '#D97706' };
      if (n.includes('block')) return { bg: '#FEE2E2', color: '#DC2626' };
      return { bg: '#F1F5F9', color: '#64748B' };
    }
  }
}

function PriorityCell({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const configs: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    critical: { icon: <ChevronsUp size={12} />, color: '#DC2626', bg: '#FEF2F2' },
    high: { icon: <ArrowUp size={12} />, color: '#D97706', bg: '#FFFBEB' },
    medium: { icon: <ArrowRight size={12} />, color: '#2563EB', bg: '#EFF6FF' },
    low: { icon: <ArrowDown size={12} />, color: '#94A3B8', bg: '#F8FAFC' },
  };
  const c = configs[p] || configs.medium;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: c.bg }}>
      <span style={{ color: c.color }}>{c.icon}</span>
      <span className="text-[10px] capitalize" style={{ color: c.color, fontWeight: 500 }}>{p}</span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
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

function formatShortDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[date.getMonth()]} ${date.getDate()}`;
}

function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

// ─── Column Set ────────────────────────────────────────
export const ALL_COLUMNS = [
  { key: 'checkbox', label: '', w: 36 },
  { key: 'type', label: 'T', w: 30 },
  { key: 'key', label: 'Key', w: 65 },
  { key: 'summary', label: 'Summary', w: 0 }, // flex
  { key: 'status', label: 'Status', w: 95 },
  { key: 'priority', label: 'Priority', w: 70 },
  { key: 'assignee', label: 'Assignee', w: 120 },
  { key: 'dueDate', label: 'Due Date', w: 85 },
  { key: 'cycleTime', label: 'Cycle', w: 60 },
  { key: 'reporter', label: 'Reporter', w: 90 },
  { key: 'labels', label: 'Labels', w: 70 },
  { key: 'components', label: 'Components', w: 80 },
  { key: 'release', label: 'Release', w: 75 },
  { key: 'flag', label: 'Flag', w: 55 },
  { key: 'comments', label: '💬', w: 55 },
  { key: 'links', label: '🔗', w: 55 },
  { key: 'subtasks', label: 'Subtasks', w: 60 },
  { key: 'progress', label: 'Progress', w: 60 },
  { key: 'created', label: 'Created', w: 70 },
  { key: 'updated', label: 'Updated', w: 70 },
  { key: 'resolution', label: 'Resolution', w: 80 },
  { key: 'dept', label: 'Dept', w: 70 },
  { key: 'team', label: 'Team', w: 70 },
  { key: 'environment', label: 'Env', w: 80 },
] as const;

export type ColumnKey = typeof ALL_COLUMNS[number]['key'];

interface Props {
  item: WorkItemRow;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  visibleColumns: Set<ColumnKey>;
}

export function WorkItemTableRow({
  item, depth, hasChildren, isExpanded, onToggle, onClick,
  isSelected, isHighlighted, onSelect, onContextMenu, visibleColumns,
}: Props) {
  const borderColor = TYPE_BORDER[item.type_name] ?? item.type_color;
  const overdue = isOverdue(item.due_date);
  const statusStyle = getStatusLozenge(item.status_name, item.status_category);

  const cell = (key: ColumnKey, content: React.ReactNode, extraClass = '') => {
    if (!visibleColumns.has(key)) return null;
    const col = ALL_COLUMNS.find(c => c.key === key)!;
    const isSticky = key === 'checkbox' || key === 'type' || key === 'key' || key === 'summary';
    const stickyLeft = key === 'checkbox' ? 0 : key === 'type' ? 36 : key === 'key' ? 66 : key === 'summary' ? 131 : undefined;

    return (
      <td
        key={key}
        className={`px-1 whitespace-nowrap ${extraClass}`}
        style={{
          width: col.w || undefined,
          minWidth: key === 'summary' ? 200 : col.w || undefined,
          maxWidth: key === 'summary' ? undefined : col.w || undefined,
          ...(isSticky ? { position: 'sticky', left: stickyLeft, zIndex: 2, background: isSelected ? '#EFF6FF' : isHighlighted ? '#F8FAFC' : '#FFF' } : {}),
        }}
      >
        {content}
      </td>
    );
  };

  return (
    <tr
      className="group cursor-pointer transition-colors hover:bg-[#F8FAFC]"
      style={{
        height: 36,
        borderBottom: '1px solid #F1F5F9',
        background: isSelected ? '#EFF6FF' : isHighlighted ? '#F8FAFC' : undefined,
        borderLeft: `3px solid ${borderColor}`,
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Checkbox */}
      {cell('checkbox',
        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={() => {}} onClick={onSelect} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
        </div>
      )}

      {/* Type icon */}
      {cell('type',
        <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
          {hasChildren ? (
            <button onClick={e => { e.stopPropagation(); onToggle(); }}
              className="w-4 h-4 flex items-center justify-center text-[#94A3B8] hover:text-[#475569]"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
              <ChevronRight size={14} />
            </button>
          ) : <span className="w-4" />}
          <span style={{ color: TYPE_BORDER[item.type_name] || '#94A3B8', fontSize: 13, lineHeight: 1 }}>
            {TYPE_SYMBOL[item.type_name] || '●'}
          </span>
        </div>
      )}

      {/* Key */}
      {cell('key',
        <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
          {item.item_key}
        </span>
      )}

      {/* Summary */}
      {cell('summary',
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className="text-[12px] font-medium truncate" style={{ color: '#0F172A' }}>
            {item.title}
          </span>
        </div>,
        'overflow-hidden'
      )}

      {/* Status */}
      {cell('status',
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase whitespace-nowrap"
          style={{ background: statusStyle.bg, color: statusStyle.color, letterSpacing: '0.02em' }}>
          {item.status_name}
        </span>
      )}

      {/* Priority */}
      {cell('priority', <PriorityCell priority={item.priority} />)}

      {/* Assignee */}
      {cell('assignee',
        item.assignee_name ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar name={item.assignee_name} />
            <span className="text-[11px] truncate" style={{ color: '#334155' }}>{item.assignee_name}</span>
          </div>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Due Date */}
      {cell('dueDate',
        <div className="flex items-center gap-1">
          <Calendar size={11} style={{ color: overdue ? '#DC2626' : '#94A3B8' }} />
          <span className="text-[10px]" style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: overdue ? '#DC2626' : '#64748B',
            fontWeight: overdue ? 600 : 400,
          }}>{formatShortDate(item.due_date)}</span>
        </div>
      )}

      {/* Cycle Time */}
      {cell('cycleTime',
        <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
          {item.cycle_time_days != null ? `${item.cycle_time_days}d` : '—'}
        </span>
      )}

      {/* Reporter */}
      {cell('reporter',
        item.reporter_name ? (
          <span className="text-[10px] truncate" style={{ color: '#64748B' }}>{item.reporter_name}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Labels */}
      {cell('labels',
        item.label_names.length > 0 ? (
          <div className="flex items-center gap-0.5 overflow-hidden">
            {item.label_names.slice(0, 2).map(l => (
              <span key={l} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full truncate"
                style={{ background: '#DBEAFE', color: '#2563EB', maxWidth: 60 }}>{l}</span>
            ))}
            {item.label_names.length > 2 && (
              <span className="text-[9px]" style={{ color: '#94A3B8' }}>+{item.label_names.length - 2}</span>
            )}
          </div>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Components */}
      {cell('components',
        item.component_names.length > 0 ? (
          <span className="text-[10px] truncate" style={{ color: '#64748B' }}>{item.component_names.join(', ')}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Release */}
      {cell('release',
        item.release_name ? (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4' }}>
            {item.release_name}
          </span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Flag */}
      {cell('flag',
        item.is_flagged ? (
          <span title={item.flag_reason || 'Flagged'}>🚩</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Comments */}
      {cell('comments',
        item.comment_count > 0 ? (
          <div className="flex items-center gap-0.5">
            <MessageSquare size={11} style={{ color: '#94A3B8' }} />
            <span className="text-[10px]" style={{ color: '#64748B' }}>{item.comment_count}</span>
          </div>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Links */}
      {cell('links',
        item.link_count > 0 ? (
          <div className="flex items-center gap-0.5">
            <Link2 size={11} style={{ color: '#94A3B8' }} />
            <span className="text-[10px]" style={{ color: '#64748B' }}>{item.link_count}</span>
          </div>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Subtasks */}
      {cell('subtasks',
        item.subtask_total > 0 ? (
          <span className="text-[10px]" style={{ color: '#64748B' }}>{item.subtask_done}/{item.subtask_total}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Progress */}
      {cell('progress',
        item.subtask_total > 0 ? (
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
            <div className="h-full rounded-full" style={{ width: `${(item.subtask_done / item.subtask_total) * 100}%`, background: '#16A34A' }} />
          </div>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Created */}
      {cell('created',
        <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}>
          {formatShortDate(item.created_at)}
        </span>
      )}

      {/* Updated */}
      {cell('updated',
        <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}>
          {formatShortDate(item.updated_at)}
        </span>
      )}

      {/* Resolution */}
      {cell('resolution',
        item.resolution ? (
          <span className="text-[10px] capitalize" style={{ color: '#64748B' }}>{item.resolution.replace('_', ' ')}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Dept */}
      {cell('dept',
        item.department ? (
          <span className="text-[10px] truncate" style={{ color: '#64748B' }}>{item.department}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Team */}
      {cell('team',
        item.team ? (
          <span className="text-[10px] truncate" style={{ color: '#64748B' }}>{item.team}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}

      {/* Environment */}
      {cell('environment',
        item.environment ? (
          <span className="text-[10px] truncate capitalize" style={{ color: '#64748B' }}>{item.environment}</span>
        ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>
      )}
    </tr>
  );
}
