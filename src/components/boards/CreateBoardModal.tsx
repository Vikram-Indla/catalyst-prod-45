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
  const [projectName, setProjectName] = useState<string | undefined>(undefined);

  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  // Resolve project key + name for the Location field
  useEffect(() => {
    supabase
      .from('ph_projects')
      .select('key, name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProjectKey(data.key ?? undefined);
          setProjectName(data.name ?? undefined);
        }
      });
  }, [projectId]);

  const { data: filters = [] } = useFiltersForProject(projectKey, 'project');

  const canCreate = name.trim().length > 0 && filterId.length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    const result = await createBoard.mutateAsync({
      name: name.trim(),
      projectId,
      boardType: 'kanban',
      filterId,
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

  const locationLabel = projectName
    ? `${projectName}${projectKey ? ` (${projectKey})` : ''}`
    : (projectKey ?? '—');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--ds-blanket, rgba(9,30,66,0.54))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 680,
          background: 'var(--ds-surface, #FFFFFF)',
          borderRadius: 8,
          boxShadow: 'var(--ds-shadow-overlay, 0 8px 32px rgba(9,30,66,0.25))',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--ds-border, #DFE1E6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        }}>
          <div>
            <h2 style={{
              fontSize: 'var(--ds-font-size-700)', fontWeight: 600, margin: 0,
              color: 'var(--ds-text, #172B4D)',
            }}>
              Name this board
            </h2>
            <p style={{
              fontSize: 'var(--ds-font-size-300)', margin: '4px 0 0',
              color: 'var(--ds-text-subtle, #42526E)',
            }}>
              Required fields are marked with an asterisk *
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
            <CloseIcon label="Close" size="small" primaryColor="var(--ds-text-subtlest, #6B778C)" />
          </button>
        </div>

        {/* Body — 2-column layout */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0,
          padding: '24px',
        }}>
          {/* Left column — form fields */}
          <div style={{ paddingRight: 24 }}>
            {/* Board name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                color: 'var(--ds-text, #172B4D)', marginBottom: 4,
              }}>
                Board name <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
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
                  border: '2px solid var(--ds-border-focused, #4C9AFF)',
                  borderRadius: 4, fontSize: 'var(--ds-font-size-400)',
                  color: 'var(--ds-text, #172B4D)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Saved filter */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                color: 'var(--ds-text, #172B4D)', marginBottom: 4,
              }}>
                Saved filter <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
              </label>
              <select
                value={filterId}
                onChange={e => setFilterId(e.target.value)}
                style={{
                  width: '100%', height: 40, padding: '0 12px',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: 4, fontSize: 'var(--ds-font-size-400)',
                  color: filterId ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtlest, #6B778C)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                <option value="" disabled>Select a saved filter…</option>
                {filters.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {filters.length === 0 && projectKey && (
                <p style={{
                  fontSize: 'var(--ds-font-size-100)', marginTop: 4,
                  color: 'var(--ds-text-subtlest, #6B778C)',
                }}>
                  No saved filters found for this project.
                </p>
              )}
            </div>

            {/* Location — read-only */}
            <div style={{ marginBottom: 0 }}>
              <label style={{
                display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                color: 'var(--ds-text, #172B4D)', marginBottom: 4,
              }}>
                Location
              </label>
              <div style={{
                height: 40, padding: '0 12px',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4, fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text-subtle, #42526E)',
                background: 'var(--ds-surface-sunken, #F7F8F9)',
                display: 'flex', alignItems: 'center',
                boxSizing: 'border-box',
              }}>
                {locationLabel}
              </div>
              <p style={{
                fontSize: 'var(--ds-font-size-100)', marginTop: 4,
                color: 'var(--ds-text-subtlest, #6B778C)',
              }}>
                This board will be added to the current project.
              </p>
            </div>
          </div>

          {/* Right column — info panel */}
          <div style={{
            borderLeft: '1px solid var(--ds-border, #DFE1E6)',
            paddingLeft: 24,
          }}>
            <h3 style={{
              fontSize: 'var(--ds-font-size-300)', fontWeight: 600, margin: '0 0 8px',
              color: 'var(--ds-text, #172B4D)',
            }}>
              Saved filters
            </h3>
            <p style={{
              fontSize: 'var(--ds-font-size-300)', margin: '0 0 12px',
              color: 'var(--ds-text-subtle, #42526E)',
              lineHeight: 1.5,
            }}>
              Choose from a list of saved filters that define which issues appear on the board.
            </p>
            <p style={{
              fontSize: 'var(--ds-font-size-300)', margin: 0,
              color: 'var(--ds-text-subtle, #42526E)',
              lineHeight: 1.5,
            }}>
              You can create and manage saved filters from the{' '}
              <span style={{ color: 'var(--ds-link, #0052CC)' }}>Filters</span> section of your project.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '16px 24px', borderTop: '1px solid var(--ds-border, #DFE1E6)',
        }}>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 16px', borderRadius: 3,
              border: '1px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface, #FFFFFF)',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
              color: 'var(--ds-text-subtle, #42526E)',
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
                ? 'var(--ds-background-brand-bold, #0052CC)'
                : 'var(--ds-background-neutral, #F1F2F4)',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
              color: canCreate
                ? 'var(--ds-text-inverse, #FFFFFF)'
                : 'var(--ds-text-disabled, #97A0AF)',
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
