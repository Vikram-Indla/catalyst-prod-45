import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateBoard } from '@/hooks/useBoardMutations';
import type { BoardVisibility, SwimlaneType } from '@/types/board';

interface Props {
  projectId: string;
  onClose: () => void;
}

const TEMPLATES = [
  { id: 'standard', name: 'Standard 3', cols: [{ name: 'To Do', isBacklog: true }, { name: 'In Progress' }, { name: 'Done', isDone: true }] },
  { id: 'extended', name: 'Extended 4', cols: [{ name: 'To Do', isBacklog: true }, { name: 'In Progress' }, { name: 'In Review' }, { name: 'Done', isDone: true }] },
  { id: 'qa', name: 'QA Workflow 5', cols: [{ name: 'Backlog', isBacklog: true }, { name: 'In Dev' }, { name: 'Testing' }, { name: 'Passed' }, { name: 'Done', isDone: true }] },
  { id: 'custom', name: 'Custom', cols: [] },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string; desc: string }[] = [
  { value: 'none', label: 'No Swimlanes', desc: 'All issues in a single flat list' },
  { value: 'release', label: 'Group by Release', desc: 'One swimlane per release / fix version' },
  { value: 'assignee', label: 'Group by Assignee', desc: 'One swimlane per team member' },
  { value: 'epic', label: 'Group by Epic', desc: 'One swimlane per parent epic' },
];

const COLOR_SWATCHES = [
  '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706', '#0D9488', '#525252', '#0284C7',
];

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string }[] = [
  { value: 'project', label: 'Project Board', desc: 'Visible to all project members' },
  { value: 'private', label: '🔒 Private', desc: 'Only you can see this board' },
  { value: 'global', label: 'Organisation-wide', desc: 'Visible to all organisation members' },
];

export default function CreateBoardModal({ projectId, onClose }: Props) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('standard');
  const [swimlane, setSwimlane] = useState<SwimlaneType>('none');
  const [color, setColor] = useState('#2563EB');
  const [visibility, setVisibility] = useState<BoardVisibility>('project');
  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const tmpl = TEMPLATES.find(t => t.id === template);
    const result = await createBoard.mutateAsync({
      name: name.trim(),
      projectId,
      visibility,
      swimlaneType: swimlane,
      color,
      columns: tmpl?.cols.length ? tmpl.cols.map(c => ({
        name: c.name, isBacklog: c.isBacklog ?? false, isDone: c.isDone ?? false,
      })) : undefined,
    });
    onClose();
    // Navigate to the newly created board
    if (result.boardId) {
      navigate(`/projects/${projectId}/boards/${result.boardId}`);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 640, maxHeight: '90vh',
        background: '#FFFFFF', borderRadius: 10,
        boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '0.75px solid var(--cp-border-subtle)',
        }}>
          <h2 style={{
            fontSize: 15, fontFamily: 'var(--cp-font-heading)', fontWeight: 700,
            color: 'var(--cp-text-primary)', margin: 0,
          }}>Create Board</h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--cp-text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <FieldLabel required>Board Name</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Design Board, QA Workflow…"
            style={{
              width: '100%', height: 36, padding: '0 12px',
              border: '0.75px solid var(--cp-border-default)', borderRadius: 6,
              fontSize: 13, fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)',
              outline: 'none', background: '#FFFFFF', marginBottom: 20, boxSizing: 'border-box',
            }}
          />

          <FieldLabel>Column Template</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)} style={{
                padding: '10px 12px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                border: `0.75px solid ${template === t.id ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                background: template === t.id ? 'var(--cp-primary-5)' : '#FFFFFF',
                transition: 'all 100ms',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)', marginBottom: 6 }}>
                  {t.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {t.cols.length > 0 ? t.cols.map(c => (
                    <span key={c.name} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--cp-bg-sunken)', color: 'var(--cp-text-tertiary)',
                      fontFamily: 'var(--cp-font-body)',
                    }}>{c.name}</span>
                  )) : (
                    <span style={{ fontSize: 10.5, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-body)' }}>
                      Start from scratch
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <FieldLabel>Swimlane Grouping</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {SWIMLANE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSwimlane(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                border: `0.75px solid ${swimlane === opt.value ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                background: swimlane === opt.value ? 'var(--cp-primary-5)' : '#FFFFFF',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={swimlane === opt.value} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)', marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <FieldLabel>Board Color</FieldLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {COLOR_SWATCHES.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: c, cursor: 'pointer',
                outline: color === c ? '2px solid var(--cp-primary-60)' : 'none',
                outlineOffset: color === c ? 2 : 0,
                transition: 'outline 100ms',
              }} />
            ))}
          </div>

          <FieldLabel>Visibility</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                border: `0.75px solid ${visibility === opt.value ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                background: visibility === opt.value ? 'var(--cp-primary-5)' : '#FFFFFF',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={visibility === opt.value} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)', marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '14px 20px', borderTop: '0.75px solid var(--cp-border-subtle)',
        }}>
          <button onClick={onClose} style={{
            height: 34, padding: '0 16px', borderRadius: 6,
            border: '0.75px solid var(--cp-border-default)', background: '#FFFFFF',
            fontSize: 12.5, fontWeight: 500, color: 'var(--cp-text-secondary)',
            fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || createBoard.isPending}
            style={{
              height: 34, padding: '0 18px', borderRadius: 6, border: 'none',
              background: name.trim() ? 'linear-gradient(135deg, var(--cp-primary-60), var(--cp-primary-70))' : 'var(--cp-bg-sunken)',
              fontSize: 12.5, fontWeight: 600,
              color: name.trim() ? '#FFFFFF' : 'var(--cp-text-muted)',
              fontFamily: 'var(--cp-font-body)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}>
            {createBoard.isPending ? 'Creating…' : 'Create Board'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--cp-text-secondary)', fontFamily: 'var(--cp-font-body)',
      marginBottom: 6,
    }}>
      {children}{required && <span style={{ color: 'var(--cp-danger-60)' }}> *</span>}
    </label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${selected ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--cp-primary-60)' : '#FFFFFF',
      transition: 'all 100ms',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }} />}
    </div>
  );
}
