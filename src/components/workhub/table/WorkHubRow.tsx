/**
 * WorkHubRow — 36px table row (Stage E: polished)
 * Inline edit, hover actions, status/priority dropdowns, context menu
 * Accessibility: aria-label on checkbox, focus ring, keyboard Enter
 */
import { useState, useRef, useEffect, memo } from 'react';
import { Pencil, Trash2, Copy } from 'lucide-react';
import type { WorkHubItem } from '@/services/workhub-service';
import { deriveStatusCategory } from '@/services/workhub-service';
import type { ColumnConfig } from '@/types/workhub';
import WorkHubTypeIcon from './WorkHubTypeIcon';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import WorkHubPriorityIcon from './WorkHubPriorityIcon';
import { AvatarCircle } from './WorkHubAssigneePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface WorkHubRowProps {
  item: WorkHubItem;
  columns: ColumnConfig[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onOpenPanel: (id: string) => void;
  onInlineEdit: (itemId: string, field: string, value: any) => void;
  onDelete?: (id: string) => void;
  allStatuses?: string[];
  allPriorities?: string[];
  searchQuery?: string;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yy'); } catch { return '—'; }
}

const STATUS_GROUPS = [
  { label: 'TO DO', category: 'To Do', statuses: ['Backlog', 'In Requirements', 'To Do', 'Open'] },
  { label: 'IN PROGRESS', category: 'In Progress', statuses: ['In Progress', 'In Review', 'In Development', 'In Beta', 'In UAT', 'In QA', 'Ready for QA'] },
  { label: 'DONE', category: 'Done', statuses: ['Done', 'Closed', 'In Production', 'Released'] },
];

const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

