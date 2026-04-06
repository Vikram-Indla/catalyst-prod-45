import React, { useState } from 'react';
import { X, GripVertical, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BoardListItem, BoardVisibility, SwimlaneType } from '@/types/board';
import { useBoard } from '@/hooks/useBoard';
import { useUpdateBoard, useDeleteBoard, useAddColumn, useDeleteColumn } from '@/hooks/useBoardMutations';

interface Props {
  board: BoardListItem;
  onClose: () => void;
}

type SettingsTab = 'general' | 'columns' | 'swimlanes' | 'access';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'columns', label: 'Columns' },
  { key: 'swimlanes', label: 'Swimlanes' },
  { key: 'access', label: 'Access' },
];

const COLOR_SWATCHES = [
  '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706', '#0D9488', '#525252', '#0284C7',
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
  const { data: boardData } = useBoard(board.id);
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const addColumn = useAddColumn();
  const deleteCol = useDeleteColumn();

  const isDirty = name !== board.name || description !== (board.description ?? '') ||
    color !== board.color || visibility !== board.visibility || swimlane !== board.swimlaneType;

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
    });
    onClose();
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
      background: 'rgba(15,23,42,0.30)',
      display: 'flex', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: '100%', background: 'var(--cp-float)',
        borderLeft: '0.75px solid rgba(15,23,42,0.08)',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontSize: 14, fontFamily: "'Sora', sans-serif", fontWeight: 700,
              color: 'var(--fg-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>Settings</h2>
            {isDirty && (
              <span style={{ fontSize: 11.5, color: 'var(--sem-warning)', fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                • Unsaved
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--fg-3, #94A3B8)" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '0.75px solid rgba(15,23,42,0.08)', padding: '8px 12px' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '8px 10px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 11.5, fontWeight: active ? 600 : 500,
                color: active ? 'var(--cp-blue)' : 'var(--fg-3)',
                fontFamily: "'Inter', sans-serif",
                borderBottom: active ? '2px solid var(--cp-blue)' : '2px solid transparent',
                marginBottom: -1,
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
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {VISIBILITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setVisibility(opt.value)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      border: `0.75px solid ${visibility === opt.value ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
                      background: visibility === opt.value ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)',
                    }}>
                      <RadioCircle selected={visibility === opt.value} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif" }}>{opt.label}</span>
                          {opt.warning && <AlertTriangle size={12} color="#D97706" />}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Danger Zone">
                {!showDelete ? (
                  <button onClick={() => setShowDelete(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '8px 12px',
                    background: 'var(--tint-red, #FEF2F2)', border: '0.75px solid var(--sem-danger)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                    color: 'var(--sem-danger)', fontFamily: "'Inter', sans-serif",
                  }}>
                    <Trash2 size={13} /> Delete Board
                  </button>
                ) : (
                  <div style={{ padding: 10, background: 'var(--tint-red, #FEF2F2)', borderRadius: 6, border: '0.75px solid var(--sem-danger)' }}>
                    <p style={{ fontSize: 11.5, color: 'var(--sem-danger)', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>
                      Type <strong>{board.name}</strong> to confirm:
                    </p>
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder={board.name} style={{ ...inputStyle, marginBottom: 8 }} />
                    <button onClick={handleDelete}
                      disabled={deleteConfirm !== board.name || deleteBoard.isPending} style={{
                      height: 28, padding: '8px 12px', borderRadius: 6, border: 'none',
                      background: deleteConfirm === board.name ? 'var(--sem-danger)' : 'var(--divider)',
                      color: deleteConfirm === board.name ? '#FFFFFF' : 'var(--fg-4)',
                      fontSize: 11.5, fontWeight: 600, cursor: deleteConfirm === board.name ? 'pointer' : 'not-allowed',
                      fontFamily: "'Inter', sans-serif",
                    }}>{deleteBoard.isPending ? 'Deleting…' : 'Delete'}</button>
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === 'columns' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {columns.map((col) => (
                  <div key={col.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                    border: `0.75px solid ${col.statusIds.length === 0 ? 'var(--sem-warning)' : 'rgba(15,23,42,0.12)'}`,
                    borderRadius: 6, background: 'var(--bg-app)',
                    borderLeftWidth: col.statusIds.length === 0 ? 3 : 0.75,
                  }}>
                    <GripVertical size={13} color="var(--fg-3, #94A3B8)" style={{ cursor: 'grab', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--fg-1)',
                      fontFamily: "'Inter', sans-serif", flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{col.name}</span>
                    {col.isBacklog && <Badge bg="rgba(37,99,235,0.06)" color="#2563EB">Backlog</Badge>}
                    {col.isDone && <Badge bg="var(--tint-green, #F0FDF4)" color="var(--sem-success)">Done</Badge>}
                    <button onClick={() => deleteCol.mutate({ columnId: col.id, boardId: board.id })} style={{
                      width: 22, height: 22, borderRadius: 4, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Trash2 size={12} color="var(--fg-3, #94A3B8)" />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input value={newColName} onChange={e => setNewColName(e.target.value)}
                  placeholder="New column…"
                  onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleAddColumn} disabled={!newColName.trim()} style={{
                  display: 'flex', alignItems: 'center', gap: 4, height: 50, padding: '0 10px',
                  border: '0.75px dashed rgba(15,23,42,0.12)',
                  borderRadius: 6, background: 'transparent', cursor: newColName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 11.5, color: 'var(--fg-3, #94A3B8)', fontFamily: "'Inter', sans-serif",
                }}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </>
          )}

          {tab === 'swimlanes' && (
            <>
              <FieldLabel>Swimlane Type</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SWIMLANE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSwimlane(opt.value)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                    borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    border: `0.75px solid ${swimlane === opt.value ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
                    background: swimlane === opt.value ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)',
                  }}>
                    <RadioCircle selected={swimlane === opt.value} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif" }}>{opt.label}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'access' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
                Manage who has access to this board and their roles.
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '8px 12px',
                background: 'var(--cp-blue)', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
              }}>
                <Plus size={13} /> Add Member
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
          padding: '10px 16px', borderTop: '0.75px solid rgba(15,23,42,0.08)',
        }}>
          <button onClick={onClose} style={{
            height: 30, padding: '8px 12px', borderRadius: 6,
            border: '0.75px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)',
            fontSize: 11.5, fontWeight: 500, color: '#334155',
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!isDirty || updateBoard.isPending} style={{
            height: 30, padding: '0 14px', borderRadius: 6, border: 'none',
            background: isDirty ? 'var(--cp-blue)' : 'var(--divider)',
            fontSize: 11.5, fontWeight: 600,
            color: isDirty ? '#FFFFFF' : 'var(--fg-4)',
            fontFamily: "'Inter', sans-serif",
            cursor: isDirty ? 'pointer' : 'not-allowed',
          }}>{updateBoard.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 50, padding: '8px 12px', boxSizing: 'border-box',
  border: '0.75px solid rgba(15,23,42,0.12)', borderRadius: 6,
  fontSize: 13, fontFamily: "'Inter', sans-serif", color: 'var(--fg-1)',
  outline: 'none', background: 'var(--bg-app)',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 650, textTransform: 'uppercase' as const,
        letterSpacing: '0.05em', color: 'var(--fg-4)',
        fontFamily: "'Inter', sans-serif", marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

function FieldLabel({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block', fontSize: 11.5, fontWeight: 600,
      color: 'var(--fg-2)', fontFamily: "'Inter', sans-serif",
      marginBottom: 6, ...s,
    }}>{children}</label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
      border: `1.5px solid ${selected ? 'var(--cp-blue)' : 'rgba(15,23,42,0.15)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--cp-blue)' : 'var(--bg-app)',
      transition: 'all 100ms',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-app, #FFFFFF)' }} />}
    </div>
  );
}

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', height: 16, padding: '0 5px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, background: bg, color,
      fontFamily: "'Inter', sans-serif", alignItems: 'center', flexShrink: 0,
    }}>{children}</span>
  );
}
