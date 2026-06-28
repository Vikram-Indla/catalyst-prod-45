import React, { useState } from 'react';
import { Move } from '@/lib/atlaskit-icons';
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
        boxShadow: isDark ? 'none' : '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,.04))',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={e => {
        if (!isDark) e.currentTarget.style.boxShadow = '0 4px 12px var(--ds-shadow-raised, rgba(0,0,0,.08))';
        e.currentTarget.style.borderColor = 'var(--cp-border-strong)';
      }}
      onMouseLeave={e => {
        if (!isDark) e.currentTarget.style.boxShadow = '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,.04))';
        e.currentTarget.style.borderColor = 'var(--cp-border, var(--cp-border, var(--cp-bg-sunken)))';
        setMoveOpen(false);
      }}
    >
      {/* Row 1: Key + Move + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-mono)', color: dk.t3,
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
              <Move size={10} color={'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light)))'} />
            </button>
            {moveOpen && (
              <div style={{
                position: 'absolute', top: 24, right: 0, zIndex: 20,
                background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--bg-app)',
                border: `1px solid ${dk.border}`, borderRadius: 6,
                boxShadow: isDark ? 'none' : '0 4px 12px var(--ds-shadow-raised, rgba(0,0,0,.12))',
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
                      display: 'block', width: '100%', padding: '4px 10px',
                      fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: dk.t2,
                      fontFamily: 'var(--cp-font-body)', background: 'transparent',
                      border: 'none', cursor: 'pointer', borderRadius: 4,
                      textAlign: 'left', transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))')}
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
              background: idea.isCommitted ? 'var(--sem-success)' : ('var(--cp-border-strong)'),
              position: 'relative', transition: 'background 150ms',
            }}
          >
            <span style={{
              position: 'absolute', top: 4, width: 12, height: 12, borderRadius: 6,
              background: 'var(--bg-app)', transition: 'left 150ms',
              left: idea.isCommitted ? 17 : 3,
            }} />
          </button>
        </div>
      </div>

      {/* Row 2: Title */}
      <div style={{
        fontSize: 'var(--ds-font-size-300)', fontWeight: 650, color: dk.t1, fontFamily: 'var(--cp-font-body)',
        lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 4,
      }}>
        {idea.title}
      </div>

      {/* Row 3: Theme + Team badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {idea.theme && (
          <span style={{
            fontSize: 'var(--ds-font-size-50)', fontWeight: 600, fontFamily: 'var(--cp-font-body)',
            background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
            color: dk.t2, padding: '0px 6px', borderRadius: 4,
            border: isDark ? `1px solid ${dk.border}` : 'none',
          }}>{idea.theme}</span>
        )}
        {idea.team && (
          <span style={{
            fontSize: 'var(--ds-font-size-50)', fontWeight: 600, fontFamily: 'var(--cp-font-body)',
            background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
            color: dk.t2, padding: '0px 6px', borderRadius: 4,
            border: isDark ? `1px solid ${dk.border}` : 'none',
          }}>{idea.team}</span>
        )}
      </div>

      {/* Row 4: Milestone chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {MILESTONE_CONFIGS.map(m => {
          const isSet = !!idea.milestones[m.key];
          const CHIP_STYLES: Record<string, { bg: string; text: string; border: string }> = {
            req:  { bg: 'var(--cp-primary-light)', text: 'var(--cp-primary-hover)', border: isDark ? 'var(--ds-background-information-bold, rgba(59,130,246,0.25))' : 'var(--ds-background-information, var(--ds-background-information))' },
            des:  { bg: 'var(--cp-purple-5)', text: 'var(--cp-purple-60)', border: isDark ? 'var(--ds-background-discovery-bold, rgba(139,92,246,0.25))' : 'var(--ds-background-discovery)' },
            dev:  { bg: 'var(--cp-success-light)', text: 'var(--cp-success)', border: 'var(--cp-success)' },
            uat:  { bg: 'var(--cp-warning-light)', text: 'var(--cp-warning-text)', border: isDark ? 'var(--ds-background-warning, rgba(217,119,6,0.25))' : 'var(--ds-background-warning, var(--ds-background-warning))' },
            beta: { bg: isDark ? 'var(--ds-background-success, rgba(13,148,136,0.15))' : 'var(--ds-background-success)', text: 'var(--cp-teal-60, var(--ds-chart-teal-bolder))', border: isDark ? 'var(--ds-background-success, rgba(13,148,136,0.25))' : 'var(--ds-background-success)' },
            prod: { bg: isDark ? 'var(--ds-background-success-bold, rgba(22,163,74,0.15))' : 'var(--ds-background-success)', text: 'var(--cp-success-text)', border: isDark ? 'var(--ds-background-success-bold, rgba(22,163,74,0.25))' : 'var(--ds-background-success)' },
          };
          const unsetStyle = { bg: 'var(--cp-bg-page, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-border-strong)', border: 'var(--cp-border, var(--cp-border, var(--cp-bg-sunken)))' };
          const style = isSet ? CHIP_STYLES[m.key] : unsetStyle;
          return (
            <span key={m.key} style={{
              height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 6px', borderRadius: 4,
              fontSize: 'var(--ds-font-size-100)', fontWeight: 700, fontFamily: 'var(--cp-font-body)',
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
          background: 'var(--cp-success, var(--cp-lozenge-green-bg))',
          color: isDark ? 'var(--ds-background-success)' : 'var(--bg-app)',
          border: `1px solid ${isDark ? 'var(--ds-background-success-bold, rgba(22,163,74,0.25))' : '#B7EBD1'}`,
          fontSize: 'var(--ds-font-size-50)', fontWeight: 700,
          fontFamily: 'var(--cp-font-body)',
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
            color: dk.t3, fontSize: 'var(--ds-font-size-50)', fontWeight: 600,
            fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--cp-teal-60)';
            e.currentTarget.style.color = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))';
            e.currentTarget.style.borderColor = 'var(--cp-teal-60)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))';
            e.currentTarget.style.color = 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary)))';
            e.currentTarget.style.borderColor = 'var(--cp-border, var(--cp-border, var(--cp-bg-sunken)))';
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
