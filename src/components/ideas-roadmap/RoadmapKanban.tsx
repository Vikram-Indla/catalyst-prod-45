import React, { useState } from 'react';
import { RoadmapCard } from './RoadmapCard';
import type { RoadmapIdea, RoadmapQuarter } from '@/types/ideasRoadmap';

interface Column {
  id: RoadmapQuarter | 'uncommitted';
  label: string;
  accent: string;
  dashed: boolean;
}

const COLUMNS: Column[] = [
  { id: 'uncommitted', label: 'UNCOMMITTED', accent: '#CBD5E1', dashed: true },
  { id: 'Q1', label: 'Q1 2026', accent: '#7C3AED', dashed: false },
  { id: 'Q2', label: 'Q2 2026', accent: '#2563EB', dashed: false },
  { id: 'Q3', label: 'Q3 2026', accent: '#0D9488', dashed: false },
  { id: 'Q4', label: 'Q4 2026', accent: '#D97706', dashed: false },
];

interface RoadmapKanbanProps {
  ideas: RoadmapIdea[];
  onDrop: (ideaId: string, quarter: RoadmapQuarter, isCommitted: boolean) => void;
  onSelectIdea: (idea: RoadmapIdea) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
}

export function RoadmapKanban({ ideas, onDrop, onSelectIdea, onToggleCommitted }: RoadmapKanbanProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  function getColumnIdeas(col: Column): RoadmapIdea[] {
    if (col.id === 'uncommitted') return ideas.filter(i => !i.isCommitted);
    return ideas.filter(i => i.isCommitted && i.quarter === col.id);
  }

  function handleDrop(e: React.DragEvent, col: Column) {
    e.preventDefault();
    setDragOverCol(null);
    const ideaId = e.dataTransfer.getData('text/plain');
    if (!ideaId) return;
    if (col.id === 'uncommitted') {
      onDrop(ideaId, null as any, false);
    } else {
      onDrop(ideaId, col.id as RoadmapQuarter, true);
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 12, padding: 16, flex: 1,
      overflowX: 'auto', overflowY: 'hidden', minHeight: 0,
    }}>
      {COLUMNS.map(col => {
        const colIdeas = getColumnIdeas(col);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id ?? 'uncommitted'}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id as string); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, col)}
            style={{
              flex: 1, minWidth: 260, maxWidth: 320,
              display: 'flex', flexDirection: 'column',
              borderRadius: 8,
              background: col.dashed ? '#F8FAFC' : '#FFFFFF',
              border: col.dashed
                ? `1.5px dashed ${isOver ? '#2563EB' : '#CBD5E1'}`
                : `1px solid ${isOver ? '#2563EB' : '#E2E8F0'}`,
              borderTop: col.dashed ? undefined : `2px solid ${col.accent}`,
              transition: 'border-color 150ms, background 150ms',
              ...(isOver && !col.dashed ? { background: 'rgba(37,99,235,0.04)' } : {}),
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px 6px',
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#1E293B',
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {col.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#94A3B8',
                fontFamily: "'Inter', sans-serif",
                background: '#F1F5F9', padding: '1px 7px', borderRadius: 100,
              }}>
                {colIdeas.length}
              </span>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '4px 12px 12px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {colIdeas.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif",
                }}>
                  No ideas
                </div>
              ) : (
                colIdeas.map(idea => (
                  <RoadmapCard
                    key={idea.id}
                    idea={idea}
                    onSelectIdea={onSelectIdea}
                    onToggleCommitted={onToggleCommitted}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
