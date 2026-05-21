import React, { useState, useEffect, useCallback } from 'react';
import CloseIcon from '@atlaskit/icon/core/close';
import WarningIcon from '@atlaskit/icon/core/warning';
import { useNavigate } from 'react-router-dom';
import { useCreateBoard } from '@/hooks/useBoardMutations';
import { supabase } from '@/integrations/supabase/client';
import type { BoardVisibility, SwimlaneType } from '@/types/board';

interface Props {
  projectId: string;
  basePath?: string;
  onClose: () => void;
  onCreated?: (boardId: string) => void;
}

const TEMPLATES = [
  { id: 'standard', name: 'Standard 3', cols: [{ name: 'To Do', isBacklog: true }, { name: 'In Progress' }, { name: 'Done', isDone: true }] },
  { id: 'extended', name: 'Extended 4', cols: [{ name: 'To Do', isBacklog: true }, { name: 'In Progress' }, { name: 'In Review' }, { name: 'Done', isDone: true }] },
  { id: 'qa', name: 'QA Workflow 5', cols: [{ name: 'Backlog', isBacklog: true }, { name: 'In Dev' }, { name: 'Testing' }, { name: 'Passed' }, { name: 'Done', isDone: true }] },
  { id: 'custom', name: 'Custom', cols: [] },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string; desc: string }[] = [
  { value: 'none', label: 'No swimlanes', desc: 'All issues in a single flat list' },
  { value: 'release', label: 'Group by release', desc: 'One swimlane per release / fix version' },
  { value: 'assignee', label: 'Group by assignee', desc: 'One swimlane per team member' },
  { value: 'epic', label: 'Group by epic', desc: 'One swimlane per parent epic' },
];

const COLOR_SWATCHES = [
  'var(--ds-text-brand, #2563EB)',
  'var(--ds-text-success, #16A34A)',
  'var(--cp-purple-60, #7C3AED)',
  'var(--ds-text-danger, #DC2626)',
  'var(--ds-text-warning, #D97706)',
  'var(--cp-teal-60, #0D9488)',
  'var(--ds-icon, #525252)',
  'var(--ds-background-information-bold, #0284C7)',
];

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string; warning?: boolean }[] = [
  { value: 'project', label: 'Project board', desc: 'Visible to all project members' },
  { value: 'private', label: 'Private', desc: 'Only you can see this board' },
  { value: 'global', label: 'Organisation-wide', desc: 'Visible to all users in the organisation. Use with caution.', warning: true },
];

// Default JQL per board type — filled with project key once known
function defaultQuery(type: 'kanban' | 'scrum', projectKey?: string): string {
  const proj = projectKey ? `project = ${projectKey}` : 'project = PROJECT';
  return type === 'scrum'
    ? `${proj} AND sprint in openSprints() ORDER BY Rank ASC`
    : `${proj} ORDER BY Rank ASC`;
}

const QUERY_PRESETS = [
  { label: 'All issues', fn: (key?: string) => key ? `project = ${key} ORDER BY Rank ASC` : 'project = PROJECT ORDER BY Rank ASC' },
  { label: 'Open sprints', fn: (key?: string) => key ? `project = ${key} AND sprint in openSprints() ORDER BY Rank ASC` : 'project = PROJECT AND sprint in openSprints() ORDER BY Rank ASC' },
  { label: 'My issues', fn: (key?: string) => key ? `project = ${key} AND assignee = currentUser() ORDER BY Rank ASC` : 'project = PROJECT AND assignee = currentUser() ORDER BY Rank ASC' },
  { label: 'Bugs only', fn: (key?: string) => key ? `project = ${key} AND issuetype = "QA Bug" ORDER BY priority DESC` : 'project = PROJECT AND issuetype = "QA Bug" ORDER BY priority DESC' },
];

