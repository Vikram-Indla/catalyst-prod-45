/**
 * SubtasksPanel — Jira-native subtasks section (pixel-perfect parity)
 *
 * Layout: [Header: ▼ Subtasks N  ··· ⊞ +] → [Progress bar + % Done] → [HTML <table>]
 * Uses real <table> with border-collapse:separate, NOT div-based grid.
 *
 * Merged "Work" column: [issue-type icon] [BAU-xxxx blue link] [summary]
 * StatusCell: colored lozenge with ▼ chevron
 * AssigneeCell: photo avatar (24px circle) + truncated name
 * PriorityCell: icon + truncated label
 *
 * Inline create row inside table with type selector
 * Column picker popover (localStorage-persisted)
 * Delete via row action menu
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Columns3,
  Trash2, X, Check, Loader2, CornerDownLeft,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  type Subtask, type SubtasksColumnId, type SubtasksDataProvider,
  type IssueKey, loadVisibleColumns, saveVisibleColumns,
  DEFAULT_STATUSES,
} from '@/lib/subtasks-provider';

// ── Helpers ──

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

// ── WorkCell (merged: icon + key + summary) ──

function WorkCell({ issueType, issueKey, summary }: {
  issueType: string;
  issueKey: string;
  summary: string;
}) {
  return (
    <div className="sp-work-cell">
      <span className="sp-type-icon"><JiraIssueTypeIcon type={issueType} size={16} /></span>
      <span className="sp-issue-key">{issueKey}</span>
      <span className="sp-issue-summary">{summary}</span>
    </div>
  );
}

// ── PriorityCell ──

function PriorityCell({ priority }: { priority: string }) {
  const p = (priority ?? '').toLowerCase();
  let color = '#F79232';
  if (p === 'highest' || p === 'critical') color = '#EF4444';
  else if (p === 'high') color = '#F97316';
  else if (p === 'low') color = '#3B82F6';
  else if (p === 'lowest' || p === 'trivial') color = '#60A5FA';

  // Truncate to 5 chars like Jira
  const label = priority.length > 5 ? priority.slice(0, 4) + '...' : priority;

  return (
    <div className="sp-priority-cell">
      <span className="sp-priority-icon">
        {(p === 'highest' || p === 'high' || p === 'critical') ? (
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13l5-10 5 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (p === 'low' || p === 'lowest' || p === 'trivial') ? (
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l5 10 5-10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="2" rx="1" fill={color}/><rect x="2" y="9" width="12" height="2" rx="1" fill={color}/></svg>
        )}
      </span>
      <span className="sp-priority-label">{label}</span>
    </div>
  );
}

// ── AssigneeCell (avatar + name) ──

function AssigneeCell({ displayName, avatarUrl }: {
  displayName: string | null;
  avatarUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);

  if (!displayName) {
    return (
      <div className="sp-assignee-cell">
        <div className="sp-avatar-fallback" style={{ background: '#8993A4' }}>?</div>
      </div>
    );
  }

  const truncated = displayName.length > 5 ? displayName.slice(0, 3) + '...' : displayName;

  return (
    <div className="sp-assignee-cell" title={displayName}>
      {avatarUrl && !imgError ? (
        <img className="sp-avatar" src={avatarUrl} alt={displayName} onError={() => setImgError(true)} />
      ) : (
        <div className="sp-avatar-fallback" style={{ background: avatarBg(displayName) }}>
          {initials(displayName)}
        </div>
      )}
      <span className="sp-assignee-name">{truncated}</span>
    </div>
  );
}

// ── StatusCell (lozenge with ▼ chevron) ──

function StatusCell({ status, statusCategory, onStatusChange }: {
  status: string;
  statusCategory: string;
  onStatusChange?: (newStatus: { name: string; category: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cat = statusCategory?.toLowerCase() || '';
  let cls = 'sp-status-btn--todo';
  if (cat === 'done') cls = 'sp-status-btn--done';
  else if (cat === 'in_progress' || cat === 'inprogress' || cat === 'indeterminate') cls = 'sp-status-btn--inprogress';

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`sp-status-btn ${cls}`}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        type="button"
      >
        <span>{status}</span>
        <span className="sp-status-chevron">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2.5 3.5L5 6.5L7.5 3.5" />
          </svg>
        </span>
      </button>
      {open && onStatusChange && (
        <div className="sp-status-dropdown">
          {DEFAULT_STATUSES.map(s => (
            <div
              key={s.id}
              className={`sp-status-dropdown-item ${s.name === status ? 'sp-status-dropdown-item--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange({ name: s.name, category: s.category });
                setOpen(false);
              }}
            >
              <StatusBadge name={s.name} category={s.category} />
              {s.name === status && <Check size={12} color="#0052CC" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ name, category }: { name: string; category: string }) {
  let cls = 'sp-status-btn--todo';
  if (category === 'done') cls = 'sp-status-btn--done';
  else if (category === 'in_progress') cls = 'sp-status-btn--inprogress';
  return <span className={`sp-status-btn ${cls}`} style={{ cursor: 'default' }}>{name}</span>;
}

// ── Column picker ──

type VisibleColumn = 'priority' | 'assignee' | 'status';

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
        <Columns3 size={16} />
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

// ── Row action menu ──

function RowActions({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sp-row-action" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="sp-row-menu">
          <button className="sp-row-menu-item" onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main SubtasksPanel ──

interface SubtasksPanelProps {
  parentKey: IssueKey;
  provider: SubtasksDataProvider;
  /** External child items from ph_issues (Jira-synced) */
  externalChildren?: any[];
}

