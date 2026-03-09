import React, { useState } from 'react';
import { Move } from 'lucide-react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea, RoadmapQuarter } from '@/types/ideasRoadmap';

interface RoadmapCardProps {
  idea: RoadmapIdea;
  onSelectIdea: (idea: RoadmapIdea) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
  onMoveToQuarter?: (ideaId: string, quarter: RoadmapQuarter | null) => void;
}

const MOVE_OPTIONS: { label: string; value: RoadmapQuarter | null }[] = [
  { label: 'Uncommitted', value: null },
  { label: 'Q1 2026', value: 'Q1' },
  { label: 'Q2 2026', value: 'Q2' },
  { label: 'Q3 2026', value: 'Q3' },
  { label: 'Q4 2026', value: 'Q4' },
];

const isConverted = (status: string) =>
  status.toLowerCase() === 'converted';

export function RoadmapCard({ idea, onSelectIdea, onToggleCommitted, onMoveToQuarter }: RoadmapCardProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const hasAnyMilestone = MILESTONE_CONFIGS.some(m => idea.milestones[m.key]);

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', idea.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
      }}
      onDragEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      onClick={() => onSelectIdea(idea)}
      title={idea.title.length > 60 ? idea.title : undefined}
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
        padding: 12, cursor: 'grab', position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)';
        e.currentTarget.style.borderColor = '#E2E8F0';
        setMoveOpen(false);
      }}
    >
      {/* Row 1: Key + Move + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {idea.ideaKey}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* EC-05: Move button for touch/fallback */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMoveOpen(!moveOpen); }}
              title="Move to quarter"
              className="move-btn"
              style={{
                width: 22, height: 18, borderRadius: 4, border: '1px solid #E2E8F0',
                background: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 150ms',
              }}
            >
              <Move size={10} color="#94A3B8" />
            </button>
            {moveOpen && (
              <div style={{
                position: 'absolute', top: 22, right: 0, zIndex: 20,
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,.12)', minWidth: 140, padding: 4,
              }}>
                {MOVE_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={e => {
                      e.stopPropagation();
                      onMoveToQuarter?.(idea.id, opt.value);
                      setMoveOpen(false);
                    }}
                    style={{
                      display: 'block', width: '100%', padding: '6px 10px',
                      fontSize: 12, fontWeight: 500, color: '#334155',
                      fontFamily: "'Inter', sans-serif", background: 'transparent',
                      border: 'none', cursor: 'pointer', borderRadius: 4,
                      textAlign: 'left', transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onToggleCommitted(idea); }}
            title={idea.isCommitted ? 'Uncommit' : 'Commit'}
            style={{
              width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
              background: idea.isCommitted ? '#0D9488' : '#CBD5E1',
              position: 'relative', transition: 'background 150ms',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
              background: '#FFFFFF', transition: 'left 150ms',
              left: idea.isCommitted ? 17 : 3,
            }} />
          </button>
        </div>
      </div>

      {/* Row 2: Title — EC-01: line-clamp 2, tooltip on long titles */}
      <div style={{
        fontSize: 13, fontWeight: 650, color: '#0F172A', fontFamily: "'Inter', sans-serif",
        lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 6,
      }}>
        {idea.title}
      </div>

      {/* Row 3: Theme + Team badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {idea.theme && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4,
          }}>{idea.theme}</span>
        )}
        {idea.team && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4,
          }}>{idea.team}</span>
        )}
      </div>

      {/* Row 4: EC-03 — Always show all 6 milestone chips (greyed if unset) */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {MILESTONE_CONFIGS.map(m => {
          const isSet = !!idea.milestones[m.key];
          return (
            <span key={m.key} style={{
              height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px', borderRadius: 3,
              fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase',
              background: isSet ? `${m.color}18` : '#F1F5F9',
              color: isSet ? m.color : '#CBD5E1',
            }}>
              {m.label}
            </span>
          );
        })}
      </div>

      {/* Row 5: EC-07 — Converted badge or → Init */}
      {isConverted(idea.status) ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 8px',
          borderRadius: 4, background: '#E3FCEF', color: '#006644',
          border: '1px solid #B7EBD1', fontSize: 10, fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
        }}>
          ✓ Converted
        </span>
      ) : idea.isCommitted ? (
        <button
          onClick={e => { e.stopPropagation(); onSelectIdea(idea); }}
          style={{
            height: 24, padding: '0 8px', borderRadius: 4,
            border: '1px solid #E2E8F0', background: '#FFFFFF',
            color: '#64748B', fontSize: 10, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#0D9488';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = '#0D9488';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          → Init
        </button>
      ) : null}

      {/* CSS for move button hover reveal */}
      <style>{`
        div:hover > .move-btn,
        div:hover .move-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
