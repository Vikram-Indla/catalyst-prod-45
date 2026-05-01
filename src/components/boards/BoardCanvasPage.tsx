import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, ArrowLeft, User } from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBoard } from '@/hooks/useBoard';
import { useBoardCards } from '@/hooks/useBoardCards';
import { useBoards } from '@/hooks/useBoards';
import { useUpdateCardRank, useUpdateBoardLastViewed } from '@/hooks/useBoardMutations';
import { useBoardStore } from '@/stores/boardStore';
import KanbanColumn from './KanbanColumn';
import KanbanCardComponent from './KanbanCard';
import BoardQuickFilters from './BoardQuickFilters';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import type { KanbanCard, BoardColumn } from '@/types/board';
import { lazy, Suspense } from 'react';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* Board accent colors — use board.color from DB, fallback map */
const BOARD_ACCENT: Record<string, string> = {
  'Demand Analysis Kanban': 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
  'Business Request Kanban': 'var(--ds-text-warning, var(--ds-text-warning, #D97706))',
  'Delivery Board': 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
  'QA Board': 'var(--ds-text-success, var(--ds-text-success, #16A34A))',
  'Design Board': '#7C3AED',
  'My Planning Board': 'var(--ds-text-warning, var(--ds-text-warning, #D97706))',
};

/* ── StatusLozenge V12 3-color guardrail ── */
function StatusLozenge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[\s_-]+/g, '');
  let bg = 'var(--ds-border, var(--ds-border, #DFE1E6))', color = '#42526E', label = status.toUpperCase();
  let leftBorder: string | undefined;

  // Blue: in-progress family
  if (['inprogress','indev','inreview','inqa','active','inbeta','processing','testing','review'].includes(s)) {
    bg = '#0C66E4'; color = 'var(--ds-surface, var(--ds-surface, #FFFFFF))';
  }
  // Green: done family
  else if (['done','completed','production','prodready','approved','resolved','passed','closed'].includes(s)) {
    bg = '#1B7F37'; color = 'var(--ds-surface, var(--ds-surface, #FFFFFF))';
  }
  // Grey: everything else (backlog, todo, onhold, new, waiting, blocked)
  // Blocked gets a red left border accent on grey lozenge
  if (s === 'blocked') {
    leftBorder = '3px solid #DC2626';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 4,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: bg, color,
      fontFamily: 'var(--cp-font-body)',
      borderLeft: leftBorder,
    }}>{label}</span>
  );
}

interface BoardCanvasPageProps {
  projectIdOverride?: string;
  basePath?: string;
}

