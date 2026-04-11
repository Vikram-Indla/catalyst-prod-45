/**
 * SubtasksPanel — Pixel-perfect Jira native-issue-table parity
 *
 * Layout: [Header: ▼ Subtasks ... ··· ⊞ +] → [Progress bar + % Done] → [HTML <table>]
 * Uses real <table> with border-collapse:separate, NOT div-based grid
 *
 * Replaces both the inline subtasks in StoryDetailView and ChildIssuesSection in StoryDetailModal
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, LayoutGrid,
  Check, Loader2, CornerDownLeft,
} from 'lucide-react';
import { WORK_ITEM_ICONS } from '../dialogs/story-detail-modules/constants';
import { nextPos } from '../dialogs/story-detail-modules/helpers';
import { WorkCell } from './cells/WorkCell';
import { PriorityCell } from './cells/PriorityCell';
import { AssigneeCell } from './cells/AssigneeCell';
import { StatusCell } from './cells/StatusCell';
import './SubtasksPanel.css';

// ─── Types ──────────────────────────────────────────────
interface SubtaskRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  issue_type: string;
  assignee_display_name: string | null;
  priority: string;
  position: number;
  deleted_at: string | null;
}

type VisibleColumn = 'priority' | 'assignee' | 'status';

interface SubtasksPanelProps {
  storyKey: string;
  storyId: string;
  projectKey: string;
  onSubtaskClick?: (subtaskId: string) => void;
}

// ─── Type selector for inline create ────────────────────
const TYPE_OPTIONS = [
  { key: 'Sub-task', label: 'Sub-task', icon: WORK_ITEM_ICONS['Sub-task'] },
  { key: 'bug', label: 'Bug', icon: WORK_ITEM_ICONS.bug },
  { key: 'task', label: 'Task', icon: WORK_ITEM_ICONS.task },
];

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = TYPE_OPTIONS.find(t => t.key === value) ?? TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px',
        border: '1px solid #DFE1E6', borderRadius: 3, background: '#fff', cursor: 'pointer',
        fontSize: 13, color: '#172B4D', fontFamily: 'inherit',
      }}>
        <span dangerouslySetInnerHTML={{ __html: current.icon }} style={{ display: 'flex', width: 16, height: 16 }} />
        <span>{current.label}</span>
        <ChevronDown size={12} color="#6B778C" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, minWidth: 160,
          background: '#fff', border: '1px solid #DFE1E6', borderRadius: 4,
          boxShadow: '0 4px 8px rgba(9,30,66,.25)', zIndex: 60, overflow: 'hidden',
        }}>
          {TYPE_OPTIONS.map(opt => (
            <div key={opt.key} onClick={() => { onChange(opt.key); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
                cursor: 'pointer', fontSize: 13, color: '#172B4D',
                background: opt.key === value ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (opt.key !== value) e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (opt.key !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <span dangerouslySetInnerHTML={{ __html: opt.icon }} style={{ display: 'flex', width: 16, height: 16 }} />
              <span>{opt.label}</span>
              {opt.key === value && <Check size={12} color="#0052CC" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column picker ──────────────────────────────────────
const ALL_COLUMNS: { key: VisibleColumn; label: string }[] = [
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
];

function ColumnPicker({ columns, onChange }: {
  columns: Record<VisibleColumn, boolean>;
  onChange: (cols: Record<VisibleColumn, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (key: VisibleColumn) => onChange({ ...columns, [key]: !columns[key] });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="sp-icon-btn" onClick={() => setOpen(o => !o)} title="Configure columns">
        <LayoutGrid size={16} />
      </button>
      {open && (
        <div className="sp-colpicker-dropdown">
          <div className="sp-colpicker-title">Visible columns</div>
          {ALL_COLUMNS.map(col => (
            <div key={col.key} className="sp-colpicker-item" onClick={() => toggle(col.key)}>
              <div className={`sp-colpicker-check ${columns[col.key] ? 'sp-colpicker-check--active' : ''}`}>
                {columns[col.key] && <Check size={10} color="#fff" strokeWidth={3} />}
              </div>
              <span>{col.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────
export function SubtasksPanel({ storyKey, storyId, projectKey, onSubtaskClick }: SubtasksPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Sub-task');
  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    priority: true,
    assignee: true,
    status: true,
  });
  const createRef = useRef<HTMLInputElement>(null);

  // ─── Data query ───────────────────────────────
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_display_name,priority,position,deleted_at')
        .eq('parent_key', storyKey)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubtaskRow[];
    },
    enabled: !!storyKey,
  });

  // ─── Progress calc ────────────────────────────
  const doneCount = children.filter(c => c.status_category === 'done').length;
  const totalCount = children.length;
  const percentage = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // ─── Create mutation ──────────────────────────
  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      const tempKey = `${projectKey}-NEW-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey,
        summary: summary.trim(),
        issue_type: draftType,
        parent_key: storyKey,
        project_key: projectKey,
        status: 'To Do',
        status_category: 'todo',
        priority: 'Medium',
        position: nextPos(children),
        reporter_account_id: user?.id,
        source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
  });

  useEffect(() => {
    if (creating) setTimeout(() => createRef.current?.focus(), 50);
  }, [creating]);

  return (
    <div className="sp-panel">
      {/* ═══ Header ═══ */}
      <div className="sp-header">
        <div className="sp-header-left">
          <button type="button" className="sp-collapse-btn" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="sp-title">Subtasks</span>
        </div>
        {expanded && (
          <div className="sp-header-right">
            <button type="button" className="sp-icon-btn" title="Work item actions">
              <MoreHorizontal size={16} />
            </button>
            <ColumnPicker columns={columns} onChange={setColumns} />
            <button type="button" className="sp-icon-btn" title="Create subtask" onClick={() => setCreating(true)}>
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <>
          {/* ═══ Progress bar ═══ */}
          {totalCount > 0 && (
            <div className="sp-progress" role="progressbar" aria-valuemax={totalCount} aria-valuenow={doneCount} aria-label="Child work progress">
              <div className="sp-progress-track">
                <div className="sp-progress-fill" style={{ width: `${percentage}%` }} />
              </div>
              <span className="sp-progress-label" aria-live="polite" aria-atomic="true">
                {percentage}% Done
              </span>
            </div>
          )}

          {/* ═══ Loading skeleton ═══ */}
          {isLoading && (
            <div>
              {[1, 2, 3].map(i => (
                <div key={i} className="sp-skeleton-row">
                  <div className="sp-skeleton-pulse" style={{ width: 16, height: 16 }} />
                  <div className="sp-skeleton-pulse" style={{ width: 60, height: 12 }} />
                  <div className="sp-skeleton-pulse" style={{ flex: 1, height: 12 }} />
                  <div className="sp-skeleton-pulse" style={{ width: 60, height: 18 }} />
                </div>
              ))}
            </div>
          )}

          {/* ═══ Empty state ═══ */}
          {!isLoading && children.length === 0 && !creating && (
            <div className="sp-empty">
              <div className="sp-empty-heading">No subtasks yet</div>
              <div className="sp-empty-sub">Break this story into subtasks to track progress</div>
              <button type="button" className="sp-empty-cta" onClick={() => setCreating(true)}>+ Create subtask</button>
            </div>
          )}

          {/* ═══ Native HTML table ═══ */}
          {!isLoading && children.length > 0 && (
            <div className="sp-scroll-container">
              <table className="sp-table">
                <thead className="sp-thead">
                  <tr>
                    <th className="sp-th" style={{ width: 'auto' }}>Work</th>
                    {columns.priority && <th className="sp-th sp-th--priority">Priority</th>}
                    {columns.assignee && <th className="sp-th sp-th--assignee">Assignee</th>}
                    {columns.status && <th className="sp-th sp-th--status">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {children.map(child => (
                    <tr
                      key={child.id}
                      className="sp-row"
                      onClick={() => onSubtaskClick?.(child.id)}
                    >
                      <td className="sp-td">
                        <WorkCell
                          issueType={child.issue_type}
                          issueKey={child.issue_key}
                          summary={child.summary}
                          onClick={() => onSubtaskClick?.(child.id)}
                        />
                      </td>
                      {columns.priority && (
                        <td className="sp-td">
                          <PriorityCell priority={child.priority} />
                        </td>
                      )}
                      {columns.assignee && (
                        <td className="sp-td">
                          <AssigneeCell displayName={child.assignee_display_name} />
                        </td>
                      )}
                      {columns.status && (
                        <td className="sp-td">
                          <StatusCell
                            status={child.status}
                            statusCategory={child.status_category}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ Inline create ═══ */}
          {creating && (
            <>
              <div className="sp-create-row">
                <input
                  ref={createRef}
                  type="text"
                  className="sp-create-input"
                  placeholder="What needs to be done?"
                  value={draftSummary}
                  onChange={e => setDraftSummary(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && draftSummary.trim()) {
                      e.preventDefault();
                      createMutation.mutate(draftSummary);
                    }
                    if (e.key === 'Escape') {
                      setCreating(false);
                      setDraftSummary('');
                    }
                  }}
                  maxLength={255}
                />
                <div className="sp-create-actions">
                  <TypeSelector value={draftType} onChange={setDraftType} />
                  <button
                    type="button"
                    onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                    disabled={!draftSummary.trim() || createMutation.isPending}
                    title="Create (Enter)"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 3,
                      background: '#F4F5F7', cursor: draftSummary.trim() ? 'pointer' : 'not-allowed',
                      color: '#6B778C', opacity: draftSummary.trim() ? 1 : 0.5,
                    }}
                  >
                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
                <button type="button" onClick={() => { setCreating(false); setDraftSummary(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B778C', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
