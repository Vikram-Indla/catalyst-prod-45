import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import BoardCard from './BoardCard';
import CreateBoardModal from './CreateBoardModal';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import type { BoardListItem } from '@/types/board';

type TabFilter = 'all' | 'project' | 'personal' | 'starred';

interface BoardManagerPageProps {
  projectIdOverride?: string;
  basePath?: string;
}

export default function BoardManagerPage({ projectIdOverride, basePath }: BoardManagerPageProps = {}) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdOverride || paramProjectId;
  const boardBasePath = basePath || `/projects/${projectId}/boards`;
  const navigate = useNavigate();
  const { data: boards = [], isLoading, error } = useBoards(projectId);
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

  const starred = filtered.filter(b => b.isStarred);
  const projectBoards = filtered.filter(b => !b.isPersonal && !b.isStarred);
  const personalBoards = filtered.filter(b => b.isPersonal && !b.isStarred);

  const tabCounts = useMemo(() => ({
    all: boards.length,
    project: boards.filter(b => !b.isPersonal).length,
    personal: boards.filter(b => b.isPersonal).length,
    starred: boards.filter(b => b.isStarred).length,
  }), [boards]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All Boards' },
    { key: 'project', label: 'Project Boards' },
    { key: 'personal', label: 'Personal' },
    { key: 'starred', label: 'Starred' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
      {error && (
        <div style={{ background: '#FEF2F2', color: 'var(--sem-danger)', padding: '8px 24px', fontSize: 12, fontFamily: "'Inter', sans-serif", borderBottom: '1px solid #FECACA' }}>
          ⚠ Board query error: {(error as Error).message} | projectId: {projectId}
        </div>
      )}
      {/* Header */}
      <div style={{ background: 'var(--bg-app)', borderBottom: '0.75px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", color: 'var(--fg-3)', marginBottom: 6 }}>
            ProjectHub › Boards
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div>
              <h1 style={{ fontSize: 17, fontFamily: "'Sora', sans-serif", fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.4px', margin: 0 }}>Boards</h1>
              <p style={{ fontSize: 12.5, color: 'var(--fg-3)', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
                {boards.length} board{boards.length !== 1 ? 's' : ''} in this project
              </p>
              <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
                Debug: projectId = {projectId}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 12px' }}>
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px',
              background: 'var(--bg-1)', border: `0.75px solid ${searchFocused ? 'var(--cp-blue)' : 'rgba(15,23,42,0.06)'}`,
              borderRadius: 4, width: 200,
              boxShadow: searchFocused ? '0 0 0 2px rgba(37,99,235,0.10)' : 'none',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}>
              <Search size={13} color="#94A3B8" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search boards…"
                style={{
                  border: 'none', outline: 'none', background: 'transparent', flex: 1,
                  fontSize: 12.5, fontFamily: "'Inter', sans-serif", color: 'var(--fg-1)',
                  appearance: 'none' as any,
                }}
              />
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '8px 12px',
              background: 'transparent', border: '0.75px solid rgba(15,23,42,0.12)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
              color: 'var(--fg-2)', fontFamily: "'Inter', sans-serif",
            }}>
              <SlidersHorizontal size={14} /> Filter
            </button>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 14px',
              background: 'var(--cp-blue)', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create Board
            </button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderTop: '0.75px solid rgba(15,23,42,0.08)' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--cp-blue)' : 'var(--fg-3)',
                  fontFamily: "'Inter', sans-serif",
                  borderBottom: active ? '2px solid var(--cp-blue)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                  {tab.label}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 12,
                    background: active ? 'rgba(37,99,235,0.08)' : 'var(--bg-1)',
                    color: active ? 'var(--cp-blue)' : 'var(--fg-4)',
                  }}>{tabCounts[tab.key]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cp-blue)' }} />
          </div>
        ) : (
          <>
            {starred.length > 0 && (
              <>
                <SectionLabel label="⭐ Starred" />
                <BoardGrid>
                  {starred.map(b => (
                    <BoardCard key={b.id} board={b} projectId={projectId!}
                      onOpen={() => navigate(`${boardBasePath}/${b.id}`)}
                      onSettings={() => setSettingsBoard(b)} />
                  ))}
                </BoardGrid>
              </>
            )}

            {projectBoards.length > 0 && (
              <>
                <SectionLabel label="Project Boards" />
                <BoardGrid>
                  {projectBoards.map(b => (
                    <BoardCard key={b.id} board={b} projectId={projectId!}
                      onOpen={() => navigate(`${boardBasePath}/${b.id}`)}
                      onSettings={() => setSettingsBoard(b)} />
                  ))}
                </BoardGrid>
              </>
            )}

            {personalBoards.length > 0 && (
              <>
                <SectionLabel label="Personal Boards" />
                <BoardGrid>
                  {personalBoards.map(b => (
                    <BoardCard key={b.id} board={b} projectId={projectId!}
                      onOpen={() => navigate(`${boardBasePath}/${b.id}`)}
                      onSettings={() => setSettingsBoard(b)} />
                  ))}
                </BoardGrid>
              </>
            )}

            {filtered.length === 0 && (
              <BoardGrid>
                <NewBoardCard onClick={() => setCreateOpen(true)} />
              </BoardGrid>
            )}
            {filtered.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <BoardGrid>
                  <NewBoardCard onClick={() => setCreateOpen(true)} />
                </BoardGrid>
              </div>
            )}
          </>
        )}
      </div>

      {createOpen && (
        <CreateBoardModal projectId={projectId!} basePath={boardBasePath} onClose={() => setCreateOpen(false)} />
      )}
      {settingsBoard && (
        <BoardSettingsDrawer board={settingsBoard} onClose={() => setSettingsBoard(null)} />
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
      <span style={{
        fontSize: 11.5, fontWeight: 650, textTransform: 'uppercase' as const,
        letterSpacing: '0.05em', color: 'var(--fg-4)',
        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
      }}>{label}</span>
      <span style={{ flex: 1, height: 0.75, background: 'rgba(15,23,42,0.08)' }} />
    </div>
  );
}

function BoardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {children}
    </div>
  );
}

function NewBoardCard({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 160, padding: 20,
        border: `0.75px dashed ${hover ? 'var(--cp-blue)' : 'rgba(15,23,42,0.12)'}`,
        borderRadius: 8, cursor: 'pointer',
        background: hover ? 'var(--cp-blue-wash)' : 'transparent',
        transition: 'all 150ms',
      }}
    >
      <Plus size={28} color={hover ? '#2563EB' : '#94A3B8'} strokeWidth={1.5} />
      <span style={{
        fontSize: 12.5, fontWeight: 500, marginTop: 8,
        color: hover ? 'var(--cp-blue)' : 'var(--fg-4)',
        fontFamily: "'Inter', sans-serif",
      }}>Create New Board</span>
      <span style={{
        fontSize: 11.5, color: 'var(--fg-4)', marginTop: 4,
        maxWidth: 220, textAlign: 'center', fontFamily: "'Inter', sans-serif",
      }}>Add a kanban board to organize and track work items</span>
    </button>
  );
}
