import React, { useState, useEffect } from 'react';
import { X, GripVertical, Trash2, Plus, AlertTriangle } from '@/lib/atlaskit-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BoardListItem, BoardVisibility, SwimlaneType, BoardQuickFilter } from '@/types/board';
import { useBoard } from '@/hooks/useBoard';
import { useUpdateBoard, useDeleteBoard, useAddColumn, useDeleteColumn, useAddQuickFilter, useDeleteQuickFilter } from '@/hooks/useBoardMutations';
import { typedQuery } from '@/integrations/supabase/client';

interface Props {
  board: BoardListItem;
  onClose: () => void;
}

type SettingsTab = 'general' | 'query' | 'columns' | 'swimlanes' | 'access';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'query', label: 'Query' },
  { key: 'columns', label: 'Columns' },
  { key: 'swimlanes', label: 'Swimlanes' },
  { key: 'access', label: 'Access' },
];

const QUERY_PRESETS = [
  { label: 'All issues', jql: (key?: string | null) => key ? `project = ${key} ORDER BY Rank ASC` : 'ORDER BY Rank ASC' },
  { label: 'Open sprints', jql: (key?: string | null) => key ? `project = ${key} AND sprint in openSprints() ORDER BY Rank ASC` : 'sprint in openSprints() ORDER BY Rank ASC' },
  { label: 'My issues', jql: (key?: string | null) => key ? `project = ${key} AND assignee = currentUser() ORDER BY Rank ASC` : 'assignee = currentUser() ORDER BY Rank ASC' },
  { label: 'Bugs only', jql: (key?: string | null) => key ? `project = ${key} AND issuetype = "QA Bug" ORDER BY priority DESC` : 'issuetype = "QA Bug" ORDER BY priority DESC' },
];

