/**
 * WorkHubRow — Single table row (36px height)
 * Inline edit on click, hover actions, checkbox, type icon, status lozenge
 */
import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Link2, Pencil } from 'lucide-react';
import type { WorkHubItem } from '@/services/workhub-service';
import type { ColumnConfig } from '@/types/workhub';
import WorkHubTypeIcon from './WorkHubTypeIcon';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import WorkHubPriorityIcon from './WorkHubPriorityIcon';
import { AvatarCircle } from './WorkHubAssigneePicker';
import { format } from 'date-fns';

interface WorkHubRowProps {
  item: WorkHubItem;
  columns: ColumnConfig[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onOpenPanel: (id: string) => void;
  onInlineEdit: (itemId: string, field: string, value: any) => void;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yy'); } catch { return '—'; }
}

export default function WorkHubRow({ item, columns, selected, onSelect, onOpenPanel, onInlineEdit }: WorkHubRowProps) {
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editField && inputRef.current) inputRef.current.focus();
  }, [editField]);

  const startEdit = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (editField && editValue !== undefined) {
      onInlineEdit(item.id, editField, editValue);
    }
    setEditField(null);
  };

  const cancelEdit = () => { setEditField(null); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const visibleCols = columns.filter(c => c.visible);

  const cellStyle = (col: ColumnConfig): React.CSSProperties => ({
    width: col.width,
    minWidth: col.minWidth,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  });

  const renderCell = (col: ColumnConfig) => {
    switch (col.id) {
      case 'type':
        return <WorkHubTypeIcon type={item.issue_type} size={16} />;

      case 'key':
        return (
          <button
            onClick={e => { e.stopPropagation(); onOpenPanel(item.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500,
              color: '#0F172A', textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0F172A')}
          >
            {item.issue_key}
          </button>
        );

      case 'summary':
        if (editField === 'summary') {
          return (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, height: 28, border: '1.5px solid #2563EB', borderRadius: 3,
                padding: '0 6px', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif',
                color: '#0F172A', background: 'white',
              }}
            />
          );
        }
        return (
          <span
            onClick={e => { e.stopPropagation(); startEdit('summary', item.summary); }}
            title={item.summary}
            style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 13, color: '#0F172A', cursor: 'text',
              fontWeight: item.child_count > 0 ? 500 : 400,
            }}
          >
            {item.summary}
          </span>
        );

      case 'status':
        return <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />;

      case 'parent':
        if (!item.parent_key) return <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
            background: '#F1F5F9', borderRadius: 3, maxWidth: '100%', overflow: 'hidden',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 500, flexShrink: 0 }}>
              {item.parent_key}
            </span>
            {item.parent_summary && (
              <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                · {item.parent_summary}
              </span>
            )}
          </span>
        );

      case 'assignee':
        if (!item.assignee_display_name) return <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <AvatarCircle name={item.assignee_display_name} size={20} />
            <span style={{ fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.assignee_display_name}
            </span>
          </span>
        );

      case 'priority':
        return <WorkHubPriorityIcon priority={item.priority} size={16} />;

      case 'created':
        return <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.jira_created_at)}</span>;

      case 'updated':
        return <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.jira_updated_at)}</span>;

      case 'due_date':
        return <span style={{ fontSize: 13, color: item.due_date ? '#0F172A' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.due_date)}</span>;

      case 'points':
        return <span style={{ fontSize: 13, color: item.story_points != null ? '#0F172A' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
          {item.story_points != null ? item.story_points : '—'}
        </span>;

      default:
        return <span style={{ color: '#94A3B8' }}>—</span>;
    }
  };

  return (
    <div
      className="group"
      style={{
        display: 'flex', alignItems: 'center',
        height: 36, maxHeight: 36, minHeight: 36,
        borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        background: selected ? 'rgba(37,99,235,0.08)' : 'transparent',
        transition: 'background 120ms',
        position: 'relative',
        cursor: 'default',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Checkbox */}
      <div style={{ width: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onSelect(e.target.checked); }}
          style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer' }}
        />
      </div>

      {/* Data cells */}
      {visibleCols.map(col => (
        <div key={col.id} style={cellStyle(col)}>
          {renderCell(col)}
        </div>
      ))}

      {/* Hover actions */}
      <div
        className="opacity-0 group-hover:opacity-100"
        style={{
          position: 'absolute', right: 8, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center', gap: 2,
          transition: 'opacity 120ms',
        }}
      >
        {[
          { icon: Pencil, label: 'Edit', onClick: () => startEdit('summary', item.summary) },
          { icon: Link2, label: 'Link', onClick: () => {} },
          { icon: MoreHorizontal, label: 'More', onClick: () => {} },
        ].map(({ icon: Icon, label, onClick }) => (
          <button key={label} onClick={e => { e.stopPropagation(); onClick(); }} title={label}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'white', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4, cursor: 'pointer',
            }}>
            <Icon size={14} color="#64748B" />
          </button>
        ))}
      </div>
    </div>
  );
}
