import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import BoardCard from './BoardCard';
import CreateBoardModal from './CreateBoardModal';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import type { BoardListItem } from '@/types/board';

type TabFilter = 'all' | 'project' | 'personal' | 'starred';

export default function BoardManagerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: boards = [], isLoading } = useBoards(projectId);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsBoard, setSettingsBoard] = useState<BoardListItem | null>(null);

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
    { key: 'all', label: 'All' },
    { key: 'project', label: 'Project' },
    { key: 'personal', label: 'Personal' },
    { key: 'starred', label: 'Starred' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cp-bg-page)' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '0.75px solid var(--cp-border-subtle)', flexShrink: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-tertiary)', marginBottom: 6 }}>
            ProjectHub › Boards
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div>
              <h1 style={{ fontSize: 17, fontFamily: 'var(--cp-font-heading)', fontWeight: 700, color: 'var(--cp-text-primary)', letterSpacing: '-0.4px', margin: 0 }}>Boards</h1>
              <p style={{ fontSize: 12.5, color: 'var(--cp-text-tertiary)', margin: '2px 0 0', fontFamily: 'var(--cp-font-body)' }}>
                Manage and configure all boards for this project
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px',
              background: 'var(--cp-bg-sunken)', border: '0.75px solid var(--cp-border-subtle)',
              borderRadius: 6, width: 200,
            }}>
              <Search size={14} color="var(--cp-text-muted)" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search boards…"
                style={{
                  border: 'none', outline: 'none', background: 'transparent', flex: 1,
                  fontSize: 12.5, fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)',
                  appearance: 'none' as any,
                }}
              />
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
              background: 'transparent', border: '0.75px solid var(--cp-border-default)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
              color: 'var(--cp-text-secondary)', fontFamily: 'var(--cp-font-body)',
            }}>
              <SlidersHorizontal size={14} /> Filter
            </button>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px',
              background: 'var(--cp-primary-60)', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#FFFFFF',
              fontFamily: 'var(--cp-font-body)',
            }}>
              <Plus size={14} strokeWidth={2.5} /> Create Board
            </button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderTop: '0.75px solid var(--cp-border-subtle)' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--cp-primary-60)' : 'var(--cp-text-tertiary)',
                  fontFamily: 'var(--cp-font-body)',
                  borderBottom: active ? '2px solid var(--cp-primary-60)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                  {tab.label}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                    background: active ? 'var(--cp-primary-10)' : 'var(--cp-bg-sunken)',
                    color: active ? 'var(--cp-primary-60)' : 'var(--cp-text-muted)',
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cp-primary-60)' }} />
          </div>
        ) : (
          <>
            {starred.length > 0 && (
              <>
                <SectionLabel label="⭐ Starred" />
                <BoardGrid>
                  {starred.map(b => (
                    <BoardCard key={b.id} board={b} projectId={projectId!}
                      onOpen={() => navigate(`/projects/${projectId}/boards/${b.id}`)}
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
                      onOpen={() => navigate(`/projects/${projectId}/boards/${b.id}`)}
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
                      onOpen={() => navigate(`/projects/${projectId}/boards/${b.id}`)}
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
        <CreateBoardModal projectId={projectId!} onClose={() => setCreateOpen(false)} />
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
        letterSpacing: '0.05em', color: 'var(--cp-text-muted)',
        fontFamily: 'var(--cp-font-body)', whiteSpace: 'nowrap',
      }}>{label}</span>
      <span style={{ flex: 1, height: 0.75, background: 'var(--cp-border-subtle)' }} />
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
        border: `1.5px dashed ${hover ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
        borderRadius: 8, cursor: 'pointer',
        background: hover ? 'var(--cp-primary-5)' : 'transparent',
        transition: 'all 150ms',
      }}
    >
      <Plus size={28} color={hover ? 'var(--cp-primary-60)' : 'var(--cp-text-muted)'} strokeWidth={1.5} />
      <span style={{
        fontSize: 12.5, fontWeight: 500, marginTop: 8,
        color: hover ? 'var(--cp-primary-60)' : 'var(--cp-text-muted)',
        fontFamily: 'var(--cp-font-body)',
      }}>Create New Board</span>
      <span style={{
        fontSize: 11.5, color: 'var(--cp-text-muted)', marginTop: 4,
        maxWidth: 220, textAlign: 'center', fontFamily: 'var(--cp-font-body)',
      }}>Add a kanban board to organize and track work items</span>
    </button>
  );
}