const COLOR_SWATCHES = [
  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', 'var(--ds-text-success, var(--cp-success, #16A34A))', 'var(--cp-purple-60, #7C3AED)', 'var(--ds-text-danger, var(--cp-danger, #DC2626))', 'var(--ds-text-warning, var(--cp-warning, #D97706))', 'var(--cp-teal-60, #0D9488)', 'var(--ds-icon, #525252)', 'var(--ds-background-information-bold, #0284C7)',
];

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string; warning?: boolean }[] = [
  { value: 'project', label: 'Project Board', desc: 'Visible to all project members' },
  { value: 'private', label: '🔒 Private', desc: 'Only you can see this board' },
  { value: 'global', label: 'Organisation-wide', desc: 'Visible to all users in the organisation. Use with caution.', warning: true },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string; desc: string }[] = [
  { value: 'none', label: 'No Swimlanes', desc: 'All issues in a single flat list' },
  { value: 'release', label: 'Group by Release', desc: 'One swimlane per release / fix version' },
  { value: 'assignee', label: 'Group by Assignee', desc: 'One swimlane per team member' },
  { value: 'epic', label: 'Group by Epic', desc: 'One swimlane per parent epic' },
];

export default function BoardSettingsDrawer({ board, onClose }: Props) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? '');
  const [color, setColor] = useState(board.color);
  const [visibility, setVisibility] = useState<BoardVisibility>(board.visibility);
  const [swimlane, setSwimlane] = useState<SwimlaneType>(board.swimlaneType);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [boardQuery, setBoardQuery] = useState(board.boardQuery ?? '');
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterJql, setNewFilterJql] = useState('');
  const [addingFilter, setAddingFilter] = useState(false);

  const { data: boardData } = useBoard(board.id);
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const addColumn = useAddColumn();
  const deleteCol = useDeleteColumn();
  const addQuickFilter = useAddQuickFilter();
  const deleteQuickFilter = useDeleteQuickFilter();
  const qc = useQueryClient();

  // Resolve project key for query presets
  const projectKey = board.projectId ? undefined : undefined; // resolved from boardData if available

  const { data: quickFilters = [] } = useQuery<BoardQuickFilter[]>({
    queryKey: ['board-quick-filters', board.id],
    queryFn: async () => {
      const { data, error } = await typedQuery('board_quick_filters' as any)
        .select('*')
        .eq('board_id', board.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        id: f.id,
        boardId: f.board_id,
        name: f.name,
        filterType: f.filter_type,
        filterValue: f.filter_value ?? {},
        isSystem: f.is_system,
        sortOrder: f.sort_order,
        createdAt: f.created_at,
      }));
    },
  });

  const isDirty = name !== board.name || description !== (board.description ?? '') ||
    color !== board.color || visibility !== board.visibility || swimlane !== board.swimlaneType ||
    boardQuery !== (board.boardQuery ?? '');

  const columns = boardData?.columns ?? [];

  const handleSave = async () => {
    if (!isDirty) return;
    await updateBoard.mutateAsync({
      boardId: board.id,
      projectId: projectId ?? board.projectId ?? undefined,
      name: name !== board.name ? name : undefined,
      description: description !== (board.description ?? '') ? description : undefined,
      color: color !== board.color ? color : undefined,
      visibility: visibility !== board.visibility ? visibility : undefined,
      swimlane_type: swimlane !== board.swimlaneType ? swimlane : undefined,
      board_query: boardQuery !== (board.boardQuery ?? '') ? boardQuery : undefined,
    });
    onClose();
  };

  const handleAddFilter = async () => {
    if (!newFilterName.trim() || !newFilterJql.trim()) return;
    await addQuickFilter.mutateAsync({ boardId: board.id, name: newFilterName.trim(), jql: newFilterJql.trim() });
    setNewFilterName('');
    setNewFilterJql('');
    setAddingFilter(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== board.name) return;
    await deleteBoard.mutateAsync({ boardId: board.id, projectId: projectId ?? board.projectId ?? '' });
    onClose();
    navigate(`/projects/${projectId}/boards`);
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    await addColumn.mutateAsync({
      boardId: board.id,
      name: newColName.trim(),
      position: columns.length,
    });
    setNewColName('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--ds-blanket, rgba(15,23,42,0.30))',
      display: 'flex', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: '100%', background: 'var(--cp-float)',
        borderLeft: '0.75px solid var(--ds-border, rgba(15,23,42,0.08))',
        boxShadow: 'var(--ds-shadow-overlay, -8px 0 32px var(--ds-border, rgba(15,23,42,0.12)))',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '0.75px solid var(--ds-border, rgba(15,23,42,0.08))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontSize: 14, fontFamily: 'var(--cp-font-heading)', fontWeight: 700,
              color: 'var(--fg-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>Settings</h2>
            {isDirty && (
              <span style={{ fontSize: 11.5, color: 'var(--sem-warning)', fontFamily: 'var(--cp-font-body)', flexShrink: 0 }}>
                • Unsaved
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '0.75px solid var(--ds-border, rgba(15,23,42,0.08))', padding: '8px 12px' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '8px 8px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 11.5, fontWeight: active ? 600 : 500,
                color: active ? 'var(--cp-blue)' : 'var(--fg-3)',
                fontFamily: 'var(--cp-font-body)',
                borderBottom: active ? '2px solid var(--cp-blue)' : '2px solid transparent',
                marginBottom: 0,
              }}>{t.label}</button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'general' && (
            <>
              <Section label="Board Identity">
                <FieldLabel>Board Name</FieldLabel>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />

                <FieldLabel style={{ marginTop: 12 }}>Description</FieldLabel>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />

                <FieldLabel style={{ marginTop: 12 }}>Board Color</FieldLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{
                      width: 24, height: 24, borderRadius: 6, border: 'none',
                      background: c, cursor: 'pointer',
                      outline: color === c ? '2px solid var(--cp-blue)' : 'none',
                      outlineOffset: color === c ? 2 : 0,
                    }} />
                  ))}
                </div>
              </Section>

              <Section label="Visibility">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {VISIBILITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setVisibility(opt.value)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      border: `0.75px solid ${visibility === opt.value ? 'var(--cp-blue)' : 'var(--ds-border, rgba(15,23,42,0.12))'}`,
                      background: visibility === opt.value ? 'var(--ds-background-selected, rgba(37,99,235,0.04))' : 'var(--bg-app)',
                    }}>
                      <RadioCircle selected={visibility === opt.value} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>{opt.label}</span>
                          {opt.warning && <AlertTriangle size={12} color="var(--ds-text-warning, var(--cp-warning, #D97706))" />}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', marginTop: 0 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Danger Zone">
                {!showDelete ? (
                  <button onClick={() => setShowDelete(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '8px 12px',
                    background: 'var(--ds-background-danger, #FEF2F2)', border: '0.75px solid var(--sem-danger)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                    color: 'var(--sem-danger)', fontFamily: 'var(--cp-font-body)',
                  }}>
                    <Trash2 size={13} /> Delete Board
                  </button>
                ) : (
                  <div style={{ padding: 8, background: 'var(--ds-background-danger, #FEF2F2)', borderRadius: 6, border: '0.75px solid var(--sem-danger)' }}>
                    <p style={{ fontSize: 11.5, color: 'var(--sem-danger)', margin: '0 0 8px', fontFamily: 'var(--cp-font-body)' }}>
                      Type <strong>{board.name}</strong> to confirm:
                    </p>
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder={board.name} style={{ ...inputStyle, marginBottom: 8 }} />
                    <button onClick={handleDelete}
                      disabled={deleteConfirm !== board.name || deleteBoard.isPending} style={{
                      height: 28, padding: '8px 12px', borderRadius: 6, border: 'none',
                      background: deleteConfirm === board.name ? 'var(--sem-danger)' : 'var(--divider)',
                      color: deleteConfirm === board.name ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' : 'var(--fg-4)',
                      fontSize: 11.5, fontWeight: 600, cursor: deleteConfirm === board.name ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--cp-font-body)',
                    }}>{deleteBoard.isPending ? 'Deleting…' : 'Delete'}</button>
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === 'query' && (
            <>
              <Section label="Board Query">
                <p style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Issues matching this query will appear on the board.
                </p>
                <textarea
                  value={boardQuery}
                  onChange={e => setBoardQuery(e.target.value)}
                  rows={3}
                  style={{
                    ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12,
                    background: 'var(--ds-surface-sunken, #F7F8F9)',
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {QUERY_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setBoardQuery(p.jql(null))} style={{
                      fontSize: 11, padding: '4px 8px', borderRadius: 10,
                      border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))',
                      background: 'var(--bg-app)', color: 'var(--cp-blue)',
                      cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                    }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Quick Filters">
                <p style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', margin: '0 0 8px' }}>
                  Filter chips shown in the board toolbar.
                </p>

                {quickFilters.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px', borderRadius: 6, marginBottom: 8,
                    border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))',
                    background: 'var(--bg-app)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
                        {f.name}
                        {f.isSystem && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>system</span>
                        )}
                      </div>
                      {f.filterType === 'jql' && (
                        <div style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', marginTop: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String((f.filterValue as any).jql ?? '')}
                        </div>
                      )}
                    </div>
                    {!f.isSystem && (
                      <button
                        onClick={() => deleteQuickFilter.mutate({ filterId: f.id, boardId: board.id })}
                        style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={12} color="var(--ds-text-subtlest, #6B778C)" />
                      </button>
                    )}
                  </div>
                ))}

                {addingFilter ? (
                  <div style={{ padding: 8, border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))', borderRadius: 6, background: 'var(--bg-1)', marginTop: 8 }}>
                    <FieldLabel>Filter label</FieldLabel>
                    <input value={newFilterName} onChange={e => setNewFilterName(e.target.value)}
                      placeholder="e.g. My Issues, Blocked…"
                      style={{ ...inputStyle, height: 34, marginBottom: 8 }} />
                    <FieldLabel>JQL clause</FieldLabel>
                    <input value={newFilterJql} onChange={e => setNewFilterJql(e.target.value)}
                      placeholder="assignee = currentUser()"
                      onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
                      style={{ ...inputStyle, height: 34, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setAddingFilter(false)} style={{
                        height: 28, padding: '0 12px', borderRadius: 4,
                        border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))', background: 'var(--bg-app)',
                        fontSize: 11.5, cursor: 'pointer', color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)',
                      }}>Cancel</button>
                      <button onClick={handleAddFilter} disabled={!newFilterName.trim() || !newFilterJql.trim()} style={{
                        height: 28, padding: '0 12px', borderRadius: 4, border: 'none',
                        background: newFilterName.trim() && newFilterJql.trim() ? 'var(--cp-blue)' : 'var(--divider)',
                        fontSize: 11.5, fontWeight: 600,
                        color: newFilterName.trim() && newFilterJql.trim() ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--fg-4)',
                        cursor: newFilterName.trim() && newFilterJql.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: 'var(--cp-font-body)',
                      }}>Add filter</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingFilter(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px',
                    border: '0.75px dashed var(--ds-border, rgba(15,23,42,0.12))', borderRadius: 6,
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', marginTop: 8,
                  }}>
                    <Plus size={13} /> Add filter
                  </button>
                )}
              </Section>
            </>
          )}

          {tab === 'columns' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columns.map((col) => (
                  <div key={col.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px',
                    border: `0.75px solid ${col.statusIds.length === 0 ? 'var(--sem-warning)' : 'var(--ds-border, rgba(15,23,42,0.12))'}`,
                    borderRadius: 6, background: 'var(--bg-app)',
                    borderLeftWidth: col.statusIds.length === 0 ? 3 : 0.75,
                  }}>
                    <GripVertical size={13} color="var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))" style={{ cursor: 'grab', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--fg-1)',
                      fontFamily: 'var(--cp-font-body)', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{col.name}</span>
                    {col.isBacklog && <Badge bg="var(--ds-background-brand-subtle, rgba(37,99,235,0.06))" color="var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))">Backlog</Badge>}
                    {col.isDone && <Badge bg="var(--ds-background-success, #F0FDF4)" color="var(--sem-success)">Done</Badge>}
                    <button onClick={() => deleteCol.mutate({ columnId: col.id, boardId: board.id })} style={{
                      width: 22, height: 22, borderRadius: 4, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Trash2 size={12} color="var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))" />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={newColName} onChange={e => setNewColName(e.target.value)}
                  placeholder="New column…"
                  onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleAddColumn} disabled={!newColName.trim()} style={{
                  display: 'flex', alignItems: 'center', gap: 4, height: 48, padding: '0 8px',
                  border: '0.75px dashed var(--ds-border, rgba(15,23,42,0.12))',
                  borderRadius: 6, background: 'transparent', cursor: newColName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 11.5, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))', fontFamily: 'var(--cp-font-body)',
                }}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </>
          )}

          {tab === 'swimlanes' && (
            <>
              <FieldLabel>Swimlane Type</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SWIMLANE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSwimlane(opt.value)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px',
                    borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    border: `0.75px solid ${swimlane === opt.value ? 'var(--cp-blue)' : 'var(--ds-border, rgba(15,23,42,0.12))'}`,
                    background: swimlane === opt.value ? 'var(--ds-background-selected, rgba(37,99,235,0.04))' : 'var(--bg-app)',
                  }}>
                    <RadioCircle selected={swimlane === opt.value} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', marginTop: 0 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'access' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', marginBottom: 12 }}>
                Manage who has access to this board and their roles.
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '8px 12px',
                background: 'var(--cp-blue)', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
                fontFamily: 'var(--cp-font-body)',
              }}>
                <Plus size={13} /> Add Member
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '8px 16px', borderTop: '0.75px solid var(--ds-border, rgba(15,23,42,0.08))',
        }}>
          <button onClick={onClose} style={{
            height: 30, padding: '8px 12px', borderRadius: 6,
            border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))', background: 'var(--bg-app)',
            fontSize: 11.5, fontWeight: 500, color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, #334155)))',
            fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!isDirty || updateBoard.isPending} style={{
            height: 32, padding: '0 16px', borderRadius: 6, border: 'none',
            background: isDirty ? 'var(--cp-blue)' : 'var(--divider)',
            fontSize: 11.5, fontWeight: 600,
            color: isDirty ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' : 'var(--fg-4)',
            fontFamily: 'var(--cp-font-body)',
            cursor: isDirty ? 'pointer' : 'not-allowed',
          }}>{updateBoard.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 50, padding: '8px 12px', boxSizing: 'border-box',
  border: '0.75px solid var(--ds-border, rgba(15,23,42,0.12))', borderRadius: 6,
  fontSize: 13, fontFamily: 'var(--cp-font-body)', color: 'var(--fg-1)',
  outline: 'none', background: 'var(--bg-app)',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--ds-text-subtlest, var(--fg-4, #6B778C))',
        fontFamily: 'var(--cp-font-body)', marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

function FieldLabel({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block', fontSize: 11.5, fontWeight: 600,
      color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)',
      marginBottom: 4, ...s,
    }}>{children}</label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 0,
      border: `1.5px solid ${selected ? 'var(--cp-blue)' : 'var(--ds-border, rgba(15,23,42,0.15))'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--cp-blue)' : 'var(--bg-app)',
      transition: 'all 100ms',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }} />}
    </div>
  );
}

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', height: 16, padding: '0 4px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, background: bg, color,
      fontFamily: 'var(--cp-font-body)', alignItems: 'center', flexShrink: 0,
    }}>{children}</span>
  );
}