export default function BoardCanvasPage({ projectIdOverride, basePath }: BoardCanvasPageProps = {}) {
  const { projectId: paramProjectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const projectId = projectIdOverride || paramProjectId;
  const boardBasePath = basePath || `/projects/${projectId}/boards`;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: boardData, isLoading } = useBoard(boardId);
  const { data: cards = [] } = useBoardCards(boardId);
  const { data: siblingBoards = [] } = useBoards(projectId);
  const { collapsedSwimlanes, toggleSwimlane, draggingCardId, setDraggingCardId } = useBoardStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const updateCardRank = useUpdateCardRank();
  const updateLastViewed = useUpdateBoardLastViewed();

  // Canonical board order for tab bar
  // Dynamic board tabs — sorted by sort_order from DB
  const boardTabs = useMemo(() => {
    return [...siblingBoards].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [siblingBoards]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dragCard = cards.find(c => c.id === draggingCardId) ?? null;

  const board = boardData?.board;
  const columns = boardData?.columns ?? [];

  useEffect(() => {
    if (boardId) updateLastViewed.mutate(boardId);
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    const channel = supabase
      .channel(`board:${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_issue_rank', filter: `board_id=eq.${boardId}` },
        () => { setTimeout(() => qc.invalidateQueries({ queryKey: ['board-cards', boardId] }), 300); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_columns', filter: `board_id=eq.${boardId}` },
        () => { setTimeout(() => qc.invalidateQueries({ queryKey: ['board', boardId] }), 300); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardId, qc]);

  const cardsByColumn = useMemo(() => {
    const map: Record<string, KanbanCard[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    for (const card of cards) {
      const colId = (card as any).columnId;
      if (colId && map[colId]) {
        map[colId].push(card);
      } else if (columns.length > 0) {
        map[columns[0].id]?.push(card);
      }
    }
    return map;
  }, [columns, cards]);

  // Seed swimlane data for release boards when no cards have release info
  const SEED_SWIMLANES = [
    { id: 'seed-v240', name: 'v2.4.0', count: 12, doneCount: 7 },
    { id: 'seed-v231', name: 'v2.3.1', count: 1,  doneCount: 1 },
    { id: 'seed-v250', name: 'v2.5.0', count: 2,  doneCount: 0 },
  ];

  // Build swimlanes based on board's swimlane type
  const swimlanes = useMemo(() => {
    if (board?.swimlaneType === 'release') {
      const releaseMap = new Map<string, { id: string; name: string; cards: KanbanCard[] }>();
      const noRelease: KanbanCard[] = [];
      for (const card of cards) {
        if (card.release) {
          if (!releaseMap.has(card.release.id)) {
            releaseMap.set(card.release.id, { id: card.release.id, name: card.release.name, cards: [] });
          }
          releaseMap.get(card.release.id)!.cards.push(card);
        } else {
          noRelease.push(card);
        }
      }
      const lanes = [...releaseMap.values()].map(r => ({
        id: r.id, name: r.name, count: r.cards.length,
        doneCount: r.cards.filter(c => columns.find(col => col.id === ((c as any).columnId || columns[0]?.id))?.isDone).length,
      }));
      if (noRelease.length > 0) {
        lanes.push({ id: 'unassigned', name: 'No Release', count: noRelease.length, doneCount: 0 });
      }
      // If no real release lanes found, use seed data
      return lanes.length > 0 ? lanes : SEED_SWIMLANES;
    }
    return [{ id: 'default', name: 'All Issues', count: cards.length, doneCount: 0 }];
  }, [board, cards, columns]);

  // Filter cards by swimlane
  const getCardsForSwimlane = (laneId: string, colId: string) => {
    const colCards = cardsByColumn[colId] ?? [];
    if (laneId === 'default') return colCards;
    if (laneId === 'unassigned') return colCards.filter(c => !c.release);
    return colCards.filter(c => c.release?.id === laneId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingCardId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCardId(null);
    const { active, over } = event;
    if (!over || !boardId) return;

    const cardId = String(active.id);
    const overId = String(over.id);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Resolve target column: over.id may be a column ID or a card ID
    const columnIds = new Set(columns.map(c => c.id));
    let targetColumnId: string;
    if (columnIds.has(overId)) {
      targetColumnId = overId;
    } else {
      // over.id is a card — find which column it belongs to
      const overCard = cards.find(c => c.id === overId);
      const overColId = (overCard as any)?.columnId;
      if (overColId && columnIds.has(overColId)) {
        targetColumnId = overColId;
      } else {
        // Fallback: search cardsByColumn
        const found = Object.entries(cardsByColumn).find(([, colCards]) => colCards.some(c => c.id === overId));
        targetColumnId = found?.[0] ?? columns[0]?.id;
      }
    }
    if (!targetColumnId) return;

    const currentColumnId = (card as any).columnId || columns[0]?.id;
    if (currentColumnId === targetColumnId) return;

    const targetCards = cardsByColumn[targetColumnId] ?? [];
    let newRank: string;
    if (targetCards.length === 0) {
      newRank = 'a';
    } else {
      const lastRank = targetCards[targetCards.length - 1].rankValue;
      newRank = lastRank + 'a';
    }

    qc.setQueryData(['board-cards', boardId], (old: KanbanCard[] | undefined) => {
      if (!old) return old;
      return old.map(c => c.id === cardId ? { ...c, columnId: targetColumnId, statusId: targetColumnId, rankValue: newRank } : c);
    });

    updateCardRank.mutate({
      boardId,
      workItemId: cardId,
      columnId: targetColumnId,
      rankValue: newRank,
    }, {
      onError: () => {
        qc.invalidateQueries({ queryKey: ['board-cards', boardId] });
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cp-blue)' }} />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--cp-font-body)' }}>
        Board not found
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-app)', borderBottom: '0.75px solid rgba(15,23,42,0.08)', flexShrink: 0, padding: '12px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--cp-font-body)', color: 'var(--fg-3)', marginBottom: 6 }}>
          <button onClick={() => navigate(boardBasePath)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--cp-blue)', fontSize: 12, fontFamily: 'var(--cp-font-body)', padding: 0,
          }}>
            <ArrowLeft size={13} /> All Boards
          </button>
          <span style={{ color: 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))' }}>›</span>
          <span>{board.name}</span>
        </div>

        {/* ── Board Switcher Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0 }}>
          {boardTabs.map(tab => {
            const active = tab.id === boardId;
            const accent = BOARD_ACCENT[tab.name] || tab.color || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))';
            const isPersonal = tab.name === 'My Planning Board';
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`${boardBasePath}/${tab.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 30, padding: '8px 12px', borderRadius: 4,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--fg-1)' : 'var(--fg-3)',
                  fontFamily: 'var(--cp-font-body)',
                  borderBottom: active ? `3px solid ${accent}` : '3px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms, border-color 150ms',
                }}
              >
                {isPersonal && <User size={12} color={active ? 'var(--ds-text-warning, var(--ds-text-warning, #D97706))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))'} />}
                {tab.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 15, fontFamily: 'var(--cp-font-heading)', fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              {board.name}
            </h1>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: (BOARD_ACCENT[board.name] || board.color) + '18',
              color: BOARD_ACCENT[board.name] || board.color,
              fontFamily: 'var(--cp-font-body)',
            }}>Kanban</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              height: 28, padding: '0 10px', borderRadius: 4,
              background: 'var(--cp-bd-zone)', border: '0.75px solid rgba(15,23,42,0.06)',
              fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)',
              cursor: 'pointer',
            }}>
              Group by: <strong style={{ fontWeight: 600 }}>{board.swimlaneType === 'none' ? 'None' : board.swimlaneType.charAt(0).toUpperCase() + board.swimlaneType.slice(1)}</strong>
              <ChevronDown size={12} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))" />
            </button>
            <button onClick={() => setSettingsOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '8px 12px',
              background: 'transparent', border: '0.75px solid rgba(15,23,42,0.12)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)',
            }}>
              <Settings size={13} /> Board Settings
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <BoardQuickFilters />
        </div>
      </div>

      {/* Column headers with WIP capacity */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 24px',
        background: 'var(--bg-app)', borderBottom: '0.75px solid rgba(15,23,42,0.08)',
        flexShrink: 0,
      }}>
        {columns.map(col => {
          const count = cardsByColumn[col.id]?.length ?? 0;
          const maxWip = (col as any).maxWip as number | undefined;
          const atLimit = maxWip != null && count >= maxWip;
          return (
            <div key={col.id} style={{
              width: 272, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {/* WIP status dot — only when maxWip is set */}
              {maxWip != null && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: atLimit ? 'var(--sem-danger)' : 'var(--fg-4)',
                }} />
              )}
              <span style={{
                fontSize: 12, fontWeight: 650, textTransform: 'uppercase' as const,
                color: col.isDone ? 'var(--sem-success)' : 'var(--fg-2)',
                fontFamily: 'var(--cp-font-body)', letterSpacing: '0.05em',
              }}>{col.name}</span>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                background: col.isDone ? '#F0FDF4' : 'var(--bg-1)',
                color: col.isDone ? 'var(--sem-success)' : 'var(--fg-4)',
                fontFamily: 'var(--cp-font-mono)',
              }}>{count}</span>
              {/* WIP limit badge */}
              {maxWip != null && (
                <span style={{
                  fontSize: 10.5, padding: '1px 5px', borderRadius: 4,
                  background: atLimit ? 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))' : 'var(--bg-1)',
                  color: atLimit ? 'var(--sem-danger)' : 'var(--fg-3)',
                  fontFamily: 'var(--cp-font-body)',
                }}>max {maxWip}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Canvas body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '12px 24px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {swimlanes.map(lane => {
            const collapsed = collapsedSwimlanes[lane.id];
            const pct = lane.count > 0 ? Math.round((lane.doneCount / lane.count) * 100) : 0;
            return (
              <div key={lane.id} style={{
                background: 'var(--bg-app)', border: '0.75px solid rgba(15,23,42,0.08)',
                borderRadius: 8, marginBottom: 10,
              }}>
                {/* Swimlane header */}
                <button onClick={() => toggleSwimlane(lane.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: collapsed ? 'none' : '0.75px solid rgba(15,23,42,0.06)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'flex' }}>
                    <ChevronDown size={14} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))" />
                  </span>
                {/* Release pill in swimlane header */}
                {lane.id !== 'default' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    height: 20, padding: '0 8px', borderRadius: 12,
                    background: 'var(--cp-bd-zone)', border: '0.75px solid rgba(15,23,42,0.10)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} />
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--fg-1)',
                      fontFamily: 'var(--cp-font-mono)',
                    }}>{lane.name}</span>
                  </span>
                )}
                {lane.id === 'default' && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--ds-text, var(--ds-text, #0F172A))',
                    fontFamily: 'var(--cp-font-mono)',
                  }}>{lane.name}</span>
                )}
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                  background: 'var(--cp-bd-zone)', color: 'var(--fg-4)',
                  fontFamily: 'var(--cp-font-mono)',
                }}>{lane.count} {lane.count === 1 ? 'issue' : 'issues'}</span>
                {/* Progress bar */}
                {lane.count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <div style={{
                      width: 64, height: 5, background: 'var(--cp-bd-zone)',
                      borderRadius: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'var(--sem-success)', borderRadius: 4,
                        transition: 'width 300ms ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>
                      {pct}%
                    </span>
                  </div>
                )}
              </button>

              {!collapsed && (
                <div style={{
                  display: 'flex', gap: 12, padding: '12px 12px',
                  overflowX: 'auto',
                }}>
                  {columns.map(col => {
                    const laneCards = getCardsForSwimlane(lane.id, col.id);
                    return (
                      <div key={col.id} style={{ width: 272, flexShrink: 0 }}>
                        {/* Column sub-header inside swimlane */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 650, textTransform: 'uppercase' as const,
                            color: col.isDone ? 'var(--sem-success)' : 'var(--fg-3)',
                            fontFamily: 'var(--cp-font-body)', letterSpacing: '0.05em',
                          }}>{col.name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 6,
                            background: col.isDone ? '#F0FDF4' : 'var(--bg-1)',
                            color: col.isDone ? 'var(--sem-success)' : 'var(--fg-4)',
                            fontFamily: 'var(--cp-font-mono)',
                          }}>{laneCards.length}</span>
                        </div>
                        <KanbanColumn column={col} cards={laneCards} onCardClick={setDetailItemId} />
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            );
          })}

          <DragOverlay>
            {dragCard && (
              <div style={{ opacity: 0.9, transform: 'rotate(2deg) scale(1.02)', filter: 'drop-shadow(0 8px 24px rgba(15,23,42,0.18))' }}>
                <KanbanCardComponent card={dragCard} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {settingsOpen && board && (
        <BoardSettingsDrawer
          board={{ ...board, columnCount: columns.length, issueCount: cards.length, createdByName: null } as any}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Issue Detail Modal — unified StoryDetailModal */}
      {detailItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setDetailItemId(null)}
            itemId={detailItemId}
            projectId={projectId ?? ''}
          />
        </Suspense>
      )}
    </div>
  );
}
