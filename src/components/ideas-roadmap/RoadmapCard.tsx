import React from 'react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea } from '@/types/ideasRoadmap';

interface RoadmapCardProps {
  idea: RoadmapIdea;
  onSelectIdea: (idea: RoadmapIdea) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
}

export function RoadmapCard({ idea, onSelectIdea, onToggleCommitted }: RoadmapCardProps) {
  const hasMilestones = MILESTONE_CONFIGS.some(m => idea.milestones[m.key]);

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
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
        padding: 12, cursor: 'grab',
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
      }}
    >
      {/* Row 1: Key + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {idea.ideaKey}
        </span>
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

      {/* Row 2: Title */}
      <div style={{
        fontSize: 13, fontWeight: 650, color: '#0F172A', fontFamily: "'Inter', sans-serif",
        lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 6,
      }}>
        {idea.title}
      </div>

      {/* Row 3: Theme + Team badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: hasMilestones ? 6 : 0 }}>
        {idea.theme && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4,
          }}>
            {idea.theme}
          </span>
        )}
        {idea.team && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4,
          }}>
            {idea.team}
          </span>
        )}
      </div>

      {/* Row 4: Milestone chips */}
      {hasMilestones && (
        <div style={{ display: 'flex', gap: 3, marginBottom: idea.isCommitted ? 6 : 0 }}>
          {MILESTONE_CONFIGS.map(m => {
            const isSet = !!idea.milestones[m.key];
            return (
              <span
                key={m.key}
                style={{
                  height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px', borderRadius: 3,
                  fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase',
                  background: isSet ? `${m.color}18` : '#F1F5F9',
                  color: isSet ? m.color : '#CBD5E1',
                }}
              >
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Row 5: Convert button */}
      {idea.isCommitted && (
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
      )}
    </div>
  );
}
