import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateBoard } from '@/hooks/useBoardMutations';
import type { BoardVisibility, SwimlaneType } from '@/types/board';

interface Props {
  projectId: string;
  basePath?: string;
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

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string; warning?: boolean }[] = [
  { value: 'project', label: 'Project Board', desc: 'Visible to all project members' },
  { value: 'private', label: '🔒 Private', desc: 'Only you can see this board' },
  { value: 'global', label: 'Organisation-wide', desc: 'Visible to all users in the organisation. Use with caution.', warning: true },
];

export default function CreateBoardModal({ projectId, basePath, onClose }: Props) {
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
    if (result.boardId) {
      const base = basePath || `/projects/${projectId}/boards`;
      navigate(`${base}/${result.boardId}`);
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
        background: 'var(--cp-float)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
        display: 'flex', flexDirection: 'column',
        border: '0.75px solid rgba(15,23,42,0.12)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.08)',
        }}>
          <h2 style={{
            fontSize: 15, fontFamily: "'Sora', sans-serif", fontWeight: 700,
            color: 'var(--fg-1)', margin: 0,
          }}>Create Board</h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--fg-3, #94A3B8)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <FieldLabel required>Board Name</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Design Board, QA Workflow…"
            style={{
              width: '100%', height: 50, padding: '8px 12px',
              border: '0.75px solid rgba(15,23,42,0.15)', borderRadius: 6,
              fontSize: 13, fontFamily: "'Inter', sans-serif", color: 'var(--fg-1)',
              outline: 'none', background: 'var(--bg-app)', marginBottom: 20, boxSizing: 'border-box',
            }}
          />

          <FieldLabel>Column Template</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)} style={{
                padding: '10px 12px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                border: `0.75px solid ${template === t.id ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
                background: template === t.id ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)',
                transition: 'all 100ms',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>
                  {t.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {t.cols.length > 0 ? t.cols.map(c => (
                    <span key={c.name} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--bg-1)', color: 'var(--fg-3)',
                      fontFamily: "'Inter', sans-serif",
                    }}>{c.name}</span>
                  )) : (
                    <span style={{ fontSize: 10.5, color: 'var(--fg-4)', fontFamily: "'Inter', sans-serif" }}>
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
                border: `0.75px solid ${swimlane === opt.value ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
                background: swimlane === opt.value ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={swimlane === opt.value} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>
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
                outline: color === c ? '2px solid var(--cp-blue)' : 'none',
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
                border: `0.75px solid ${visibility === opt.value ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
                background: visibility === opt.value ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={visibility === opt.value} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif" }}>
                      {opt.label}
                    </span>
                    {opt.warning && (
                      <span title="Visible to all users in the organisation. Use with caution.">
                        <AlertTriangle size={13} color="#D97706" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>
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
          padding: '14px 20px', borderTop: '0.75px solid rgba(15,23,42,0.08)',
        }}>
          <button onClick={onClose} style={{
            height: 34, padding: '0 16px', borderRadius: 6,
            border: '0.75px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)',
            fontSize: 12.5, fontWeight: 500, color: 'var(--fg-2)',
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || createBoard.isPending}
            style={{
              height: 34, padding: '0 18px', borderRadius: 6, border: 'none',
              background: name.trim() ? 'var(--cp-blue)' : 'var(--divider)',
              fontSize: 12.5, fontWeight: 600,
              color: name.trim() ? '#FFFFFF' : 'var(--fg-4)',
              fontFamily: "'Inter', sans-serif",
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
      color: 'var(--fg-2)', fontFamily: "'Inter', sans-serif",
      marginBottom: 6,
    }}>
      {children}{required && <span style={{ color: 'var(--sem-danger)' }}> *</span>}
    </label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${selected ? 'var(--cp-blue)' : 'rgba(15,23,42,0.15)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--cp-blue)' : 'var(--bg-app)',
      transition: 'all 100ms',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-app, #FFFFFF)' }} />}
    </div>
  );
}