function highlightMatch(text: string, query: string | undefined): React.ReactNode {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark style={{ background: '#FEF3C7', padding: 0, borderRadius: 1 }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

export default memo(function WorkHubRow({ item, columns, selected, onSelect, onOpenPanel, onInlineEdit, onDelete, allStatuses, allPriorities, searchQuery }: WorkHubRowProps) {
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { if (editField && inputRef.current) inputRef.current.focus(); }, [editField]);

  const startEdit = (field: string, currentValue: string) => { setEditField(field); setEditValue(currentValue); };
  const commitEdit = () => { if (editField && editValue !== undefined) onInlineEdit(item.id, editField, editValue); setEditField(null); };
  const cancelEdit = () => setEditField(null);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); };

  const commitPoints = () => {
    const val = editValue === '' ? null : parseInt(editValue, 10);
    onInlineEdit(item.id, 'story_points', isNaN(val as number) ? null : val);
    setEditField(null);
  };

  const visibleCols = columns.filter(c => c.visible);

  const cellStyle = (col: ColumnConfig): React.CSSProperties => ({
    width: col.width, minWidth: col.minWidth, padding: '8px 12px',
    display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
  });

  const renderCell = (col: ColumnConfig) => {
    switch (col.id) {
      case 'type':
        return <WorkHubTypeIcon type={item.issue_type} size={16} />;

      case 'key':
        return (
          <button
            onClick={e => { e.stopPropagation(); onOpenPanel(item.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: '#2563EB', textDecoration: 'none', outline: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            onFocus={e => (e.currentTarget.style.outline = '2px solid #2563EB')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          >
            {highlightMatch(item.issue_key, searchQuery)}
          </button>
        );

      case 'summary':
        if (editField === 'summary') {
          return (
            <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit} onKeyDown={handleKeyDown}
              style={{ flex: 1, height: 28, border: '1.5px solid #2563EB', borderRadius: 3, padding: '0 6px', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif', color: '#0F172A', background: 'white' }}
            />
          );
        }
        return (
          <span onClick={e => { e.stopPropagation(); startEdit('summary', item.summary); }}
            title={item.summary?.length > 80 ? item.summary : undefined}
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#0F172A', cursor: 'text', fontWeight: item.child_count > 0 ? 500 : 400 }}>
            {highlightMatch(item.summary, searchQuery)}
          </span>
        );

      case 'status':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" style={{ width: 220, padding: '4px 0', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999, maxHeight: 320, overflowY: 'auto' }}>
              {STATUS_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', padding: '6px 12px 2px' }}>{group.label}</div>
                  {group.statuses.map(s => (
                    <button key={s} onClick={() => onInlineEdit(item.id, 'status', s)} style={{
                      width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                      background: item.status === s ? 'rgba(37,99,235,0.08)' : 'transparent',
                      color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <WorkHubStatusLozenge status={s} statusCategory={group.category} />
                    </button>
                  ))}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        );

      case 'parent':
        if (!item.parent_key) return <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>;
        return (
          <span title={`${item.parent_key} · ${item.parent_summary || ''}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
            background: '#F1F5F9', borderRadius: 3, maxWidth: 180, overflow: 'hidden',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 500, flexShrink: 0 }}>{item.parent_key}</span>
            {item.parent_summary && <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {item.parent_summary}</span>}
          </span>
        );

      case 'assignee':
        if (!item.assignee_display_name) return <span style={{ color: '#94A3B8', fontSize: 13, fontStyle: 'italic', fontWeight: 400 }}>Unassigned</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <AvatarCircle name={item.assignee_display_name} size={20} />
            <span style={{ fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.assignee_display_name}</span>
          </span>
        );

      case 'priority':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <WorkHubPriorityIcon priority={item.priority || 'Medium'} size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" style={{ width: 160, padding: '4px 0', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999 }}>
              {PRIORITY_OPTIONS.map(p => (
                <button key={p} onClick={() => onInlineEdit(item.id, 'priority', p)} style={{
                  width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                  background: item.priority === p ? 'rgba(37,99,235,0.08)' : 'transparent',
                  color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <WorkHubPriorityIcon priority={p} size={14} showLabel />
                </button>
              ))}
            </PopoverContent>
          </Popover>
        );

      case 'created':
        return <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.jira_created_at)}</span>;
      case 'updated':
        return <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.jira_updated_at)}</span>;
      case 'due_date':
        return <span style={{ fontSize: 13, color: item.due_date ? '#0F172A' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' }}>{formatDate(item.due_date)}</span>;

      case 'points':
        if (editField === 'points') {
          return (
            <input ref={inputRef} type="number" min={0} max={100} value={editValue}
              onChange={e => setEditValue(e.target.value)} onBlur={commitPoints}
              onKeyDown={e => { if (e.key === 'Enter') commitPoints(); if (e.key === 'Escape') cancelEdit(); }}
              style={{ width: 50, height: 28, border: '1.5px solid #2563EB', borderRadius: 3, padding: '0 4px', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", color: '#0F172A', background: 'white', textAlign: 'center' }}
            />
          );
        }
        return (
          <span onClick={e => { e.stopPropagation(); startEdit('points', String(item.story_points ?? '')); }}
            style={{ fontSize: 13, color: item.story_points != null ? '#0F172A' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace", cursor: 'text' }}>
            {item.story_points != null ? item.story_points : '—'}
          </span>
        );

      default:
        return <span style={{ color: '#94A3B8' }}>—</span>;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); };

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  return (
    <>
      <div
        role="row"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' && !editField) onOpenPanel(item.id); if (e.key === ' ' && !editField) { e.preventDefault(); onSelect(!selected); } }}
        style={{
          display: 'flex', alignItems: 'center',
          height: 36, maxHeight: 36, minHeight: 36,
          borderBottom: '0.75px solid rgba(15,23,42,0.06)',
          background: selected ? 'rgba(37,99,235,0.08)' : hovered ? 'rgba(15,23,42,0.04)' : 'transparent',
          transition: 'background 150ms ease',
          position: 'relative', cursor: 'default',
          outline: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={e => { if (e.currentTarget === e.target) e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #2563EB'; }}
        onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        onContextMenu={handleContextMenu}
      >
        <div style={{ width: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(e.target.checked); }}
            aria-label={`Select ${item.issue_key}`}
            style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer' }} />
        </div>

        {visibleCols.map(col => (
          <div key={col.id} style={cellStyle(col)} role="gridcell">{renderCell(col)}</div>
        ))}

        {/* Hover actions — opacity transition */}
        <div style={{
          position: 'absolute', right: 8, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center', gap: 2,
          opacity: hovered ? 1 : 0, transition: 'opacity 120ms', pointerEvents: hovered ? 'auto' : 'none',
        }}>
          <button onClick={e => { e.stopPropagation(); startEdit('summary', item.summary); }} title="Edit" aria-label="Edit summary"
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4, cursor: 'pointer' }}>
            <Pencil size={14} color="#64748B" />
          </button>
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(item.id); }} title="Delete" aria-label="Delete item"
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4, cursor: 'pointer' }}>
              <Trash2 size={14} color="#DC2626" />
            </button>
          )}
        </div>
      </div>

      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x,
          width: 200, background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)',
          borderRadius: 6, padding: '4px 0', zIndex: 99999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }} role="menu">
          <button role="menuitem" onClick={() => { onOpenPanel(item.id); setContextMenu(null); }}
            style={{ width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', background: 'transparent', color: '#0F172A', cursor: 'pointer', textAlign: 'left' }}>
            Open in panel
          </button>
          <button role="menuitem" onClick={() => { navigator.clipboard.writeText(item.issue_key); setContextMenu(null); }}
            style={{ width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', background: 'transparent', color: '#0F172A', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Copy size={13} /> Copy key
          </button>
          <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '4px 0' }} />
          {onDelete && (
            <button role="menuitem" onClick={() => { onDelete(item.id); setContextMenu(null); }}
              style={{ width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )}
    </>
  );
});
