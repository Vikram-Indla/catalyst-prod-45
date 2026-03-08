import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, ArrowLeft } from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBoard } from '@/hooks/useBoard';
import { useBoardCards } from '@/hooks/useBoardCards';
import { useUpdateCardRank, useUpdateBoardLastViewed } from '@/hooks/useBoardMutations';
import { useBoardStore } from '@/stores/boardStore';
import KanbanColumn from './KanbanColumn';
import KanbanCardComponent from './KanbanCard';
import BoardQuickFilters from './BoardQuickFilters';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import type { KanbanCard, BoardColumn } from '@/types/board';

/* ── StatusLozenge V12 3-color guardrail ── */
function StatusLozenge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[\s_-]+/g, '');
  let bg = '#DFE1E6', color = '#253858', label = status.toUpperCase();

  // Blue: in-progress family
  if (['inprogress','indev','inreview','inqa','active','inbeta','processing','testing','review'].includes(s)) {
    bg = '#DEEBFF'; color = '#0747A6';
  }
  // Green: done family
  else if (['done','completed','production','prodready','approved','resolved','passed','closed'].includes(s)) {
    bg = '#E3FCEF'; color = '#006644';
  }
  // Grey: everything else (backlog, todo, onhold, new, waiting, blocked)

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: bg, color,
      fontFamily: "'Inter', sans-serif",
    }}>{label}</span>
  );
}

export default function BoardCanvasPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: boardData, isLoading } = useBoard(boardId);
  const { data: cards = [] } = useBoardCards(boardId);
  const { collapsedSwimlanes, toggleSwimlane, draggingCardId, setDraggingCardId } = useBoardStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const updateCardRank = useUpdateCardRank();
  const updateLastViewed = useUpdateBoardLastViewed();

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
      return lanes.length > 0 ? lanes : [{ id: 'default', name: 'All Issues', count: cards.length, doneCount: 0 }];
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
    const targetColumnId = String(over.id);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563EB' }} />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
        Board not found
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '0.75px solid rgba(15,23,42,0.08)', flexShrink: 0, padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Inter', sans-serif", color: '#64748B', marginBottom: 6 }}>
          <button onClick={() => navigate(`/projects/${projectId}/boards`)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            color: '#2563EB', fontSize: 12, fontFamily: "'Inter', sans-serif", padding: 0,
          }}>
            <ArrowLeft size={13} /> Boards
          </button>
          <span style={{ color: '#CBD5E1' }}>›</span>
          <span>{board.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 15, fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {board.name}
            </h1>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: board.color + '18', color: board.color,
              fontFamily: "'Inter', sans-serif",
            }}>Kanban</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Group by selector */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              height: 28, padding: '0 10px', borderRadius: 4,
              background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.06)',
              fontSize: 12, color: '#334155', fontFamily: "'Inter', sans-serif",
            }}>
              Group by: <strong style={{ fontWeight: 600 }}>{board.swimlaneType === 'none' ? 'None' : board.swimlaneType.charAt(0).toUpperCase() + board.swimlaneType.slice(1)}</strong>
            </div>
            <button onClick={() => setSettingsOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
              background: 'transparent', border: '0.75px solid rgba(15,23,42,0.12)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              color: '#334155', fontFamily: "'Inter', sans-serif",
            }}>
              <Settings size={13} /> Board Settings
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <BoardQuickFilters />
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 24px',
        background: '#FFFFFF', borderBottom: '0.75px solid rgba(15,23,42,0.08)',
        flexShrink: 0,
      }}>
        {columns.map(col => {
          const count = cardsByColumn[col.id]?.length ?? 0;
          return (
            <div key={col.id} style={{
              width: 272, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 650, textTransform: 'uppercase' as const,
                color: col.isDone ? '#16A34A' : '#334155',
                fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em',
              }}>{col.name}</span>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                background: col.isDone ? '#F0FDF4' : '#F8FAFC',
                color: col.isDone ? '#16A34A' : '#94A3B8',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{count}</span>
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
                background: '#FFFFFF', border: '0.75px solid rgba(15,23,42,0.08)',
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
                    <ChevronDown size={14} color="#94A3B8" />
                  </span>
                  {/* Release pill in swimlane header */}
                  {lane.id !== 'default' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 20, padding: '0 8px', borderRadius: 10,
                      background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.08)',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: '#0F172A',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{lane.name}</span>
                    </span>
                  )}
                  {lane.id === 'default' && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: '#0F172A',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{lane.name}</span>
                  )}
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                    background: '#F8FAFC', color: '#94A3B8',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{lane.count} issues</span>
                  {/* Progress bar */}
                  {lane.count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                      <div style={{
                        width: 64, height: 5, background: '#F8FAFC',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: '#16A34A', borderRadius: 3,
                          transition: 'width 300ms ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
                        {pct}%
                      </span>
                    </div>
                  )}
                </button>

                {!collapsed && (
                  <div style={{
                    display: 'flex', gap: 12, padding: '0 12px 12px',
                    overflowX: 'auto',
                  }}>
                    {columns.map(col => (
                      <KanbanColumn key={col.id} column={col} cards={getCardsForSwimlane(lane.id, col.id)} />
                    ))}
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
    </div>
  );
}
