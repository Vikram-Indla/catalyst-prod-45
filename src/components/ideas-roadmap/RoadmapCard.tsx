import React, { useState } from 'react';
import { Move } from 'lucide-react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea, RoadmapQuarter } from '@/types/ideasRoadmap';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

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
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
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
        background: isDark ? 'transparent' : 'var(--bg-app)',
        border: `1px solid ${dk.border}`,
        borderRadius: 8,
        padding: 12, cursor: 'grab', position: 'relative',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,.04)',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={e => {
        if (!isDark) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
        e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1';
      }}
      onMouseLeave={e => {
        if (!isDark) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)';
        e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0';
        setMoveOpen(false);
      }}
    >
      {/* Row 1: Key + Move + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: dk.t3,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {idea.ideaKey}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMoveOpen(!moveOpen); }}
              title="Move to quarter"
              className="move-btn"
              style={{
                width: 22, height: 18, borderRadius: 4, border: `1px solid ${dk.border}`,
                background: isDark ? 'transparent' : 'var(--bg-app)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 150ms',
              }}
            >
              <Move size={10} color={isDark ? '#7D7D7D' : '#94A3B8'} />
            </button>
            {moveOpen && (
              <div style={{
                position: 'absolute', top: 22, right: 0, zIndex: 20,
                background: isDark ? '#1A1A1A' : 'var(--bg-app)',
                border: `1px solid ${dk.border}`, borderRadius: 6,
                boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,.12)',
                minWidth: 140, padding: 4,
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
                      fontSize: 12, fontWeight: 500, color: dk.t2,
                      fontFamily: "'Inter', sans-serif", background: 'transparent',
                      border: 'none', cursor: 'pointer', borderRadius: 4,
                      textAlign: 'left', transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#292929' : '#F1F5F9')}
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
              width: 32, height: 18, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: idea.isCommitted ? 'var(--sem-success)' : (isDark ? '#454545' : '#CBD5E1'),
              position: 'relative', transition: 'background 150ms',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
              background: 'var(--bg-app)', transition: 'left 150ms',
              left: idea.isCommitted ? 17 : 3,
            }} />
          </button>
        </div>
      </div>

      {/* Row 2: Title */}
      <div style={{
        fontSize: 13, fontWeight: 650, color: dk.t1, fontFamily: "'Inter', sans-serif",
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
            background: isDark ? '#292929' : '#F1F5F9',
            color: dk.t2, padding: '2px 6px', borderRadius: 4,
            border: isDark ? `1px solid ${dk.border}` : 'none',
          }}>{idea.theme}</span>
        )}
        {idea.team && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            background: isDark ? '#292929' : '#F1F5F9',
            color: dk.t2, padding: '2px 6px', borderRadius: 4,
            border: isDark ? `1px solid ${dk.border}` : 'none',
          }}>{idea.team}</span>
        )}
      </div>

      {/* Row 4: Milestone chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {MILESTONE_CONFIGS.map(m => {
          const isSet = !!idea.milestones[m.key];
          const CHIP_STYLES: Record<string, { bg: string; text: string; border: string }> = {
            req:  { bg: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', text: isDark ? '#93C5FD' : '#1D4ED8', border: isDark ? 'rgba(59,130,246,0.25)' : '#93C5FD' },
            des:  { bg: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE', text: isDark ? '#C4B5FD' : '#5B21B6', border: isDark ? 'rgba(139,92,246,0.25)' : '#C4B5FD' },
            dev:  { bg: isDark ? 'rgba(22,163,74,0.15)' : '#DCFCE7', text: isDark ? '#86EFAC' : '#15803D', border: isDark ? 'rgba(22,163,74,0.25)' : '#86EFAC' },
            uat:  { bg: isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7', text: isDark ? '#FCD34D' : '#92400E', border: isDark ? 'rgba(217,119,6,0.25)' : '#FCD34D' },
            beta: { bg: isDark ? 'rgba(13,148,136,0.15)' : '#CCFBF1', text: isDark ? '#5EEAD4' : '#0F766E', border: isDark ? 'rgba(13,148,136,0.25)' : '#5EEAD4' },
            prod: { bg: isDark ? 'rgba(22,163,74,0.15)' : '#D1FAE5', text: isDark ? '#86EFAC' : '#065F46', border: isDark ? 'rgba(22,163,74,0.25)' : '#6EE7B7' },
          };
          const unsetStyle = { bg: isDark ? '#1F1F1F' : '#F1F5F9', text: isDark ? '#454545' : '#CBD5E1', border: isDark ? '#2E2E2E' : '#E2E8F0' };
          const style = isSet ? CHIP_STYLES[m.key] : unsetStyle;
          return (
            <span key={m.key} style={{
              height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 6px', borderRadius: 4,
              fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: style.bg, color: style.text, border: `1px solid ${style.border}`,
            }}>
              {m.label}
            </span>
          );
        })}
      </div>

      {/* Row 5: Converted badge or → Init */}
      {isConverted(idea.status) ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 8px',
          borderRadius: 4,
          background: isDark ? 'rgba(22,163,74,0.12)' : '#1B7F37',
          color: isDark ? '#86EFAC' : 'var(--bg-app)',
          border: `1px solid ${isDark ? 'rgba(22,163,74,0.25)' : '#B7EBD1'}`,
          fontSize: 10, fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
        }}>
          ✓ Converted
        </span>
      ) : idea.isCommitted ? (
        <button
          onClick={e => { e.stopPropagation(); onSelectIdea(idea); }}
          style={{
            height: 24, padding: '0 8px', borderRadius: 4,
            border: `1px solid ${dk.border}`,
            background: isDark ? 'transparent' : 'var(--bg-app)',
            color: dk.t3, fontSize: 10, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#0D9488';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = '#0D9488';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isDark ? 'transparent' : '#FFFFFF';
            e.currentTarget.style.color = isDark ? '#878787' : '#64748B';
            e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0';
          }}
        >
          → Init
        </button>
      ) : null}

      <style>{`
        div:hover > .move-btn,
        div:hover .move-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
