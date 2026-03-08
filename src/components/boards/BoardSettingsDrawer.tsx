import React, { useState, useEffect } from 'react';
import { X, GripVertical, Trash2, Plus } from 'lucide-react';
import type { BoardListItem, BoardVisibility, SwimlaneType } from '@/types/board';
import { useBoard } from '@/hooks/useBoard';

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

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string }[] = [
  { value: 'project', label: 'Project Board', desc: 'Visible to all project members' },
  { value: 'private', label: '🔒 Private', desc: 'Only you can see this board' },
  { value: 'global', label: 'Organisation-wide', desc: 'Visible to all organisation members' },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string; desc: string }[] = [
  { value: 'none', label: 'No Swimlanes', desc: 'All issues in a single flat list' },
  { value: 'release', label: 'Group by Release', desc: 'One swimlane per release / fix version' },
  { value: 'assignee', label: 'Group by Assignee', desc: 'One swimlane per team member' },
  { value: 'epic', label: 'Group by Epic', desc: 'One swimlane per parent epic' },
];

export default function BoardSettingsDrawer({ board, onClose }: Props) {
  const [tab, setTab] = useState<SettingsTab>('general');
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? '');
  const [color, setColor] = useState(board.color);
  const [visibility, setVisibility] = useState<BoardVisibility>(board.visibility);
  const [swimlane, setSwimlane] = useState<SwimlaneType>(board.swimlaneType);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const { data: boardData } = useBoard(board.id);

  const isDirty = name !== board.name || description !== (board.description ?? '') ||
    color !== board.color || visibility !== board.visibility || swimlane !== board.swimlaneType;

  const columns = boardData?.columns ?? [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.30)',
      display: 'flex', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, height: '100%', background: '#FFFFFF',
        borderLeft: '0.75px solid var(--cp-border-subtle)',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '0.75px solid var(--cp-border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{
              fontSize: 14, fontFamily: 'var(--cp-font-heading)', fontWeight: 700,
              color: 'var(--cp-text-primary)', margin: 0,
            }}>Board Settings — {board.name}</h2>
            {isDirty && (
              <span style={{ fontSize: 11.5, color: 'var(--cp-warning-60)', fontFamily: 'var(--cp-font-body)' }}>
                • Unsaved changes
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--cp-text-muted)" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.75px solid var(--cp-border-subtle)', padding: '0 20px' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 600 : 500,
                color: active ? 'var(--cp-primary-60)' : 'var(--cp-text-tertiary)',
                fontFamily: 'var(--cp-font-body)',
                borderBottom: active ? '2px solid var(--cp-primary-60)' : '2px solid transparent',
                marginBottom: -1,
              }}>{t.label}</button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'general' && (
            <>
              <Section label="Board Identity">
                <FieldLabel>Board Name</FieldLabel>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />

                <FieldLabel style={{ marginTop: 12 }}>Description</FieldLabel>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />

                <FieldLabel style={{ marginTop: 12 }}>Board Color</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{
                      width: 28, height: 28, borderRadius: 6, border: 'none',
                      background: c, cursor: 'pointer',
                      outline: color === c ? '2px solid var(--cp-primary-60)' : 'none',
                      outlineOffset: color === c ? 2 : 0,
                    }} />
                  ))}
                </div>
              </Section>

              <Section label="Visibility">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {VISIBILITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setVisibility(opt.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      border: `0.75px solid ${visibility === opt.value ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                      background: visibility === opt.value ? 'var(--cp-primary-5)' : '#FFFFFF',
                    }}>
                      <RadioCircle selected={visibility === opt.value} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)', marginTop: 1 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Danger Zone">
                {!showDelete ? (
                  <button onClick={() => setShowDelete(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
                    background: 'var(--cp-danger-5)', border: '0.75px solid var(--cp-danger-60)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    color: 'var(--cp-danger-60)', fontFamily: 'var(--cp-font-body)',
                  }}>
                    <Trash2 size={13} /> Delete this Board
                  </button>
                ) : (
                  <div style={{ padding: 12, background: 'var(--cp-danger-5)', borderRadius: 6, border: '0.75px solid var(--cp-danger-60)' }}>
                    <p style={{ fontSize: 12, color: 'var(--cp-danger-60)', margin: '0 0 8px', fontFamily: 'var(--cp-font-body)' }}>
                      Type <strong>{board.name}</strong> to confirm deletion:
                    </p>
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder={board.name} style={{ ...inputStyle, marginBottom: 8 }} />
                    <button disabled={deleteConfirm !== board.name} style={{
                      height: 30, padding: '0 14px', borderRadius: 5, border: 'none',
                      background: deleteConfirm === board.name ? 'var(--cp-danger-60)' : 'var(--cp-bg-sunken)',
                      color: deleteConfirm === board.name ? '#FFFFFF' : 'var(--cp-text-muted)',
                      fontSize: 12, fontWeight: 600, cursor: deleteConfirm === board.name ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--cp-font-body)',
                    }}>Permanently Delete</button>
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === 'columns' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {columns.map((col, i) => (
                  <div key={col.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    border: `0.75px solid ${col.statusIds.length === 0 ? 'var(--cp-warning-60)' : 'var(--cp-border-default)'}`,
                    borderRadius: 6, background: '#FFFFFF',
                    borderLeftWidth: col.statusIds.length === 0 ? 3 : 0.75,
                  }}>
                    <GripVertical size={14} color="var(--cp-text-muted)" style={{ cursor: 'grab', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--cp-text-primary)',
                      fontFamily: 'var(--cp-font-body)', flex: 1,
                    }}>{col.name}</span>
                    {col.isBacklog && <Badge bg="var(--cp-primary-5)" color="var(--cp-primary-60)">Backlog</Badge>}
                    {col.isDone && <Badge bg="var(--cp-success-5)" color="var(--cp-success-60)">Done</Badge>}
                    {col.statusIds.length === 0 && (
                      <span style={{ fontSize: 10, color: 'var(--cp-warning-60)', fontFamily: 'var(--cp-font-body)' }}>No statuses mapped</span>
                    )}
                  </div>
                ))}
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 5, width: '100%', marginTop: 8,
                padding: '10px 12px', border: '1.5px dashed var(--cp-border-default)',
                borderRadius: 6, background: 'transparent', cursor: 'pointer',
                fontSize: 12, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-body)',
              }}>
                <Plus size={14} /> Add Column
              </button>
            </>
          )}

          {tab === 'swimlanes' && (
            <>
              <FieldLabel>Swimlane Type</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SWIMLANE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSwimlane(opt.value)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    border: `0.75px solid ${swimlane === opt.value ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                    background: swimlane === opt.value ? 'var(--cp-primary-5)' : '#FFFFFF',
                  }}>
                    <RadioCircle selected={swimlane === opt.value} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'access' && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)', marginBottom: 12 }}>
                Manage who has access to this board and their roles.
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px',
                background: 'var(--cp-primary-60)', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#FFFFFF',
                fontFamily: 'var(--cp-font-body)',
              }}>
                <Plus size={14} /> Add Member
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: '0.75px solid var(--cp-border-subtle)',
        }}>
          <button onClick={onClose} style={{
            height: 34, padding: '0 16px', borderRadius: 6,
            border: '0.75px solid var(--cp-border-default)', background: '#FFFFFF',
            fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-secondary)',
            fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
          }}>Cancel</button>
          <button disabled={!isDirty} style={{
            height: 34, padding: '0 18px', borderRadius: 6, border: 'none',
            background: isDirty ? 'linear-gradient(135deg, var(--cp-primary-60), var(--cp-primary-70))' : 'var(--cp-bg-sunken)',
            fontSize: 12.5, fontWeight: 600,
            color: isDirty ? '#FFFFFF' : 'var(--cp-text-muted)',
            fontFamily: 'var(--cp-font-body)',
            cursor: isDirty ? 'pointer' : 'not-allowed',
          }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 12px', boxSizing: 'border-box',
  border: '0.75px solid var(--cp-border-default)', borderRadius: 6,
  fontSize: 13, fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)',
  outline: 'none', background: '#FFFFFF',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11.5, fontWeight: 650, textTransform: 'uppercase' as const,
        letterSpacing: '0.05em', color: 'var(--cp-text-muted)',
        fontFamily: 'var(--cp-font-body)', marginBottom: 10,
      }}>{label}</div>
      {children}
    </div>
  );
}

function FieldLabel({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--cp-text-secondary)', fontFamily: 'var(--cp-font-body)',
      marginBottom: 6, ...s,
    }}>{children}</label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${selected ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--cp-primary-60)' : '#FFFFFF',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }} />}
    </div>
  );
}

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
      background: bg, color, fontFamily: 'var(--cp-font-body)',
    }}>{children}</span>
  );
}
