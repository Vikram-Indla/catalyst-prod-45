import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Search, SlidersHorizontal, Plus } from '@/lib/atlaskit-icons';
import { useBoards } from '@/hooks/useBoards';
import { useDeleteBoard } from '@/hooks/useBoardMutations';
import { JiraTable } from '@/components/shared/JiraTable';
import { makeSummaryCell, makeAssigneeCell } from '@/components/shared/JiraTable/cells';
import type { Column } from '@/components/shared/JiraTable/types';
import CreateBoardModal from './CreateBoardModal';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import Spinner from '@atlaskit/spinner';
import type { BoardListItem } from '@/types/board';

type TabFilter = 'all' | 'project' | 'personal' | 'starred';

interface BoardManagerPageProps {
  projectIdOverride?: string;
  basePath?: string;
  /** Project name for the Location column — resolved by ProjectBoardManagerPage */
  projectName?: string;
  /** Project key for the Location column — resolved by ProjectBoardManagerPage */
  projectKey?: string;
}

export default function BoardManagerPage({ projectIdOverride, basePath, projectName, projectKey }: BoardManagerPageProps = {}) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdOverride || paramProjectId;
  const boardBasePath = basePath || `/projects/${projectId}/boards`;
  const navigate = useNavigate();
  const { data: boards = [], isLoading, error } = useBoards(projectId);
  const deleteBoard = useDeleteBoard();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsBoard, setSettingsBoard] = useState<BoardListItem | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    let list = boards;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q));
    }
    switch (activeTab) {
      case 'project': return list.filter(b => !b.isPersonal);
      case 'personal': return list.filter(b => b.isPersonal);
      case 'starred': return list.filter(b => b.isStarred);
      default: return list;
    }
  }, [boards, search, activeTab]);

  const tabCounts = useMemo(() => ({
    all: boards.length,
    project: boards.filter(b => !b.isPersonal).length,
    personal: boards.filter(b => b.isPersonal).length,
    starred: boards.filter(b => b.isStarred).length,
  }), [boards]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All boards' },
    { key: 'project', label: 'Project boards' },
    { key: 'personal', label: 'Personal' },
    { key: 'starred', label: 'Starred' },
  ];

  const handleDelete = useCallback((board: BoardListItem) => {
    if (!projectId) return;
    if (!window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    deleteBoard.mutate({ boardId: board.id, projectId });
  }, [deleteBoard, projectId]);

  const locationLabel = projectName
    ? `${projectName}${projectKey ? ` (${projectKey})` : ''}`
    : (projectKey ?? '—');

  const columns: Column<BoardListItem>[] = useMemo(() => [
    {
      id: 'name',
      label: 'Board name',
      flex: true,
      alwaysVisible: true,
      accessor: (b) => b.name,
      cell: makeSummaryCell((b) => b.name),
    },
    {
      id: 'lead',
      label: 'Lead',
      width: 18,
      accessor: (b) => b.leadName,
      cell: makeAssigneeCell((b) => b.leadName ? { name: b.leadName, avatarUrl: b.leadAvatarUrl } : null),
    },
    {
      id: 'location',
      label: 'Location',
      width: 22,
      accessor: () => locationLabel,
      cell: () => (
        <span style={{
          color: 'var(--ds-text-subtle, #505258)',
          fontSize: 14,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {locationLabel}
        </span>
      ),
    },
    {
      id: '__menu',
      label: '',
      width: 4,
      alwaysVisible: true,
      accessor: () => null,
      cell: ({ row }) => (
        <BoardRowMenu
          board={row}
          onEditSettings={() => setSettingsBoard(row)}
          onDelete={() => handleDelete(row)}
        />
      ),
    },
  ], [locationLabel, handleDelete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--ds-surface, #FFFFFF)' }}>
      {error && (
        <div style={{ background: 'var(--ds-background-danger-subtle, #FEF2F2)', color: 'var(--ds-text-danger, #AE2A19)', padding: '8px 24px', fontSize: 12, borderBottom: '1px solid var(--ds-border-danger, #FECACA)' }}>
          Board query error: {(error as Error).message}
        </div>
      )}
      {/* Header */}
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
            Project hub › Boards
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 4px' }}>
            Boards
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 12px' }}>
            {boards.length} board{boards.length !== 1 ? 's' : ''} in this project
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 8px',
              background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
              border: `2px solid ${searchFocused ? 'var(--ds-border-focused, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
              borderRadius: 3, width: 200, transition: 'border-color 150ms',
            }}>
              <Search size={13} color="var(--ds-text-subtlest, #6B778C)" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                placeholder="Search boards…"
                style={{
                  border: 'none', outline: 'none', background: 'transparent', flex: 1,
                  fontSize: 14, color: 'var(--ds-text, #172B4D)',
                }}
              />
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
              background: 'var(--ds-background-neutral, #F1F2F4)', border: '2px solid transparent',
              borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              color: 'var(--ds-text, #172B4D)',
            }}>
              <SlidersHorizontal size={14} /> Filter
            </button>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
              background: 'var(--ds-background-brand-bold, #0052CC)', border: '2px solid transparent',
              borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--ds-text-inverse, #FFFFFF)',
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create board
            </button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
                  borderBottom: active ? '2px solid var(--ds-link, #0052CC)' : '2px solid transparent',
                  marginBottom: 0,
                }}>
                  {tab.label}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '0 8px', borderRadius: 12,
                    background: active ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-background-neutral, #F1F2F4)',
                    color: active ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtlest, #6B778C)',
                  }}>{tabCounts[tab.key]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body — JiraTable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Spinner size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
              {search ? `No boards match "${search}"` : 'No boards yet'}
            </span>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
              background: 'var(--ds-background-brand-bold, #0052CC)', border: 'none',
              borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--ds-text-inverse, #FFFFFF)',
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create board
            </button>
          </div>
        ) : (
          <JiraTable
            rows={filtered}
            columns={columns}
            getRowId={(b) => b.id}
            onRowClick={(b) => navigate(`${boardBasePath}/${b.id}`)}
          />
        )}
      </div>

      {createOpen && (
        <CreateBoardModal projectId={projectId!} basePath={boardBasePath} onClose={() => setCreateOpen(false)} />
      )}
      {settingsBoard && (
        <BoardSettingsDrawer
          board={settingsBoard}
          projectKey={projectKey}
          onClose={() => setSettingsBoard(null)}
        />
      )}
    </div>
  );
}

// ─── Board row kebab menu ────────────────────────────────────────────────────
// Separate component so it can use top-level imports cleanly.
// CLAUDE.md 2026-05-10: uses @atlaskit/dropdown-menu, not a hand-rolled menu.
function BoardRowMenu({ board, onEditSettings, onDelete }: {
  board: BoardListItem;
  onEditSettings: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...triggerProps }) => (
        <button
          {...triggerProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          aria-label={`More actions for ${board.name}`}
          className="jira-row-menu-trigger"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, padding: 0, border: 'none', borderRadius: 3,
            background: 'transparent', color: 'var(--ds-text-subtle, #42526E)',
            cursor: 'pointer', opacity: 0, transition: 'opacity 120ms ease',
            fontSize: 18, letterSpacing: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F4F5F7)';
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          •••
        </button>
      )}
    >
      <DropdownItemGroup>
        <DropdownItem onClick={onEditSettings}>
          Edit settings
        </DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup>
        <DropdownItem onClick={onDelete}>
          <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Delete</span>
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}