export default function CreateBoardModal({ projectId, basePath, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [boardType, setBoardType] = useState<'kanban' | 'scrum'>('kanban');
  const [template, setTemplate] = useState('standard');
  const [swimlane, setSwimlane] = useState<SwimlaneType>('none');
  const [color, setColor] = useState('var(--ds-text-brand, #2563EB)');
  const [visibility, setVisibility] = useState<BoardVisibility>('project');
  const [boardQuery, setBoardQuery] = useState('');
  const [queryMatchCount, setQueryMatchCount] = useState<number | null>(null);
  const [queryChecking, setQueryChecking] = useState(false);
  const [projectKey, setProjectKey] = useState<string | undefined>(undefined);

  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  // Resolve project key for JQL default
  useEffect(() => {
    supabase.from('ph_projects').select('key').eq('id', projectId).maybeSingle()
      .then(({ data }) => {
        const k = data?.key ?? undefined;
        setProjectKey(k);
        setBoardQuery(defaultQuery(boardType, k));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // When board type changes, update default query only if user hasn't edited it
  useEffect(() => {
    setBoardQuery(prev => {
      const kanbanDefault = defaultQuery('kanban', projectKey);
      const scrumDefault = defaultQuery('scrum', projectKey);
      if (prev === kanbanDefault || prev === scrumDefault || prev === '') {
        return defaultQuery(boardType, projectKey);
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardType]);

  // Debounced issue-count preview (just counts ph_issues for the project; full JQL not available client-side)
  const previewCount = useCallback(async () => {
    setQueryChecking(true);
    try {
      const { count } = await supabase
        .from('ph_issues')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      setQueryMatchCount(count ?? 0);
    } catch {
      setQueryMatchCount(null);
    } finally {
      setQueryChecking(false);
    }
  }, [projectId]);

  useEffect(() => {
    const t = setTimeout(previewCount, 600);
    return () => clearTimeout(t);
  }, [boardQuery, previewCount]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const tmpl = TEMPLATES.find(t => t.id === template);
    const result = await createBoard.mutateAsync({
      name: name.trim(),
      projectId,
      visibility,
      boardType,
      swimlaneType: swimlane,
      color,
      boardQuery: boardQuery.trim() || undefined,
      columns: tmpl?.cols.length ? tmpl.cols.map(c => ({
        name: c.name, isBacklog: (c as any).isBacklog ?? false, isDone: (c as any).isDone ?? false,
      })) : undefined,
    });
    onClose();
    if (result.boardId) {
      if (onCreated) {
        onCreated(result.boardId);
      } else {
        const base = basePath || `/projects/${projectId}/boards`;
        navigate(`${base}/${result.boardId}`);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--ds-blanket, rgba(9,30,66,0.54))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 640, maxHeight: '92vh',
        background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 32px rgba(9,30,66,0.25))',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--ds-border, #DFE1E6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 600,
            color: 'var(--ds-text, #172B4D)', margin: 0,
            fontFamily: 'var(--cp-font-heading)',
          }}>Create board</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CloseIcon label="Close" size="small" primaryColor="var(--ds-text-subtlest, #6B778C)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Board name */}
          <FieldLabel required>Board name</FieldLabel>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleCreate(); if (e.key === 'Escape') onClose(); }}
            placeholder="e.g. Design board, QA workflow, Release 2.2…"
            style={{
              width: '100%', height: 40, padding: '0 12px',
              border: '2px solid var(--ds-border-focused, #4C9AFF)',
              borderRadius: 4, fontSize: 14,
              color: 'var(--ds-text, #172B4D)',
              background: 'var(--ds-surface, #FFFFFF)',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--cp-font-body)', marginBottom: 16,
            }}
          />

          {/* Board type */}
          <FieldLabel>Board type</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {(['kanban', 'scrum'] as const).map(type => (
              <button key={type} onClick={() => setBoardType(type)} style={{
                padding: '12px 16px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${boardType === type ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-border, #DFE1E6)'}`,
                background: boardType === type ? 'var(--ds-background-selected, #DEEBFF)' : 'var(--ds-surface, #FFFFFF)',
                transition: 'all 100ms',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
                  {type === 'kanban' ? 'Kanban' : 'Scrum'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)' }}>
                  {type === 'kanban'
                    ? 'Continuous flow — issues move through statuses'
                    : 'Sprint-based — backlog feeds into sprints'}
                </div>
              </button>
            ))}
          </div>

          {/* Board query */}
          <FieldLabel>Board query (JQL)</FieldLabel>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 8 }}>
            Issues matching this query will appear on the board.
          </div>
          <textarea
            value={boardQuery}
            onChange={e => setBoardQuery(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '8px 12px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4, fontSize: 13,
              color: 'var(--ds-text, #172B4D)',
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              outline: 'none', boxSizing: 'border-box', resize: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              {queryChecking
                ? 'Checking…'
                : queryMatchCount !== null
                  ? `✓ ${queryMatchCount} matching issues`
                  : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {QUERY_PRESETS.map(p => (
                <button key={p.label} onClick={() => setBoardQuery(p.fn(projectKey))} style={{
                  fontSize: 11, padding: '4px 8px', borderRadius: 10,
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  color: 'var(--ds-link, #0052CC)',
                  cursor: 'pointer',
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column template */}
          <FieldLabel>Column template</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)} style={{
                padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${template === t.id ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-border, #DFE1E6)'}`,
                background: template === t.id ? 'var(--ds-background-selected, #DEEBFF)' : 'var(--ds-surface, #FFFFFF)',
                transition: 'all 100ms',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {t.cols.length > 0 ? t.cols.map(c => (
                    <span key={c.name} style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 3,
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      color: 'var(--ds-text-subtle, #42526E)',
                    }}>{c.name}</span>
                  )) : (
                    <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                      Start from scratch
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Swimlane grouping */}
          <FieldLabel>Swimlane grouping</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {SWIMLANE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSwimlane(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${swimlane === opt.value ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-border, #DFE1E6)'}`,
                background: swimlane === opt.value ? 'var(--ds-background-selected, #DEEBFF)' : 'var(--ds-surface, #FFFFFF)',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={swimlane === opt.value} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)', marginTop: 0 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Board color */}
          <FieldLabel>Board color</FieldLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {COLOR_SWATCHES.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: c, cursor: 'pointer',
                outline: color === c ? '2px solid var(--ds-border-focused, #4C9AFF)' : 'none',
                outlineOffset: color === c ? 2 : 0,
                transition: 'outline 100ms',
              }} />
            ))}
          </div>

          {/* Visibility */}
          <FieldLabel>Visibility</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${visibility === opt.value ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-border, #DFE1E6)'}`,
                background: visibility === opt.value ? 'var(--ds-background-selected, #DEEBFF)' : 'var(--ds-surface, #FFFFFF)',
                transition: 'all 100ms',
              }}>
                <RadioCircle selected={visibility === opt.value} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                      {opt.value === 'private' ? '🔒 ' : ''}{opt.label}
                    </span>
                    {opt.warning && (
                      <span title="Visible to all users in the organisation. Use with caution.">
                        <WarningIcon label="Warning" size="small" primaryColor="var(--ds-text-warning, #D97706)" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)', marginTop: 0 }}>
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
          padding: '16px 24px', borderTop: '1px solid var(--ds-border, #DFE1E6)',
        }}>
          <button onClick={onClose} style={{
            height: 32, padding: '0 16px', borderRadius: 3,
            border: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface, #FFFFFF)',
            fontSize: 14, fontWeight: 500,
            color: 'var(--ds-text-subtle, #42526E)',
            cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || createBoard.isPending}
            style={{
              height: 32, padding: '0 16px', borderRadius: 3, border: 'none',
              background: name.trim() ? 'var(--ds-background-brand-bold, #0052CC)' : 'var(--ds-background-neutral, #F1F2F4)',
              fontSize: 14, fontWeight: 500,
              color: name.trim() ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--ds-text-disabled, #97A0AF)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}>
            {createBoard.isPending ? 'Creating…' : 'Create board'}
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
      color: 'var(--ds-text, #172B4D)',
      marginBottom: 4,
    }}>
      {children}{required && <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}> *</span>}
    </label>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${selected ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-border, #DFE1E6)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--ds-border-focused, #4C9AFF)' : 'var(--ds-surface, #FFFFFF)',
      transition: 'all 100ms',
    }}>
      {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-surface, #FFFFFF)' }} />}
    </div>
  );
}
