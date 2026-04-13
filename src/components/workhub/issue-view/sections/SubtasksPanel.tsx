/**
 * SubtasksPanel — Jira-parity subtasks section with:
 * - Progress bar (green/grey)
 * - Dense table with dynamic columns
 * - Inline create row (+ button)
 * - Column picker popover (localStorage-persisted)
 * - Delete via row action menu
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Columns3, Trash2, X,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import {
  type Subtask, type SubtasksColumnId, type SubtasksDataProvider,
  type IssueKey, loadVisibleColumns, saveVisibleColumns,
} from '@/lib/subtasks-provider';
import { format } from 'date-fns';

// ── Helpers ──

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(d: string) { try { return format(new Date(d), 'yyyy-MM-dd'); } catch { return ''; } }

function PriorityIcon({ priority }: { priority?: string }) {
  const p = (priority ?? '').toLowerCase();
  let color = '#F79232';
  if (p === 'highest' || p === 'critical') color = '#EF4444';
  else if (p === 'high') color = '#F97316';
  else if (p === 'low') color = '#3B82F6';
  else if (p === 'lowest') color = '#60A5FA';
  return <svg width="14" height="14" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="2" rx="1" fill={color}/><rect x="2" y="9" width="12" height="2" rx="1" fill={color}/></svg>;
}

// ── Column definitions ──

interface ColumnSpec {
  id: SubtasksColumnId;
  label: string;
  width: number;
  alwaysVisible?: boolean;
  renderCell: (row: Subtask) => React.ReactNode;
}

const ALL_COLUMNS: ColumnSpec[] = [
  {
    id: 'type', label: 'T', width: 30,
    renderCell: (r) => <JiraIssueTypeIcon type={r.issueType.name} size={16} />,
  },
  {
    id: 'key', label: 'Key', width: 100,
    renderCell: (r) => <span className="stKey">{r.key}</span>,
  },
  {
    id: 'summary', label: 'Summary', width: 0, alwaysVisible: true, // flex
    renderCell: (r) => <span className="stSummary">{r.summary}</span>,
  },
  {
    id: 'priority', label: 'Priority', width: 90,
    renderCell: (r) => (
      <span className="stPriorityCell">
        <PriorityIcon priority={r.priority} />
        <span>{r.priority}</span>
      </span>
    ),
  },
  {
    id: 'assignee', label: 'Assignee', width: 120,
    renderCell: (r) => r.assignee ? (
      <span className="stAssigneeCell">
        <span className="stAvatar" style={{ background: avatarBg(r.assignee.name) }}>{initials(r.assignee.name)}</span>
        <span>{r.assignee.name.split(' ')[0].slice(0, 5)}...</span>
      </span>
    ) : <span className="stUnassigned">—</span>,
  },
  {
    id: 'status', label: 'Status', width: 110,
    renderCell: (r) => <StatusLozenge status={r.status.name} />,
  },
  {
    id: 'created', label: 'Created', width: 90,
    renderCell: (r) => <span className="stDate">{fmtDate(r.createdAt)}</span>,
  },
  {
    id: 'updated', label: 'Updated', width: 90,
    renderCell: (r) => <span className="stDate">{fmtDate(r.updatedAt)}</span>,
  },
];

// ── Column Picker Popover ──

function ColumnPicker({ visible, onToggle, anchor }: {
  visible: SubtasksColumnId[];
  onToggle: (id: SubtasksColumnId) => void;
  anchor: React.RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && anchor.current && !anchor.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [open, anchor]);

  return (
    <>
      <button ref={anchor as any} className="awPill stIconBtn" onClick={() => setOpen(o => !o)} title="Columns">
        <Columns3 style={{ width: 14, height: 14 }} />
      </button>
      {open && (
        <div ref={ref} className="stColumnPicker">
          <div className="stPickerTitle">Columns</div>
          {ALL_COLUMNS.map(col => (
            <label key={col.id} className="stPickerRow">
              <input
                type="checkbox"
                checked={visible.includes(col.id)}
                disabled={col.alwaysVisible}
                onChange={() => onToggle(col.id)}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

// ── Row Action Menu ──

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
      <button className="stRowAction" onClick={() => setOpen(o => !o)}><MoreHorizontal style={{ width: 14, height: 14 }} /></button>
      {open && (
        <div className="stRowMenu">
          <button className="stRowMenuItem" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 style={{ width: 12, height: 12 }} /> Delete
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
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [createError, setCreateError] = useState('');
  const [visibleCols, setVisibleCols] = useState<SubtasksColumnId[]>(loadVisibleColumns);
  const createRef = useRef<HTMLInputElement>(null);
  const colBtnRef = useRef<HTMLButtonElement>(null);

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

  // Focus create input
  useEffect(() => { if (creating && createRef.current) createRef.current.focus(); }, [creating]);

  // Merge local subtasks with external children count
  const totalCount = subtasks.length + externalChildren.length;
  const doneCount = subtasks.filter(s => s.status.category === 'done').length
    + externalChildren.filter((c: any) => (c.status_category ?? '').toLowerCase().includes('done')).length;
  const donePercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Column toggle
  const toggleColumn = useCallback((id: SubtasksColumnId) => {
    setVisibleCols(prev => {
      const col = ALL_COLUMNS.find(c => c.id === id);
      if (col?.alwaysVisible) return prev;
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      saveVisibleColumns(next);
      return next;
    });
  }, []);

  const columns = useMemo(() => ALL_COLUMNS.filter(c => visibleCols.includes(c.id)), [visibleCols]);

  // Create subtask
  const handleCreate = useCallback(async () => {
    const val = createValue.trim();
    if (!val) { setCreateError('Summary is required'); return; }
    setCreateError('');
    try {
      await provider.createSubtask({ parentKey, summary: val });
      setCreateValue('');
      setCreating(false);
      fetchSubtasks();
    } catch { setCreateError('Failed to create'); }
  }, [createValue, parentKey, provider, fetchSubtasks]);

  const handleCreateKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
    if (e.key === 'Escape') { setCreating(false); setCreateValue(''); setCreateError(''); }
  }, [handleCreate]);

  // Delete
  const handleDelete = useCallback(async (id: string) => {
    try { await provider.deleteSubtask(id); fetchSubtasks(); } catch { /* silent */ }
  }, [provider, fetchSubtasks]);

  return (
    <div className="awSection">
      {/* Header */}
      <div className="awSectionHead" onClick={() => setCollapsed(c => !c)}>
        <span className="awSectionLabel">
          {collapsed ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
          Subtasks
          <span className="awCount">{totalCount}</span>
        </span>
        <div className="awSectionActions" onClick={e => e.stopPropagation()}>
          <button className="awPill stIconBtn" title="Options"><MoreHorizontal style={{ width: 14, height: 14 }} /></button>
          <ColumnPicker visible={visibleCols} onToggle={toggleColumn} anchor={colBtnRef} />
          <button className="awPill stIconBtn" title="Create subtask" onClick={() => { setCreating(true); setCollapsed(false); }}>
            <Plus style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="awSectionBody">
          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="awProgress">
              <div className="awProgressBar">
                <div className="awProgressFill" style={{ width: `${donePercent}%`, background: '#5B7F24' }} />
              </div>
              <span className="awProgressText">{donePercent}% Done</span>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="stLoading">
              {[1,2,3].map(i => <div key={i} className="stSkeleton" />)}
            </div>
          ) : totalCount === 0 && !creating ? (
            <div className="awEmpty">No sub-tasks</div>
          ) : (
            <table className="stTable">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.id} className="stTh" style={col.width ? { width: col.width } : undefined}>
                      {col.label !== 'T' ? col.label : ''}
                    </th>
                  ))}
                  <th className="stTh" style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {/* Inline create row */}
                {creating && (
                  <tr className="stCreateRow">
                    {columns.map(col => (
                      <td key={col.id} className="stTd">
                        {col.id === 'type' && <JiraIssueTypeIcon type="Sub-task" size={16} />}
                        {col.id === 'summary' && (
                          <div>
                            <input
                              ref={createRef}
                              className="stCreateInput"
                              placeholder="What needs to be done?"
                              value={createValue}
                              onChange={e => { setCreateValue(e.target.value); setCreateError(''); }}
                              onKeyDown={handleCreateKeyDown}
                            />
                            {createError && <div className="stErrorText">{createError}</div>}
                          </div>
                        )}
                        {col.id === 'status' && <StatusLozenge status="TO DO" />}
                      </td>
                    ))}
                    <td className="stTd">
                      <button className="stRowAction" onClick={() => { setCreating(false); setCreateValue(''); setCreateError(''); }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Local subtasks */}
                {subtasks.map(row => (
                  <tr key={row.id} className="stTr">
                    {columns.map(col => (
                      <td key={col.id} className="stTd" style={col.id === 'summary' ? undefined : undefined}>
                        {col.renderCell(row)}
                      </td>
                    ))}
                    <td className="stTd">
                      <RowActions onDelete={() => handleDelete(row.id)} />
                    </td>
                  </tr>
                ))}

                {/* External children (from ph_issues) */}
                {externalChildren.map((ch: any) => (
                  <tr key={ch.issue_key} className="stTr">
                    {columns.map(col => (
                      <td key={col.id} className="stTd">
                        {col.id === 'type' && <JiraIssueTypeIcon type={ch.issue_type} size={16} />}
                        {col.id === 'key' && <span className="stKey">{ch.issue_key}</span>}
                        {col.id === 'summary' && <span className="stSummary">{ch.summary}</span>}
                        {col.id === 'priority' && (
                          <span className="stPriorityCell">
                            <PriorityIcon priority={ch.priority} />
                            <span>{ch.priority}</span>
                          </span>
                        )}
                        {col.id === 'assignee' && (ch.assignee_display_name
                          ? <span className="stAssigneeCell">
                              <span className="stAvatar" style={{ background: avatarBg(ch.assignee_display_name) }}>{initials(ch.assignee_display_name)}</span>
                              <span>{ch.assignee_display_name.split(' ')[0].slice(0, 5)}...</span>
                            </span>
                          : <span className="stUnassigned">—</span>
                        )}
                        {col.id === 'status' && <StatusLozenge status={ch.status} />}
                        {col.id === 'created' && <span className="stDate">{fmtDate(ch.jira_created_at)}</span>}
                        {col.id === 'updated' && <span className="stDate">{fmtDate(ch.jira_updated_at)}</span>}
                      </td>
                    ))}
                    <td className="stTd" />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
