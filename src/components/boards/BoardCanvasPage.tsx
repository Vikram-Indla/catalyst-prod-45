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

  // Update last viewed on mount
  useEffect(() => {
    if (boardId) updateLastViewed.mutate(boardId);
  }, [boardId]);

  // Realtime subscriptions
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

  // Group cards by column_id
  const cardsByColumn = useMemo(() => {
    const map: Record<string, KanbanCard[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    for (const card of cards) {
      const colId = (card as any).columnId;
      if (colId && map[colId]) {
        map[colId].push(card);
      } else if (columns.length > 0) {
        // Cards without a column_id go to the first column
        map[columns[0].id]?.push(card);
      }
    }
    return map;
  }, [columns, cards]);

  const swimlanes = [{ id: 'default', name: 'All Issues', count: cards.length }];

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingCardId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCardId(null);
    const { active, over } = event;
    if (!over || !boardId) return;

    const cardId = String(active.id);
    const targetColumnId = String(over.id);

    // Find the card
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const currentColumnId = (card as any).columnId || columns[0]?.id;
    if (currentColumnId === targetColumnId) return; // Same column, no move needed

    // Generate new rank value (midpoint between existing items)
    const targetCards = cardsByColumn[targetColumnId] ?? [];
    let newRank: string;
    if (targetCards.length === 0) {
      newRank = 'a';
    } else {
      const lastRank = targetCards[targetCards.length - 1].rankValue;
      newRank = lastRank + 'a';
    }

    // Optimistic update
    qc.setQueryData(['board-cards', boardId], (old: KanbanCard[] | undefined) => {
      if (!old) return old;
      return old.map(c => c.id === cardId ? { ...c, columnId: targetColumnId, statusId: targetColumnId, rankValue: newRank } : c);
    });

    // Fire mutation
    updateCardRank.mutate({
      boardId,
      workItemId: cardId,
      columnId: targetColumnId,
      rankValue: newRank,
    }, {
      onError: () => {
        // Rollback
        qc.invalidateQueries({ queryKey: ['board-cards', boardId] });
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cp-primary-60)' }} />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cp-text-tertiary)', fontSize: 13, fontFamily: 'var(--cp-font-body)' }}>
        Board not found
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cp-bg-page)' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '0.75px solid var(--cp-border-subtle)', flexShrink: 0, padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-tertiary)', marginBottom: 6 }}>
          <button onClick={() => navigate(`/projects/${projectId}/boards`)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--cp-primary-60)', fontSize: 12, fontFamily: 'var(--cp-font-body)', padding: 0,
          }}>
            <ArrowLeft size={13} /> Boards
          </button>
          <span style={{ color: 'var(--cp-text-muted)' }}>›</span>
          <span>{board.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 15, fontFamily: 'var(--cp-font-heading)', fontWeight: 700, color: 'var(--cp-text-primary)', margin: 0 }}>
              {board.name}
            </h1>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: board.color + '18', color: board.color,
              fontFamily: 'var(--cp-font-body)',
            }}>Kanban</span>
          </div>
          <button onClick={() => setSettingsOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
            background: 'transparent', border: '0.75px solid var(--cp-border-default)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: 'var(--cp-text-secondary)', fontFamily: 'var(--cp-font-body)',
          }}>
            <Settings size={13} /> Board Settings
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <BoardQuickFilters />
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 24px 8px 248px',
        background: '#FFFFFF', borderBottom: '0.75px solid var(--cp-border-subtle)',
        flexShrink: 0,
      }}>
        {columns.map(col => (
          <div key={col.id} style={{
            width: 272, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 650, textTransform: 'uppercase' as const,
              color: col.isDone ? 'var(--cp-success-60)' : 'var(--cp-text-secondary)',
              fontFamily: 'var(--cp-font-body)', letterSpacing: '0.03em',
            }}>{col.name}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
              background: col.isDone ? 'var(--cp-success-5)' : 'var(--cp-bg-sunken)',
              color: col.isDone ? 'var(--cp-success-60)' : 'var(--cp-text-muted)',
              fontFamily: 'var(--cp-font-mono)',
            }}>{cardsByColumn[col.id]?.length ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Canvas body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '12px 24px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {swimlanes.map(lane => {
            const collapsed = collapsedSwimlanes[lane.id];
            return (
              <div key={lane.id} style={{
                background: '#FFFFFF', border: '0.75px solid var(--cp-border-subtle)',
                borderRadius: 8, marginBottom: 10,
              }}>
                <button onClick={() => toggleSwimlane(lane.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    <ChevronDown size={14} color="var(--cp-text-muted)" />
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--cp-text-primary)',
                    fontFamily: 'var(--cp-font-mono)',
                  }}>{lane.name}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                    background: 'var(--cp-bg-sunken)', color: 'var(--cp-text-muted)',
                    fontFamily: 'var(--cp-font-mono)',
                  }}>{lane.count}</span>
                </button>

                {!collapsed && (
                  <div style={{
                    display: 'flex', gap: 12, padding: '0 12px 12px',
                    overflowX: 'auto',
                  }}>
                    {columns.map(col => (
                      <KanbanColumn key={col.id} column={col} cards={cardsByColumn[col.id] ?? []} />
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