export function SubtasksPanel({ parentKey, provider, externalChildren = [] }: SubtasksPanelProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    priority: true,
    assignee: true,
    status: true,
  });
  const createRef = useRef<HTMLInputElement>(null);

  // Load subtasks
  const fetchSubtasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await provider.listSubtasks(parentKey);
      setSubtasks(data);
    } catch { /* silent */ }
    setLoading(false);
  }, [parentKey, provider]);

  useEffect(() => { fetchSubtasks(); }, [fetchSubtasks]);
  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);

  // Merge counts
  const totalCount = subtasks.length + externalChildren.length;
  const doneCount = subtasks.filter(s => s.status.category === 'done').length
    + externalChildren.filter((c: any) => (c.status_category ?? '').toLowerCase().includes('done')).length;
  const percentage = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // Create subtask
  const handleCreate = useCallback(async () => {
    const val = draftSummary.trim();
    if (!val) return;
    setCreatePending(true);
    try {
      await provider.createSubtask({ parentKey, summary: val });
      setDraftSummary('');
      fetchSubtasks();
      setTimeout(() => createRef.current?.focus(), 50);
    } catch { /* silent */ }
    setCreatePending(false);
  }, [draftSummary, parentKey, provider, fetchSubtasks]);

  // Delete
  const handleDelete = useCallback(async (id: string) => {
    try { await provider.deleteSubtask(id); fetchSubtasks(); } catch { /* silent */ }
  }, [provider, fetchSubtasks]);

  // Status change
  const handleStatusChange = useCallback(async (id: string, newStatus: { name: string; category: string }) => {
    try {
      await provider.updateSubtask(id, {
        status: { id: newStatus.category, name: newStatus.name, category: newStatus.category as any },
      });
      fetchSubtasks();
    } catch { /* silent */ }
  }, [provider, fetchSubtasks]);

  return (
    <div className="sp-panel">
      {/* ═══ Header ═══ */}
      <div className="sp-header">
        <div className="sp-header-left">
          <button type="button" className="sp-collapse-btn" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="sp-title">Subtasks</span>
          {totalCount > 0 && <span className="sp-count">{totalCount}</span>}
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
            <div className="sp-progress" role="progressbar" aria-valuemax={totalCount} aria-valuenow={doneCount}>
              <div className="sp-progress-track">
                <div className="sp-progress-fill" style={{ width: `${percentage}%` }} />
              </div>
              <span className="sp-progress-label">{percentage}% Done</span>
            </div>
          )}

          {/* ═══ Loading skeleton ═══ */}
          {loading && (
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
          {!loading && totalCount === 0 && !creating && (
            <div className="sp-empty">
              <div className="sp-empty-heading">No subtasks yet</div>
              <div className="sp-empty-sub">Break this story into subtasks to track progress</div>
              <button type="button" className="sp-empty-cta" onClick={() => setCreating(true)}>+ Create subtask</button>
            </div>
          )}

          {/* ═══ Native HTML table ═══ */}
          {!loading && (totalCount > 0 || creating) && (
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
                  {/* ─── Inline create row ─── */}
                  {creating && (
                    <tr className="sp-row sp-row--create">
                      <td className="sp-td" colSpan={columns.status ? undefined : 1}>
                        <div className="sp-work-cell">
                          <span className="sp-type-icon"><JiraIssueTypeIcon type="Sub-task" size={16} /></span>
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
                                handleCreate();
                              }
                              if (e.key === 'Escape') {
                                setCreating(false);
                                setDraftSummary('');
                              }
                            }}
                            maxLength={255}
                          />
                        </div>
                      </td>
                      {columns.priority && <td className="sp-td" />}
                      {columns.assignee && <td className="sp-td" />}
                      {columns.status && (
                        <td className="sp-td">
                          <StatusBadge name="TO DO" category="todo" />
                        </td>
                      )}
                    </tr>
                  )}

                  {/* ─── Local subtasks ─── */}
                  {subtasks.map(row => (
                    <tr key={row.id} className="sp-row">
                      <td className="sp-td">
                        <WorkCell
                          issueType={row.issueType.name}
                          issueKey={row.key}
                          summary={row.summary}
                        />
                      </td>
                      {columns.priority && (
                        <td className="sp-td">
                          <PriorityCell priority={row.priority} />
                        </td>
                      )}
                      {columns.assignee && (
                        <td className="sp-td">
                          <AssigneeCell
                            displayName={row.assignee?.name ?? null}
                            avatarUrl={row.assignee?.avatarUrl}
                          />
                        </td>
                      )}
                      {columns.status && (
                        <td className="sp-td">
                          <StatusCell
                            status={row.status.name}
                            statusCategory={row.status.category}
                            onStatusChange={(s) => handleStatusChange(row.id, s)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* ─── External children (from ph_issues) ─── */}
                  {externalChildren.map((ch: any) => (
                    <tr key={ch.issue_key} className="sp-row">
                      <td className="sp-td">
                        <WorkCell
                          issueType={ch.issue_type}
                          issueKey={ch.issue_key}
                          summary={ch.summary}
                        />
                      </td>
                      {columns.priority && (
                        <td className="sp-td">
                          <PriorityCell priority={ch.priority ?? 'Medium'} />
                        </td>
                      )}
                      {columns.assignee && (
                        <td className="sp-td">
                          <AssigneeCell
                            displayName={ch.assignee_display_name}
                            avatarUrl={ch.assignee_avatar}
                          />
                        </td>
                      )}
                      {columns.status && (
                        <td className="sp-td">
                          <StatusCell
                            status={ch.status}
                            statusCategory={ch.status_category ?? 'todo'}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ Cancel create ═══ */}
          {creating && (
            <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
              <button
                type="button"
                onClick={() => { setCreating(false); setDraftSummary(''); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B778C', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
