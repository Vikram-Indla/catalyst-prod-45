import React, { useState, useEffect } from 'react';
import CloseIcon from '@atlaskit/icon/core/close';
import { useNavigate } from 'react-router-dom';
import { useCreateBoard } from '@/hooks/useBoardMutations';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import { seedBoardStatusMappings } from '@/hooks/workhub/useCreateKanbanFromFilter';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  projectId: string;
  basePath?: string;
  onClose: () => void;
  onCreated?: (boardId: string) => void;
}

export default function CreateBoardModal({ projectId, basePath, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [filterId, setFilterId] = useState('');
  const [projectKey, setProjectKey] = useState<string | undefined>(undefined);

  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  // Resolve project key to populate filter list
  useEffect(() => {
    supabase
      .from('ph_projects')
      .select('key')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProjectKey(data.key ?? undefined);
      });
  }, [projectId]);

  const { data: filters = [] } = useFiltersForProject(projectKey, 'project');

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    const result = await createBoard.mutateAsync({
      name: name.trim(),
      projectId,
      boardType: 'kanban',
      filterId: filterId || undefined,
    });
    if (result.boardId && projectKey) {
      await seedBoardStatusMappings(result.boardId, projectKey, supabase);
    }
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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--ds-blanket)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 680,
          background: 'var(--ds-surface)',
          borderRadius: 8,
          boxShadow: 'var(--ds-shadow-overlay)',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--ds-border)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--ds-border)',
        }}>
          <div>
            <h2 style={{
              fontSize: 'var(--ds-font-size-700)', fontWeight: 600, margin: 0,
              color: 'var(--ds-text)',
            }}>
              Name this board
            </h2>
            <p style={{
              fontSize: 'var(--ds-font-size-300)', margin: '4px 0 0',
              color: 'var(--ds-text-subtle)',
            }}>
              Give your board a name to get started.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CloseIcon label="Close" size="small" primaryColor="var(--ds-text-subtlest)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Board name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
              color: 'var(--ds-text)', marginBottom: 4,
            }}>
              Board name <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canCreate) handleCreate();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="e.g. My Kanban board"
              style={{
                width: '100%', height: 40, padding: '0 12px',
                border: '1px solid var(--ds-border-focused)',
                borderRadius: 4, fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text)',
                background: 'var(--ds-surface)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Saved filter — optional */}
          {filters.length > 0 && (
            <div>
              <label style={{
                display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                color: 'var(--ds-text)', marginBottom: 4,
              }}>
                Saved filter <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 400, color: 'var(--ds-text-subtlest)' }}>(optional)</span>
              </label>
              <select
                value={filterId}
                onChange={e => setFilterId(e.target.value)}
                style={{
                  width: '100%', height: 40, padding: '0 12px',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4, fontSize: 'var(--ds-font-size-400)',
                  color: filterId ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
                  background: 'var(--ds-surface)',
                  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                <option value="">No filter — show all work items</option>
                {filters.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '16px 24px', borderTop: '1px solid var(--ds-border)',
        }}>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 16px', borderRadius: 3,
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-surface)',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
              color: 'var(--ds-text-subtle)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || createBoard.isPending}
            style={{
              height: 32, padding: '0 16px', borderRadius: 3, border: 'none',
              background: canCreate
                ? 'var(--ds-background-brand-bold)'
                : 'var(--ds-background-neutral)',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
              color: canCreate
                ? 'var(--ds-text-inverse)'
                : 'var(--ds-text-disabled)',
              cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
          >
            {createBoard.isPending ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </div>
    </div>
  );
}
